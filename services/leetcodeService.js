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

            // Retry on rate limit, cold-start timeouts, and upstream 5xx —
            // alfa-leetcode-api sleeps on Render free tier and throws these
            // instead of 429 when waking up.
            const retryable =
                status === 429 ||
                status >= 500 ||
                !status; // no response = timeout/ECONNRESET/ECONNABORTED

            if (retryable && attempt < MAX_RETRIES) {

                const retryAfter =
                    err.response && err.response.headers["retry-after"];

                const wait = retryAfter
                    ? Number(retryAfter) * 1000
                    : 3000 * Math.pow(2, attempt - 1);

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

/**
 * Loads all requested questions.
 * Cached questions come from MongoDB.
 * Missing questions are fetched once from the API and cached.
 */
async function fetchQuestions(titleSlugs) {

    //------------------------------------------
    // Load cached questions
    //------------------------------------------

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

        // Rows with null acceptanceRate are from the pre-fix broken
        // scraper (see leetcodeScraper.js fetchStats() comment) — don't
        // trust them as "fresh", force a re-scrape instead.
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

    //------------------------------------------
    // Find uncached problems
    //------------------------------------------

    const missing =
        titleSlugs.filter(
            slug => !questionMap.has(slug)
        );

    if (!missing.length)
        return questionMap;

    //------------------------------------------
    // Scrape missing problems
    //------------------------------------------

    const documents = [];

    // alfa-leetcode-api is a free-tier service — firing every missing
    // problem at it simultaneously can overwhelm/rate-limit it and cause
    // requests to hang far longer than a single 30s timeout would suggest.
    // Scrape in small concurrent batches instead of all-at-once or one-by-one.
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

    //------------------------------------------
    // Cache newly scraped problems
    //------------------------------------------

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

    //------------------------------------------
    // Load user
    //------------------------------------------

    const user = await User.findById(userId);

    if (!user)
        throw new Error("User not found");

    if (!user.lcConnected || !user.lcUsername) {

        return {
            newlyScored: [],
            pointsAdded: 0
        };

    }

    //------------------------------------------
    // Fetch recent accepted submissions
    //------------------------------------------

    const submissions =
        await fetchRecentAccepted(user.lcUsername);

    const cutoff =
        Math.floor(Date.now() / 1000) -
        WINDOW_SECONDS;

    const candidates =
        submissions.filter(sub => {

            const ts = Number(sub.timestamp);

            return (
                ts >= cutoff &&
                ts > (user.lcLastSubmissionTimestamp || 0)
            );

        });

    if (!candidates.length) {

        return {
            newlyScored: [],
            pointsAdded: 0
        };

    }

    //------------------------------------------
    // Load question metadata
    //------------------------------------------

    const uniqueSlugs = [

        ...new Set(

            candidates.map(
                s => s.titleSlug
            )

        )

    ];

    const questionMap =
        await fetchQuestions(uniqueSlugs);

    //------------------------------------------
    // Build scored submissions
    //------------------------------------------

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

        //--------------------------------------
        // Calculate points
        //--------------------------------------

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

    //------------------------------------------
    // Insert new submissions
    //------------------------------------------

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

    //------------------------------------------
    // Update latest timestamp
    //------------------------------------------

    user.lcLastSubmissionTimestamp =
        highestTimestamp;

    await user.save();

    //------------------------------------------
    // Return summary
    //------------------------------------------

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
