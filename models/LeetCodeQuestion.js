const mongoose = require("mongoose");

const LeetCodeQuestionSchema = new mongoose.Schema({

    titleSlug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },

    title: {
        type: String,
        required: true
    },

    difficulty: {
        type: String,
        enum: [
            "Easy",
            "Medium",
            "Hard"
        ],
        required: true
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

    topicTags: [
        String
    ],

    lastFetchedAt: {
        type: Date,
        default: Date.now,
        index: true
    }

},
{
    versionKey: false
});

module.exports = mongoose.model(
    "LeetCodeQuestion",
    LeetCodeQuestionSchema
);