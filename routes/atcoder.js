const express = require("express");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");
const { generateVerificationCode, checkVerification } = require("../services/atcoderVerificationService");

const router = express.Router();

router.post("/start-verification", requireAuth, async (req, res) => {
    try {
        const { atcoderHandle } = req.body;
        if (!atcoderHandle || !atcoderHandle.trim()) {
            return res.status(400).json({ error: "AtCoder handle is required" });
        }

        const result = await generateVerificationCode(req.user._id, atcoderHandle.trim());
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.post("/verify", requireAuth, async (req, res) => {
    try {
        const result = await checkVerification(req.user._id);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get("/status", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: "User not found" });

        res.json({
            connected: user.atcoderConnected,
            handle: user.atcoderHandle,
            connectedAt: user.atcoderConnectedAt,
            verifiedAt: user.atcoderVerification?.verifiedAt || null,
            pendingVerification: !!(
                user.atcoderHandle &&
                user.atcoderVerificationRequestedAt &&
                !user.atcoderConnected
            )
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete("/disconnect", requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: "User not found" });

        user.atcoderConnected = false;
        user.atcoderHandle = null;
        user.atcoderConnectedAt = null;
        user.lastCheckedAtcoderSubmissionId = null;
        user.atcoderVerification = {
            method: "affiliation",
            verificationCode: null,
            verifiedAt: null
        };
        user.atcoderVerificationRequestedAt = null;

        await user.save();

        await ScoredSubmission.deleteMany({ userId: user._id, platform: "atcoder" });

        res.json({
            success: true,
            message: "AtCoder account disconnected."
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
