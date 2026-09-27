import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getSessionUser } from '../api';

export default function AdminPage() {
  const [tab, setTab] = useState('users');
  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    if (user.role !== 'admin') { navigate('/leaderboard'); return; }
  }, []);

  if (!user || user.role !== 'admin') return null;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/leaderboard')}>← Leaderboard</button>
        <div style={styles.headerTitle}>ADMIN CONSOLE</div>
      </header>

      <main style={styles.main} className="page-main">
        <div style={styles.tabRow} className="admin-tab-row">
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
          <TabButton active={tab === 'review'} onClick={() => setTab('review')}>Review Queue</TabButton>
          <TabButton active={tab === 'suggestions'} onClick={() => setTab('suggestions')}>User Suggestions</TabButton>
          <TabButton active={tab === 'audit'} onClick={() => setTab('audit')}>Audit Log</TabButton>
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'review' && <ReviewTab />}
        {tab === 'suggestions' && <SuggestionsTab />}
        {tab === 'audit' && <AuditTab />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}
    >
      {children}
    </button>
  );
}

/* ---------------- Users Tab ---------------- */

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); // userId pending confirmation
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.adminListUsers();
      setUsers(res);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSoftRemove(u) {
    setBusyId(u._id);
    try {
      await api.adminSoftRemove(u._id, 'Removed via admin panel');
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(u) {
    setBusyId(u._id);
    try {
      await api.adminReactivate(u._id, 'Reactivated via admin panel');
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleHardDelete(u) {
    setBusyId(u._id);
    try {
      await api.adminHardDelete(u._id, 'Hard deleted via admin panel');
      setMsg('Deleted. Leaderboard updates automatically.');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}
      {msg && <div style={styles.infoMsg}>{msg}</div>}

      <div style={styles.table} className="admin-table-scroll">
        <div className="admin-table-inner">
          <div style={styles.tableHeader}>
            <span style={{ ...styles.col, flex: 2 }}>NAME / USN</span>
            <span style={{ ...styles.col, flex: 1 }}>CF HANDLE</span>
            <span style={{ ...styles.col, flex: 1 }}>LC HANDLE</span>
            <span style={{ ...styles.col, width: '90px' }}>STATUS</span>
            <span style={{ ...styles.col, width: '90px' }}>ROLE</span>
            <span style={{ ...styles.col, width: '180px' }}>ACTIONS</span>
          </div>

          {users.map(u => (
            <div key={u._id} style={styles.tableRow}>
              <div style={{ flex: 2 }}>
                <div style={{ fontWeight: 600 }}>{u.name}</div>
                <div style={styles.subtext}>{u.usn} · {u.email}</div>
              </div>

              <div style={{ flex: 1 }}>
                {u.cfHandle ? (
                  <span>
                    {u.cfHandle}
                    {u.cfConnected && <span style={styles.verifiedDot} title="Verified">✓</span>}
                  </span>
                ) : (
                  <span style={styles.dim}>—</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                {u.lcUsername ? (
                  <span>
                    {u.lcUsername}
                    {u.lcConnected && <span style={styles.verifiedDot} title="Verified">✓</span>}
                  </span>
                ) : (
                  <span style={styles.dim}>—</span>
                )}
              </div>

              <div style={{ width: '90px' }}>
                <span style={u.isActive ? styles.pillGreen : styles.pillRed}>
                  {u.isActive ? 'Active' : 'Soft-Rem'}
                </span>
              </div>

              <div style={{ width: '90px' }}>
                <span style={styles.dim}>{u.role}</span>
              </div>

              <div style={{ width: '180px', display: 'flex', gap: '6px' }}>
                {u.isActive ? (
                  <button
                    style={styles.actionBtn}
                    disabled={busyId === u._id}
                    onClick={() => handleSoftRemove(u)}
                  >
                    Soft-Remove
                  </button>
                ) : (
                  <button
                    style={styles.actionBtnGreen}
                    disabled={busyId === u._id}
                    onClick={() => handleReactivate(u)}
                  >
                    Reactivate
                  </button>
                )}

                {confirmDelete === u._id ? (
                  <button
                    style={styles.actionBtnRed}
                    disabled={busyId === u._id}
                    onClick={() => handleHardDelete(u)}
                  >
                    Confirm?
                  </button>
                ) : (
                  <button
                    style={styles.actionBtnRedOutline}
                    onClick={() => setConfirmDelete(u._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Review Queue Tab ---------------- */

function ReviewTab() {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('unreviewed');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    try {
      const res = await api.adminListSubmissions(filter);
      setSubmissions(res);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReview(s, status) {
    setBusyId(s._id);
    try {
      await api.adminReviewSubmission(s._id, status, `Marked as ${status} via admin panel`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
        {['unreviewed', 'flagged', 'cleared'].map(st => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            style={{ ...styles.actionBtn, ...(filter === st ? styles.tabActive : {}) }}
          >
            {st.toUpperCase()}
          </button>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {submissions.length === 0 ? (
        <div style={styles.empty}>No {filter} submissions found.</div>
      ) : (
        <div style={styles.table} className="admin-table-scroll">
          <div className="admin-table-inner">
            <div style={styles.tableHeader}>
              <span style={{ ...styles.col, flex: 2 }}>USER</span>
              <span style={{ ...styles.col, flex: 2 }}>CONTEST / PROBLEM</span>
              <span style={{ ...styles.col, width: '90px' }}>POINTS</span>
              <span style={{ ...styles.col, width: '160px' }}>ACTIONS</span>
            </div>

            {submissions.map(s => {
              const u = s.userId || {};
              return (
                <div key={s._id} style={styles.tableRow}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontWeight: 600 }}>{u.name || 'Unknown'}</div>
                    <div style={styles.subtext}>{u.usn} ({u.cfHandle})</div>
                  </div>

                  <div style={{ flex: 2 }}>
                    <div>Contest {s.contestId}</div>
                    <div style={styles.subtext}>Prob {s.problemIndex} · Sub #{s.submissionId}</div>
                  </div>

                  <div style={{ width: '90px' }}>
                    <span style={styles.pillGreen}>+{s.points} pts</span>
                  </div>

                  <div style={{ width: '160px', display: 'flex', gap: '6px' }}>
                    <button
                      style={styles.actionBtnGreen}
                      disabled={busyId === s._id}
                      onClick={() => handleReview(s, 'cleared')}
                    >
                      Clear
                    </button>
                    <button
                      style={styles.actionBtnRedOutline}
                      disabled={busyId === s._id}
                      onClick={() => handleReview(s, 'flagged')}
                    >
                      Flag Plag
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- User Suggestions Tab (Admin Only) ---------------- */

function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.adminListSuggestions();
      setSuggestions(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(s) {
    setBusyId(s._id);
    try {
      await api.adminDeleteSuggestion(s._id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.empty}>Loading suggestions...</div>
      ) : suggestions.length === 0 ? (
        <div style={styles.empty}>No user suggestions received yet.</div>
      ) : (
        <div style={styles.table} className="admin-table-scroll">
          <div className="admin-table-inner">
            <div style={styles.tableHeader}>
              <span style={{ ...styles.col, flex: 2 }}>SUBMITTED BY</span>
              <span style={{ ...styles.col, flex: 4 }}>SUGGESTION DETAILS</span>
              <span style={{ ...styles.col, flex: 2 }}>DATE &amp; TIME</span>
              <span style={{ ...styles.col, width: '100px', textAlign: 'right' }}>ACTION</span>
            </div>

            {suggestions.map(s => {
              const u = s.userId || {};
              return (
                <div key={s._id} style={{ ...styles.tableRow, alignItems: 'flex-start', padding: '14px 16px' }}>
                  <div style={{ flex: 2 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name || 'User'}</div>
                    <div style={styles.subtext}>{u.usn ? `USN: ${u.usn}` : ''}</div>
                    <div style={styles.subtext}>{u.email || ''}</div>
                  </div>

                  <div style={{ flex: 4, whiteSpace: 'pre-wrap', color: 'var(--text)', lineHeight: '1.5', fontFamily: 'inherit' }}>
                    {s.text}
                  </div>

                  <div style={{ flex: 2, fontSize: '11px', color: 'var(--text-dim)' }}>
                    {new Date(s.createdAt).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </div>

                  <div style={{ width: '100px', textAlign: 'right' }}>
                    <button
                      style={styles.actionBtnRedOutline}
                      disabled={busyId === s._id}
                      onClick={() => handleDelete(s)}
                    >
                      {busyId === s._id ? 'Dismissing...' : 'Dismiss'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Audit Log Tab ---------------- */

function AuditTab() {
  const [actions, setActions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminAuditLog()
      .then(res => setActions(res))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.table} className="admin-table-scroll">
        <div className="admin-table-inner">
          <div style={styles.tableHeader}>
            <span style={{ ...styles.col, flex: 2 }}>TIMESTAMP</span>
            <span style={{ ...styles.col, flex: 1.5 }}>ACTION</span>
            <span style={{ ...styles.col, flex: 2 }}>REASON</span>
          </div>

          {actions.map(a => (
            <div key={a._id} style={styles.tableRow}>
              <div style={{ flex: 2, fontSize: '12px' }}>
                {new Date(a.createdAt).toLocaleString()}
              </div>
              <div style={{ flex: 1.5 }}>
                <span style={a.action.includes('remove') || a.action.includes('flag') ? styles.pillRed : styles.pillGreen}>
                  {a.action}
                </span>
              </div>
              <div style={{ flex: 2, color: 'var(--text-dim)' }}>
                {a.reason || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    padding: '14px 16px',
    borderBottom: '1px solid var(--border)'
  },
  backBtn: {
    background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--text-dim)',
    fontSize: '12px', fontFamily: "'Orbitron', sans-serif", cursor: 'pointer', padding: '6px 12px', borderRadius: '4px'
  },
  headerTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '13px', fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: '2px',
    userSelect: 'none'
  },
  main: { maxWidth: '1040px', margin: '0 auto', padding: 'var(--space-4) var(--space-3)' },
  tabRow: { display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' },
  tab: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-dim)',
    padding: '10px 16px',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '12px',
    letterSpacing: '0.5px',
    userSelect: 'none',
    cursor: 'pointer',
    minHeight: '40px'
  },
  tabActive: { borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' },
  table: { border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  tableHeader: {
    display: 'flex',
    padding: '10px 16px',
    background: 'var(--surface-raised)',
    borderBottom: '1px solid var(--border)'
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px',
    fontFamily: "'Orbitron', sans-serif"
  },
  col: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '1.5px',
    userSelect: 'none'
  },
  subtext: { fontSize: '11px', color: 'var(--text-dim)', fontFamily: "'Orbitron', sans-serif" },
  dim: { color: 'var(--text-dim)', fontFamily: "'Orbitron', sans-serif" },
  verifiedDot: { color: 'var(--accent-green)', marginLeft: '6px', fontSize: '10px' },
  pillGreen: {
    color: 'var(--accent-green)', background: 'var(--accent-green-dim)',
    border: '1px solid var(--accent-green)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px',
    fontFamily: "'Orbitron', sans-serif"
  },
  pillRed: {
    color: 'var(--accent-red)', background: 'var(--accent-red-dim)',
    border: '1px solid var(--accent-red)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px',
    fontFamily: "'Orbitron', sans-serif"
  },
  actionBtn: {
    background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '4px',
    color: 'var(--text)', padding: '8px 12px', fontSize: '11px', fontFamily: "'Orbitron', sans-serif", cursor: 'pointer', minHeight: '34px'
  },
  actionBtnGreen: {
    background: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '4px',
    color: 'var(--accent-green)', padding: '8px 12px', fontSize: '11px', fontFamily: "'Orbitron', sans-serif", cursor: 'pointer', minHeight: '34px'
  },
  actionBtnRed: {
    background: 'var(--accent-red)', border: 'none', borderRadius: '4px',
    color: '#2A0A08', padding: '8px 12px', fontSize: '11px', fontWeight: 600, fontFamily: "'Orbitron', sans-serif", cursor: 'pointer', minHeight: '34px'
  },
  actionBtnRedOutline: {
    background: 'transparent', border: '1px solid var(--accent-red)', borderRadius: '4px',
    color: 'var(--accent-red)', padding: '8px 12px', fontSize: '11px', fontFamily: "'Orbitron', sans-serif", cursor: 'pointer', minHeight: '34px'
  },
  error: { color: 'var(--accent-red)', marginBottom: 'var(--space-3)', fontFamily: "'Orbitron', sans-serif", fontSize: '13px' },
  infoMsg: { color: 'var(--accent-gold)', marginBottom: 'var(--space-3)', fontFamily: "'Orbitron', sans-serif", fontSize: '12px' },
  empty: { padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'Orbitron', sans-serif", fontSize: '13px' }
};