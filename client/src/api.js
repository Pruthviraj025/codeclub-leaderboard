const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
    return localStorage.getItem("token");
}

async function request(path, options = {}) {
    const token = getToken();
    const timeoutMs = options.timeoutMs || 60000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res;
    try {
        res = await fetch(`${BASE_URL}${path}`, {
            ...options,
            signal: controller.signal,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {})
            }
        });
    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error("Request timed out. The server may be slow to respond — try again.");
        }
        throw new Error("Network error. Check your connection and try again.");
    } finally {
        clearTimeout(timeoutId);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        throw new Error(res.ok ? "Unexpected response from server." : `Server error (${res.status}). Backend may still be starting.`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed.");
    return data;
}

export const api = {
    signup: body => request("/auth/signup", { method: "POST", body: JSON.stringify(body) }),
    login: body => request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
    forgotPassword: email => request("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),
    verifyOtp: (email, otp) => request("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) }),
    resetPassword: (resetToken, newPassword) => request("/auth/reset-password", { method: "POST", body: JSON.stringify({ resetToken, newPassword }) }),
    currentLeaderboard: () => request("/leaderboard/current"),
    refresh: () => request("/leaderboard/refresh", { method: "POST" }),
    refreshCf: () => request("/leaderboard/refresh/cf", { method: "POST" }),
    refreshLc: () => request("/leaderboard/refresh/lc", { method: "POST", timeoutMs: 100000 }),
    profile: userId => request(`/profile/${userId}`),
    updateEmail: email => request("/profile/me/email", { method: "PATCH", body: JSON.stringify({ email }) }),
    startCfVerification: cfHandle => request("/cf/start-verification", { method: "POST", body: JSON.stringify({ cfHandle }) }),
    checkCfVerification: () => request("/cf/verify", { method: "POST" }),
    startLcVerification: lcUsername => request("/lc/start-verification", { method: "POST", body: JSON.stringify({ username: lcUsername }) }),
    verifyLc: () => request("/lc/verify", { method: "POST" }),
    lcStatus: () => request("/lc/status"),
    disconnectLc: () => request("/lc/disconnect", { method: "DELETE" }),
    contests: () => request("/contests"),
    analyticsDays: () => request("/analytics/days"),
    analyticsForDay: date => request(`/analytics/day/${date}`),
    analyticsRange: () => request("/analytics/range"),
    analyticsDeductions: () => request("/analytics/deductions"),
    adminListUsers: () => request("/admin/users"),
    adminListSubmissions: (status = "unreviewed") => request(`/admin/submissions?status=${status}`),
    adminSoftRemove: (userId, reason) => request(`/admin/users/${userId}/soft-remove`, { method: "POST", body: JSON.stringify({ reason }) }),
    adminReactivate: (userId, reason) => request(`/admin/users/${userId}/reactivate`, { method: "POST", body: JSON.stringify({ reason }) }),
    adminHardDelete: (userId, reason) => request(`/admin/users/${userId}`, { method: "DELETE", body: JSON.stringify({ reason }) }),
    adminReviewSubmission: (submissionId, status, reason) => request(`/admin/submissions/${submissionId}/review`, { method: "PATCH", body: JSON.stringify({ status, reason }) }),
    adminAuditLog: () => request("/admin/audit-log")
};

export function saveSession(token, user) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
}

export function getSessionUser() {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
}

export function warmUpServer() {
    fetch(`${BASE_URL}/health`).catch(() => {});
}
