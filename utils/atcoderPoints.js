const UNRATED_POINTS = 100;

// AtCoder difficulty rating intervals and points
const ATCODER_TIERS = [
    { min: 3000, points: 5500 },
    { min: 2800, points: 5000 },
    { min: 2600, points: 4500 },
    { min: 2400, points: 4000 },
    { min: 2200, points: 3400 },
    { min: 2000, points: 2800 },
    { min: 1800, points: 2400 },
    { min: 1600, points: 2000 },
    { min: 1400, points: 1600 },
    { min: 1200, points: 1300 },
    { min: 1000, points: 1000 },
    { min: 800,  points: 700  },
    { min: 600,  points: 450  },
    { min: 400,  points: 300  },
    { min: 200,  points: 200  },
    { min: 0,    points: 100  }
];

function resolveAtCoderPoints(rating) {
    if (rating == null || isNaN(rating)) {
        return UNRATED_POINTS;
    }

    const num = Number(rating);
    if (num < 200) {
        return UNRATED_POINTS;
    }

    for (const tier of ATCODER_TIERS) {
        if (num >= tier.min) {
            return tier.points;
        }
    }

    return UNRATED_POINTS;
}

module.exports = {
    ATCODER_TIERS,
    UNRATED_POINTS,
    resolveAtCoderPoints
};
