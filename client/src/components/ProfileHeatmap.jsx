import { useMemo, useState, useRef, useEffect } from "react";

// Platform-specific colour shades matching the Homepage buttons:
// Codeforces: Blue (#7DD3FC / #38BDF8)
// LeetCode: Orange (#FB923C / #EA580C)
// CodeChef: Purple (#D8B4FE / #C084FC)
// Activity tiers: light (1 solve), dark (2 solves), darker (3+ solves)
const COLOR_EMPTY = "rgba(255, 255, 255, 0.035)";
const BORDER_EMPTY = "rgba(255, 255, 255, 0.065)";

const PALETTES = {
    cf: {
        // Codeforces Blue
        light: { bg: "rgba(56, 189, 248, 0.4)", border: "rgba(56, 189, 248, 0.65)", glow: "#38BDF8" },
        dark: { bg: "#38BDF8", border: "#0284C7", glow: "#38BDF8" },
        darker: { bg: "#0284C7", border: "#7DD3FC", glow: "#0284C7" }
    },
    lc: {
        // LeetCode Orange
        light: { bg: "rgba(251, 146, 60, 0.45)", border: "rgba(251, 146, 60, 0.7)", glow: "#FB923C" },
        dark: { bg: "#FB923C", border: "#EA580C", glow: "#FB923C" },
        darker: { bg: "#EA580C", border: "#FED7AA", glow: "#EA580C" }
    },
    cc: {
        // CodeChef Purple
        light: { bg: "rgba(192, 132, 252, 0.4)", border: "rgba(192, 132, 252, 0.65)", glow: "#C084FC" },
        dark: { bg: "#C084FC", border: "#9333EA", glow: "#C084FC" },
        darker: { bg: "#9333EA", border: "#E9D5FF", glow: "#9333EA" }
    },
    twoPlats: {
        // 2 Platforms (Soft Aqua/Teal)
        light: { bg: "rgba(94, 234, 212, 0.45)", border: "rgba(94, 234, 212, 0.7)", glow: "#5EEAD4" },
        dark: { bg: "#2DD4BF", border: "#0D9488", glow: "#2DD4BF" },
        darker: { bg: "#0D9488", border: "#5EEAD4", glow: "#0D9488" }
    },
    threePlats: {
        // 3 Platforms (Emerald Green)
        light: { bg: "rgba(52, 211, 153, 0.45)", border: "rgba(52, 211, 153, 0.7)", glow: "#34D399" },
        dark: { bg: "#34D399", border: "#059669", glow: "#34D399" },
        darker: { bg: "#059669", border: "#A7F3D0", glow: "#059669" }
    }
};

const COLOR_CF = "#7DD3FC";
const COLOR_LC = "#FB923C";
const COLOR_CC = "#D8B4FE";
const COLOR_2PLATS = "#5EEAD4";
const COLOR_3PLATS = "#34D399";

function getShadeKey(count) {
    if (count <= 1) return "light";
    if (count === 2) return "dark";
    return "darker";
}

function formatShortDate(d) {
    if (!d) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRangeText(start, end) {
    if (!start || !end) return "";
    const sStr = formatShortDate(start);
    const eStr = formatShortDate(end);
    if (sStr === eStr) return sStr;
    return `${sStr} – ${eStr}`;
}

export default function ProfileHeatmap({ activityMap = {}, userCreatedAt = null }) {
    const cardRef = useRef(null);
    const scrollWrapperRef = useRef(null);
    const [selectedYear, setSelectedYear] = useState("current");
    const [hoveredCell, setHoveredCell] = useState(null);

    // Compute available years: ONLY from the year they registered on the leaderboard up to current year
    const availableYears = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();

        let startYear = currentYear;
        if (userCreatedAt) {
            const parsed = new Date(userCreatedAt).getFullYear();
            if (parsed && !isNaN(parsed) && parsed <= currentYear) {
                startYear = parsed;
            }
        }

        const years = [];
        for (let y = currentYear; y >= startYear; y--) {
            years.push(String(y));
        }

        return ["current", ...years];
    }, [userCreatedAt]);

    // On mount or year switch, auto-scroll to the latest days (far right) for 'current' on mobile/narrow screens
    useEffect(() => {
        if (scrollWrapperRef.current) {
            if (selectedYear === "current") {
                scrollWrapperRef.current.scrollLeft = scrollWrapperRef.current.scrollWidth;
            } else {
                scrollWrapperRef.current.scrollLeft = 0;
            }
        }
    }, [selectedYear]);

    // Build the calendar grid and calculate all streak & activity statistics according to the selected year
    const {
        weeks,
        monthLabels,
        totalSolves,
        activeDays,
        totalDaysInRange,
        currentStreak,
        currentStreakStart,
        currentStreakEnd,
        longestStreak,
        longestStreakStart,
        longestStreakEnd,
        platformTotals
    } = useMemo(() => {
        const now = new Date();
        const currentYear = now.getFullYear();

        let startDate, endDate;

        if (selectedYear === "current") {
            // Rolling 52 full weeks up to today
            const today = new Date(now);
            today.setHours(23, 59, 59, 999);
            const dayOfWeek = today.getDay(); // 0 is Sunday
            const totalDays = 52 * 7 + dayOfWeek + 1;

            startDate = new Date(today);
            startDate.setDate(today.getDate() - totalDays + 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = today;
        } else {
            const y = parseInt(selectedYear, 10);
            startDate = new Date(y, 0, 1, 0, 0, 0, 0); // Jan 1 of that year
            if (y === currentYear) {
                // Current year: up to today
                const today = new Date(now);
                today.setHours(23, 59, 59, 999);
                endDate = today;
            } else {
                // Historical year: full year ending Dec 31
                endDate = new Date(y, 11, 31, 23, 59, 59, 999);
            }
        }

        // Align startDate to Sunday for visual calendar columns
        const startDay = new Date(startDate);
        while (startDay.getDay() !== 0) {
            startDay.setDate(startDay.getDate() - 1);
        }

        const formatYMD = (d) => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };

        const weeksList = [];
        let currentWeek = [];
        const monthPositions = [];
        let lastMonth = -1;

        let total = 0;
        let activeDaysCount = 0;
        let cfTotal = 0;
        let lcTotal = 0;
        let ccTotal = 0;

        const cursor = new Date(startDay);
        let colIndex = 0;

        while (cursor <= endDate) {
            const dateStr = formatYMD(cursor);
            const emptyDay = { total: 0, codeforces: 0, leetcode: 0, codechef: 0 };
            // Server buckets by local date key
            const inRange = cursor >= startDate && cursor <= endDate;
            const dayData = inRange ? (activityMap[dateStr] || emptyDay) : emptyDay;

            if (inRange) {
                const daySolves = dayData.total || 0;
                total += daySolves;
                if (daySolves > 0) {
                    activeDaysCount++;
                }
                cfTotal += dayData.codeforces || 0;
                lcTotal += dayData.leetcode || 0;
                ccTotal += dayData.codechef || 0;
            }

            const currentMonth = cursor.getMonth();
            if (currentMonth !== lastMonth && cursor.getDate() <= 7) {
                const monthName = cursor.toLocaleDateString("en-US", { month: "short" });
                monthPositions.push({ colIndex, label: monthName });
                lastMonth = currentMonth;
            }

            currentWeek.push({
                dateStr,
                date: new Date(cursor),
                dayOfWeek: cursor.getDay(),
                total: dayData.total || 0,
                codeforces: dayData.codeforces || 0,
                leetcode: dayData.leetcode || 0,
                codechef: dayData.codechef || 0,
                inRange
            });

            if (currentWeek.length === 7) {
                weeksList.push(currentWeek);
                currentWeek = [];
                colIndex++;
            }

            cursor.setDate(cursor.getDate() + 1);
        }

        if (currentWeek.length > 0) {
            weeksList.push(currentWeek);
        }

        const totalDaysCount = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        // --- STREAK CALCULATIONS ---
        // 1. Longest Streak in the active period (startDate to endDate)
        let maxStreak = 0;
        let maxStart = null;
        let maxEnd = null;

        let tempStreak = 0;
        let tempStart = null;

        const streakScan = new Date(startDate);
        while (streakScan <= endDate) {
            const dStr = formatYMD(streakScan);
            const daySolves = activityMap[dStr]?.total || 0;

            if (daySolves > 0) {
                if (tempStreak === 0) {
                    tempStart = new Date(streakScan);
                }
                tempStreak++;
                if (tempStreak > maxStreak) {
                    maxStreak = tempStreak;
                    maxStart = new Date(tempStart);
                    maxEnd = new Date(streakScan);
                }
            } else {
                tempStreak = 0;
                tempStart = null;
            }
            streakScan.setDate(streakScan.getDate() + 1);
        }

        // 2. Current Streak (anchored at today, with ongoing-day buffer for yesterday)
        let currStreak = 0;
        let currStart = null;
        let currEnd = null;

        const isViewingCurrent = selectedYear === "current" || parseInt(selectedYear, 10) === currentYear;

        if (isViewingCurrent) {
            const todayDate = new Date(now);
            todayDate.setHours(0, 0, 0, 0);

            const todayStr = formatYMD(todayDate);
            const todayCount = activityMap[todayStr]?.total || 0;

            let checkCursor = new Date(todayDate);
            if (todayCount === 0) {
                // If today has no submissions yet, check if yesterday was active
                checkCursor.setDate(checkCursor.getDate() - 1);
            }

            const anchorStr = formatYMD(checkCursor);
            if ((activityMap[anchorStr]?.total || 0) > 0) {
                currEnd = new Date(checkCursor);
                while ((activityMap[formatYMD(checkCursor)]?.total || 0) > 0) {
                    currStreak++;
                    currStart = new Date(checkCursor);
                    checkCursor.setDate(checkCursor.getDate() - 1);
                }
            }
        }

        return {
            weeks: weeksList,
            monthLabels: monthPositions,
            totalSolves: total,
            activeDays: activeDaysCount,
            totalDaysInRange: totalDaysCount,
            currentStreak: currStreak,
            currentStreakStart: currStart,
            currentStreakEnd: currEnd,
            longestStreak: maxStreak,
            longestStreakStart: maxStart,
            longestStreakEnd: maxEnd,
            platformTotals: {
                cf: cfTotal,
                lc: lcTotal,
                cc: ccTotal
            }
        };
    }, [activityMap, selectedYear]);

    function getCellMeta(day) {
        if (!day || !day.total || day.total === 0) {
            return {
                bg: COLOR_EMPTY,
                border: BORDER_EMPTY,
                label: "No solves"
            };
        }

        const hasCf = day.codeforces > 0;
        const hasLc = day.leetcode > 0;
        const hasCc = day.codechef > 0;
        const activeCount = (hasCf ? 1 : 0) + (hasLc ? 1 : 0) + (hasCc ? 1 : 0);

        // Light for 1 question, Dark for 2 questions, Darker for 3+ questions
        const shade = getShadeKey(day.total);

        if (activeCount >= 3) {
            return {
                ...PALETTES.threePlats[shade],
                label: "3 Platforms"
            };
        }

        if (activeCount === 2) {
            return {
                ...PALETTES.twoPlats[shade],
                label: "2 Platforms"
            };
        }

        // Exactly 1 platform
        if (hasCf) {
            return {
                ...PALETTES.cf[shade],
                label: "Codeforces"
            };
        }
        if (hasLc) {
            return {
                ...PALETTES.lc[shade],
                label: "LeetCode"
            };
        }
        if (hasCc) {
            return {
                ...PALETTES.cc[shade],
                label: "CodeChef"
            };
        }

        return {
            bg: COLOR_EMPTY,
            border: BORDER_EMPTY,
            label: "No solves"
        };
    }

    // Calculate tooltip positioning and arrow offset inside the card
    let tooltipLeft = hoveredCell ? hoveredCell.x : 0;
    let arrowOffset = 0;
    if (hoveredCell && cardRef.current) {
        const cardWidth = cardRef.current.offsetWidth || 350;
        const tooltipWidth = Math.min(225, Math.max(160, cardWidth - 24));
        const halfWidth = tooltipWidth / 2;
        const minCenter = halfWidth + 8;
        const maxCenter = Math.max(minCenter, cardWidth - halfWidth - 8);

        const clampedCenter = Math.max(minCenter, Math.min(maxCenter, hoveredCell.x));
        tooltipLeft = clampedCenter;
        const rawOffset = hoveredCell.x - clampedCenter;
        arrowOffset = Math.max(-halfWidth + 14, Math.min(halfWidth - 14, rawOffset));
    }

    return (
        <div
            ref={cardRef}
            className="profile-heatmap-card fade-up"
            onClick={() => {
                // Dismiss tooltip on mobile tap outside cell
                if (hoveredCell) setHoveredCell(null);
            }}
        >
            <style>{`
                .profile-heatmap-card {
                    padding: 26px 28px;
                    position: relative;
                    background: rgba(10, 13, 19, 0.72);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px;
                    margin-top: 24px;
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
                }
                .profile-heatmap-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .profile-heatmap-stats-bar {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 12px;
                    margin-bottom: 22px;
                }
                .profile-heatmap-stat-box {
                    background: rgba(255, 255, 255, 0.025);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                    border-radius: 12px;
                    padding: 12px 14px;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    min-height: 84px;
                    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                                border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                                background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                                box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    will-change: transform, box-shadow;
                }
                .profile-heatmap-stat-box:hover {
                    transform: translateY(-2px);
                }
                .profile-heatmap-stat-box:active {
                    transform: translateY(0px) scale(0.99);
                }

                .stat-box-current-streak {
                    background: rgba(251, 146, 60, 0.035);
                    border-color: rgba(251, 146, 60, 0.16);
                }
                .stat-box-current-streak:hover {
                    background: rgba(251, 146, 60, 0.075) !important;
                    border-color: rgba(251, 146, 60, 0.42) !important;
                    box-shadow: 0 10px 24px rgba(251, 146, 60, 0.12), inset 0 1px 0 rgba(251, 146, 60, 0.15) !important;
                }

                .stat-box-longest-streak {
                    background: rgba(252, 211, 77, 0.035);
                    border-color: rgba(252, 211, 77, 0.16);
                }
                .stat-box-longest-streak:hover {
                    background: rgba(252, 211, 77, 0.075) !important;
                    border-color: rgba(252, 211, 77, 0.42) !important;
                    box-shadow: 0 10px 24px rgba(252, 211, 77, 0.12), inset 0 1px 0 rgba(252, 211, 77, 0.15) !important;
                }

                .stat-box-active-days {
                    background: rgba(94, 234, 212, 0.035);
                    border-color: rgba(94, 234, 212, 0.16);
                }
                .stat-box-active-days:hover {
                    background: rgba(94, 234, 212, 0.075) !important;
                    border-color: rgba(94, 234, 212, 0.42) !important;
                    box-shadow: 0 10px 24px rgba(94, 234, 212, 0.12), inset 0 1px 0 rgba(94, 234, 212, 0.15) !important;
                }

                .stat-box-solves {
                    background: rgba(192, 132, 252, 0.035);
                    border-color: rgba(192, 132, 252, 0.16);
                }
                .stat-box-solves:hover {
                    background: rgba(192, 132, 252, 0.075) !important;
                    border-color: rgba(192, 132, 252, 0.42) !important;
                    box-shadow: 0 10px 24px rgba(192, 132, 252, 0.12), inset 0 1px 0 rgba(192, 132, 252, 0.15) !important;
                }

                .profile-year-select {
                    appearance: none;
                    -webkit-appearance: none;
                    -moz-appearance: none;
                    background: rgba(10, 13, 19, 0.72);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 8px;
                    color: #fff;
                    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 12.5px;
                    font-weight: 500;
                    padding: 6px 26px 6px 12px;
                    cursor: pointer;
                    outline: none;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .profile-year-select:hover {
                    background: rgba(20, 26, 38, 0.9);
                    border-color: rgba(94, 234, 212, 0.45);
                    box-shadow: 0 4px 14px rgba(94, 234, 212, 0.15);
                }
                .profile-year-select:focus,
                .profile-year-select:active {
                    border-color: #5EEAD4;
                    box-shadow: 0 0 0 2px rgba(94, 234, 212, 0.25);
                }

                .profile-stat-platform-pill {
                    transition: all 0.15s ease;
                    cursor: default;
                }
                .profile-stat-platform-pill:hover {
                    filter: brightness(1.2);
                    transform: translateY(-1px);
                }
                .profile-stat-platform-pill:active {
                    transform: translateY(0);
                }

                .profile-legend-item {
                    transition: all 0.15s ease;
                    cursor: default;
                }
                .profile-legend-item:hover {
                    filter: brightness(1.2);
                }

                .profile-cell-interactive:active {
                    transform: scale(1.3) !important;
                }

                .profile-heatmap-controls {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .profile-heatmap-scroll {
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                    padding-bottom: 6px;
                    scrollbar-width: thin;
                    scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
                }
                .profile-heatmap-scroll::-webkit-scrollbar {
                    height: 4px;
                }
                .profile-heatmap-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .profile-heatmap-scroll::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.18);
                    border-radius: 4px;
                }
                .profile-heatmap-mobile-cue {
                    display: none;
                }
                @media (max-width: 860px) {
                    .profile-heatmap-stats-bar {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 10px;
                    }
                }
                @media (max-width: 640px) {
                    .profile-heatmap-card {
                        padding: 18px 14px !important;
                        margin-top: 18px !important;
                    }
                    .profile-heatmap-header {
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        gap: 12px !important;
                    }
                    .profile-heatmap-controls {
                        justify-content: flex-end !important;
                    }
                    .profile-heatmap-mobile-cue {
                        display: flex;
                        align-items: center;
                        justify-content: flex-end;
                        gap: 4px;
                        font-size: 11px;
                        color: rgba(255, 255, 255, 0.5);
                        font-family: 'Space Grotesk', sans-serif;
                        margin-bottom: 6px;
                    }
                }
                @media (max-width: 480px) {
                    .profile-heatmap-stats-bar {
                        grid-template-columns: 1fr;
                        gap: 8px;
                    }
                }
            `}</style>

            <div className="profile-heatmap-header">
                <div>
                    <div style={styles.eyebrow}>ACTIVITY HEATMAP</div>
                    <div style={styles.subtitle}>
                        {totalSolves} accepted problem{totalSolves === 1 ? "" : "s"} {selectedYear === "current" ? "in the past year" : `in ${selectedYear}`}
                    </div>
                </div>

                <div className="profile-heatmap-controls">
                    {/* Year selector dropdown */}
                    <div style={styles.yearSelectWrap}>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="profile-year-select"
                            aria-label="Select year"
                        >
                            {availableYears.map(y => (
                                <option key={y} value={y} style={styles.yearOption}>
                                    {y === "current" ? "Current" : y}
                                </option>
                            ))}
                        </select>
                        <span style={styles.yearSelectArrow}>▾</span>
                    </div>
                </div>
            </div>

            {/* Streak & Activity Information Bar */}
            <div className="profile-heatmap-stats-bar">
                {/* 1. Current Streak */}
                <div className="profile-heatmap-stat-box stat-box-current-streak">
                    <div style={styles.statBoxHeader}>
                        <span style={{ ...styles.statBoxLabel, color: "#FB923C" }}>CURRENT STREAK</span>
                        <span style={{ fontSize: "14px" }}>🔥</span>
                    </div>
                    <div style={{ ...styles.statBoxValue, color: currentStreak > 0 ? "#FB923C" : "rgba(255, 255, 255, 0.45)" }}>
                        {currentStreak} <span style={styles.statBoxUnit}>{currentStreak === 1 ? "day" : "days"}</span>
                    </div>
                    <div style={styles.statBoxCaption}>
                        {currentStreak > 0 ? formatRangeText(currentStreakStart, currentStreakEnd) : "No active streak"}
                    </div>
                </div>

                {/* 2. Longest Streak */}
                <div className="profile-heatmap-stat-box stat-box-longest-streak">
                    <div style={styles.statBoxHeader}>
                        <span style={{ ...styles.statBoxLabel, color: "#FCD34D" }}>LONGEST STREAK</span>
                        <span style={{ fontSize: "14px" }}>⚡</span>
                    </div>
                    <div style={{ ...styles.statBoxValue, color: longestStreak > 0 ? "#FCD34D" : "rgba(255, 255, 255, 0.45)" }}>
                        {longestStreak} <span style={styles.statBoxUnit}>{longestStreak === 1 ? "day" : "days"}</span>
                    </div>
                    <div style={styles.statBoxCaption}>
                        {longestStreak > 0 ? formatRangeText(longestStreakStart, longestStreakEnd) : "No streak in range"}
                    </div>
                </div>

                {/* 3. Active Days */}
                <div className="profile-heatmap-stat-box stat-box-active-days">
                    <div style={styles.statBoxHeader}>
                        <span style={{ ...styles.statBoxLabel, color: "#5EEAD4" }}>ACTIVE DAYS</span>
                        <span style={{ fontSize: "14px" }}>📅</span>
                    </div>
                    <div style={{ ...styles.statBoxValue, color: activeDays > 0 ? "#5EEAD4" : "rgba(255, 255, 255, 0.45)" }}>
                        {activeDays} <span style={styles.statBoxUnit}>{activeDays === 1 ? "day" : "days"}</span>
                    </div>
                    <div style={styles.statBoxCaption}>
                        {totalDaysInRange > 0 ? `${activeDays} of ${totalDaysInRange} days (${Math.round((activeDays / totalDaysInRange) * 100)}%)` : "Days with submissions"}
                    </div>
                </div>

                {/* 4. Solves Breakdown */}
                <div className="profile-heatmap-stat-box stat-box-solves">
                    <div style={styles.statBoxHeader}>
                        <span style={{ ...styles.statBoxLabel, color: "#D8B4FE" }}>PLATFORM SOLVES</span>
                        <span style={{ fontSize: "14px" }}>🎯</span>
                    </div>
                    <div style={{ ...styles.statBoxValue, color: "#FFFFFF" }}>
                        {totalSolves} <span style={styles.statBoxUnit}>{totalSolves === 1 ? "solve" : "solves"}</span>
                    </div>
                    <div style={styles.statBoxPlatformPills}>
                        <span className="profile-stat-platform-pill" style={{ ...styles.statPlatformPill, color: COLOR_CF, borderColor: "rgba(56, 189, 248, 0.3)" }}>
                            CF {platformTotals.cf}
                        </span>
                        <span className="profile-stat-platform-pill" style={{ ...styles.statPlatformPill, color: COLOR_LC, borderColor: "rgba(251, 146, 60, 0.3)" }}>
                            LC {platformTotals.lc}
                        </span>
                        <span className="profile-stat-platform-pill" style={{ ...styles.statPlatformPill, color: COLOR_CC, borderColor: "rgba(192, 132, 252, 0.3)" }}>
                            CC {platformTotals.cc}
                        </span>
                    </div>
                </div>
            </div>

            {/* Mobile Swipe Cue */}
            <div className="profile-heatmap-mobile-cue">
                <span>◀ swipe to view full year ▶</span>
            </div>

            {/* Scrollable calendar view */}
            <div
                ref={scrollWrapperRef}
                style={styles.scrollWrapper}
                className="profile-heatmap-scroll custom-heatmap-scroll"
            >
                <div style={styles.gridContainer}>
                    {/* Month labels along the top */}
                    <div style={styles.monthRow}>
                        <div style={{ width: "24px" }} /> {/* spacer for weekday labels */}
                        <div style={styles.monthLabelsTrack}>
                            {monthLabels.map((m, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        position: "absolute",
                                        left: `${m.colIndex * 13}px`,
                                        fontSize: "12px",
                                        color: "rgba(255, 255, 255, 0.6)",
                                        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                                    }}
                                >
                                    {m.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={styles.bodyRow}>
                        {/* Weekday indicators */}
                        <div style={styles.weekdayCol}>
                            <span style={styles.weekdayLabel}></span>
                            <span style={styles.weekdayLabel}>Mon</span>
                            <span style={styles.weekdayLabel}></span>
                            <span style={styles.weekdayLabel}>Wed</span>
                            <span style={styles.weekdayLabel}></span>
                            <span style={styles.weekdayLabel}>Fri</span>
                            <span style={styles.weekdayLabel}></span>
                        </div>

                        {/* Weeks columns */}
                        <div style={styles.weeksTrack}>
                            {weeks.map((week, wIdx) => (
                                <div key={wIdx} style={styles.weekColumn}>
                                    {week.map((day, dIdx) => {
                                        const meta = getCellMeta(day);
                                        const isHovered = hoveredCell && hoveredCell.day.dateStr === day.dateStr;

                                        return (
                                            <div
                                                key={dIdx}
                                                className="profile-cell-interactive"
                                                style={{
                                                    ...styles.cell,
                                                    background: meta.bg,
                                                    border: `1px solid ${meta.border}`,
                                                    transform: isHovered ? "scale(1.4)" : "scale(1)",
                                                    zIndex: isHovered ? 10 : 1,
                                                    boxShadow: isHovered ? `0 0 10px ${meta.glow || meta.bg}` : "none"
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!cardRef.current) return;
                                                    const cellRect = e.currentTarget.getBoundingClientRect();
                                                    const cardRect = cardRef.current.getBoundingClientRect();
                                                    setHoveredCell({
                                                        day,
                                                        meta,
                                                        x: cellRect.left - cardRect.left + cellRect.width / 2,
                                                        y: cellRect.top - cardRect.top
                                                    });
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!cardRef.current) return;
                                                    const cellRect = e.currentTarget.getBoundingClientRect();
                                                    const cardRect = cardRef.current.getBoundingClientRect();
                                                    setHoveredCell({
                                                        day,
                                                        meta,
                                                        x: cellRect.left - cardRect.left + cellRect.width / 2,
                                                        y: cellRect.top - cardRect.top
                                                    });
                                                }}
                                                onMouseLeave={() => {
                                                    if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
                                                        setHoveredCell(null);
                                                    }
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Platform & Activity Level Legend */}
            <div style={styles.legendRow}>
                <div style={styles.legendPlatforms}>
                    <div className="profile-legend-item" style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, background: "#38BDF8", border: "1px solid #0284C7" }} />
                        <span style={styles.legendText}>Codeforces</span>
                    </div>
                    <div className="profile-legend-item" style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, background: "#FB923C", border: "1px solid #EA580C" }} />
                        <span style={styles.legendText}>LeetCode</span>
                    </div>
                    <div className="profile-legend-item" style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, background: "#C084FC", border: "1px solid #9333EA" }} />
                        <span style={styles.legendText}>CodeChef</span>
                    </div>
                    <div className="profile-legend-item" style={styles.legendItem}>
                        <span style={{ ...styles.legendDot, background: "#2DD4BF", border: "1px solid #0D9488" }} />
                        <span style={styles.legendText}>Multi-Platform</span>
                    </div>
                </div>

                <div style={styles.legendScale}>
                    <span style={styles.legendScaleLabel}>Less</span>
                    <span style={{ ...styles.legendCell, background: COLOR_EMPTY, border: `1px solid ${BORDER_EMPTY}` }} title="0 solves" />
                    <span style={{ ...styles.legendCell, background: "rgba(255, 255, 255, 0.18)", border: "1px solid rgba(255, 255, 255, 0.3)" }} title="1 solve" />
                    <span style={{ ...styles.legendCell, background: "rgba(255, 255, 255, 0.5)", border: "1px solid rgba(255, 255, 255, 0.7)" }} title="2 solves" />
                    <span style={{ ...styles.legendCell, background: "#FFFFFF", border: "1px solid #FFFFFF" }} title="3+ solves" />
                    <span style={styles.legendScaleLabel}>More</span>
                </div>
            </div>

            {/* Hover Tooltip display (positioned relative to the card) */}
            {hoveredCell && (
                <div
                    style={{
                        position: "absolute",
                        left: `${tooltipLeft}px`,
                        top: `${Math.max(12, hoveredCell.y - 12)}px`,
                        transform: "translate(-50%, -100%)",
                        zIndex: 100,
                        pointerEvents: "none",
                        background: "rgba(12, 16, 23, 0.96)",
                        backdropFilter: "blur(14px)",
                        WebkitBackdropFilter: "blur(14px)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "10px",
                        padding: "12px 16px",
                        boxShadow: "0 14px 34px rgba(0, 0, 0, 0.8)",
                        width: "225px",
                        maxWidth: "calc(100% - 24px)",
                        boxSizing: "border-box"
                    }}
                >
                    <div style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "4px" }}>
                        {hoveredCell.day.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </div>

                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: "'Space Grotesk', sans-serif", marginBottom: "6px" }}>
                        {hoveredCell.day.total === 0
                            ? "No questions solved"
                            : `${hoveredCell.day.total} question${hoveredCell.day.total === 1 ? "" : "s"} solved`}
                    </div>

                    {hoveredCell.day.total > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "13px", fontFamily: "'Space Grotesk', sans-serif", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "8px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                                <span style={{ color: COLOR_CF, fontWeight: 500 }}>
                                    Codeforces:
                                </span>
                                <strong style={{ color: "#fff" }}>{hoveredCell.day.codeforces || 0}</strong>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                                <span style={{ color: COLOR_LC, fontWeight: 500 }}>
                                    LeetCode:
                                </span>
                                <strong style={{ color: "#fff" }}>{hoveredCell.day.leetcode || 0}</strong>
                            </div>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                                <span style={{ color: COLOR_CC, fontWeight: 500 }}>
                                    CodeChef:
                                </span>
                                <strong style={{ color: "#fff" }}>{hoveredCell.day.codechef || 0}</strong>
                            </div>
                        </div>
                    )}

                    {/* Pointer arrow pointing to the hovered box */}
                    <div
                        style={{
                            position: "absolute",
                            bottom: "-5px",
                            left: `calc(50% + ${arrowOffset}px)`,
                            transform: "translateX(-50%) rotate(45deg)",
                            width: "8px",
                            height: "8px",
                            background: "rgba(12, 16, 23, 0.96)",
                            borderRight: "1px solid rgba(255, 255, 255, 0.12)",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.12)"
                        }}
                    />
                </div>
            )}

        </div>
    );
}

const styles = {
    eyebrow: {
        fontSize: "12.5px",
        fontWeight: 600,
        letterSpacing: "2.5px",
        color: "#5EEAD4",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        textTransform: "uppercase"
    },
    subtitle: {
        fontSize: "15px",
        color: "rgba(255, 255, 255, 0.75)",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        marginTop: "4px"
    },
    statBox: {
        background: "rgba(255, 255, 255, 0.025)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius: "12px",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "84px"
    },
    statBoxHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "4px"
    },
    statBoxLabel: {
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "1px",
        color: "rgba(255, 255, 255, 0.55)",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        textTransform: "uppercase"
    },
    statBoxValue: {
        fontSize: "22px",
        fontWeight: 700,
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        lineHeight: 1.2,
        marginBottom: "4px"
    },
    statBoxUnit: {
        fontSize: "13px",
        fontWeight: 500,
        color: "rgba(255, 255, 255, 0.55)",
        marginLeft: "2px"
    },
    statBoxCaption: {
        fontSize: "11.5px",
        color: "rgba(255, 255, 255, 0.5)",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis"
    },
    statBoxPlatformPills: {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        marginTop: "2px"
    },
    statPlatformPill: {
        fontSize: "11px",
        fontWeight: 600,
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "1px 6px",
        borderRadius: "4px",
        border: "1px solid",
        background: "rgba(255, 255, 255, 0.03)"
    },
    yearSelectWrap: {
        position: "relative",
        display: "inline-flex",
        alignItems: "center"
    },
    yearSelect: {
        appearance: "none",
        WebkitAppearance: "none",
        MozAppearance: "none",
        background: "rgba(10, 13, 19, 0.72)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "8px",
        color: "#fff",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "12.5px",
        fontWeight: 500,
        padding: "6px 26px 6px 12px",
        cursor: "pointer",
        outline: "none",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        transition: "border-color 0.15s ease, background 0.15s ease"
    },
    yearSelectArrow: {
        position: "absolute",
        right: "10px",
        fontSize: "10px",
        color: "rgba(255, 255, 255, 0.5)",
        pointerEvents: "none"
    },
    yearOption: {
        background: "#0c1017",
        color: "#fff",
        fontFamily: "'Space Grotesk', sans-serif"
    },
    scrollWrapper: {
        overflowX: "auto",
        paddingBottom: "4px",
        scrollbarWidth: "thin",
        scrollbarColor: "rgba(255, 255, 255, 0.15) transparent"
    },
    gridContainer: {
        minWidth: "700px",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
    },
    monthRow: {
        display: "flex",
        alignItems: "center",
        height: "18px",
        position: "relative"
    },
    monthLabelsTrack: {
        position: "relative",
        flex: 1,
        height: "18px"
    },
    bodyRow: {
        display: "flex",
        gap: "6px"
    },
    weekdayCol: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "22px",
        height: "92px",
        paddingTop: "1px"
    },
    weekdayLabel: {
        fontSize: "11px",
        color: "rgba(255, 255, 255, 0.55)",
        lineHeight: "11px",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        userSelect: "none"
    },
    weeksTrack: {
        display: "flex",
        gap: "2.5px"
    },
    weekColumn: {
        display: "flex",
        flexDirection: "column",
        gap: "2.5px"
    },
    cell: {
        width: "11px",
        height: "11px",
        borderRadius: "2.5px",
        cursor: "pointer",
        transition: "transform 0.12s ease, box-shadow 0.12s ease"
    },
    legendRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px",
        marginTop: "16px",
        paddingTop: "14px",
        borderTop: "1px solid rgba(255, 255, 255, 0.06)"
    },
    legendPlatforms: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
        flexWrap: "wrap"
    },
    legendItem: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px"
    },
    legendDot: {
        width: "10px",
        height: "10px",
        borderRadius: "2.5px",
        display: "inline-block",
        flexShrink: 0
    },
    legendText: {
        fontSize: "12px",
        color: "rgba(255, 255, 255, 0.7)",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontWeight: 500
    },
    legendScale: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px"
    },
    legendScaleLabel: {
        fontSize: "11px",
        color: "rgba(255, 255, 255, 0.5)",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: "0 4px"
    },
    legendCell: {
        width: "10px",
        height: "10px",
        borderRadius: "2px",
        display: "inline-block"
    }
};
