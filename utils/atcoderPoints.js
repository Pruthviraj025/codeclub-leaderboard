const UNRATED_POINTS = 100;

// AtCoder task points -> Leaderboard points
// 100 pt -> 200 pts
// 200 pt -> 400 pts
// 300 pt -> 500 pts
// 400 pt -> 800 pts
// 500 pt -> 1400 pts
// 600 pt -> 2000 pts
// 700 pt -> 2600 pts
// 800 pt -> 3200 pts
// 900 pt -> 3800 pts
// 1000 pt -> 4400 pts
// 1100 pt -> 5000 pts
// 1200+ pt -> 5500 pts
const ATCODER_POINT_TIERS = [
    { min: 1200, points: 5500 },
    { min: 1100, points: 5000 },
    { min: 1000, points: 4400 },
    { min: 900,  points: 3800 },
    { min: 800,  points: 3200 },
    { min: 700,  points: 2600 },
    { min: 600,  points: 2000 },
    { min: 500,  points: 1400 },
    { min: 400,  points: 800  },
    { min: 300,  points: 500  },
    { min: 200,  points: 400  },
    { min: 100,  points: 200  },
    { min: 0,    points: 100  }
];

// Difficulty fallback if task point is unavailable or 0
const ATCODER_DIFFICULTY_TIERS = [
    { min: 2600, points: 5500 },
    { min: 2400, points: 5000 },
    { min: 2200, points: 4400 },
    { min: 2000, points: 3800 },
    { min: 1800, points: 3200 },
    { min: 1600, points: 2600 },
    { min: 1400, points: 2000 },
    { min: 1200, points: 1400 },
    { min: 800,  points: 800  },
    { min: 400,  points: 500  },
    { min: 200,  points: 400  },
    { min: 0,    points: 200  }
];

function resolveAtCoderPoints(taskPoint, difficultyRating) {
    if (taskPoint != null && !isNaN(taskPoint) && Number(taskPoint) > 0) {
        const p = Number(taskPoint);
        for (const tier of ATCODER_POINT_TIERS) {
            if (p >= tier.min) {
                return tier.points;
            }
        }
        return UNRATED_POINTS;
    }

    if (difficultyRating != null && !isNaN(difficultyRating)) {
        const d = Number(difficultyRating);
        for (const tier of ATCODER_DIFFICULTY_TIERS) {
            if (d >= tier.min) {
                return tier.points;
            }
        }
        return UNRATED_POINTS;
    }

    return UNRATED_POINTS;
}

module.exports = {
    ATCODER_POINT_TIERS,
    ATCODER_DIFFICULTY_TIERS,
    UNRATED_POINTS,
    resolveAtCoderPoints
};
