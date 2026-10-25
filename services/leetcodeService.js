const axios = require("axios");

const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");
const LeetCodeQuestion = require("../models/LeetCodeQuestion");

const { resolveLeetCodePoints } = require("../utils/leetcodePoints");
const { scrapeProblem } = require("./leetcodeScraper");

const BASE_URL = "https://alfa-leetcode-api.onrender.com";
const WINDOW_SECONDS = 7 * 24 * 60 * 60;
const QUESTION_CACHE_DAYS = 30;

const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchRecentAccepted(username) {

    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {

            const { data } = await axios.get(
                `${BASE_URL}/${username}/acSubmission`,
                {
                    timeout: 30000
                }
            );

            if (!Array.isArray(data.submission)) {
                console.error("Unexpected LeetCode response:", data);
                throw new Error("Unable to fetch LeetCode submissions.");
            }

            return data.submission;

        } catch (err) {

            lastError = err;

            const status = err.response && err.response.status;

            const retryable =
                status === 429 ||
                status >= 500 ||
                !status; 

            if (retryable && attempt < MAX_RETRIES) {

                const retryAfter =
                    err.response && err.response.headers["retry-after"];

                const MAX_WAIT_MS = 60000;

                const wait = Math.min(
                    retryAfter
                        ? Number(retryAfter) * 1000
                        : 3000 * Math.pow(2, attempt - 1),
                    MAX_WAIT_MS
                );

                console.log(
                    `LeetCode fetch failed for ${username} (${status || err.code}), retrying in ${wait}ms...`
                );

                await sleep(wait);
                continue;
            }

            throw err;
        }
    }

    throw lastError;
}

async function fetchQuestions(titleSlugs) {


    const expiry = new Date(
        Date.now() -
        QUESTION_CACHE_DAYS * 24 * 60 * 60 * 1000
    );

    const cached = await LeetCodeQuestion.find({

        titleSlug: {
            $in: titleSlugs
        },

        lastFetchedAt: {
            $gte: expiry
        },

        acceptanceRate: {
            $ne: null
        }

    });

    const questionMap = new Map();

    cached.forEach(question => {

        questionMap.set(
            question.titleSlug,
            {

                questionTitle:
                    question.title,

                difficulty:
                    question.difficulty,

                acceptanceRate:
                    question.acceptanceRate,

                acceptedCount:
                    question.acceptedCount,

                totalSubmissions:
                    question.totalSubmissions,

                topicTags:
                    question.topicTags || []

            }
        );

    });


    const missing =
        titleSlugs.filter(
            slug => !questionMap.has(slug)
        );

    if (!missing.length)
        return questionMap;


    const documents = [];

    const SCRAPE_CONCURRENCY = 3;

    const scraped = [];

    for (let i = 0; i < missing.length; i += SCRAPE_CONCURRENCY) {

        const batch = missing.slice(i, i + SCRAPE_CONCURRENCY);

        const batchResults = await Promise.all(

            batch.map(async slug => {

                try {

                    console.log(
                        `Scraping LeetCode problem: ${slug}`
                    );

                    const data =
                        await scrapeProblem(slug);

                    return { slug, data };

                } catch (err) {

                    console.error(
                        `Unable to scrape ${slug}`,
                        err.message
                    );

                    return { slug, data: null };

                }

            })

        );

        scraped.push(...batchResults);

    }

    for (const { slug, data } of scraped) {

        if (
            !data ||
            !data.difficulty
        ) {

            const stale = await LeetCodeQuestion.findOne({
                titleSlug: slug,
                difficulty: { $ne: null }
            });

            if (stale) {
                console.log(
                    `Using cached data for ${slug} after scrape failure`
                );
                questionMap.set(
                    slug,
                    {
                        questionTitle:
                            stale.title,
                        difficulty:
                            stale.difficulty,
                        acceptanceRate:
                            stale.acceptanceRate,
                        acceptedCount:
                            stale.acceptedCount,
                        totalSubmissions:
                            stale.totalSubmissions,
                        topicTags:
                            stale.topicTags || []
                    }
                );
                continue;
            }

            console.log(
                `Skipping ${slug}`
            );

            continue;

        }

        questionMap.set(
            slug,
            data
        );

        documents.push({

            titleSlug:
                slug,

            title:
                data.questionTitle,

            difficulty:
                data.difficulty,

            acceptanceRate:
                data.acceptanceRate,

            acceptedCount:
                data.acceptedCount,

            totalSubmissions:
                data.totalSubmissions,

            topicTags:
                data.topicTags || [],

            lastFetchedAt:
                new Date()

        });

    }


    if (documents.length) {

        await Promise.all(

            documents.map(doc =>

                LeetCodeQuestion.findOneAndUpdate(

                    {
                        titleSlug: doc.titleSlug
                    },

                    doc,

                    {
                        upsert: true,
                        new: true
                    }

                )

            )

        ).catch(() => {});

    }

    return questionMap;

}

async function refreshLeetCodeScore(userId) {


    const user = await User.findById(userId);

    if (!user)
        throw new Error("User not found");

    if (!user.lcConnected || !user.lcUsername) {

        return {
            newlyScored: [],
            pointsAdded: 0
        };

    }


    const submissions =
        await fetchRecentAccepted(user.lcUsername);

    const cutoff =
        Math.floor(Date.now() / 1000) -
        WINDOW_SECONDS;

    const inWindowSubs =
        (submissions || []).filter(sub => {

            const ts = Number(sub.timestamp);

            return (
                ts >= cutoff &&
                (sub.statusDisplay === "Accepted" || !sub.statusDisplay)
            );

        });

    if (!inWindowSubs.length) {

        return {
            newlyScored: [],
            pointsAdded: 0
        };

    }

    const existingScored = await ScoredSubmission.find({
        userId: user._id,
        platform: "leetcode",
        problemId: {
            $in: inWindowSubs.map(s => s.titleSlug)
        }
    }).select("problemId").lean();

    const existingSlugs = new Set(
        existingScored.map(e => e.problemId)
    );

    const seenSlugs = new Set();
    const candidates = [];

    for (const sub of inWindowSubs) {

        if (
            !existingSlugs.has(sub.titleSlug) &&
            !seenSlugs.has(sub.titleSlug)
        ) {

            seenSlugs.add(sub.titleSlug);
            candidates.push(sub);

        }

    }

    if (!candidates.length) {

        return {
            newlyScored: [],
            pointsAdded: 0
        };

    }

    const uniqueSlugs =
        candidates.map(s => s.titleSlug);

    const questionMap =
        await fetchQuestions(uniqueSlugs);

    let highestTimestamp =
        user.lcLastSubmissionTimestamp || 0;

    const docs = [];

    for (const submission of candidates) {

        const question =
            questionMap.get(
                submission.titleSlug
            );

        if (!question)
            continue;

        const points =
            resolveLeetCodePoints({
                difficulty:
                    question.difficulty,
                acceptanceRate:
                    question.acceptanceRate,
                totalSubmissions:
                    question.totalSubmissions
            });

        if (points == null)
            continue;

        highestTimestamp = Math.max(
            highestTimestamp,
            Number(submission.timestamp)
        );

        docs.push({
            userId:
                user._id,
            platform:
                "leetcode",
            problemId:
                submission.titleSlug,
            problemName:
                question.questionTitle,
            difficulty:
                question.difficulty,
            acceptanceRate:
                question.acceptanceRate,
            acceptedCount:
                question.acceptedCount,
            totalSubmissions:
                question.totalSubmissions,
            scoringVersion:
                1,
            points,
            lcSubmissionId:
                `${submission.titleSlug}_${submission.timestamp}`,
            solvedAt:
                new Date(
                    Number(submission.timestamp) * 1000
                )
        });

    }

    let inserted = [];

    if (docs.length) {

        try {

            inserted =
                await ScoredSubmission.insertMany(
                    docs,
                    {
                        ordered: false
                    }
                );

        }
        catch (err) {

            inserted =
                err.insertedDocs || [];

        }

    }

    await User.updateOne(
        { _id: user._id },
        { $set: { lcLastSubmissionTimestamp: highestTimestamp } }
    );


    return {

        newlyScored:
            inserted,

        pointsAdded:

            inserted.reduce(

                (sum, doc) =>
                    sum + doc.points,

                0

            )

    };

}

module.exports = {

    refreshLeetCodeScore,

    fetchRecentAccepted,

    fetchQuestions

};
