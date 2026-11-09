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
                <style>{`
                    .profile-stat-box {
                        transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                                    border-color 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                                    background 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                                    box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                        will-change: transform, box-shadow;
                    }
                    .profile-stat-box:hover {
                        transform: translateY(-2px);
                    }
                    .profile-stat-box:active {
                        transform: translateY(0) scale(0.99);
                    }
                    .profile-stat-box-cf:hover {
                        background: rgba(56, 189, 248, 0.07) !important;
                        border-color: rgba(56, 189, 248, 0.4) !important;
                        box-shadow: 0 10px 24px rgba(56, 189, 248, 0.12), inset 0 1px 0 rgba(125, 211, 252, 0.15) !important;
                    }
                    .profile-stat-box-lc:hover {
                        background: rgba(251, 146, 60, 0.07) !important;
                        border-color: rgba(251, 146, 60, 0.4) !important;
                        box-shadow: 0 10px 24px rgba(251, 146, 60, 0.12), inset 0 1px 0 rgba(251, 146, 60, 0.15) !important;
                    }
                    .profile-stat-box-cc:hover {
                        background: rgba(216, 180, 254, 0.07) !important;
                        border-color: rgba(216, 180, 254, 0.4) !important;
                        box-shadow: 0 10px 24px rgba(216, 180, 254, 0.12), inset 0 1px 0 rgba(216, 180, 254, 0.15) !important;
                    }
                    .profile-stat-box-total:hover {
                        background: rgba(94, 234, 212, 0.07) !important;
                        border-color: rgba(94, 234, 212, 0.4) !important;
                        box-shadow: 0 10px 24px rgba(94, 234, 212, 0.12), inset 0 1px 0 rgba(94, 234, 212, 0.15) !important;
                    }

                    .profile-platform-link {
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    .profile-platform-link-cf:hover {
                        color: #BAE6FD !important;
                        text-shadow: 0 0 12px rgba(56, 189, 248, 0.5);
                        transform: translateX(1px);
                    }
                    .profile-platform-link-lc:hover {
                        color: #FED7AA !important;
                        text-shadow: 0 0 12px rgba(251, 146, 60, 0.5);
                        transform: translateX(1px);
                    }
                    .profile-platform-link-cc:hover {
                        color: #F3E8FF !important;
                        text-shadow: 0 0 12px rgba(216, 180, 254, 0.5);
                        transform: translateX(1px);
                    }
                    .profile-platform-link:active {
                        transform: scale(0.97);
                    }

                    .profile-back-btn {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        background: rgba(255, 255, 255, 0.04);
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        color: rgba(255, 255, 255, 0.85);
                        cursor: pointer;
                        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 14px;
                        font-weight: 500;
                        letter-spacing: 0.2px;
                        padding: 9px 18px;
                        border-radius: 10px;
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
                        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                        will-change: transform, box-shadow;
                    }
                    .profile-back-btn:hover {
                        background: rgba(94, 234, 212, 0.08);
                        border-color: rgba(94, 234, 212, 0.45);
                        color: #5EEAD4;
                        transform: translateY(-1.5px);
                        box-shadow: 0 6px 20px rgba(94, 234, 212, 0.18), inset 0 1px 0 rgba(94, 234, 212, 0.2);
                    }
                    .profile-back-btn:active {
                        transform: translateY(1px) scale(0.98);
                        background: rgba(94, 234, 212, 0.14);
                    }

                    .profile-btn {
                        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 14px;
                        font-weight: 600;
                        min-height: 42px;
                        padding: 10px 22px;
                        border-radius: 10px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        outline: none;
                        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                        will-change: transform, box-shadow;
                    }
                    .profile-btn-cf {
                        background: rgba(56, 189, 248, 0.12);
                        color: #7DD3FC;
                        border: 1px solid rgba(56, 189, 248, 0.35);
                        box-shadow: 0 4px 14px rgba(56, 189, 248, 0.12);
                    }
                    .profile-btn-cf:hover:not(:disabled) {
                        background: rgba(56, 189, 248, 0.22);
                        border-color: rgba(56, 189, 248, 0.65);
                        color: #BAE6FD;
                        transform: translateY(-1.5px);
                        box-shadow: 0 8px 24px rgba(56, 189, 248, 0.25);
                    }
                    .profile-btn-cf:active:not(:disabled) {
                        transform: translateY(1px) scale(0.98);
                        background: rgba(56, 189, 248, 0.3);
                    }

                    .profile-btn-lc {
                        background: rgba(251, 146, 60, 0.12);
                        color: #FB923C;
                        border: 1px solid rgba(251, 146, 60, 0.35);
                        box-shadow: 0 4px 14px rgba(251, 146, 60, 0.12);
                    }
                    .profile-btn-lc:hover:not(:disabled) {
                        background: rgba(251, 146, 60, 0.22);
                        border-color: rgba(251, 146, 60, 0.65);
                        color: #FED7AA;
                        transform: translateY(-1.5px);
                        box-shadow: 0 8px 24px rgba(251, 146, 60, 0.25);
                    }
                    .profile-btn-lc:active:not(:disabled) {
                        transform: translateY(1px) scale(0.98);
                        background: rgba(251, 146, 60, 0.3);
                    }

                    .profile-btn-cc {
                        background: rgba(216, 180, 254, 0.12);
                        color: #D8B4FE;
                        border: 1px solid rgba(216, 180, 254, 0.35);
                        box-shadow: 0 4px 14px rgba(216, 180, 254, 0.12);
                    }
                    .profile-btn-cc:hover:not(:disabled) {
                        background: rgba(216, 180, 254, 0.22);
                        border-color: rgba(216, 180, 254, 0.65);
                        color: #F3E8FF;
                        transform: translateY(-1.5px);
                        box-shadow: 0 8px 24px rgba(216, 180, 254, 0.25);
                    }
                    .profile-btn-cc:active:not(:disabled) {
                        transform: translateY(1px) scale(0.98);
                        background: rgba(216, 180, 254, 0.3);
                    }

                    .profile-btn-teal {
                        background: rgba(94, 234, 212, 0.12);
                        color: #5EEAD4;
                        border: 1px solid rgba(94, 234, 212, 0.35);
                        box-shadow: 0 4px 14px rgba(94, 234, 212, 0.12);
                    }
                    .profile-btn-teal:hover:not(:disabled) {
                        background: rgba(94, 234, 212, 0.22);
                        border-color: rgba(94, 234, 212, 0.65);
                        color: #A7F3D0;
                        transform: translateY(-1.5px);
                        box-shadow: 0 8px 24px rgba(94, 234, 212, 0.25);
                    }
                    .profile-btn-teal:active:not(:disabled) {
                        transform: translateY(1px) scale(0.98);
                        background: rgba(94, 234, 212, 0.3);
                    }

                    .profile-btn-disconnect {
                        background: rgba(248, 113, 113, 0.08);
                        color: #F87171;
                        border: 1px solid rgba(248, 113, 113, 0.28);
                        min-height: 38px;
                        padding: 8px 18px;
                        font-size: 13.5px;
                    }
                    .profile-btn-disconnect:hover:not(:disabled) {
                        background: rgba(248, 113, 113, 0.18);
                        border-color: rgba(248, 113, 113, 0.55);
                        color: #FCA5A5;
                        transform: translateY(-1.5px);
                        box-shadow: 0 6px 18px rgba(248, 113, 113, 0.2);
                    }
                    .profile-btn-disconnect:active:not(:disabled) {
                        transform: translateY(1px) scale(0.98);
                        background: rgba(248, 113, 113, 0.26);
                    }

                    .profile-connected-badge {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        padding: 9px 16px;
                        border-radius: 9px;
                        font-size: 14.5px;
                        font-family: 'Space Grotesk', sans-serif;
                    }
                    .profile-connected-badge-cf {
                        background: rgba(56, 189, 248, 0.06);
                        border: 1px solid rgba(56, 189, 248, 0.22);
                    }
                    .profile-connected-badge-lc {
                        background: rgba(251, 146, 60, 0.06);
                        border: 1px solid rgba(251, 146, 60, 0.22);
                    }
                    .profile-connected-badge-cc {
                        background: rgba(216, 180, 254, 0.06);
                        border: 1px solid rgba(216, 180, 254, 0.22);
                    }

                    .profile-edit-email-btn {
                        background: rgba(94, 234, 212, 0.08);
                        border: 1px solid rgba(94, 234, 212, 0.25);
                        color: #5EEAD4;
                        border-radius: 6px;
                        padding: 2px 10px;
                        font-size: 12.5px;
                        font-weight: 600;
                        cursor: pointer;
                        font-family: 'Space Grotesk', sans-serif;
                        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                        margin-left: 10px;
                    }
                    .profile-edit-email-btn:hover {
                        background: rgba(94, 234, 212, 0.18);
                        border-color: rgba(94, 234, 212, 0.5);
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(94, 234, 212, 0.15);
                    }
                    .profile-edit-email-btn:active {
                        transform: translateY(1px) scale(0.96);
                    }

                    .profile-input {
                        flex: 1;
                        min-width: 180px;
                        background: rgba(255, 255, 255, 0.03);
                        color: #FFFFFF;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 10px;
                        padding: 11px 16px;
                        font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        font-size: 15px;
                        min-height: 44px;
                        outline: none;
                        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    .profile-input:hover {
                        border-color: rgba(255, 255, 255, 0.22);
                        background: rgba(255, 255, 255, 0.045);
                    }
                    .profile-input:focus {
                        border-color: rgba(94, 234, 212, 0.65) !important;
                        background: rgba(255, 255, 255, 0.05) !important;
                        box-shadow: 0 0 0 3px rgba(94, 234, 212, 0.14) !important;
                    }

                    .profile-solve-row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 12px 16px;
                        background: rgba(255, 255, 255, 0.025);
                        border: 1px solid rgba(255, 255, 255, 0.06);
                        border-radius: 10px;
                        gap: 12px;
                        flex-wrap: wrap;
                        transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                        will-change: transform, box-shadow;
                    }
                    .profile-solve-row:hover {
                        transform: translateY(-1.5px);
                        background: rgba(255, 255, 255, 0.05);
                        border-color: rgba(255, 255, 255, 0.15);
                        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.06);
                    }
                    .profile-solve-row-cf:hover {
                        border-color: rgba(56, 189, 248, 0.3) !important;
                    }
                    .profile-solve-row-lc:hover {
                        border-color: rgba(251, 146, 60, 0.3) !important;
                    }
                    .profile-solve-row-cc:hover {
                        border-color: rgba(216, 180, 254, 0.3) !important;
                    }
                    .profile-solve-problem-link {
                        color: #FFFFFF;
                        text-decoration: none;
                        font-weight: 600;
                        font-size: 15px;
                        font-family: 'Space Grotesk', sans-serif;
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        transition: color 0.15s ease, transform 0.15s ease;
                    }
                    .profile-solve-row-cf:hover .profile-solve-problem-link {
                        color: #BAE6FD;
                    }
                    .profile-solve-row-lc:hover .profile-solve-problem-link {
                        color: #FED7AA;
                    }
                    .profile-solve-row-cc:hover .profile-solve-problem-link {
                        color: #F3E8FF;
                    }
                    .profile-solve-problem-link:active {
                        transform: scale(0.98);
                    }

                    @media (max-width: 768px) {
                        .profile-card-responsive {
                            padding: 20px 16px !important;
                            border-radius: 14px !important;
                        }
                        .profile-stats-grid {
                            grid-template-columns: repeat(2, 1fr) !important;
                            gap: 10px !important;
                        }
                        .profile-cf-form {
                            flex-direction: column !important;
                            gap: 10px !important;
                        }
                        .profile-cf-form input,
                        .profile-cf-form button {
                            width: 100% !important;
                        }
                        .profile-solve-row {
                            flex-direction: column !important;
                            align-items: flex-start !important;
                            gap: 8px !important;
                        }
                    }

                    @media (max-width: 400px) {
                        .profile-card-responsive {
                            padding: 16px 12px !important;
                        }
                        .profile-stats-grid {
                            grid-template-columns: 1fr !important;
                        }
                    }
                `}</style>
                <div style={{ marginBottom: "16px" }}>
                    <button
                        onClick={() => navigate("/leaderboard")}
                        className="profile-back-btn"
                    >
                        ← Back to Leaderboard
                    </button>
                </div>

                <div
                    style={styles.card}
                    className="fade-up profile-card-responsive"
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

                    <div style={styles.statRow} className="profile-stats-grid">

                        <Stat
                            variant="cf"
                            label="CODEFORCES"
                            value={
                                profile.cfHandle ? (
                                    <a
                                        href={`https://codeforces.com/profile/${profile.cfHandle}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="profile-platform-link profile-platform-link-cf"
                                        style={{ color: "#7DD3FC", textDecoration: "none" }}
                                        title="Open Codeforces profile"
                                    >
                                        {profile.cfHandle} ↗
                                    </a>
                                ) : (
                                    <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "15px", fontWeight: 500 }}>
                                        Not Connected
                                    </span>
                                )
                            }
                        />

                        <Stat
                            variant="lc"
                            label="LEETCODE"
                            value={
                                profile.lcUsername ? (
                                    <a
                                        href={`https://leetcode.com/${profile.lcUsername}/`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="profile-platform-link profile-platform-link-lc"
                                        style={{ color: "#FB923C", textDecoration: "none" }}
                                        title="Open LeetCode profile"
                                    >
                                        {profile.lcUsername} ↗
                                    </a>
                                ) : (
                                    <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "15px", fontWeight: 500 }}>
                                        Not Connected
                                    </span>
                                )
                            }
                        />

                        <Stat
                            variant="cc"
                            label="CODECHEF"
                            value={
                                profile.ccHandle ? (
                                    <a
                                        href={`https://www.codechef.com/users/${profile.ccHandle}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="profile-platform-link profile-platform-link-cc"
                                        style={{ color: "#D8B4FE", textDecoration: "none" }}
                                        title="Open CodeChef profile"
                                    >
                                        {profile.ccHandle} ↗
                                    </a>
                                ) : (
                                    <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: "15px", fontWeight: 500 }}>
                                        Not Connected
                                    </span>
                                )
                            }
                        />

                    </div>

                    <div style={{ ...styles.statRow, marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255, 255, 255, 0.07)" }} className="profile-stats-grid">
                        <Stat
                            variant="total"
                            label="TOTAL POINTS"
                            value={profile.totalPoints || 0}
                            color="#5EEAD4"
                        />
                        <Stat
                            variant="cf"
                            label="CF POINTS"
                            value={profile.codeforcesPoints || 0}
                            color="#7DD3FC"
                        />
                        <Stat
                            variant="lc"
                            label="LC POINTS"
                            value={profile.leetcodePoints || 0}
                            color="#FB923C"
                        />
                        <Stat
                            variant="cc"
                            label="CC POINTS"
                            value={profile.codechefPoints || 0}
                            color="#D8B4FE"
                        />
                    </div>

                    {isOwner && profile.usn && (

                        <div style={styles.privateBlock}>

                            <div style={{ ...styles.privateLine, display: "flex", alignItems: "center", gap: "10px" }}>

                                <span style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    letterSpacing: "1px",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "1px solid rgba(255, 255, 255, 0.1)",
                                    color: "rgba(255, 255, 255, 0.65)"
                                }}>
                                    USN
                                </span>

                                <span style={{ fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.5px" }}>
                                    {profile.usn}
                                </span>

                            </div>

                            {!editingEmail ? (

                                <div style={{ ...styles.privateLine, display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>

                                    <span style={{
                                        fontSize: "11px",
                                        fontWeight: 700,
                                        letterSpacing: "1px",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        background: "rgba(255, 255, 255, 0.05)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        color: "rgba(255, 255, 255, 0.65)"
                                    }}>
                                        EMAIL
                                    </span>

                                    <span style={{ fontWeight: 500, color: "rgba(255, 255, 255, 0.9)" }}>
                                        {profile.email}
                                    </span>

                                    <button
                                        className="profile-edit-email-btn"
                                        onClick={() => {

                                            setEditingEmail(true);

                                            setNewEmail(
                                                profile.email
                                            );

                                            setEmailMsg("");

                                        }}
                                    >
                                        Edit
                                    </button>

                                </div>

                            ) : (

                                <form
                                    onSubmit={handleUpdateEmail}
                                    style={styles.cfForm}
                                    className="profile-cf-form"
                                >

                                    <input
                                        type="email"
                                        required
                                        value={newEmail}
                                        className="profile-input"
                                        onChange={(e) =>
                                            setNewEmail(
                                                e.target.value
                                            )
                                        }
                                    />

                                    <button
                                        className="profile-btn profile-btn-teal"
                                        disabled={savingEmail}
                                    >

                                        {savingEmail
                                            ? "Saving..."
                                            : "Save"}

                                    </button>

                                    <button
                                        type="button"
                                        className="profile-edit-email-btn"
                                        onClick={() => {

                                            setEditingEmail(
                                                false
                                            );

                                            setEmailMsg("");

                                        }}
                                    >
                                        Cancel
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

                                <div style={{ ...styles.eyebrow, color: "#7DD3FC" }}>
                                    CONNECT CODEFORCES
                                </div>

                                {!verifyInfo ? (

                                    <form
                                        onSubmit={
                                            handleStartVerification
                                        }
                                        style={styles.cfForm}
                                        className="profile-cf-form"
                                    >

                                        <input
                                            className="profile-input"
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
                                            className="profile-btn profile-btn-cf"
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
                                                style={{ ...styles.link, color: "#7DD3FC" }}
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
                                            className="profile-btn profile-btn-cf"
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

                                <div style={{ ...styles.eyebrow, color: "#7DD3FC" }}>
                                    CODEFORCES
                                </div>

                                <div className="profile-connected-badge profile-connected-badge-cf">

                                    <span>✅</span>
                                    <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>Connected as</span>
                                    <strong style={{ color: "#7DD3FC", fontWeight: 700 }}>
                                        {profile.cfHandle}
                                    </strong>

                                </div>

                                <div style={{ marginTop: 14 }}>
                                    <button
                                        className="profile-btn profile-btn-disconnect"
                                        onClick={handleDisconnectCodeforces}
                                    >
                                        Disconnect
                                    </button>
                                </div>

                            </div>

                        )}


                    {isOwner && (

                        <div style={styles.cfConnect}>

                            <div style={{ ...styles.eyebrow, color: "#FB923C" }}>
                                {profile.lcConnected ? "LEETCODE" : "CONNECT LEETCODE"}
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

                                    <div style={styles.cfForm} className="profile-cf-form">

                                        <input
                                            className="profile-input"
                                            placeholder="LeetCode Username"
                                            value={lcUsername}
                                            onChange={(e) =>
                                                setLcUsername(
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <button
                                            className="profile-btn profile-btn-lc"
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
                                                    padding: "12px 16px",
                                                    border: "1px solid rgba(251, 146, 60, 0.3)",
                                                    borderRadius: "10px",
                                                    background: "rgba(251, 146, 60, 0.08)",
                                                    fontFamily: "'Space Grotesk', sans-serif",
                                                    color: "#FB923C",
                                                    fontSize: "14px",
                                                    fontWeight: 600,
                                                    wordBreak: "break-all"
                                                }}
                                            >
                                                {lcStatus.verificationCode}
                                            </div>

                                            <div style={{ marginTop: 16 }}>
                                                <button
                                                    className="profile-btn profile-btn-lc"
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

                                    <div className="profile-connected-badge profile-connected-badge-lc">

                                        <span>✅</span>
                                        <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>Connected as</span>
                                        <strong style={{ color: "#FB923C", fontWeight: 700 }}>
                                            {profile.lcUsername}
                                        </strong>

                                    </div>

                                    <div
                                        style={{
                                            marginTop: 14
                                        }}
                                    >

                                        <button
                                            className="profile-btn profile-btn-disconnect"
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
                            <div style={{ ...styles.eyebrow, color: "#D8B4FE" }}>
                                {profile.ccConnected ? "CODECHEF" : "CONNECT CODECHEF"}
                            </div>

                            {!profile.ccConnected ? (
                                <>
                                    <div style={{ ...styles.privateLine, marginBottom: 12 }}>
                                        Connect your CodeChef account to earn leaderboard points.
                                    </div>

                                    {!ccVerifyInfo ? (
                                        <form onSubmit={handleStartCcVerification} style={styles.cfForm} className="profile-cf-form">
                                            <input
                                                className="profile-input"
                                                placeholder="CodeChef Handle"
                                                value={ccHandle}
                                                onChange={(e) => setCcHandle(e.target.value)}
                                                required
                                            />
                                            <button className="profile-btn profile-btn-cc">
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
                                                    style={{ ...styles.link, color: "#D8B4FE" }}
                                                >
                                                    problem {ccVerifyInfo.problemCode}
                                                </a>{" "}
                                                on CodeChef within {ccVerifyInfo.windowMinutes} minutes.
                                            </p>
                                            <button
                                                className="profile-btn profile-btn-cc"
                                                onClick={handleCheckCcVerification}
                                            >
                                                Verify Submission
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="profile-connected-badge profile-connected-badge-cc">
                                        <span>✅</span>
                                        <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>Connected as</span>
                                        <strong style={{ color: "#D8B4FE", fontWeight: 700 }}>{profile.ccHandle}</strong>
                                    </div>
                                    <div style={{ marginTop: 14 }}>
                                        <button
                                            className="profile-btn profile-btn-disconnect"
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

                <div style={{ ...styles.card, marginTop: "24px" }} className="fade-up profile-card-responsive">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
                        <div style={styles.eyebrow}>RECENT SOLVED PROBLEMS</div>
                        <div style={{ ...styles.dim, fontSize: "12px" }}>Last 5 across all platforms</div>
                    </div>

                    {!profile.solvedSubmissions || profile.solvedSubmissions.length === 0 ? (
                        <div style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "14px", padding: "20px 0", fontFamily: "'Space Grotesk', sans-serif" }}>
                            No solved problems recorded yet.
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {profile.solvedSubmissions.slice(0, 5).map(sub => {
                                const isCf = sub.platform === "codeforces";
                                const isCc = sub.platform === "codechef";
                                return (
                                    <div
                                        key={sub._id}
                                        className={`profile-solve-row profile-solve-row-${isCf ? "cf" : isCc ? "cc" : "lc"}`}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            padding: "12px 16px",
                                            background: "rgba(255, 255, 255, 0.025)",
                                            border: "1px solid rgba(255, 255, 255, 0.06)",
                                            borderRadius: "10px",
                                            gap: "12px",
                                            flexWrap: "wrap"
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "220px", flexWrap: "wrap" }}>
                                            <span
                                                style={{
                                                    fontSize: "11px",
                                                    fontWeight: 700,
                                                    padding: "3px 8px",
                                                    borderRadius: "6px",
                                                    fontFamily: "'Space Grotesk', sans-serif",
                                                    color: isCf ? "#7DD3FC" : isCc ? "#D8B4FE" : "#FB923C",
                                                    background: isCf ? "rgba(99, 223, 255, 0.12)" : isCc ? "rgba(216, 180, 254, 0.12)" : "rgba(251, 146, 60, 0.12)",
                                                    border: `1px solid ${isCf ? "rgba(99, 223, 255, 0.25)" : isCc ? "rgba(216, 180, 254, 0.25)" : "rgba(251, 146, 60, 0.25)"}`
                                                }}
                                            >
                                                {isCf ? "CF" : isCc ? "CC" : "LC"}
                                            </span>
                                            {sub.problemUrl ? (
                                                <a
                                                    href={sub.problemUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="profile-solve-problem-link"
                                                    style={{
                                                        textDecoration: "none",
                                                        fontWeight: 600,
                                                        fontSize: "15px",
                                                        fontFamily: "'Space Grotesk', sans-serif",
                                                        display: "inline-flex",
                                                        alignItems: "center",
                                                        gap: "4px"
                                                    }}
                                                    title="Open problem in new tab"
                                                >
                                                    {sub.problemName} ↗
                                                </a>
                                            ) : (
                                                <span style={{ fontWeight: 600, fontSize: "15px", color: "#FFFFFF", fontFamily: "'Space Grotesk', sans-serif" }}>{sub.problemName}</span>
                                            )}
                                            {sub.problemRating != null && (
                                                <span style={{
                                                    fontSize: "12px",
                                                    fontWeight: 600,
                                                    color: "#FCD34D",
                                                    background: "rgba(252, 211, 77, 0.12)",
                                                    border: "1px solid rgba(252, 211, 77, 0.25)",
                                                    padding: "2px 8px",
                                                    borderRadius: "6px",
                                                    fontFamily: "'Space Grotesk', sans-serif"
                                                }}>
                                                    ★ {sub.problemRating}
                                                </span>
                                            )}
                                            {sub.difficulty && (
                                                <span style={{
                                                    fontSize: "12px",
                                                    fontWeight: 500,
                                                    color: "rgba(255, 255, 255, 0.7)",
                                                    background: "rgba(255, 255, 255, 0.04)",
                                                    border: "1px solid rgba(255, 255, 255, 0.08)",
                                                    padding: "2px 8px",
                                                    borderRadius: "6px",
                                                    fontFamily: "'Space Grotesk', sans-serif"
                                                }}>
                                                    {sub.difficulty}
                                                </span>
                                            )}
                                        </div>

                                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                            {sub.solvedAt && (
                                                <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.55)", fontFamily: "'Space Grotesk', sans-serif" }}>
                                                    {new Date(sub.solvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </span>
                                            )}
                                            <span
                                                style={{
                                                    color: "#5EEAD4",
                                                    background: "rgba(94, 234, 212, 0.12)",
                                                    border: "1px solid rgba(94, 234, 212, 0.3)",
                                                    borderRadius: "6px",
                                                    padding: "3px 10px",
                                                    fontSize: "13px",
                                                    fontWeight: 600,
                                                    fontFamily: "'Space Grotesk', sans-serif"
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
    color,
    variant = "default"
}) {
    const variantStyles = {
        cf: {
            bg: "rgba(56, 189, 248, 0.035)",
            border: "rgba(56, 189, 248, 0.16)",
            labelColor: "#7DD3FC"
        },
        lc: {
            bg: "rgba(251, 146, 60, 0.035)",
            border: "rgba(251, 146, 60, 0.16)",
            labelColor: "#FB923C"
        },
        cc: {
            bg: "rgba(216, 180, 254, 0.035)",
            border: "rgba(216, 180, 254, 0.16)",
            labelColor: "#D8B4FE"
        },
        total: {
            bg: "rgba(94, 234, 212, 0.035)",
            border: "rgba(94, 234, 212, 0.18)",
            labelColor: "#5EEAD4"
        },
        default: {
            bg: "rgba(255, 255, 255, 0.03)",
            border: "rgba(255, 255, 255, 0.07)",
            labelColor: "rgba(255, 255, 255, 0.6)"
        }
    }[variant] || {
        bg: "rgba(255, 255, 255, 0.03)",
        border: "rgba(255, 255, 255, 0.07)",
        labelColor: "rgba(255, 255, 255, 0.6)"
    };

    return (
        <div
            className={`profile-stat-box profile-stat-box-${variant}`}
            style={{
                ...styles.stat,
                background: variantStyles.bg,
                borderColor: variantStyles.border
            }}
        >
            <div
                style={{
                    ...styles.statLabel,
                    color: variantStyles.labelColor
                }}
            >
                {label}
            </div>
            <div
                style={{
                    ...styles.statValue,
                    color: color || "var(--text)"
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
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
    },

    backBtn: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        background: "rgba(255, 255, 255, 0.04)",
        border: "1px solid rgba(255, 255, 255, 0.12)",
        color: "rgba(255, 255, 255, 0.85)",
        cursor: "pointer",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "14px",
        fontWeight: 500,
        letterSpacing: "0.2px",
        padding: "9px 18px",
        borderRadius: "10px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
    },

    main: {
        maxWidth: "940px",
        margin: "0 auto",
        padding: "var(--space-4) var(--space-3) 48px"
    },

    card: {
        background: "rgba(10, 13, 19, 0.72)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "16px",
        padding: "28px 30px",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 24px 60px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.09)"
    },

    nameRow: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        flexWrap: "wrap"
    },

    name: {
        margin: 0,
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "clamp(26px, 4.5vw, 34px)",
        fontWeight: 700,
        letterSpacing: "-0.3px",
        color: "#FFFFFF",
        textShadow: "0 0 24px rgba(255, 255, 255, 0.12)"
    },

    youTag: {
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "11.5px",
        fontWeight: 600,
        color: "#FCD34D",
        background: "rgba(252, 211, 77, 0.12)",
        border: "1px solid rgba(252, 211, 77, 0.3)",
        padding: "4px 12px",
        borderRadius: "999px",
        letterSpacing: "0.8px"
    },

    statRow: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "14px",
        marginTop: "22px"
    },

    stat: {
        minWidth: "120px",
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.07)",
        borderRadius: "12px",
        padding: "16px 18px",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)"
    },

    statLabel: {
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "12px",
        fontWeight: 600,
        color: "rgba(255, 255, 255, 0.6)",
        letterSpacing: "1px",
        marginBottom: "6px",
        textTransform: "uppercase"
    },

    statValue: {
        fontSize: "18px",
        fontWeight: 700,
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        wordBreak: "break-all"
    },

    privateBlock: {
        marginTop: "26px",
        paddingTop: "20px",
        borderTop: "1px solid rgba(255, 255, 255, 0.07)",
        fontFamily: "'Space Grotesk', sans-serif"
    },

    privateLine: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "15px",
        color: "#FFFFFF",
        marginBottom: "10px",
        lineHeight: 1.6,
        wordBreak: "break-word"
    },

    dim: {
        color: "rgba(255, 255, 255, 0.6)",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 500
    },

    editLink: {
        background: "transparent",
        border: "none",
        color: "#5EEAD4",
        cursor: "pointer",
        padding: 0,
        marginLeft: "8px",
        textDecoration: "underline",
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "14px",
        fontWeight: 500
    },

    cfConnect: {
        marginTop: "24px",
        paddingTop: "20px",
        borderTop: "1px solid rgba(255, 255, 255, 0.07)"
    },

    eyebrow: {
        color: "#5EEAD4",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "2px",
        marginBottom: "12px",
        textTransform: "uppercase"
    },

    cfForm: {
        display: "flex",
        gap: "12px",
        flexWrap: "wrap"
    },

    input: {
        flex: 1,
        minWidth: "180px",
        background: "rgba(255, 255, 255, 0.03)",
        color: "#FFFFFF",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "10px",
        padding: "11px 16px",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontSize: "15px",
        minHeight: "44px",
        outline: "none",
        transition: "border-color 0.2s ease"
    },

    smallBtn: {
        background: "rgba(94, 234, 212, 0.12)",
        color: "#5EEAD4",
        border: "1px solid rgba(94, 234, 212, 0.35)",
        borderRadius: "10px",
        padding: "11px 22px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "14px",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        minHeight: "44px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 4px 14px rgba(94, 234, 212, 0.15)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
    },

    disconnectBtn: {
        background: "rgba(248, 113, 113, 0.1)",
        color: "#F87171",
        border: "1px solid rgba(248, 113, 113, 0.3)",
        borderRadius: "10px",
        padding: "9px 20px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: "13.5px",
        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        minHeight: "40px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
    },

    instructions: {
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "15px",
        lineHeight: 1.6,
        color: "rgba(255, 255, 255, 0.9)"
    },

    link: {
        color: "#5EEAD4",
        fontWeight: 600,
        textDecoration: "underline",
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "15px"
    },

    verifyMsg: {
        marginTop: "14px",
        fontFamily: "'Space Grotesk', sans-serif",
        color: "#FCD34D",
        fontSize: "14px"
    },

    error: {
        color: "var(--accent-red)",
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: "14px"
    }
};
