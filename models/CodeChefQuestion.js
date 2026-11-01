const mongoose = require("mongoose");

const CodeChefQuestionSchema = new mongoose.Schema(
    {
        problemCode: {
            type: String,
            required: true,
            unique: true,
            index: true,
            uppercase: true,
            trim: true
        },

        problemName: {
            type: String,
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

module.exports = mongoose.model("CodeChefQuestion", CodeChefQuestionSchema);
