const axios = require("axios");

const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");
const LeetCodeQuestion = require("../models/LeetCodeQuestion");

const { resolveLeetCodePoints } = require("../utils/leetcodePoints");
const { scrapeProblem } = require("./leetcodeScraper");

const BASE_URL = "https://alfa-leetcode-api.onrender.com";
const WINDOW_SECONDS = 7 * 24 * 60 * 60;
const QUESTION_CACHE_DAYS = 30;

async function fetchRecentAccepted(username) {
    const { data } = await axios.get(
        `${BASE_URL}/${username}/acSubmission`,
        {
            timeout: 15000
        }
    );

    if (!Array.isArray(data.submission)) {
        console.error("Unexpected LeetCode response:", data);
        throw new Error("Unable to fetch LeetCode submissions.");
    }

    return data.submission;
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

    for (const slug of missing) {

        try {

            console.log(
                `Scraping LeetCode problem: ${slug}`
            );

            const data =
                await scrapeProblem(slug);

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
        catch (err) {

            console.error(

                `Unable to scrape ${slug}`,

                err.message

            );

        }

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

        // Only advance the cursor once we know this submission
        // will actually be scored — otherwise a submission that
        // fails to resolve gets permanently skipped on every
        // future sync.
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
