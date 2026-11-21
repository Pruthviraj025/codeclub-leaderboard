const mongoose = require("mongoose");

const AtCoderQuestionSchema = new mongoose.Schema(
    {
        problemId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },

        problemName: {
            type: String,
            default: null
        },

        contestId: {
            type: String,
            default: null
        },

        taskPoints: {
            type: Number,
            default: null
        },

        difficultyRating: {
            type: Number,
            default: null
        },

        points: {
            type: Number,
            required: true
        },

        lastFetchedAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    },
    {
        versionKey: false
    }
);

module.exports = mongoose.model("AtCoderQuestion", AtCoderQuestionSchema);
