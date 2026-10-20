const axios = require("axios");

const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");

const { resolvePoints } = require("../utils/ratingMap");
const { refreshLeetCodeScore } = require("./leetcodeService");

const REFRESH_COOLDOWN_MS = 15 * 1000;
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// contestId missing for problemset-only problems (e.g. acmsguru).
// Keeps the normal "1234A" form whenever contestId exists.
function cfProblemId(problem) {
    const prefix =
        problem.contestId != null
            ? problem.contestId
            : (problem.problemsetName || "ps");
    return `${prefix}${problem.index}`;
}

async function fetchCFSubmissions(handle) {

    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {

            const { data } = await axios.get(
                "https://codeforces.com/api/user.status",
                {
                    params: {
                        handle,
                        from: 1,
                        count: 10000
                    },
                    timeout: 10000
                }
            );

            if (data.status !== "OK") {
                throw new Error("Codeforces API returned non-OK status.");
            }

            return data.result;

        } catch (err) {

            lastError = err;

            if (attempt < MAX_RETRIES) {

                await sleep(
                    2000 * Math.pow(2, attempt - 1)
                );

            }

        }

    }

    throw lastError;

}

async function refreshCodeforcesScore(user) {

    if (!user.cfConnected || !user.cfHandle) {

        return {
            newlyScored: [],
            pointsAdded: 0
        };

    }

    const submissions =
        await fetchCFSubmissions(user.cfHandle);

    const connectedAt =
        Math.floor(
            user.cfConnectedAt.getTime() / 1000
        );

    const watermark =
        user.lastCheckedSubmissionId || 0;

    // Unrated solves at/below the watermark may have been skipped by an
    // older build (before unrated scoring existed) and never retried.
    // Re-check them every refresh; unique index + pre-query dedupe keep
    // it safe and cheap.
    const isOld = sub => sub.id <= watermark;
    const isUnrated = sub => sub.problem.rating == null;

    const baseOk = submissions.filter(sub =>
        sub.verdict === "OK" &&
        sub.creationTimeSeconds >= connectedAt
    );

    const fresh = baseOk.filter(sub => !isOld(sub));

    const oldUnrated = baseOk.filter(sub =>
        isOld(sub) && isUnrated(sub)
    );

    let missedUnrated = oldUnrated;

    if (oldUnrated.length > 0) {

        const existing =
            await ScoredSubmission.find({
                userId: user._id,
                platform: "codeforces",
                problemId: {
                    $in: oldUnrated.map(s =>
                        cfProblemId(s.problem)
                    )
                }
            }).select("problemId").lean();

        const have =
            new Set(existing.map(e => e.problemId));

        missedUnrated = oldUnrated.filter(s =>
            !have.has(cfProblemId(s.problem))
        );

    }

    const candidates = [...fresh, ...missedUnrated];

    let highestSubmissionId =
        user.lastCheckedSubmissionId || 0;

    const newlyScored = [];

    let pointsAdded = 0;

    for (const submission of candidates) {

        highestSubmissionId = Math.max(
            highestSubmissionId,
            submission.id
        );

        const rating =
            submission.problem.rating;

        const points =
            resolvePoints(rating);

        if (points == null)
            continue;

        const problemId =
            cfProblemId(submission.problem);

        try {

            const scored =
                await ScoredSubmission.create({

                    userId: user._id,

                    platform: "codeforces",

                    problemId,

                    problemName:
                        submission.problem.name,

                    problemRating: rating,

                    points,

                    cfSubmissionId:
                        submission.id,

                    solvedAt:
                        new Date(
                            submission.creationTimeSeconds * 1000
                        )

                });

            newlyScored.push(scored);

            pointsAdded += points;

        } catch (err) {

            if (err.code !== 11000) {
                throw err;
            }

        }

    }

    user.lastCheckedSubmissionId =
        highestSubmissionId;

    await user.save();

    return {

        newlyScored,

        pointsAdded

    };

}

/**
 * options.ignoreCooldown
 * Used by cron jobs.
 */
async function refreshUserScore(
    userId,
    options = {}
) {

    const user =
        await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (
        !options.ignoreCooldown &&
        user.lastRefreshAt &&
        Date.now() -
            user.lastRefreshAt.getTime() <
            REFRESH_COOLDOWN_MS
    ) {

        const wait =
            REFRESH_COOLDOWN_MS -
            (
                Date.now() -
                user.lastRefreshAt.getTime()
            );

        throw new Error(
            `Refresh on cooldown. Try again in ${Math.ceil(wait / 1000)}s`
        );

    }

    let cf = {
        newlyScored: [],
        pointsAdded: 0,
        success: false,
        error: null
    };

    let lc = {
        newlyScored: [],
        pointsAdded: 0,
        success: false,
        error: null
    };

    try {

        const result =
            await refreshCodeforcesScore(user);

        cf = {
            ...result,
            success: true,
            error: null
        };

    } catch (err) {

        cf.error = err.message;

        console.error(
            "Codeforces refresh failed:",
            err.message
        );

    }

    try {

        const result =
            await refreshLeetCodeScore(user._id);

        lc = {
            ...result,
            success: true,
            error: null
        };

    } catch (err) {

        lc.error = err.message;

        console.error(
            "LeetCode refresh failed:",
            err.message
        );

    }

    user.lastRefreshAt = new Date();

    await user.save();

    return {

        codeforces: cf,

        leetcode: lc,

        totalPointsAdded:
            cf.pointsAdded +
            lc.pointsAdded

    };

}

/**
 * Refreshes Codeforces only. Independent cooldown from LeetCode,
 * so checking one platform never blocks the other.
 */
async function refreshCfOnly(userId, options = {}) {

    const user =
        await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (
        !options.ignoreCooldown &&
        user.lastCfRefreshAt &&
        Date.now() -
            user.lastCfRefreshAt.getTime() <
            REFRESH_COOLDOWN_MS
    ) {

        const wait =
            REFRESH_COOLDOWN_MS -
            (
                Date.now() -
                user.lastCfRefreshAt.getTime()
            );

        throw new Error(
            `Refresh on cooldown. Try again in ${Math.ceil(wait / 1000)}s`
        );

    }

    const result =
        await refreshCodeforcesScore(user);

    user.lastCfRefreshAt = new Date();

    await user.save();

    return result;

}

/**
 * Refreshes LeetCode only. Independent cooldown from Codeforces,
 * so checking one platform never blocks the other.
 */
async function refreshLcOnly(userId, options = {}) {

    const user =
        await User.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    if (
        !options.ignoreCooldown &&
        user.lastLcRefreshAt &&
        Date.now() -
            user.lastLcRefreshAt.getTime() <
            REFRESH_COOLDOWN_MS
    ) {

        const wait =
            REFRESH_COOLDOWN_MS -
            (
                Date.now() -
                user.lastLcRefreshAt.getTime()
            );

        throw new Error(
            `Refresh on cooldown. Try again in ${Math.ceil(wait / 1000)}s`
        );

    }

    const result =
        await refreshLeetCodeScore(user._id);

    user.lastLcRefreshAt = new Date();

    await user.save();

    return result;

}

module.exports = {

    refreshUserScore,

    refreshCfOnly,

    refreshLcOnly,

    refreshCodeforcesScore,

    fetchCFSubmissions

};
