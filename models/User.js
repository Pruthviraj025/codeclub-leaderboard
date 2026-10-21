const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true,
        trim: true
    },

    usn: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    passwordHash: {
        type: String,
        required: true
    },


    resetOtpHash: {
        type: String,
        default: null
    },

    resetOtpExpiry: {
        type: Date,
        default: null
    },

    resetOtpAttempts: {
        type: Number,
        default: 0
    },

    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },

    isActive: {
        type: Boolean,
        default: true,
        index: true
    },


    cfHandle: {
        type: String,
        default: null,
        trim: true
    },

    cfConnected: {
        type: Boolean,
        default: false,
        index: true
    },

    cfConnectedAt: {
        type: Date,
        default: null
    },

    cfVerification: {

        method: {
            type: String,
            default: "compile_error"
        },

        verificationCode: {
            type: String,
            default: null
        },

        verifiedAt: {
            type: Date,
            default: null
        }

    },

    cfVerificationRequestedAt: {
        type: Date,
        default: null
    },

    lastCheckedSubmissionId: {
        type: Number,
        default: null
    },


    lcUsername: {
        type: String,
        default: null,
        trim: true
    },

    lcConnected: {
        type: Boolean,
        default: false,
        index: true
    },

    lcConnectedAt: {
        type: Date,
        default: null
    },

    lcLastSubmissionTimestamp: {
        type: Number,
        default: 0
    },

    lcVerification: {

        verificationCode: {
            type: String,
            default: null
        },

        requestedAt: {
            type: Date,
            default: null
        },

        verifiedAt: {
            type: Date,
            default: null
        }

    },


    lastRefreshAt: {
        type: Date,
        default: null
    },

    lastCfRefreshAt: {
        type: Date,
        default: null
    },

    lastLcRefreshAt: {
        type: Date,
        default: null
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

},
{
    versionKey: false
});


UserSchema.index({
    cfConnected: 1,
    isActive: 1
});

UserSchema.index({
    lcConnected: 1,
    isActive: 1
});

UserSchema.index({
    role: 1
});

module.exports = mongoose.model(
    "User",
    UserSchema
);
