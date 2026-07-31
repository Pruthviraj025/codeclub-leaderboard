const mongoose = require("mongoose");

const ScoredSubmissionSchema = new mongoose.Schema({

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },

    platform: {
        type: String,
        enum: ["codeforces", "leetcode"],
        required: true,
        index: true
    },

    // CF -> 1234A
    // LC -> two-sum
    problemId: {
        type: String,
        required: true
    },

    problemName: {
        type: String,
        default: null
    },

    // Codeforces only
    problemRating: {
        type: Number,
        default: null
    },

    // LeetCode only
    difficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard", null],
        default: null
    },

    // LeetCode only — needed by resolveLeetCodePoints() for rescoring
    acceptanceRate: {
        type: Number,
        default: null
    },

    acceptedCount: {
        type: Number,
        default: null
    },

    totalSubmissions: {
        type: Number,
        default: null
    },

    scoringVersion: {
        type: Number,
        default: null
    },

    points: {
        type: Number,
        required: true
    },

    cfSubmissionId: {
        type: Number,
        default: null
    },

    lcSubmissionId: {
        type: String,
        default: null
    },

    solvedAt: {
        type: Date,
        required: true,
        index: true
    },

    reviewStatus: {
        type: String,
        enum: [
            "unreviewed",
            "cleared",
            "flagged"
        ],
        default: "unreviewed"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

},
{
    versionKey: false
});

/*
|--------------------------------------------------------------------------
| Indexes
|--------------------------------------------------------------------------
*/

// User cannot score the same problem twice on the same platform.
ScoredSubmissionSchema.index(
    {
        userId: 1,
        platform: 1,
        problemId: 1
    },
    {
        unique: true
    }
);

// Leaderboard
ScoredSubmissionSchema.index({
    solvedAt: -1
});

ScoredSubmissionSchema.index({
    userId: 1,
    solvedAt: -1
});

ScoredSubmissionSchema.index({
    platform: 1,
    solvedAt: -1
});

module.exports = mongoose.model(
    "ScoredSubmission",
    ScoredSubmissionSchema
);
