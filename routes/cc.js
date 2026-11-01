const express = require("express");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");
const { generateVerificationCode, checkVerification } = require("../services/ccVerificationService");

const router = express.Router();

router.post("/start-verification", requireAuth, async (req, res) => {
    try {
        const { ccHandle } = req.body;
        if (!ccHandle || !ccHandle.trim()) {
            return res.status(400).json({ error: "CodeChef handle is required" });
        }

        const result = await generateVerificationCode(req.user._id, ccHandle.trim());
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
            connected: user.ccConnected,
            handle: user.ccHandle,
            connectedAt: user.ccConnectedAt,
            verifiedAt: user.ccVerification?.verifiedAt || null,
            pendingVerification: !!(
                user.ccHandle &&
                user.ccVerificationRequestedAt &&
                !user.ccConnected
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

        user.ccConnected = false;
        user.ccHandle = null;
        user.ccConnectedAt = null;
        user.lastCheckedCcSubmissionId = null;
        user.ccVerification = {
            method: "compile_error",
            verifiedAt: null
        };
        user.ccVerificationRequestedAt = null;

        await user.save();

        await ScoredSubmission.deleteMany({ userId: user._id, platform: "codechef" });

        res.json({
            success: true,
            message: "CodeChef account disconnected."
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
