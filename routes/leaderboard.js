const express = require("express");

const { requireAuth } = require("../middleware/auth");
const { refreshUserScore, refreshCfOnly, refreshLcOnly } = require("../services/scoringService");

const ScoredSubmission = require("../models/ScoredSubmission");
const User = require("../models/User");

const router = express.Router();

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/*
|--------------------------------------------------------------------------
| Refresh leaderboard data
|--------------------------------------------------------------------------
*/
router.post("/refresh", requireAuth, async (req, res) => {

    try {

        const result = await refreshUserScore(req.user._id);

        res.json({
            success: true,
            ...result
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            error: err.message
        });

    }

});

/*
|--------------------------------------------------------------------------
| Refresh Codeforces only
|--------------------------------------------------------------------------
*/
router.post("/refresh/cf", requireAuth, async (req, res) => {

    try {

        const result = await refreshCfOnly(req.user._id);

        res.json({
            success: true,
            ...result
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            error: err.message
        });

    }

});

/*
|--------------------------------------------------------------------------
| Refresh LeetCode only
|--------------------------------------------------------------------------
*/
router.post("/refresh/lc", requireAuth, async (req, res) => {

    try {

        const result = await refreshLcOnly(req.user._id);

        res.json({
            success: true,
            ...result
        });

    } catch (err) {

        res.status(400).json({
            success: false,
            error: err.message
        });

    }

});

/*
|--------------------------------------------------------------------------
| Current Leaderboard
|--------------------------------------------------------------------------
*/
router.get("/current", requireAuth, async (req, res) => {

    try {

        const windowStart =
            new Date(Date.now() - WINDOW_MS);

        const totals =
            await ScoredSubmission.aggregate([

                {
                    $match: {
                        solvedAt: {
                            $gte: windowStart
                        }
                    }
                },

                {
                    $group: {

                        _id: "$userId",

                        totalPoints: {
                            $sum: "$points"
                        },

                        latestSolveAt: {
                            $max: "$solvedAt"
                        },

                        codeforcesPoints: {

                            $sum: {

                                $cond: [

                                    {
                                        $eq: [
                                            "$platform",
                                            "codeforces"
                                        ]
                                    },

                                    "$points",

                                    0

                                ]

                            }

                        },

                        leetcodePoints: {

                            $sum: {

                                $cond: [

                                    {
                                        $eq: [
                                            "$platform",
                                            "leetcode"
                                        ]
                                    },

                                    "$points",

                                    0

                                ]

                            }

                        }

                    }

                }

            ]);

        const userIds = totals.map(x => x._id);

        const users =
            await User.find(
                {
                    _id: {
                        $in: userIds
                    },
                    isActive: true
                },
                "name cfHandle lcUsername"
            );

        const userMap = new Map(
            users.map(user => [
                user._id.toString(),
                user
            ])
        );

        const leaderboard =
            totals

                .filter(x =>
                    userMap.has(
                        x._id.toString()
                    )
                )

                .sort((a, b) => {

                    if (
                        b.totalPoints !==
                        a.totalPoints
                    ) {

                        return (
                            b.totalPoints -
                            a.totalPoints
                        );

                    }

                    return (
                        a.latestSolveAt -
                        b.latestSolveAt
                    );

                })

                .map((entry, index) => {

                    const user =
                        userMap.get(
                            entry._id.toString()
                        );

                    return {

                        rank: index + 1,

                        userId: user._id,

                        name: user.name,

                        cfHandle:
                            user.cfHandle,

                        lcUsername:
                            user.lcUsername,

                        codeforcesPoints:
                            entry.codeforcesPoints,

                        leetcodePoints:
                            entry.leetcodePoints,

                        totalPoints:
                            entry.totalPoints,

                        latestSolveAt:
                            entry.latestSolveAt

                    };

                });

        res.json({

            success: true,

            windowStart,

            totalParticipants:
                leaderboard.length,

            leaderboard

        });

    } catch (err) {

        res.status(500).json({

            success: false,

            error: err.message

        });

    }

});

module.exports = router;
