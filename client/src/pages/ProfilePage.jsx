import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, getSessionUser } from "../api";
import SidebarLayout from "../components/SidebarLayout";
import ProfileHeatmap from "../components/ProfileHeatmap";

export default function ProfilePage() {

    const { userId } = useParams();

    const sessionUser = getSessionUser();
    const navigate = useNavigate();

    const isOwnProfile = !userId || (sessionUser && String(sessionUser.id) === String(userId));
    const sidebarActive = isOwnProfile ? "profile" : "leaderboard";

    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");


    const [editingEmail, setEditingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailMsg, setEmailMsg] = useState("");
    const [savingEmail, setSavingEmail] = useState(false);


    const [cfHandle, setCfHandle] = useState("");
    const [verifyInfo, setVerifyInfo] = useState(null);
    const [verifyMsg, setVerifyMsg] = useState("");

    const [lcUsername, setLcUsername] =
        useState("");
    const [lcStatus, setLcStatus] =
        useState(null);
    const [lcMsg, setLcMsg] =
        useState("");

    const [ccHandle, setCcHandle] = useState("");
    const [ccVerifyInfo, setCcVerifyInfo] = useState(null);
    const [ccVerifyMsg, setCcVerifyMsg] = useState("");

    useEffect(() => {

        if (!sessionUser) {

            navigate("/");
            return;

        }

        load();

    }, [userId]);

    async function load() {

        try {

            const res =
                await api.profile(userId);

            setProfile(res);

            if (res.lcConnected) {

                try {

                    const status =
                        await api.lcStatus();

                    setLcStatus(status);

                } catch {


                }

            }

        } catch (err) {

            setError(
                err.message ||
                "Failed to load profile."
            );

        }

    }

    async function handleUpdateEmail(e) {

        e.preventDefault();

        setSavingEmail(true);
        setEmailMsg("");

        try {

            await api.updateEmail(newEmail);

            setEditingEmail(false);

            setEmailMsg(
                "Email updated successfully."
            );

            await load();

        } catch (err) {

            setEmailMsg(err.message);

        } finally {

            setSavingEmail(false);

        }

    }

    async function handleStartVerification(e) {

        e.preventDefault();

        setVerifyMsg("");

        try {

            const res =
                await api.startCfVerification(
                    cfHandle
                );

            setVerifyInfo(res);

        } catch (err) {

            setVerifyMsg(err.message);

        }

    }

    async function handleCheckVerification() {

        try {

            const res =
                await api.checkCfVerification();

            if (res.verified) {

                setVerifyMsg(
                    "Codeforces account connected!"
                );

                setVerifyInfo(null);

                await load();

            } else {

                setVerifyMsg(

                    res.expired
                        ? "Verification expired."
                        : "Not verified yet."

                );

            }

        } catch (err) {

            setVerifyMsg(err.message);

        }

    }

    async function handleStartLeetCode() {

        setLcMsg("");

        try {

            const res =
                await api.startLcVerification(
                    lcUsername
                );

            setLcStatus(res);

            setLcMsg(
                "Verification started."
            );

        } catch (err) {

            setLcMsg(err.message);

        }

    }

    async function handleVerifyLeetCode() {

        try {

            const res =
                await api.verifyLc();

            if (res.verified) {

                setLcMsg(
                    "LeetCode connected!"
                );

                await load();

            } else {

                setLcMsg(
                    "Verification still pending."
                );

            }

        } catch (err) {

            setLcMsg(err.message);

        }

    }

    async function handleDisconnectCodeforces() {
        if (!window.confirm("Disconnect Codeforces?")) return;

        try {
            await api.disconnectCf();
            const sessionUser = getSessionUser();
            if (sessionUser) {
                sessionUser.cfConnected = false;
                localStorage.setItem("user", JSON.stringify(sessionUser));
            }
            setVerifyMsg("Disconnected.");
            await load();
        } catch (err) {
            setVerifyMsg(err.message);
        }
    }

    async function handleDisconnectLeetCode() {

        if (
            !window.confirm(
                "Disconnect LeetCode?"
            )
        ) return;

        try {

            await api.disconnectLc();

            setLcStatus(null);

            setLcMsg(
                "Disconnected."
            );

            await load();

        } catch (err) {

            setLcMsg(err.message);

        }

    }

    async function handleStartCcVerification(e) {
        e.preventDefault();
        setCcVerifyMsg("");

        try {
            const res = await api.startCcVerification(ccHandle);
            setCcVerifyInfo(res);
        } catch (err) {
            setCcVerifyMsg(err.message);
        }
    }

    async function handleCheckCcVerification() {
        try {
            const res = await api.checkCcVerification();
            if (res.verified) {
                setCcVerifyMsg("CodeChef account connected!");
                setCcVerifyInfo(null);
                await load();
            } else {
                setCcVerifyMsg(
                    res.expired
                        ? "Verification expired. Start again."
                        : (res.message || "Not verified yet.")
                );
            }
        } catch (err) {
            setCcVerifyMsg(err.message);
        }
    }

    async function handleDisconnectCodeChef() {
        if (!window.confirm("Disconnect CodeChef?")) return;

        try {
            await api.disconnectCc();
            const sessionUser = getSessionUser();
            if (sessionUser) {
                sessionUser.ccConnected = false;
                localStorage.setItem("user", JSON.stringify(sessionUser));
            }
            setCcVerifyMsg("Disconnected.");
            await load();
        } catch (err) {
            setCcVerifyMsg(err.message);
        }
    }

    if (!sessionUser)
        return null;

    if (error) {

        return (

            <SidebarLayout active={sidebarActive}>
                <div style={styles.pageCenter}>
                    <div style={styles.error}>
                        {error}
                    </div>
                </div>
            </SidebarLayout>

        );

    }

    if (!profile) {

        return (

            <SidebarLayout active={sidebarActive}>
                <div style={styles.pageCenter}>
                    <div style={styles.dim}>
                        Loading...
                    </div>
                </div>
            </SidebarLayout>

        );

    }

    const isOwner =
        profile.id === sessionUser.id;

        return (

    <SidebarLayout active={sidebarActive}>

        <div
            style={styles.main}
        >
            <div style={{ marginBottom: "14px" }}>
                <button
                    onClick={() => navigate("/leaderboard")}
                    style={styles.backBtn}
                    onMouseEnter={e => {
                        e.currentTarget.style.color = "#fff";
                        e.currentTarget.style.borderColor = "var(--accent-gold, #f59e0b)";
                        e.currentTarget.style.background = "var(--surface-raised, rgba(255, 255, 255, 0.05))";
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.color = "var(--text-dim)";
                        e.currentTarget.style.borderColor = "var(--border)";
                        e.currentTarget.style.background = "var(--surface)";
                    }}
                >
                    ← Back to Leaderboard
                </button>
            </div>

            <div
                style={styles.card}
                className="fade-up"
            >

                <div style={styles.nameRow}>

                    <h1 style={styles.name}>
                        {profile.name}
                    </h1>

                    {isOwner && (

                        <span style={styles.youTag}>
                            YOU
                        </span>

                    )}

                </div>

                <div style={styles.statRow}>

                    <Stat
                        label="CODEFORCES"
                        value={
                            profile.cfHandle ? (
                                <a
                                    href={`https://codeforces.com/profile/${profile.cfHandle}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: "#3182CE", textDecoration: "none" }}
                                    title="Open Codeforces profile"
                                >
                                    {profile.cfHandle} ↗
                                </a>
                            ) : (
                                "Not Connected"
                            )
                        }
                    />

                    <Stat
                        label="LEETCODE"
                        value={
                            profile.lcUsername ? (
                                <a
                                    href={`https://leetcode.com/${profile.lcUsername}/`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: "#FFA116", textDecoration: "none" }}
                                    title="Open LeetCode profile"
                                >
                                    {profile.lcUsername} ↗
                                </a>
                            ) : (
                                "Not Connected"
                            )
                        }
                    />

                    <Stat
                        label="CODECHEF"
                        value={
                            profile.ccHandle ? (
                                <a
                                    href={`https://www.codechef.com/users/${profile.ccHandle}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: "#8B4513", textDecoration: "none" }}
                                    title="Open CodeChef profile"
                                >
                                    {profile.ccHandle} ↗
                                </a>
                            ) : (
                                "Not Connected"
                            )
                        }
                    />

                </div>

                <div style={{ ...styles.statRow, marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                    <Stat
                        label="TOTAL POINTS"
                        value={profile.totalPoints || 0}
                        color="var(--accent-green, #22C55E)"
                    />
                    <Stat
                        label="CF POINTS"
                        value={profile.codeforcesPoints || 0}
                        color="#3182CE"
                    />
                    <Stat
                        label="LC POINTS"
                        value={profile.leetcodePoints || 0}
                        color="#FFA116"
                    />
                    <Stat
                        label="CC POINTS"
                        value={profile.codechefPoints || 0}
                        color="#8B4513"
                    />
                </div>

                {isOwner && profile.usn && (

                    <div style={styles.privateBlock}>

                        <div style={styles.privateLine}>

                            <span style={styles.dim}>
                                USN
                            </span>

                            {" "}
                            {profile.usn}

                        </div>

                        {!editingEmail ? (

                            <div style={styles.privateLine}>

                                <span style={styles.dim}>
                                    Email
                                </span>

                                {" "}
                                {profile.email}

                                {" "}

                                <button
                                    style={styles.editLink}
                                    onClick={() => {

                                        setEditingEmail(true);

                                        setNewEmail(
                                            profile.email
                                        );

                                        setEmailMsg("");

                                    }}
                                >
                                    edit
                                </button>

                            </div>

                        ) : (

                            <form
                                onSubmit={handleUpdateEmail}
                                style={styles.cfForm}
                            >

                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    style={styles.input}
                                    onChange={(e) =>
                                        setNewEmail(
                                            e.target.value
                                        )
                                    }
                                />

                                <button
                                    style={styles.smallBtn}
                                    disabled={savingEmail}
                                >

                                    {savingEmail
                                        ? "Saving..."
                                        : "Save"}

                                </button>

                                <button
                                    type="button"
                                    style={styles.editLink}
                                    onClick={() => {

                                        setEditingEmail(
                                            false
                                        );

                                        setEmailMsg("");

                                    }}
                                >
                                    cancel
                                </button>

                            </form>

                        )}

                        {emailMsg && (

                            <div style={styles.verifyMsg}>
                                {emailMsg}
                            </div>

                        )}

                    </div>

                )}


                {isOwner &&
                    !profile.cfConnected && (

                    <div style={styles.cfConnect}>

                        <div style={styles.eyebrow}>
                            CONNECT CODEFORCES
                        </div>

                        {!verifyInfo ? (

                            <form
                                onSubmit={
                                    handleStartVerification
                                }
                                style={styles.cfForm}
                            >

                                <input
                                    style={styles.input}
                                    placeholder="Codeforces Handle"
                                    value={cfHandle}
                                    onChange={(e) =>
                                        setCfHandle(
                                            e.target.value
                                        )
                                    }
                                    required
                                />

                                <button
                                    style={styles.smallBtn}
                                >
                                    Start
                                </button>

                            </form>

                        ) : (

                            <div>

                                <p
                                    style={
                                        styles.instructions
                                    }
                                >

                                    Submit one
                                    intentionally
                                    non-compiling
                                    solution to

                                    {" "}

                                    <a
                                        href={
                                            verifyInfo.problemUrl
                                        }
                                        target="_blank"
                                        rel="noreferrer"
                                        style={styles.link}
                                    >

                                        {verifyInfo.contestId}
                                        {verifyInfo.problemIndex}

                                    </a>

                                    {" "}

                                    within

                                    {" "}

                                    {
                                        verifyInfo.windowMinutes
                                    }

                                    {" "}

                                    minutes.

                                </p>

                                <button
                                    style={styles.smallBtn}
                                    onClick={
                                        handleCheckVerification
                                    }
                                >

                                    Verify

                                </button>

                            </div>

                        )}

                        {verifyMsg && (

                            <div style={styles.verifyMsg}>
                                {verifyMsg}
                            </div>

                        )}

                    </div>

                )}
                                {isOwner &&
                    profile.cfConnected && (

                    <div style={styles.cfConnect}>

                        <div style={styles.eyebrow}>
                            CODEFORCES
                        </div>

                        <div style={styles.privateLine}>

                            ✅ Connected as

                            {" "}

                            <strong>
                                {profile.cfHandle}
                            </strong>

                        </div>

                        <div style={{ marginTop: 14 }}>
                            <button
                                style={{
                                    ...styles.smallBtn,
                                    background: "var(--accent-red)",
                                    color: "#fff"
                                }}
                                onClick={handleDisconnectCodeforces}
                            >
                                Disconnect
                            </button>
                        </div>

                    </div>

                )}


                {isOwner && (

                    <div style={styles.cfConnect}>

                        <div style={styles.eyebrow}>
                            CONNECT LEETCODE
                        </div>

                        {!profile.lcConnected ? (

                            <>

                                <div
                                    style={{
                                        ...styles.privateLine,
                                        marginBottom: 12
                                    }}
                                >

                                    Connect your LeetCode account
                                    to earn leaderboard points.

                                </div>

                                <div style={styles.cfForm}>

                                    <input
                                        style={styles.input}
                                        placeholder="LeetCode Username"
                                        value={lcUsername}
                                        onChange={(e) =>
                                            setLcUsername(
                                                e.target.value
                                            )
                                        }
                                    />

                                    <button
                                        style={styles.smallBtn}
                                        onClick={
                                            handleStartLeetCode
                                        }
                                    >

                                        Connect

                                    </button>

                                </div>

                                {lcStatus && (
    <div style={{ marginTop: 16 }}>

        <div style={styles.instructions}>
            {lcStatus.instructions}
        </div>

        <div
            style={{
                marginTop: 12,
                padding: "12px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontFamily: "'Orbitron', sans-serif",
                color: "#FFA116",
                wordBreak: "break-all"
            }}
        >
            {lcStatus.verificationCode}
        </div>

        <div style={{ marginTop: 16 }}>
            <button
                style={styles.smallBtn}
                onClick={handleVerifyLeetCode}
            >
                Verify Account
            </button>
        </div>

    </div>
)}

                            </>

                        ) : (

                            <>

                                <div
                                    style={styles.privateLine}
                                >

                                    ✅ Connected as

                                    {" "}

                                    <strong>
                                        {profile.lcUsername}
                                    </strong>

                                </div>

                                <div
                                    style={{
                                        marginTop: 14
                                    }}
                                >

                                    <button
                                        style={{
                                            ...styles.smallBtn,
                                            background:
                                                "var(--accent-red)",
                                            color: "#fff"
                                        }}
                                        onClick={
                                            handleDisconnectLeetCode
                                        }
                                    >

                                        Disconnect

                                    </button>

                                </div>

                            </>

                        )}

                        {lcMsg && (

                            <div
                                style={styles.verifyMsg}
                            >

                                {lcMsg}

                            </div>

                        )}

                    </div>

                )}

                {isOwner && (
                    <div style={styles.cfConnect}>
                        <div style={styles.eyebrow}>
                            CONNECT CODECHEF
                        </div>

                        {!profile.ccConnected ? (
                            <>
                                <div style={{ ...styles.privateLine, marginBottom: 12 }}>
                                    Connect your CodeChef account to earn leaderboard points.
                                </div>

                                {!ccVerifyInfo ? (
                                    <form onSubmit={handleStartCcVerification} style={styles.cfForm}>
                                        <input
                                            style={styles.input}
                                            placeholder="CodeChef Handle"
                                            value={ccHandle}
                                            onChange={(e) => setCcHandle(e.target.value)}
                                            required
                                        />
                                        <button style={styles.smallBtn}>
                                            Connect
                                        </button>
                                    </form>
                                ) : (
                                    <div style={{ marginTop: 12 }}>
                                        <p style={styles.instructions}>
                                            Submit one intentionally non-compiling (compile error) solution to{" "}
                                            <a
                                                href={ccVerifyInfo.problemUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={styles.link}
                                            >
                                                problem {ccVerifyInfo.problemCode}
                                            </a>{" "}
                                            on CodeChef within {ccVerifyInfo.windowMinutes} minutes.
                                        </p>
                                        <button
                                            style={styles.smallBtn}
                                            onClick={handleCheckCcVerification}
                                        >
                                            Verify Submission
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div style={styles.privateLine}>
                                    ✅ Connected as <strong>{profile.ccHandle}</strong>
                                </div>
                                <div style={{ marginTop: 14 }}>
                                    <button
                                        style={{
                                            ...styles.smallBtn,
                                            background: "var(--accent-red)",
                                            color: "#fff"
                                        }}
                                        onClick={handleDisconnectCodeChef}
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            </>
                        )}

                        {ccVerifyMsg && (
                            <div style={styles.verifyMsg}>
                                {ccVerifyMsg}
                            </div>
                        )}
                    </div>
                )}

            </div>

            <ProfileHeatmap activityMap={profile.activityMap} userCreatedAt={profile.createdAt} />

            <div style={{ ...styles.card, marginTop: "24px" }} className="fade-up">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div style={styles.eyebrow}>RECENT SOLVED PROBLEMS</div>
                    <div style={{ ...styles.dim, fontSize: "11px" }}>Last 5 across all platforms</div>
                </div>

                {!profile.solvedSubmissions || profile.solvedSubmissions.length === 0 ? (
                    <div style={{ color: "var(--text-dim)", fontSize: "13px", padding: "16px 0", fontFamily: "'Orbitron', sans-serif" }}>
                        No solved problems recorded yet.
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {profile.solvedSubmissions.slice(0, 5).map(sub => {
                            const isCf = sub.platform === "codeforces";
                            const isCc = sub.platform === "codechef";
                            return (
                                <div
                                    key={sub._id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "10px 14px",
                                        background: "var(--surface-raised)",
                                        border: "1px solid var(--border)",
                                        borderRadius: "var(--radius-sm)",
                                        gap: "12px",
                                        flexWrap: "wrap"
                                    }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "220px", flexWrap: "wrap" }}>
                                        <span
                                            style={{
                                                fontSize: "10px",
                                                fontWeight: 700,
                                                padding: "2px 6px",
                                                borderRadius: "4px",
                                                fontFamily: "'Orbitron', sans-serif",
                                                color: isCf ? "#3182CE" : isCc ? "#8B4513" : "#FFA116",
                                                background: isCf ? "rgba(49, 130, 206, 0.12)" : isCc ? "rgba(139, 69, 19, 0.18)" : "rgba(255, 161, 22, 0.12)",
                                                border: `1px solid ${isCf ? "#3182CE" : isCc ? "#8B4513" : "#FFA116"}`
                                            }}
                                        >
                                            {isCf ? "CF" : isCc ? "CC" : "LC"}
                                        </span>
                                        {sub.problemUrl ? (
                                            <a
                                                href={sub.problemUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                style={{
                                                    color: "var(--text)",
                                                    textDecoration: "none",
                                                    fontWeight: 600,
                                                    fontSize: "13px",
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "4px"
                                                }}
                                                title="Open problem in new tab"
                                            >
                                                {sub.problemName} ↗
                                            </a>
                                        ) : (
                                            <span style={{ fontWeight: 600, fontSize: "13px" }}>{sub.problemName}</span>
                                        )}
                                        {sub.problemRating != null && (
                                            <span style={{
                                                fontSize: "11px",
                                                color: "var(--accent-gold)",
                                                background: "rgba(230, 180, 80, 0.12)",
                                                border: "1px solid rgba(230, 180, 80, 0.3)",
                                                padding: "1px 6px",
                                                borderRadius: "3px",
                                                fontFamily: "'Orbitron', sans-serif"
                                            }}>
                                                ★ {sub.problemRating}
                                            </span>
                                        )}
                                        {sub.difficulty && (
                                            <span style={{
                                                fontSize: "11px",
                                                color: "var(--text-dim)",
                                                background: "var(--surface)",
                                                border: "1px solid var(--border)",
                                                padding: "1px 6px",
                                                borderRadius: "3px",
                                                fontFamily: "'Orbitron', sans-serif"
                                            }}>
                                                {sub.difficulty}
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                        {sub.solvedAt && (
                                            <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "'Orbitron', sans-serif" }}>
                                                {new Date(sub.solvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                            </span>
                                        )}
                                        <span
                                            style={{
                                                color: "var(--accent-green)",
                                                background: "var(--accent-green-dim)",
                                                border: "1px solid var(--accent-green)",
                                                borderRadius: "4px",
                                                padding: "2px 8px",
                                                fontSize: "11px",
                                                fontFamily: "'Orbitron', sans-serif"
                                            }}
                                        >
                                            +{sub.points} pts
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>

    </SidebarLayout>

);

}

function Stat({

    label,
    value,
    color

}) {

    return (

        <div style={styles.stat}>

            <div style={styles.statLabel}>

                {label}

            </div>

            <div
                className="mono"
                style={{
                    ...styles.statValue,
                    color:
                        color ||
                        "var(--text)"
                }}
            >

                {value}

            </div>

        </div>

    );

}
const styles = {
    page: {
        minHeight: "100vh"
    },

    pageCenter: {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
    },

    header: {
        padding: "var(--space-3) var(--space-5)",
        borderBottom: "1px solid var(--border)"
    },

    backBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--text-dim)",
        cursor: "pointer",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "12px",
        letterSpacing: "0.5px",
        padding: "6px 14px",
        borderRadius: "6px",
        transition: "all 0.15s ease"
    },

    main: {
        maxWidth: "860px",
        margin: "0 auto",
        padding: "var(--space-4) var(--space-3)"
    },

    card: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "var(--space-4)"
    },

    nameRow: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap"
    },

    name: {
        margin: 0,
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "clamp(20px, 5vw, 28px)",
        fontWeight: 700,
        letterSpacing: "0.5px"
    },

    youTag: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "10px",
        color: "var(--accent-gold)",
        border: "1px solid var(--accent-gold)",
        padding: "2px 6px",
        borderRadius: "4px",
        letterSpacing: "1px"
    },

    statRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "16px",
        marginTop: "22px"
    },

    stat: {
        minWidth: "120px",
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "12px 14px"
    },

    statLabel: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "10px",
        color: "var(--text-dim)",
        letterSpacing: "1.5px",
        marginBottom: "5px"
    },

    statValue: {
        fontSize: "16px",
        fontWeight: 700,
        fontFamily: "'Orbitron', sans-serif",
        wordBreak: "break-all"
    },

    privateBlock: {
        marginTop: "24px",
        paddingTop: "20px",
        borderTop: "1px solid var(--border)",
        fontFamily: "'Orbitron', sans-serif"
    },

    privateLine: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "13px",
        marginBottom: "10px",
        lineHeight: 1.6,
        wordBreak: "break-word"
    },

    dim: {
        color: "var(--text-dim)",
        fontFamily: "'Orbitron', sans-serif"
    },

    editLink: {
        background: "transparent",
        border: "none",
        color: "var(--accent-green)",
        cursor: "pointer",
        padding: 0,
        marginLeft: "8px",
        textDecoration: "underline",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "12px"
    },

    cfConnect: {
        marginTop: "24px",
        paddingTop: "20px",
        borderTop: "1px solid var(--border)"
    },

    eyebrow: {
        color: "var(--accent-green)",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "11px",
        letterSpacing: "2px",
        marginBottom: "14px"
    },

    cfForm: {
        display: "flex",
        gap: "12px",
        flexWrap: "wrap"
    },

    input: {
        flex: 1,
        minWidth: "180px",
        background: "var(--surface-raised)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "11px 14px",
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "13px",
        minHeight: "44px"
    },

    smallBtn: {
        background: "var(--accent-green)",
        color: "#0A1A10",
        border: "none",
        borderRadius: "var(--radius-sm)",
        padding: "11px 18px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "13px",
        fontFamily: "'Orbitron', sans-serif",
        minHeight: "44px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center"
    },

    instructions: {
        fontFamily: "'Orbitron', sans-serif",
        fontSize: "13px",
        lineHeight: 1.7,
        color: "var(--text)"
    },

    link: {
        color: "var(--accent-green)",
        fontWeight: 600,
        textDecoration: "underline",
        fontFamily: "'Orbitron', sans-serif"
    },

    verifyMsg: {
        marginTop: "14px",
        fontFamily: "'Orbitron', sans-serif",
        color: "var(--accent-gold)",
        fontSize: "12px"
    },

    error: {
        color: "var(--accent-red)",
        fontFamily: "'Orbitron', sans-serif"
    }
};
