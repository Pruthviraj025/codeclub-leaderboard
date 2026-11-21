const axios = require("axios");
const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");
const AtCoderQuestion = require("../models/AtCoderQuestion");
const { resolveAtCoderPoints } = require("../utils/atcoderPoints");

const WINDOW_SECONDS = 7 * 24 * 60 * 60;
const QUESTION_CACHE_DAYS = 30;
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// In-memory cache for Kenkoooo resources
let modelsCache = { data: null, fetchedAt: 0 };
let problemsCache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

async function fetchKenkooooProblemModels() {
    if (modelsCache.data && (Date.now() - modelsCache.fetchedAt < CACHE_TTL_MS)) {
        return modelsCache.data;
    }
    try {
        const { data } = await axios.get(
            "https://kenkoooo.com/atcoder/resources/problem-models.json",
            {
                headers: { "User-Agent": "Mozilla/5.0" },
                timeout: 15000
            }
        );
        modelsCache = { data, fetchedAt: Date.now() };
        return data;
    } catch (err) {
        console.warn(`Failed to fetch AtCoder problem models: ${err.message}`);
        return modelsCache.data || {};
    }
}

async function fetchKenkooooProblems() {
    if (problemsCache.data && (Date.now() - problemsCache.fetchedAt < CACHE_TTL_MS)) {
        return problemsCache.data;
    }
    try {
        const { data } = await axios.get(
            "https://kenkoooo.com/atcoder/resources/problems.json",
            {
                headers: { "User-Agent": "Mozilla/5.0" },
                timeout: 15000
            }
        );
        const map = new Map();
        if (Array.isArray(data)) {
            for (const p of data) {
                map.set(p.id, p);
            }
        }
        problemsCache = { data: map, fetchedAt: Date.now() };
        return map;
    } catch (err) {
        console.warn(`Failed to fetch AtCoder problems list: ${err.message}`);
        return problemsCache.data || new Map();
    }
}

async function fetchAtCoderSubmissions(handle, fromSecond = 0) {
    let lastError;
    const cleanHandle = (handle || "").trim();

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const { data } = await axios.get(
                "https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions",
                {
                    params: {
                        user: cleanHandle,
                        from_second: Math.max(0, Math.floor(fromSecond))
                    },
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    },
                    timeout: 45000
                }
            );

            if (!Array.isArray(data)) {
                return [];
            }

            return data;
        } catch (err) {
            lastError = err;
            if (attempt < MAX_RETRIES) {
                await sleep(1500 * Math.pow(2, attempt - 1));
            }
        }
    }

    throw lastError;
}

async function getAtCoderProblemDetails(problemId) {
    const cleanId = (problemId || "").trim();

    // Check DB cache
    const expiry = new Date(Date.now() - QUESTION_CACHE_DAYS * 24 * 60 * 60 * 1000);
    const cached = await AtCoderQuestion.findOne({
        problemId: cleanId,
        lastFetchedAt: { $gte: expiry }
    });

    if (cached) {
        return cached;
    }

    const [models, problemsMap] = await Promise.all([
        fetchKenkooooProblemModels(),
        fetchKenkooooProblems()
    ]);

    const model = models ? models[cleanId] : null;
    const info = problemsMap ? problemsMap.get(cleanId) : null;

    const difficultyRating = (model && typeof model.difficulty === "number") ? model.difficulty : null;
    const problemName = info ? (info.title || info.name || cleanId) : cleanId;
    const contestId = info ? info.contest_id : cleanId.split("_")[0];
    const points = resolveAtCoderPoints(difficultyRating);

    const questionDoc = await AtCoderQuestion.findOneAndUpdate(
        { problemId: cleanId },
        {
            $set: {
                problemName,
                contestId,
                difficultyRating,
                points,
                lastFetchedAt: new Date()
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return questionDoc;
}

async function refreshAtcoderScore(user) {
    if (!user.atcoderConnected || !user.atcoderHandle) {
        return {
            newlyScored: [],
            pointsAdded: 0
        };
    }

    const eligibleTime = Math.floor(Date.now() / 1000) - WINDOW_SECONDS;
    const submissions = await fetchAtCoderSubmissions(user.atcoderHandle, eligibleTime);

    const watermark = user.lastCheckedAtcoderSubmissionId || 0;
    const isOld = sub => sub.id <= watermark;

    // Filter AC submissions within trailing 7 days
    const baseOk = submissions.filter(sub =>
        sub.result === "AC" &&
        sub.epoch_second >= eligibleTime
    );

    const fresh = baseOk.filter(sub => !isOld(sub));
    const old = baseOk.filter(sub => isOld(sub));

    let missedOld = [];
    if (old.length > 0) {
        const existing = await ScoredSubmission.find({
            userId: user._id,
            platform: "atcoder",
            problemId: { $in: old.map(s => s.problem_id) }
        }).select("problemId").lean();

        const have = new Set(existing.map(e => e.problemId));
        missedOld = old.filter(s => !have.has(s.problem_id));
    }

    const candidates = [...fresh, ...missedOld];

    let highestSubmissionId = user.lastCheckedAtcoderSubmissionId || 0;
    const newlyScored = [];
    let pointsAdded = 0;

    for (const submission of candidates) {
        highestSubmissionId = Math.max(highestSubmissionId, submission.id);

        try {
            const details = await getAtCoderProblemDetails(submission.problem_id);
            const points = details.points;
            if (points == null) continue;

            const contestId = details.contestId || submission.contest_id || submission.problem_id.split("_")[0];

            const scored = await ScoredSubmission.create({
                userId: user._id,
                platform: "atcoder",
                problemId: submission.problem_id,
                problemName: details.problemName || submission.problem_id,
                problemRating: details.difficultyRating ?? null,
                points,
                atcoderSubmissionId: submission.id,
                solvedAt: new Date(submission.epoch_second * 1000)
            });

            newlyScored.push(scored);
            pointsAdded += points;
        } catch (err) {
            if (err.code !== 11000) {
                console.error(`Error scoring AtCoder submission ${submission.id}:`, err.message);
            }
        }
    }

    user.lastCheckedAtcoderSubmissionId = highestSubmissionId;
    await user.save();

    return {
        newlyScored,
        pointsAdded
    };
}

module.exports = {
    fetchAtCoderSubmissions,
    getAtCoderProblemDetails,
    refreshAtcoderScore
};
