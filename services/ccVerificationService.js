const User = require("../models/User");
const ScoredSubmission = require("../models/ScoredSubmission");
const { fetchRecentSubmissions, refreshCodechefScore } = require("./codechefService");

const VERIFICATION_PROBLEM_CODE = "TEST";
const VERIFICATION_PROBLEM_URL = "https://www.codechef.com/problems/TEST";
const VERIFICATION_WINDOW_MS = 5 * 60 * 1000;

async function generateVerificationCode(userId, ccHandle) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    if (user.ccConnected) throw new Error("CodeChef account already connected — disconnect your existing account first");

    user.ccHandle = ccHandle.trim();
    user.ccVerification = { method: "compile_error", verifiedAt: null };
    user.ccVerificationRequestedAt = new Date();
    await user.save();

    return {
        problemCode: VERIFICATION_PROBLEM_CODE,
        problemUrl: VERIFICATION_PROBLEM_URL,
        windowMinutes: VERIFICATION_WINDOW_MS / 60000,
        instructions: `Within ${VERIFICATION_WINDOW_MS / 60000} minutes, submit deliberately broken code (e.g. syntax/compilation error) to problem ${VERIFICATION_PROBLEM_CODE} on CodeChef, then click Verify.`
    };
}

async function checkVerification(userId) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");
    if (!user.ccHandle || !user.ccVerificationRequestedAt) {
        throw new Error("No pending verification for this user — call start-verification first");
    }
    if (user.ccConnected) return { verified: true, alreadyConnected: true };

    const requestedAtSec = Math.floor(user.ccVerificationRequestedAt.getTime() / 1000);
    const deadlineSec = requestedAtSec + VERIFICATION_WINDOW_MS / 1000;

    if (Date.now() / 1000 > deadlineSec) {
        return { verified: false, expired: true, message: "Verification window expired — request a new code" };
    }

    const { submissions } = await fetchRecentSubmissions(user.ccHandle, 0);

    // Look for a submission on TEST within the window that failed compilation or gave an error
    const match = submissions.find(s => {
        if (!s.problemCode || s.problemCode.toUpperCase() !== VERIFICATION_PROBLEM_CODE) return false;
        if (!s.isCompileError && s.isAccepted) return false;

        const subSec = s.solvedAt ? Math.floor(s.solvedAt.getTime() / 1000) : 0;
        // Allow a 60-second clock skew margin before requestedAt
        return subSec >= (requestedAtSec - 60) && subSec <= (deadlineSec + 60);
    });

    if (!match) {
        return {
            verified: false,
            message: "No compilation error found on problem TEST submitted within the time window. Make sure you submit broken code and retry."
        };
    }

    user.ccConnected = true;
    user.ccConnectedAt = new Date();
    user.ccVerification.verifiedAt = new Date();
    user.lastCheckedCcSubmissionId = match.submissionId || null;
    await user.save();

    await ScoredSubmission.deleteMany({ userId: user._id, platform: "codechef" });

    try {
        await refreshCodechefScore(user);
    } catch (scoreErr) {
        console.error(`Failed to refresh CodeChef score for user ${user._id} after connecting:`, scoreErr.message);
    }

    return { verified: true };
}

module.exports = {
    generateVerificationCode,
    checkVerification
};
