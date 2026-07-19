const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(
      res.ok
        ? 'Server returned an unexpected response. Please try again.'
        : `Server error (${res.status}). The backend may still be deploying — try again in a minute.`
    );
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  signup: (body) => request('/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  currentLeaderboard: () => request('/leaderboard/current'),
  refresh: () => request('/leaderboard/refresh', { method: 'POST' }),
  profile: (userId) => request(`/profile/${userId}`),
  updateEmail: (email) => request('/profile/me/email', { method: 'PATCH', body: JSON.stringify({ email }) }),
  startCfVerification: (cfHandle) => request('/cf/start-verification', { method: 'POST', body: JSON.stringify({ cfHandle }) }),
  checkCfVerification: () => request('/cf/verify', { method: 'POST' }),

  // Admin
  adminListUsers: () => request('/admin/users'),
  adminListSubmissions: (status = 'unreviewed') => request(`/admin/submissions?status=${status}`),
  adminSoftRemove: (userId, reason) => request(`/admin/users/${userId}/soft-remove`, { method: 'POST', body: JSON.stringify({ reason }) }),
  adminReactivate: (userId, reason) => request(`/admin/users/${userId}/reactivate`, { method: 'POST', body: JSON.stringify({ reason }) }),
  adminHardDelete: (userId, reason) => request(`/admin/users/${userId}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
  adminReviewSubmission: (submissionId, status, reason) => request(`/admin/submissions/${submissionId}/review`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
  adminAuditLog: () => request('/admin/audit-log')
};

export function saveSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function getSessionUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

// Fire-and-forget ping to wake a sleeping Render backend before the user submits a form
export function warmUpServer() {
  fetch(`${BASE_URL}/health`).catch(() => {});
}
