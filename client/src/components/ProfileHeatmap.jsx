import { useMemo, useState, useRef, useEffect } from "react";

// Color shades for platforms: light (1 solve), dark (2 solves), darker (3+ solves)
const COLOR_EMPTY = "rgba(255, 255, 255, 0.05)";
const BORDER_EMPTY = "rgba(255, 255, 255, 0.08)";

const PALETTES = {
    cf: {
        light: { bg: "#70B5F9", border: "#4299E1" },
        dark: { bg: "#3182CE", border: "#2B6CB0" },
        darker: { bg: "#1D4ED8", border: "#1E40AF" }
    },
    lc: {
        light: { bg: "#FFC875", border: "#F6AD55" },
        dark: { bg: "#FFA116", border: "#DD6B20" },
        darker: { bg: "#DD6B20", border: "#C05621" }
    },
    cc: {
        light: { bg: "#BC7A4D", border: "#A05A2C" },
        dark: { bg: "#8B4513", border: "#6E360F" },
        darker: { bg: "#5A2807", border: "#421C03" }
    },
    twoPlats: {
        light: { bg: "#FDE047", border: "#EAB308" },
        dark: { bg: "#EAB308", border: "#CA8A04" },
        darker: { bg: "#CA8A04", border: "#A16207" }
    },
    threePlats: {
        light: { bg: "#4ADE80", border: "#22C55E" },
        dark: { bg: "#22C55E", border: "#16A34A" },
        darker: { bg: "#15803D", border: "#166534" }
    }
};

const COLOR_CF = PALETTES.cf.dark.bg;
const COLOR_LC = PALETTES.lc.dark.bg;
const COLOR_CC = PALETTES.cc.dark.bg;
const COLOR_2PLATS = PALETTES.twoPlats.dark.bg;
const COLOR_3PLATS = PALETTES.threePlats.dark.bg;

function getShadeKey(count) {
    if (count <= 1) return "light";
    if (count === 2) return "dark";
    return "darker";
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

    // Build the calendar grid according to the selected year
    const { weeks, monthLabels, totalSolves, platformTotals } = useMemo(() => {
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

        // Align startDate to Sunday
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

        const formatUTC = (d) => {
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, "0");
            const day = String(d.getUTCDate()).padStart(2, "0");
            return `${y}-${m}-${day}`;
        };

        const weeksList = [];
        let currentWeek = [];
        const monthPositions = [];
        let lastMonth = -1;

        let total = 0;
        let cfTotal = 0;
        let lcTotal = 0;
        let ccTotal = 0;

        const cursor = new Date(startDay);
        let colIndex = 0;

        while (cursor <= endDate) {
            const dateStr = formatYMD(cursor);
            const utcDateStr = formatUTC(cursor);
            const dayData = activityMap[dateStr] || activityMap[utcDateStr] || { total: 0, codeforces: 0, leetcode: 0, codechef: 0 };

            total += dayData.total || 0;
            cfTotal += dayData.codeforces || 0;
            lcTotal += dayData.leetcode || 0;
            ccTotal += dayData.codechef || 0;

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
                codechef: dayData.codechef || 0
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

        return {
            weeks: weeksList,
            monthLabels: monthPositions,
            totalSolves: total,
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
        const tooltipWidth = Math.min(210, Math.max(160, cardWidth - 24));
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
                    padding: 24px;
                    position: relative;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    margin-top: 24px;
                    box-shadow: var(--shadow);
                }
                .profile-heatmap-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    flex-wrap: wrap;
                    gap: 12px;
                    margin-bottom: 16px;
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
                @media (max-width: 640px) {
                    .profile-heatmap-card {
                        padding: 16px 12px !important;
                        margin-top: 16px !important;
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
                        font-size: 10px;
                        color: var(--text-dim);
                        font-family: 'Orbitron', sans-serif;
                        margin-bottom: 6px;
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
                    {/* CF-style Year selector dropdown */}
                    <div style={styles.yearSelectWrap}>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            style={styles.yearSelect}
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
                                        fontSize: "10px",
                                        color: "var(--text-dim)",
                                        fontFamily: "'Orbitron', sans-serif"
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
                                                style={{
                                                    ...styles.cell,
                                                    background: meta.bg,
                                                    border: `1px solid ${meta.border}`,
                                                    transform: isHovered ? "scale(1.4)" : "scale(1)",
                                                    zIndex: isHovered ? 10 : 1,
                                                    boxShadow: isHovered ? `0 0 8px ${meta.bg}` : "none"
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

            {/* Hover Tooltip display (strictly positioned relative to the card) */}
            {hoveredCell && (
                <div
                    style={{
                        position: "absolute",
                        left: `${tooltipLeft}px`,
                        top: `${Math.max(12, hoveredCell.y - 12)}px`,
                        transform: "translate(-50%, -100%)",
                        zIndex: 100,
                        pointerEvents: "none",
                        background: "rgba(13, 20, 36, 0.96)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        padding: "10px 14px",
                        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.7), 0 0 15px rgba(0, 0, 0, 0.5)",
                        width: "205px",
                        maxWidth: "calc(100% - 24px)",
                        boxSizing: "border-box"
                    }}
                >
                    <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "'Orbitron', sans-serif", marginBottom: "4px" }}>
                        {hoveredCell.day.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                    </div>

                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", marginBottom: "6px" }}>
                        {hoveredCell.day.total === 0
                            ? "No questions solved"
                            : `${hoveredCell.day.total} question${hoveredCell.day.total === 1 ? "" : "s"} solved`}
                    </div>

                    {hoveredCell.day.total > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "11px", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "6px" }}>
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
                            background: "rgba(13, 20, 36, 0.96)",
                            borderRight: "1px solid var(--border)",
                            borderBottom: "1px solid var(--border)"
                        }}
                    />
                </div>
            )}

        </div>
    );
}

const styles = {
    card: {
        position: "relative",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "24px",
        marginTop: "24px",
        boxShadow: "var(--shadow)"
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "16px"
    },
    eyebrow: {
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        color: "var(--text-dim)",
        fontFamily: "'Orbitron', sans-serif"
    },
    subtitle: {
        fontSize: "13px",
        color: "var(--text-secondary)",
        marginTop: "2px"
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
        background: "var(--surface-raised, rgba(255, 255, 255, 0.04))",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        color: "#fff",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "11px",
        fontWeight: 600,
        padding: "4px 24px 4px 10px",
        cursor: "pointer",
        outline: "none",
        transition: "border-color 0.15s ease, background 0.15s ease"
    },
    yearSelectArrow: {
        position: "absolute",
        right: "8px",
        fontSize: "9px",
        color: "var(--text-dim)",
        pointerEvents: "none"
    },
    yearOption: {
        background: "#0f172a",
        color: "#fff",
        fontFamily: "'Orbitron', sans-serif"
    },
    summaryPills: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap"
    },
    summaryPill: {
        fontSize: "11px",
        fontFamily: "'Orbitron', sans-serif",
        padding: "3px 8px",
        borderRadius: "4px",
        border: "1px solid",
        background: "rgba(255, 255, 255, 0.02)"
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
        height: "16px",
        position: "relative"
    },
    monthLabelsTrack: {
        position: "relative",
        flex: 1,
        height: "16px"
    },
    bodyRow: {
        display: "flex",
        gap: "6px"
    },
    weekdayCol: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "20px",
        height: "89px",
        paddingTop: "1px"
    },
    weekdayLabel: {
        fontSize: "9px",
        color: "var(--text-dim)",
        lineHeight: "10px",
        fontFamily: "'Orbitron', sans-serif",
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
        width: "10.5px",
        height: "10.5px",
        borderRadius: "2px",
        cursor: "pointer",
        transition: "transform 0.12s ease, box-shadow 0.12s ease"
    }
};
