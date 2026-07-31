const axios = require("axios");

const BASE_URL = "https://alfa-leetcode-api.onrender.com";

/**
 * Fetches problem metadata from alfa-leetcode-api's /select endpoint.
 * Replaces the old Playwright-based scraper, which depended on a
 * local machine's Chrome profile and could never run on Render.
 */
async function scrapeProblem(titleSlug) {

    const { data } = await axios.get(
        `${BASE_URL}/select`,
        {
            params: { titleSlug },
            timeout: 15000
        }
    );

    if (!data || !data.difficulty) {

        console.log(
            `No usable data for ${titleSlug}. Raw response:`,
            JSON.stringify(data)
        );

        return null;

    }

    // acRate comes back as a plain number (e.g. 54.32) in this API,
    // unlike the old scraper which had to parse it out of page text.
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

}

module.exports = {
    scrapeProblem
};
