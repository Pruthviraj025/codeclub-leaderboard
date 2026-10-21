function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function resolveLeetCodePoints(question) {

    if (!question)
        return null;

    const {
        difficulty,
        acceptanceRate,
        totalSubmissions
    } = question;


    let base;

    switch (difficulty) {

        case "Easy":
            base = 200;
            break;

        case "Medium":
            base = 800;
            break;

        case "Hard":
            base = 1700;
            break;

        default:
            return null;

    }


    let acceptanceFactor = 1;

    if (typeof acceptanceRate === "number") {

        acceptanceFactor =
            1 + ((50 - acceptanceRate) / 100);

        acceptanceFactor =
            clamp(
                acceptanceFactor,
                0.80,
                1.40
            );

    }


    let submissionFactor = 1;

    if (
        typeof totalSubmissions === "number" &&
        totalSubmissions > 0
    ) {

        submissionFactor =
            1 +
            (
                Math.log10(
                    50000000 / totalSubmissions
                ) * 0.08
            );

        submissionFactor =
            clamp(
                submissionFactor,
                0.90,
                1.15
            );

    }


    let score =
        base *
        acceptanceFactor *
        submissionFactor;


    score =
        Math.round(score / 100) * 100;


    switch (difficulty) {

        case "Easy":

            score =
                clamp(
                    score,
                    200,
                    400
                );

            break;

        case "Medium":

            score =
                clamp(
                    score,
                    700,
                    1200
                );

            break;

        case "Hard":

            score =
                clamp(
                    score,
                    1500,
                    2500
                );

            break;

    }

    return score;

}

module.exports = {

    resolveLeetCodePoints

};