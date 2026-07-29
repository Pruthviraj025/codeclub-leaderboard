const { chromium } = require("playwright");

let context;

/**
 * Reuse one persistent Chrome profile.
 * NOTE:
 * Close all Chrome windows before running,
 * or use a dedicated Chrome profile instead.
 */
async function getContext() {

    if (context)
        return context;

    context = await chromium.launchPersistentContext(
    "C:\\Users\\baddi\\AppData\\Local\\Google\\Chrome\\User Data\\Profile 5",
    {
        channel: "chrome",
        headless: false,
        viewport: null,
        args: ["--start-maximized"]
    }
);

    return context;

}

/**
 * Converts
 *
 * 39.4M -> 39400000
 * 63.5K -> 63500
 * 22,789,255 -> 22789255
 */
function parseCount(value) {

    if (!value)
        return null;

    value = value
        .replace(/,/g, "")
        .trim();

    if (value.endsWith("K"))
        return Math.round(
            parseFloat(value) * 1000
        );

    if (value.endsWith("M"))
        return Math.round(
            parseFloat(value) * 1000000
        );

    return Number(value);

}

async function scrapeProblem(titleSlug) {

    const context = await getContext();

    const page = await context.newPage();

    try {

        await page.goto(
            `https://leetcode.com/problems/${titleSlug}`,
            {
                waitUntil: "networkidle",
                timeout: 60000
            }
        );

        // Wait until the stats section appears
        await page.waitForSelector(
            "div.text-sm.text-sd-muted-foreground",
            {
                timeout: 30000
            }
        );

        const data = await page.evaluate(() => {

            const result = {

                title: null,

                difficulty: null,

                acceptanceRate: null,

                acceptedCount: null,

                totalSubmissions: null

            };

            //----------------------------------
            // Title
            //----------------------------------

            result.title =
                document.title
                    .replace(" - LeetCode", "")
                    .trim();

            //----------------------------------
            // Difficulty
            //----------------------------------

            const body =
                document.body.innerText;

            if (body.includes("Easy"))
                result.difficulty = "Easy";

            else if (body.includes("Medium"))
                result.difficulty = "Medium";

            else if (body.includes("Hard"))
                result.difficulty = "Hard";

            //----------------------------------
            // Accepted / Acceptance
            //----------------------------------

            const labels = [
                ...document.querySelectorAll(
                    "div.text-sm.text-sd-muted-foreground"
                )
            ];

            for (const label of labels) {

                const text =
                    label.textContent.trim();

                //----------------------------------

                if (text === "Accepted") {

                    const container =
                        label.parentElement;

                    const spans =
                        container.querySelectorAll("span");

                    if (spans.length >= 2) {

                        result.acceptedCount =
                            spans[0].textContent.trim();

                        result.totalSubmissions =
                            spans[1]
                                .textContent
                                .replace("/", "")
                                .trim();

                    }

                }

                //----------------------------------

                if (text === "Acceptance Rate") {

                    const container =
                        label.parentElement;

                    const value =
                        container.querySelector(
                            "span.text-lg"
                        );

                    if (value) {

                        result.acceptanceRate =
                            parseFloat(
                                value.textContent.trim()
                            );

                    }

                }

            }

            return result;

        });

        return {

            titleSlug,

            questionTitle:
                data.title,

            difficulty:
                data.difficulty,

            acceptanceRate:
                data.acceptanceRate,

            acceptedCount:
                parseCount(
                    data.acceptedCount
                ),

            totalSubmissions:
                parseCount(
                    data.totalSubmissions
                )

        };

    }
    finally {

        await page.close();

    }

}

module.exports = {

    scrapeProblem

};