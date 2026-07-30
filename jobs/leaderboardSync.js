const cron = require("node-cron");

const User = require("../models/User");
const { refreshUserScore } = require("../services/scoringService");

const CONCURRENT_WORKERS = 5;

async function processUsers(users) {

    let index = 0;

    async function worker(workerId) {

        while (true) {

            const current = index++;

            if (current >= users.length) {
                return;
            }

            const user = users[current];

            try {

                const result = await refreshUserScore(
    user._id,
    {
        ignoreCooldown: true
    }
);

                console.log(
                    `[Worker ${workerId}] ✓ ${user.name} (+${result.totalPointsAdded} pts)`
                );

            } catch (err) {

                console.error(
                    `[Worker ${workerId}] ✗ ${user.name}: ${err.message}`
                );

            }

        }

    }

    const workers = [];

    for (let i = 0; i < CONCURRENT_WORKERS; i++) {
        workers.push(worker(i + 1));
    }

    await Promise.all(workers);

}

function startLeaderboardSync() {

    cron.schedule("*/15 * * * *", async () => {

        console.log("\n========== Leaderboard Sync ==========");

        try {

            const users = await User.find({

                isActive: true,

                $or: [
                    { cfConnected: true },
                    { lcConnected: true }
                ]

            });

            console.log(
                `Refreshing ${users.length} users...`
            );

            const start = Date.now();

            await processUsers(users);

            console.log(
                `Completed in ${(
                    (Date.now() - start) / 1000
                ).toFixed(2)}s`
            );

        } catch (err) {

            console.error(
                "Cron job failed:",
                err.message
            );

        }

        console.log(
            "======================================\n"
        );

    });

}

module.exports = {
    startLeaderboardSync
};