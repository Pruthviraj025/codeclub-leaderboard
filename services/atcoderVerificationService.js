const crypto = require("crypto");
const axios = require("axios");
const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");
const { refreshAtcoderScore } = require("./atcoderService");

const VERIFICATION_WINDOW_MS = 15 * 60 * 1000;

function generateCode() {
    return "CC-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

async function generateVerificationCode(userId, atcoderHandle) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    if (user.atcoderConnected) {
        throw new Error("AtCoder account already connected — disconnect your existing account first");
    }

    const cleanHandle = atcoderHandle.trim();
    // Verify that the user profile actually exists on AtCoder
    try {
        const checkRes = await axios.get(`https://atcoder.jp/users/${encodeURIComponent(cleanHandle)}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            timeout: 20000,
            validateStatus: status => status < 500
        });
        if (checkRes.status === 404) {
            throw new Error(`AtCoder user "${cleanHandle}" not found. Please verify the handle.`);
        }
    } catch (err) {
        if (err.message.includes("not found")) throw err;
        // Non-fatal if AtCoder network check is slow
        console.warn(`AtCoder handle existence pre-check warning: ${err.message}`);
    }

    const code = generateCode();

    user.atcoderHandle = cleanHandle;
    user.atcoderVerification = {
        method: "affiliation",
        verificationCode: code,
        verifiedAt: null
    };
    user.atcoderVerificationRequestedAt = new Date();
    await user.save();

    return {
        verificationCode: code,
        settingsUrl: "https://atcoder.jp/settings",
        windowMinutes: VERIFICATION_WINDOW_MS / 60000,
        instructions: `Set your AtCoder Affiliation to "${code}" in your profile settings (https://atcoder.jp/settings) and save, then click Verify within ${VERIFICATION_WINDOW_MS / 60000} minutes.`
    };
}

async function checkVerification(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    if (!user.atcoderHandle || !user.atcoderVerificationRequestedAt) {
        throw new Error("No pending verification for this user — call start-verification first");
    }
    if (user.atcoderConnected) return { verified: true, alreadyConnected: true };

    const requestedAtSec = Math.floor(user.atcoderVerificationRequestedAt.getTime() / 1000);
    const deadlineSec = requestedAtSec + VERIFICATION_WINDOW_MS / 1000;

    if (Date.now() / 1000 > deadlineSec) {
        return {
            verified: false,
            expired: true,
            message: "Verification window expired — request a new code"
        };
    }

    const code = (user.atcoderVerification?.verificationCode || "").toUpperCase();
    let verified = false;

    // Check Affiliation in user profile page
    try {
        const { data: html } = await axios.get(`https://atcoder.jp/users/${encodeURIComponent(user.atcoderHandle)}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            timeout: 15000
        });

        const affMatch = html.match(/Affiliation<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/i);
        const affiliationText = affMatch ? affMatch[1].replace(/<[^>]+>/g, "").trim().toUpperCase() : "";

        if (code && (affiliationText.includes(code) || html.toUpperCase().includes(code))) {
            verified = true;
        }
    } catch (err) {
        console.warn(`AtCoder affiliation check failed: ${err.message}`);
    }

    if (!verified) {
        return {
            verified: false,
            message: `Verification code "${code}" not found in your AtCoder Affiliation (https://atcoder.jp/settings). Make sure you saved your profile settings, then retry.`
        };
    }

    user.atcoderConnected = true;
    user.atcoderConnectedAt = new Date();
    if (!user.atcoderVerification) user.atcoderVerification = {};
    user.atcoderVerification.verifiedAt = new Date();
    await user.save();

    await ScoredSubmission.deleteMany({ userId: user._id, platform: "atcoder" });

    try {
        await refreshAtcoderScore(user);
    } catch (scoreErr) {
        console.error(`Failed to refresh AtCoder score for user ${user._id} after connecting:`, scoreErr.message);
    }

    return { verified: true };
}

module.exports = {
    generateVerificationCode,
    checkVerification
};
