const axios = require("axios");

const BASE_URL = "https://alfa-leetcode-api.onrender.com";
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetches problem metadata from alfa-leetcode-api's /select endpoint.
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

            const acceptanceRate =
                typeof data.acRate === "number"
                    ? data.acRate
                    : parseFloat(data.acRate);

            return {

                titleSlug,

                questionTitle:
                    data.questionTitle || data.title || null,

                difficulty:
                    data.difficulty,

                acceptanceRate:
                    Number.isFinite(acceptanceRate) ? acceptanceRate : null,

                acceptedCount:
                    data.totalAccepted ?? null,

                totalSubmissions:
                    data.totalSubmission ?? data.totalSubmissions ?? null

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
    scrapeProblem
};
