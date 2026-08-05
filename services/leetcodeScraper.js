const axios = require("axios");

const BASE_URL = "https://alfa-leetcode-api.onrender.com";
const LC_GRAPHQL_URL = "https://leetcode.com/graphql";
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// alfa-leetcode-api's /select endpoint requests `stats` from LeetCode's
// GraphQL but its formatQuestionData() never maps it into the response —
// data.acRate / data.totalSubmission are always undefined there (verified
// against alfa-leetcode-api source, src/FormatUtils/problemData.ts). So
// acceptanceRate/totalSubmissions must come from LeetCode's public GraphQL
// directly instead.
async function fetchStats(titleSlug) {

    const query = `
        query questionStats($titleSlug: String!) {
            question(titleSlug: $titleSlug) {
                stats
            }
        }
    `;

    const { data } = await axios.post(
        LC_GRAPHQL_URL,
        {
            query,
            variables: { titleSlug }
        },
        {
            timeout: 30000,
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "Mozilla/5.0"
            }
        }
    );

    const rawStats =
        data &&
        data.data &&
        data.data.question &&
        data.data.question.stats;

    if (!rawStats)
        return { acceptanceRate: null, acceptedCount: null, totalSubmissions: null };

    let parsed;

    try {
        parsed = JSON.parse(rawStats);
    } catch {
        return { acceptanceRate: null, acceptedCount: null, totalSubmissions: null };
    }

    const acceptanceRate =
        parsed.acRate != null
            ? parseFloat(String(parsed.acRate).replace("%", ""))
            : null;

    return {
        acceptanceRate: Number.isFinite(acceptanceRate) ? acceptanceRate : null,
        acceptedCount: Number.isFinite(parsed.totalAcceptedRaw) ? parsed.totalAcceptedRaw : null,
        totalSubmissions: Number.isFinite(parsed.totalSubmissionRaw) ? parsed.totalSubmissionRaw : null
    };

}

/**
 * Fetches problem metadata from alfa-leetcode-api's /select endpoint
 * (difficulty/title), plus acceptanceRate/totalSubmissions straight
 * from LeetCode's own GraphQL (see fetchStats() above for why).
 * Replaces the old Playwright-based scraper, which depended on a
 * local machine's Chrome profile and could never run on Render.
 */
async function scrapeProblem(titleSlug) {

    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        try {

            const { data } = await axios.get(
                `${BASE_URL}/select`,
                {
                    params: { titleSlug },
                    timeout: 30000
                }
            );

            if (!data || !data.difficulty) {

                console.log(
                    `No usable data for ${titleSlug}. Raw response:`,
                    JSON.stringify(data)
                );

                return null;

            }

            let stats = {
                acceptanceRate: null,
                acceptedCount: null,
                totalSubmissions: null
            };

            try {
                stats = await fetchStats(titleSlug);
            } catch (statsErr) {
                console.log(
                    `Stats fetch failed for ${titleSlug}, scoring will use default factors:`,
                    statsErr.message
                );
            }

            return {

                titleSlug,

                questionTitle:
                    data.questionTitle || data.title || null,

                difficulty:
                    data.difficulty,

                acceptanceRate:
                    stats.acceptanceRate,

                acceptedCount:
                    stats.acceptedCount,

                totalSubmissions:
                    stats.totalSubmissions

            };

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

                const wait =
                    retryAfter
                        ? Number(retryAfter) * 1000
                        : 3000 * Math.pow(2, attempt - 1);

                console.log(
                    `LeetCode API fetch failed for ${titleSlug} (${status || err.code}), retrying in ${wait}ms...`
                );

                await sleep(wait);
                continue;

            }

            throw err;

        }

    }

    throw lastError;

}

module.exports = {
    scrapeProblem,
    fetchStats
};