const { scrapeProblem } = require("./services/leetcodeScraper");

(async () => {
    try {
        const data = await scrapeProblem("two-sum");
        console.log(data);
    } catch (err) {
        console.error(err);
    }

    process.exit(0);
})();