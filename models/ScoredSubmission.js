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

    problemId: {
        type: String,
        required: true
    },

    problemName: {
        type: String,
        default: null
    },

    problemRating: {
        type: Number,
        default: null
    },

    difficulty: {
        type: String,
        enum: ["Easy", "Medium", "Hard", null],
        default: null
    },

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
