import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getSessionUser, clearSession } from "../api";

export default function LeaderboardPage() {

    const [data, setData] = useState(null);
    const [loadingBoard, setLoadingBoard] = useState(true);
    const [error, setError] = useState("");
    const [refreshing, setRefreshing] = useState(false);
    const [refreshMsg, setRefreshMsg] = useState("");
    const [showInfo, setShowInfo] = useState(false);

    const user = getSessionUser();
    const navigate = useNavigate();

    useEffect(() => {

        if (!user) {

            navigate("/");
            return;

        }

        loadLeaderboard();

    }, []);

    async function loadLeaderboard() {

        try {

            setLoadingBoard(true);

            const res =
                await api.currentLeaderboard();

            setData(res);

            setError("");

        } catch (err) {

            setError(
                err.message ||
                "Failed to load leaderboard."
            );

        } finally {

            setLoadingBoard(false);

        }

    }

    async function handleRefresh() {

        setRefreshing(true);
        setRefreshMsg("");

        try {

            const res =
                await api.refresh();

            const cf =
                res.codeforces?.pointsAdded || 0;

            const lc =
                res.leetcode?.pointsAdded || 0;

            const total =
                res.totalPointsAdded || 0;

            if (total > 0) {

                setRefreshMsg(

                    `Added ${total} points `
                    + `(CF +${cf}, LC +${lc})`

                );

            } else {

                setRefreshMsg(
                    "No new solves found."
                );

            }

            await loadLeaderboard();

        } catch (err) {

            setRefreshMsg(
                err.message
            );

        } finally {

            setRefreshing(false);

        }

    }

    function handleLogout() {

        clearSession();
        navigate("/");

    }

    if (!user)
        return null;

    return (

        <div style={styles.page}>

            <header
                style={styles.header}
                className="site-header"
            >

                <div style={styles.logoMark}>
                    {"<CODECLUB/>"}
                </div>

                <div
                    style={styles.headerRight}
                    className="header-right"
                >

                    {user.role === "admin" && (

                        <button
                            style={styles.adminBtn}
                            onClick={() => navigate("/admin")}
                        >
                            Admin
                        </button>

                    )}

                    <button
                        style={styles.profileBtn}
                        onClick={() =>
                            navigate(`/profile/${user.id}`)
                        }
                    >
                        My Profile
                    </button>

                    <button
                        style={styles.logoutBtn}
                        onClick={handleLogout}
                    >
                        Log out
                    </button>

                </div>

            </header>

            <main
                style={styles.main}
                className="page-main"
            >

                <div
                    style={styles.titleRow}
                    className="title-row"
                >

                    <div>

                        <div style={styles.eyebrow}>
                            TRAILING 7 DAYS · LIVE STANDINGS
                        </div>

                        <div style={styles.titleWithInfo}>

                            <h1 style={styles.title}>
                                Leaderboard
                            </h1>

                            <button
                                style={styles.infoBtn}
                                onClick={() =>
                                    setShowInfo(true)
                                }
                                title="How scoring works"
                            >
                                i
                            </button>

                        </div>

                    </div>

                    <button
                        style={styles.refreshBtn}
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >

                        {refreshing
                            ? "Refreshing..."
                            : "↻ Refresh"}

                    </button>

                </div>

                {refreshMsg && (

                    <div style={styles.refreshMsg}>
                        {refreshMsg}
                    </div>

                )}

                {error && (

                    <div style={styles.error}>
                        {error}
                    </div>

                )}

                <div style={styles.queue}>

                    <div style={styles.queueHeader}>

                        <span
                            style={{
                                ...styles.col,
                                width: "60px"
                            }}
                        >
                            RANK
                        </span>

                        <span
                            style={{
                                ...styles.col,
                                flex: 1
                            }}
                        >
                            USER
                        </span>

                        <span
                            style={{
                                ...styles.col,
                                width: "110px",
                                textAlign: "right"
                            }}
                        >
                            CF
                        </span>

                        <span
                            style={{
                                ...styles.col,
                                width: "110px",
                                textAlign: "right"
                            }}
                        >
                            LC
                        </span>

                        <span
                            style={{
                                ...styles.col,
                                width: "120px",
                                textAlign: "right"
                            }}
                        >
                            TOTAL
                        </span>

                    </div>

                    {loadingBoard ? (

                        <div style={styles.empty}>
                            Loading standings...
                        </div>

                    ) : data?.leaderboard?.length ? (

                        data.leaderboard.map((row, idx) => (

                            <div
                                key={row.userId}
                                style={{
                                    ...styles.queueRow,
                                    ...(row.userId === user.id
                                        ? styles.queueRowSelf
                                        : {})
                                }}
                                className="row-hover fade-up"
                                onClick={() =>
                                    navigate(
                                        `/profile/${row.userId}`
                                    )
                                }
                            >
                                <span
                                    style={{
                                        ...styles.col,
                                        width: "60px"
                                    }}
                                    className="mono"
                                >
                                    <RankBadge rank={row.rank} />
                                </span>

                                <span
                                    style={{
                                        ...styles.col,
                                        flex: 1,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        minWidth: 0
                                    }}
                                >

                                    {row.cfHandle && (

                                        <a
                                            href={`https://codeforces.com/profile/${row.cfHandle}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={styles.cfIconLink}
                                            title="Open Codeforces"
                                        >
                                            <CfIcon />
                                        </a>

                                    )}

                                    {row.lcUsername && (

                                        <a
                                            href={`https://leetcode.com/${row.lcUsername}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={styles.cfIconLink}
                                            title="Open LeetCode"
                                        >
                                            <LeetCodeIcon />
                                        </a>

                                    )}

                                    <span
                                        className="mono"
                                        style={styles.nameLink}
                                        onClick={(e) => {

                                            e.stopPropagation();

                                            navigate(
                                                `/profile/${row.userId}`
                                            );

                                        }}
                                    >

                                        {row.cfHandle ||
                                            row.lcUsername ||
                                            row.name}

                                    </span>

                                </span>

                                <span
                                    style={{
                                        ...styles.col,
                                        width: "110px",
                                        textAlign: "right",
                                        color: "var(--accent-green)"
                                    }}
                                    className="mono"
                                >
                                    {row.codeforcesPoints}
                                </span>

                                <span
                                    style={{
                                        ...styles.col,
                                        width: "110px",
                                        textAlign: "right",
                                        color: "#FFA116"
                                    }}
                                    className="mono"
                                >
                                    {row.leetcodePoints}
                                </span>

                                <span
                                    style={{
                                        ...styles.col,
                                        width: "120px",
                                        textAlign: "right",
                                        fontWeight: 700,
                                        color: "var(--text)"
                                    }}
                                    className="mono"
                                >
                                    {row.totalPoints}
                                </span>

                            </div>

                        ))

                    ) : (

                        <div style={styles.empty}>
                            No solves recorded in the last 7 days.
                        </div>

                    )}

                </div>

            </main>

            <footer style={styles.footer}>

                <div>
                    made with ❤️ by P T V R J
                </div>

            </footer>

            {showInfo && (

                <InfoModal
                    onClose={() => setShowInfo(false)}
                />

            )}

        </div>

    );

}

const MEDALS = {
    1: "🥇",
    2: "🥈",
    3: "🥉"
};

function RankBadge({ rank }) {

    if (MEDALS[rank]) {

        return (
            <span>
                {MEDALS[rank]}{" "}
                <span
                    style={{
                        color: "var(--text-dim)",
                        fontSize: "11px"
                    }}
                >
                    #{rank}
                </span>
            </span>
        );

    }

    return (

        <span
            style={{
                color: "var(--text-dim)",
                fontWeight: 600
            }}
        >
            #{rank}
        </span>

    );

}

function CfIcon() {

    return (

        <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
        >

            <rect
                x="0.5"
                y="6"
                width="4"
                height="9"
                rx="1.2"
                fill="#FF7F00"
            />

            <rect
                x="6"
                y="3"
                width="4"
                height="12"
                rx="1.2"
                fill="#3776AB"
            />

            <rect
                x="11.5"
                y="0.5"
                width="4"
                height="14.5"
                rx="1.2"
                fill="#1FA83B"
            />

        </svg>

    );

}

function LeetCodeIcon() {

    return (

        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
        >

            <path
                d="M16.5 18.5L21 14l-4.5-4.5"
                stroke="#FFA116"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="M20 14H9"
                stroke="#FFA116"
                strokeWidth="2"
                strokeLinecap="round"
            />

            <path
                d="M10 5L3 12l7 7"
                stroke="#B3B3B3"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

        </svg>

    );

}
// Mirrors backend utils/ratingMap.js
const RATING_MAP = [
    [800, 200],
    [900, 300],
    [1000, 600],
    [1100, 700],
    [1200, 1000],
    [1300, 1100],
    [1400, 1400],
    [1500, 1500],
    [1600, 1800],
    [1700, 1900],
    [1800, 2200],
    [1900, 2300],
    [2000, 2600],
    [2100, 2700],
    [2200, 3000],
    [2300, 3100],
    [2400, 3400],
    [2500, 3500],
    [2600, 3800],
    [2700, 3900],
    [2800, 4200],
    [2900, 4300],
    [3000, 4600],
    [3100, 4700],
    [3200, 5000],
    [3300, 5100],
    [3400, 5400],
    [3500, 5500]
];

const UNRATED_POINTS = 100;

const LEETCODE_POINTS = [

    {
        difficulty: "Easy",
        color: "#4CAF50",
        range: "200–400"
    },

    {
        difficulty: "Medium",
        color: "#FFC107",
        range: "700–1200"
    },

    {
        difficulty: "Hard",
        color: "#F44336",
        range: "1500–2500"
    }

];

function InfoModal({ onClose }) {

    return (

        <div
            style={styles.overlay}
            onClick={onClose}
        >

            <div
                style={styles.modal}
                className="scale-in"
                onClick={(e) => e.stopPropagation()}
            >

                <div style={styles.modalHeader}>

                    <h2 style={styles.modalTitle}>
                        Leaderboard Rules
                    </h2>

                    <button
                        style={styles.closeBtn}
                        onClick={onClose}
                    >
                        ✕
                    </button>

                </div>

                <div style={styles.modalBody}>

                    <section style={styles.section}>

                        <div style={styles.sectionTitle}>
                            Supported Platforms
                        </div>

                        <ul style={styles.list}>

                            <li>
                                Codeforces Accepted submissions are scored.
                            </li>

                            <li>
                                LeetCode Accepted submissions are also scored.
                            </li>

                            <li>
                                Both platforms contribute toward your
                                <strong> Total Points</strong>.
                            </li>

                        </ul>

                    </section>

                    <section style={styles.section}>

                        <div style={styles.sectionTitle}>
                            Codeforces Scoring
                        </div>

                        <ul style={styles.list}>

                            <li>
                                Every problem is scored using its official
                                Codeforces rating.
                            </li>

                            <li>
                                Each problem is counted only once.
                            </li>

                            <li>
                                Re-submitting an already solved problem
                                gives no additional points.
                            </li>

                            <li>
                                Unrated problems award
                                <strong> {UNRATED_POINTS} </strong>
                                points.
                            </li>

                        </ul>

                    </section>

                    <section style={styles.section}>

                        <div style={styles.sectionTitle}>
                            LeetCode Scoring
                        </div>

                        <ul style={styles.list}>

                            <li>
                                Only <strong>Accepted</strong> submissions are scored.
                            </li>

                            <li>
                                Every LeetCode problem awards points only once.
                            </li>

                            <li>
                                Solving the same problem again does not award additional points.
                            </li>

                            <li>
                                Points are determined using:
                                <ul
                                    style={{
                                        marginTop: "8px",
                                        paddingLeft: "20px"
                                    }}
                                >
                                    <li>Difficulty</li>
                                    <li>Acceptance Rate</li>
                                    <li>Problem Popularity</li>
                                </ul>
                            </li>

                            <li>
                                Final scores are rounded to the nearest
                                <strong> 100 </strong>
                                points.
                            </li>

                        </ul>

                    </section>

                    <section style={styles.section}>

                        <div style={styles.sectionTitle}>
                            Rolling Leaderboard
                        </div>

                        <ul style={styles.list}>

                            <li>
                                The leaderboard always shows
                                <strong> the last 7 days </strong>
                                of activity.
                            </li>

                            <li>
                                There is no weekly reset.
                            </li>

                            <li>
                                Older submissions naturally disappear
                                after seven days.
                            </li>

                            <li>
                                Refresh your profile whenever you solve
                                new problems.
                            </li>

                        </ul>

                    </section>

                    <section style={styles.section}>

                        <div style={styles.sectionTitle}>
                            Codeforces Rating → Points
                        </div>

                        <div style={styles.ratingGrid}>

                            <div style={styles.ratingCell}>

                                <span
                                    className="mono"
                                    style={styles.ratingNum}
                                >
                                    unrated
                                </span>

                                <span
                                    className="mono"
                                    style={styles.ratingPts}
                                >
                                    {UNRATED_POINTS}
                                </span>

                            </div>

                            {RATING_MAP.map(([rating, points]) => (

                                <div
                                    key={rating}
                                    style={styles.ratingCell}
                                >

                                    <span
                                        className="mono"
                                        style={styles.ratingNum}
                                    >
                                        {rating}
                                    </span>

                                    <span
                                        className="mono"
                                        style={styles.ratingPts}
                                    >
                                        {points}
                                    </span>

                                </div>

                            ))}

                        </div>

                    </section>

                    <section style={styles.section}>

    <div style={styles.sectionTitle}>
        LeetCode Difficulty → Possible Points
    </div>

    <div style={styles.lcGrid}>

        {LEETCODE_POINTS.map(item => (

            <div
                key={item.difficulty}
                style={styles.ratingCell}
            >

                <span
                    className="mono"
                    style={styles.ratingNum}
                >
                    {item.difficulty}
                </span>

                <span
                    className="mono"
                    style={{
                        ...styles.ratingPts,
                        color: item.color
                    }}
                >
                    {item.range}
                </span>
                

            </div>

        ))}
        

    </div>

    <div
    style={{
        marginTop: "16px",
        color: "var(--text-dim)",
        lineHeight: 1.8,
        fontSize: "14px"
    }}
>

    <strong>Scoring Formula</strong>

    <div
        className="mono"
        style={{
            marginTop: "10px",
            padding: "12px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-raised)",
            overflowX: "auto"
        }}
    >

        Final Score =
        Base Score ×
        Acceptance Factor ×
        Submission Factor

        <br /><br />

        Acceptance Factor =
        1 + (50 − Acceptance Rate) / 100

        <br />

        Submission Factor =
        1 + log₁₀(50,000,000 / Total Submissions) × 0.08

        <br /><br />

        Final Score =
        Round to nearest 100

        <br />

        Clamp to the range shown above.

    </div>

</div>

    <div
        style={{
            marginTop: 14,
            color: "var(--text-dim)",
            lineHeight: 1.7
        }}
    >
        Points depend on the problem's
        <strong> difficulty</strong>,
        <strong> acceptance rate</strong>,
        and
        <strong> popularity</strong>.
        <br />
        Scores are rounded to the nearest
        <strong> 100</strong>.
    </div>

</section>

                </div>

            </div>

        </div>

    );

}
const styles = {

    page: {
        minHeight: "100vh"
    },

    footer: {
        textAlign: "center",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        color: "var(--text-dim)",
        padding: "var(--space-4) 0",
        lineHeight: 1.8
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "var(--space-3) var(--space-5)",
        borderBottom: "1px solid var(--border)"
    },

    logoMark: {
        fontFamily: "var(--font-mono)",
        fontSize: "14px",
        color: "var(--accent-green)",
        letterSpacing: "1px"
    },

    headerRight: {
        display: "flex",
        gap: "var(--space-2)",
        flexWrap: "wrap"
    },

    adminBtn: {
        background: "var(--accent-gold-dim)",
        border: "1px solid var(--accent-gold)",
        color: "var(--accent-gold)",
        borderRadius: "var(--radius-sm)",
        padding: "8px 14px",
        cursor: "pointer"
    },

    profileBtn: {
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        color: "var(--text)",
        borderRadius: "var(--radius-sm)",
        padding: "8px 14px",
        cursor: "pointer"
    },

    logoutBtn: {
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--text-dim)",
        borderRadius: "var(--radius-sm)",
        padding: "8px 14px",
        cursor: "pointer"
    },

    main: {
        maxWidth: "960px",
        margin: "0 auto",
        padding: "var(--space-5) var(--space-4)"
    },

    titleRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: "20px",
        flexWrap: "wrap",
        marginBottom: "var(--space-3)"
    },

    eyebrow: {
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        color: "var(--accent-green)",
        letterSpacing: "2px"
    },

    titleWithInfo: {
        display: "flex",
        alignItems: "center",
        gap: "10px"
    },

    title: {
        margin: 0,
        fontSize: "30px"
    },

    infoBtn: {
        width: "22px",
        height: "22px",
        borderRadius: "50%",
        border: "1px solid var(--border)",
        background: "var(--surface-raised)",
        color: "var(--text-dim)",
        cursor: "pointer"
    },

    refreshBtn: {
        background: "var(--surface-raised)",
        border: "1px solid var(--accent-green)",
        color: "var(--accent-green)",
        borderRadius: "var(--radius-sm)",
        padding: "10px 18px",
        fontFamily: "var(--font-mono)",
        cursor: "pointer"
    },

    refreshMsg: {
        marginBottom: "16px",
        fontFamily: "var(--font-mono)",
        color: "var(--accent-gold)"
    },

    error: {
        marginBottom: "16px",
        color: "var(--accent-red)",
        fontFamily: "var(--font-mono)"
    },

    queue: {
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        overflow: "hidden"
    },

    queueHeader: {
        display: "flex",
        alignItems: "center",
        padding: "12px 16px",
        background: "var(--surface-raised)",
        borderBottom: "1px solid var(--border)"
    },

    queueRow: {
        display: "flex",
        alignItems: "center",
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        cursor: "pointer",
        transition: "0.2s"
    },

    queueRowSelf: {
        background: "var(--accent-green-dim)"
    },

    col: {
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        color: "var(--text-dim)"
    },

    cfIconLink: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
    },

    nameLink: {
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        color: "var(--text)"
    },

    empty: {
        padding: "40px",
        textAlign: "center",
        color: "var(--text-dim)",
        fontFamily: "var(--font-mono)"
    },

    overlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100
    },

    modal: {
        width: "min(700px,95vw)",
        maxHeight: "90vh",
        overflowY: "auto",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)"
    },

    modalHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px",
        borderBottom: "1px solid var(--border)"
    },

    modalTitle: {
        margin: 0
    },

    closeBtn: {
        background: "transparent",
        border: "none",
        color: "var(--text-dim)",
        cursor: "pointer",
        fontSize: "18px"
    },

    modalBody: {
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
    },

    section: {},

    sectionTitle: {
        color: "var(--accent-green)",
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        marginBottom: "10px",
        letterSpacing: "1px"
    },

    list: {
        margin: 0,
        paddingLeft: "18px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        lineHeight: 1.6
    },

    ratingGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(80px,1fr))",
        gap: "8px"
    },

    ratingCell: {
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "8px",
        textAlign: "center",
        background: "var(--surface-raised)"
    },

    ratingNum: {
        display: "block",
        color: "var(--text-dim)",
        fontSize: "11px"
    },

    ratingPts: {
        display: "block",
        color: "var(--accent-green)",
        fontWeight: 700,
        marginTop: "2px"
    },

    lcGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: "10px",
    marginTop: "12px"
    },

};