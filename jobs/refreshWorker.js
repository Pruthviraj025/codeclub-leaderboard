const { dequeue } = require("../utils/refreshQueue");
const { refreshUserScore } = require("../services/scoringService");

const WORKERS = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function worker(id) {

    while (true) {

        const userId = dequeue();

        if (!userId) {

            await sleep(1000);

            continue;

        }

        try {

            console.log(
                `[Queue Worker ${id}] Refreshing ${userId}`
            );

            await refreshUserScore(
                userId,
                {
                    ignoreCooldown: true
                }
            );

            console.log(
                `[Queue Worker ${id}] Done`
            );

        } catch (err) {

            console.error(
                `[Queue Worker ${id}] ${err.message}`
            );

        }

    }

}

function startRefreshWorkers() {

    for (let i = 1; i <= WORKERS; i++) {

        worker(i);

    }

    console.log(
        `Started ${WORKERS} refresh workers`
    );

}

module.exports = {
    startRefreshWorkers
};