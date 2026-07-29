const crypto = require("crypto");
const axios = require("axios");

const User = require("../models/User");

const BASE_URL =
    "https://alfa-leetcode-api.onrender.com";

const VERIFICATION_WINDOW_MS =
    10 * 60 * 1000;

function generateCode() {

    return (
        "CC-" +
        crypto.randomBytes(4)
            .toString("hex")
            .toUpperCase()
    );

}

async function startVerification(userId, username) {

    const user =
        await User.findById(userId);

    if (!user)
        throw new Error("User not found");

    if (user.lcConnected)
        throw new Error(
            "LeetCode already connected."
        );

    const code = generateCode();

    user.lcUsername = username;

    user.lcVerification = {

        verificationCode: code,

        requestedAt: new Date(),

        verifiedAt: null

    };

    await user.save();

    return {

        verificationCode: code,

        instructions:
            `Paste "${code}" into your LeetCode About section, save your profile, then click Verify.`

    };

}

async function verify(userId) {

    const user =
        await User.findById(userId);

    if (!user)
        throw new Error("User not found");

    if (!user.lcVerification?.requestedAt)
        throw new Error(
            "No pending verification."
        );

    const elapsed =
        Date.now() -
        user.lcVerification.requestedAt.getTime();

    if (elapsed > VERIFICATION_WINDOW_MS) {

        return {

            verified: false,

            expired: true,

            message:
                "Verification expired. Start again."

        };

    }

    const { data } =
        await axios.get(
            `${BASE_URL}/${user.lcUsername}`
        );

    const about =
        (data.about || "").toUpperCase();

    const code =
        user.lcVerification
            .verificationCode
            .toUpperCase();

    if (!about.includes(code)) {

        return {

            verified: false,

            message:
                "Verification code not found."

        };

    }

    user.lcConnected = true;

    user.lcConnectedAt = new Date();

    user.lcVerification.verifiedAt =
        new Date();

    await user.save();

    return {

        verified: true

    };

}

module.exports = {

    startVerification,

    verify

};