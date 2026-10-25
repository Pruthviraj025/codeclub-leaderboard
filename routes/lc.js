const express = require("express");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");

const {
    startVerification,
    verify
} = require("../services/lcVerificationService");

const {
    refreshLeetCodeScore
} = require("../services/leetcodeService");

const router = express.Router();

router.post("/start-verification", requireAuth, async (req, res) => {

    try {

        const { username } = req.body;

        if (!username || !username.trim()) {
            return res.status(400).json({
                error: "LeetCode username is required."
            });
        }

        const result = await startVerification(
            req.user._id,
            username.trim()
        );

        res.json(result);

    } catch (err) {

        res.status(400).json({
            error: err.message
        });

    }

});

router.post("/verify", requireAuth, async (req, res) => {

    try {

        const result = await verify(req.user._id);

        if (result.verified) {

            await ScoredSubmission.deleteMany({
                userId: req.user._id,
                platform: "leetcode"
            });

            try {
                await refreshLeetCodeScore(req.user._id);
            } catch (scoreErr) {
                console.error(
                    `Failed to refresh LC score for user ${req.user._id} after connecting:`,
                    scoreErr.message
                );
            }

        }

        res.json(result);

    } catch (err) {

        res.status(400).json({
            error: err.message
        });

    }

});

router.get("/status", requireAuth, async (req, res) => {

    try {

        const user = await User.findById(req.user._id);

        res.json({

            connected: user.lcConnected,

            username: user.lcUsername,

            connectedAt: user.lcConnectedAt,

            verifiedAt: user.lcVerification?.verifiedAt || null,

            pendingVerification:
                !!(
                    user.lcVerification &&
                    user.lcVerification.verificationCode &&
                    !user.lcConnected
                )

        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

router.delete("/disconnect", requireAuth, async (req, res) => {

    try {

        const user = await User.findById(req.user._id);

        user.lcConnected = false;
        user.lcUsername = null;
        user.lcConnectedAt = null;
        user.lcLastSubmissionTimestamp = 0;

        user.lcVerification = {
            verificationCode: null,
            requestedAt: null,
            verifiedAt: null
        };

        await user.save();

        await ScoredSubmission.deleteMany({
            userId: user._id,
            platform: "leetcode"
        });

        res.json({
            success: true,
            message: "LeetCode account disconnected."
        });

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

module.exports = router;