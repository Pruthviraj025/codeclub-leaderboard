import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, getSessionUser } from "../api";

export default function ProfilePage() {

    const { userId } = useParams();

    const sessionUser = getSessionUser();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");

    // -------------------------
    // Email
    // -------------------------

    const [editingEmail, setEditingEmail] = useState(false);
    const [newEmail, setNewEmail] = useState("");
    const [emailMsg, setEmailMsg] = useState("");
    const [savingEmail, setSavingEmail] = useState(false);

    // -------------------------
    // Codeforces
    // -------------------------

    const [cfHandle, setCfHandle] = useState("");
    const [verifyInfo, setVerifyInfo] = useState(null);
    const [verifyMsg, setVerifyMsg] = useState("");

    // -------------------------
    // LeetCode
    // -------------------------

    const [lcUsername, setLcUsername] =
        useState("");

    const [lcStatus, setLcStatus] =
        useState(null);

    const [lcMsg, setLcMsg] =
        useState("");

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

                    // ignore

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

    if (!sessionUser)
        return null;

    if (error) {

        return (

            <div style={styles.pageCenter}>
                <div style={styles.error}>
                    {error}
                </div>
            </div>

        );

    }

    if (!profile) {

        return (

            <div style={styles.pageCenter}>
                <div style={styles.dim}>
                    Loading...
                </div>
            </div>

        );

    }

    const isOwner =
        profile.id === sessionUser.id;

        return (

    <div style={styles.page}>

        <header style={styles.header}>

            <button
                style={styles.backBtn}
                onClick={() => navigate("/leaderboard")}
            >
                ← Leaderboard
            </button>

        </header>

        <main
            style={styles.main}
            className="page-main"
        >

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
                            profile.cfHandle ||
                            "Not Connected"
                        }
                    />

                    <Stat
                        label="LEETCODE"
                        value={
                            profile.lcUsername ||
                            "Not Connected"
                        }
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

                {/* -----------------------------
                    CODEFORCES
                ------------------------------ */}

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

                    </div>

                )}

                {/* -------------------------
                    LEETCODE
                -------------------------- */}

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
                fontFamily: "var(--font-mono)",
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

            </div>

        </main>

    </div>

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
        background: "transparent",
        border: "none",
        color: "var(--text-dim)",
        cursor: "pointer",
        fontFamily: "var(--font-mono)",
        fontSize: "13px"
    },

    main: {
        maxWidth: "760px",
        margin: "0 auto",
        padding: "var(--space-5) var(--space-4)"
    },

    card: {
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "var(--space-5)"
    },

    nameRow: {
        display: "flex",
        alignItems: "center",
        gap: "12px"
    },

    name: {
        margin: 0,
        fontSize: "30px",
        fontWeight: 700
    },

    youTag: {
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        color: "var(--accent-gold)",
        border: "1px solid var(--accent-gold)",
        padding: "2px 6px",
        borderRadius: "4px",
        letterSpacing: "1px"
    },

    statRow: {
        display: "flex",
        gap: "28px",
        flexWrap: "wrap",
        marginTop: "22px"
    },

    stat: {
        minWidth: "120px"
    },

    statLabel: {
        fontFamily: "var(--font-mono)",
        fontSize: "10px",
        color: "var(--text-dim)",
        letterSpacing: "1px",
        marginBottom: "5px"
    },

    statValue: {
        fontSize: "18px",
        fontWeight: 700
    },

    privateBlock: {
        marginTop: "28px",
        paddingTop: "20px",
        borderTop: "1px solid var(--border)"
    },

    privateLine: {
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        marginBottom: "10px",
        lineHeight: 1.6
    },

    dim: {
        color: "var(--text-dim)"
    },

    editLink: {
        background: "transparent",
        border: "none",
        color: "var(--accent-green)",
        cursor: "pointer",
        padding: 0,
        marginLeft: "8px",
        textDecoration: "underline",
        fontFamily: "var(--font-mono)",
        fontSize: "11px"
    },

    cfConnect: {
        marginTop: "30px",
        paddingTop: "20px",
        borderTop: "1px solid var(--border)"
    },

    eyebrow: {
        color: "var(--accent-green)",
        fontFamily: "var(--font-mono)",
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
        minWidth: "220px",
        background: "var(--surface-raised)",
        color: "var(--text)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "11px 14px",
        fontFamily: "var(--font-mono)",
        fontSize: "13px"
    },

    smallBtn: {
        background: "var(--accent-green)",
        color: "#0A1A10",
        border: "none",
        borderRadius: "var(--radius-sm)",
        padding: "11px 18px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "13px"
    },

    instructions: {
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        lineHeight: 1.7,
        color: "var(--text)"
    },

    link: {
        color: "var(--accent-green)",
        fontWeight: 600,
        textDecoration: "underline"
    },

    verifyMsg: {
        marginTop: "14px",
        fontFamily: "var(--font-mono)",
        color: "var(--accent-gold)",
        fontSize: "12px"
    },

    error: {
        color: "var(--accent-red)",
        fontFamily: "var(--font-mono)"
    }
};