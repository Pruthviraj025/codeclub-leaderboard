const axios = require("axios");
const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");
const CodeChefQuestion = require("../models/CodeChefQuestion");
const { resolveCodeChefPoints } = require("../utils/codechefPoints");

const WINDOW_SECONDS = 7 * 24 * 60 * 60;
const QUESTION_CACHE_DAYS = 30;
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// CodeChef displays timestamps in IST (UTC+5:30)
// Example format: "11:30 PM 21/11/09" or "02:15 AM 05/10/2023"
function parseCodeChefDate(str) {
    if (!str) return new Date();
    const clean = str.trim();
    const m = clean.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})/i);
    if (!m) {
        const d = new Date(clean);
        return isNaN(d.getTime()) ? new Date() : d;
    }

    let [_, hStr, minStr, ampm, dayStr, monthStr, yearStr] = m;
    let hours = parseInt(hStr, 10);
    const minutes = parseInt(minStr, 10);
    if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
    if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;

    let year = parseInt(yearStr, 10);
    if (year < 100) year += 2000;
    const month = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);

    // CodeChef times are in IST (UTC+5:30)
    const utcMillis = Date.UTC(year, month, day, hours, minutes) - (5.5 * 60 * 60 * 1000);
    return new Date(utcMillis);
}

function parseSubmissionRow(rowHtml) {
    // <td> with time
    const timeMatch = rowHtml.match(/<td[^>]*title=['"]([^'"]+)['"]/i);
    const timeStr = timeMatch ? timeMatch[1] : null;

    // Problem code: href='.../problems/CODE' or title='CODE'
    const probMatch = rowHtml.match(/href=['"][^'"]*\/problems\/([^'"/?]+)/i) ||
                      rowHtml.match(/<td[^>]*title=['"]([A-Z0-9_]+)['"]/i);
    const problemCode = probMatch ? probMatch[1].trim().toUpperCase() : null;

    // Result / Verdict
    const isAccepted = /title=['"]accepted['"]/i.test(rowHtml) ||
                       /tick-icon\.gif/i.test(rowHtml) ||
                       /100\s*pts/i.test(rowHtml) ||
                       /<span[^>]*class=['"][^'"]*accepted[^'"]*['"]/i.test(rowHtml);

    const isCompileError = /compile\s*error/i.test(rowHtml) ||
                           /compilation\s*error/i.test(rowHtml) ||
                           /alert-icon\.gif/i.test(rowHtml);

    // Solution ID
    const solMatch = rowHtml.match(/href=['"][^'"]*\/viewsolution\/(\d+)/i);
    const submissionId = solMatch ? solMatch[1] : null;

    return {
        solvedAt: timeStr ? parseCodeChefDate(timeStr) : null,
        rawTime: timeStr,
        problemCode,
        isAccepted,
        isCompileError,
        submissionId
    };
}

async function fetchRecentSubmissions(handle, page = 0) {
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const { data } = await axios.get(
                "https://www.codechef.com/recent/user",
                {
                    params: {
                        page,
                        user_handle: handle
                    },
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "Accept": "application/json, text/javascript, */*; q=0.01",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    timeout: 20000
                }
            );

            if (!data || typeof data.content !== "string") {
                return { submissions: [], maxPage: 0 };
            }

            const rowRegex = /<tr >([\s\S]*?)<\/tr>/gi;
            const submissions = [];
            let match;

            while ((match = rowRegex.exec(data.content)) !== null) {
                const parsed = parseSubmissionRow(match[1]);
                if (parsed.problemCode) {
                    submissions.push(parsed);
                }
            }

            return {
                submissions,
                maxPage: data.max_page || 0
            };
        } catch (err) {
            lastError = err;
            if (attempt < MAX_RETRIES) {
                await sleep(1500 * Math.pow(2, attempt - 1));
            }
        }
    }

    throw lastError;
}

async function getProblemDetails(problemCode) {
    const cleanCode = problemCode.trim().toUpperCase();

    // Check DB cache
    const expiry = new Date(Date.now() - QUESTION_CACHE_DAYS * 24 * 60 * 60 * 1000);
    const cached = await CodeChefQuestion.findOne({
        problemCode: cleanCode,
        lastFetchedAt: { $gte: expiry }
    });

    if (cached) {
        return cached;
    }

    let problemName = cleanCode;
    let difficultyRating = null;

    try {
        const { data } = await axios.get(
            `https://www.codechef.com/api/contests/PRACTICE/problems/${cleanCode}`,
            {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                timeout: 10000
            }
        );

        if (data && data.status === "success" || data.problem_name) {
            problemName = data.problem_name || cleanCode;
            difficultyRating = data.difficulty_rating != null ? Number(data.difficulty_rating) : null;
        }
    } catch (err) {
        // If practice contest endpoint fails, try without PRACTICE or keep defaults
        console.warn(`Could not fetch CodeChef problem details for ${cleanCode}: ${err.message}`);
    }

    const points = resolveCodeChefPoints(difficultyRating);

    const questionDoc = await CodeChefQuestion.findOneAndUpdate(
        { problemCode: cleanCode },
        {
            problemCode: cleanCode,
            problemName,
            difficultyRating,
            points,
            lastFetchedAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return questionDoc;
}

async function refreshCodechefScore(user) {
    if (!user.ccConnected || !user.ccHandle) {
        return {
            newlyScored: [],
            pointsAdded: 0
        };
    }

    const handle = user.ccHandle;
    const sevenDaysAgo = new Date(Date.now() - WINDOW_SECONDS * 1000);

    // Fetch page 0
    const page0 = await fetchRecentSubmissions(handle, 0);
    let allSubs = [...page0.submissions];

    // If all subs in page 0 are recent and maxPage > 0, fetch page 1
    const oldestInPage0 = allSubs[allSubs.length - 1];
    if (page0.maxPage > 0 && oldestInPage0 && oldestInPage0.solvedAt && oldestInPage0.solvedAt >= sevenDaysAgo) {
        try {
            const page1 = await fetchRecentSubmissions(handle, 1);
            allSubs.push(...page1.submissions);
        } catch (pageErr) {
            console.warn(`Failed to fetch page 1 CodeChef submissions for ${handle}: ${pageErr.message}`);
        }
    }

    // Filter accepted submissions within the 7-day window
    const eligibleSolves = allSubs.filter(sub =>
        sub.isAccepted &&
        sub.solvedAt &&
        sub.solvedAt >= sevenDaysAgo
    );

    // Deduplicate by problemCode (keep latest solve)
    const uniqueByProblem = new Map();
    for (const solve of eligibleSolves) {
        if (!uniqueByProblem.has(solve.problemCode)) {
            uniqueByProblem.set(solve.problemCode, solve);
        }
    }

    // Check existing ScoredSubmissions in DB
    const problemCodes = Array.from(uniqueByProblem.keys());
    const existingScored = await ScoredSubmission.find({
        userId: user._id,
        platform: "codechef",
        problemId: { $in: problemCodes }
    }).select("problemId").lean();

    const alreadyScoredSet = new Set(existingScored.map(s => s.problemId));

    const newlyScored = [];
    let pointsAdded = 0;

    for (const [problemCode, solve] of uniqueByProblem.entries()) {
        if (alreadyScoredSet.has(problemCode)) {
            continue;
        }

        const details = await getProblemDetails(problemCode);
        const points = details.points;

        try {
            const scored = await ScoredSubmission.create({
                userId: user._id,
                platform: "codechef",
                problemId: problemCode,
                problemName: details.problemName || problemCode,
                problemRating: details.difficultyRating,
                points,
                ccSubmissionId: solve.submissionId,
                solvedAt: solve.solvedAt || new Date()
            });

            newlyScored.push(scored);
            pointsAdded += points;
        } catch (err) {
            if (err.code !== 11000) {
                throw err;
            }
        }
    }

    user.lastCcRefreshAt = new Date();
    await user.save();

    return {
        newlyScored,
        pointsAdded
    };
}

module.exports = {
    fetchRecentSubmissions,
    getProblemDetails,
    refreshCodechefScore,
    parseCodeChefDate,
    parseSubmissionRow
};
