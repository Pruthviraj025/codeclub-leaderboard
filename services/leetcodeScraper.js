const axios = require("axios");

const BASE_URL = "https://alfa-leetcode-api.onrender.com";
const LC_GRAPHQL_URL = "https://leetcode.com/graphql";
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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

                const MAX_WAIT_MS = 60000;

                const wait = Math.min(
                    retryAfter
                        ? Number(retryAfter) * 1000
                        : 3000 * Math.pow(2, attempt - 1),
                    MAX_WAIT_MS
                );

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
