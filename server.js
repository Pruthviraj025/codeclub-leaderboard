const dns = require("dns");

dns.setServers(["1.1.1.1", "8.8.8.8"]);

console.log("Node DNS:", dns.getServers());

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const cfRoutes = require("./routes/cf");
const lcRoutes = require("./routes/lc");
const leaderboardRoutes = require("./routes/leaderboard");
const profileRoutes = require("./routes/profile");
const adminRoutes = require("./routes/admin");

const {
    startLeaderboardSync
} = require("./jobs/leaderboardSync");

const app = express();

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(cors());

app.use(express.json());

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/cf", cfRoutes);
app.use("/api/lc", lcRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/api/health", (req, res) => {

    res.json({

        status: "ok",

        message: "CodeClub Leaderboard API is running",

        timestamp: new Date()

    });

});

/*
|--------------------------------------------------------------------------
| 404 Handler
|--------------------------------------------------------------------------
*/

app.use((req, res) => {

    res.status(404).json({

        success: false,

        error: "Route not found"

    });

});

const PORT = process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| Database Connection
|--------------------------------------------------------------------------
*/

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {

        console.log("✅ MongoDB connected");

        app.listen(PORT, () => {

            console.log(
                `🚀 Server running on port ${PORT}`
            );

            console.log(
                `📍 Health: http://localhost:${PORT}/api/health`
            );

            startLeaderboardSync();

            console.log(
                "⏰ Leaderboard auto-sync started (every 15 minutes)"
            );

        });

    })
    .catch(err => {
    console.error("❌ MongoDB connection failed:");
    console.error(err);
    process.exit(1);
});