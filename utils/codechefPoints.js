const UNRATED_POINTS = 100;

// CodeChef rating intervals and points
const CODECHEF_TIERS = [
    { min: 3000, points: 5500 },
    { min: 2900, points: 5000 },
    { min: 2800, points: 4700 },
    { min: 2700, points: 4400 },
    { min: 2600, points: 4100 },
    { min: 2500, points: 3800 },
    { min: 2400, points: 3500 },
    { min: 2300, points: 3200 },
    { min: 2200, points: 2900 },
    { min: 2100, points: 2600 },
    { min: 2000, points: 2300 },
    { min: 1900, points: 2000 },
    { min: 1800, points: 1800 },
    { min: 1700, points: 1500 },
    { min: 1600, points: 1300 },
    { min: 1500, points: 1100 },
    { min: 1400, points: 900 },
    { min: 1300, points: 700 },
    { min: 1200, points: 600 },
    { min: 1100, points: 500 },
    { min: 1000, points: 400 },
    { min: 900, points: 300 },
    { min: 800, points: 250 },
    { min: 700, points: 200 },
    { min: 600, points: 150 },
    { min: 500, points: 100 }
];

function resolveCodeChefPoints(rating) {
    if (rating == null || isNaN(rating) || Number(rating) <= 0) {
        return UNRATED_POINTS;
    }

    const num = Number(rating);
    for (const tier of CODECHEF_TIERS) {
        if (num >= tier.min) {
            return tier.points;
        }
    }

    return UNRATED_POINTS;
}

module.exports = {
    CODECHEF_TIERS,
    UNRATED_POINTS,
    resolveCodeChefPoints
};
