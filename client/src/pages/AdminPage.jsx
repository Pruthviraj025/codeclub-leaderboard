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
        <div style={styles.headerTitle} className="mono">ADMIN CONSOLE</div>
      </header>

      <main style={styles.main}>
        <div style={styles.tabRow}>
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
          <TabButton active={tab === 'review'} onClick={() => setTab('review')}>Review Queue</TabButton>
          <TabButton active={tab === 'audit'} onClick={() => setTab('audit')}>Audit Log</TabButton>
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'review' && <ReviewTab />}
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
      className="mono"
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
      const res = await api.adminHardDelete(u._id, 'Hard deleted via admin panel');
      setMsg(`Deleted. Recompute job: ${res.jobId}`);
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

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span style={{ ...styles.col, flex: 2 }}>NAME / USN</span>
          <span style={{ ...styles.col, flex: 1 }}>CF HANDLE</span>
          <span style={{ ...styles.col, width: '90px' }}>STATUS</span>
          <span style={{ ...styles.col, width: '90px' }}>ROLE</span>
          <span style={{ ...styles.col, width: '260px' }}>ACTIONS</span>
        </div>
        {users.map((u) => (
          <div key={u._id} style={styles.tableRow} className="row-hover">
            <span style={{ flex: 2 }}>
              <div>{u.name}</div>
              <div className="mono" style={styles.subtext}>{u.usn}</div>
            </span>
            <span style={{ flex: 1 }} className="mono">
              {u.cfHandle || <span style={styles.dim}>—</span>}
              {u.cfConnected && <span style={styles.verifiedDot} title="Verified">●</span>}
            </span>
            <span style={{ width: '90px' }}>
              <StatusPill active={u.isActive} />
            </span>
            <span style={{ width: '90px' }} className="mono">
              {u.role === 'admin' ? <span style={{ color: 'var(--accent-gold)' }}>admin</span> : 'user'}
            </span>
            <span style={{ width: '260px', display: 'flex', gap: '6px' }}>
              {u.isActive ? (
                <button style={styles.actionBtn} disabled={busyId === u._id} onClick={() => handleSoftRemove(u)}>
                  Soft-remove
                </button>
              ) : (
                <button style={styles.actionBtnGreen} disabled={busyId === u._id} onClick={() => handleReactivate(u)}>
                  Reactivate
                </button>
              )}
              {confirmDelete === u._id ? (
                <>
                  <button style={styles.actionBtnRed} disabled={busyId === u._id} onClick={() => handleHardDelete(u)}>
                    Confirm delete
                  </button>
                  <button style={styles.actionBtn} onClick={() => setConfirmDelete(null)}>Cancel</button>
                </>
              ) : (
                <button style={styles.actionBtnRedOutline} onClick={() => setConfirmDelete(u._id)}>
                  Hard-delete
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ active }) {
  return (
    <span style={active ? styles.pillGreen : styles.pillRed} className="mono">
      {active ? 'active' : 'removed'}
    </span>
  );
}

/* ---------------- Review Tab ---------------- */

function ReviewTab() {
  const [submissions, setSubmissions] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.adminListSubmissions('unreviewed');
      setSubmissions(res);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReview(sub, status) {
    setBusyId(sub._id);
    try {
      await api.adminReviewSubmission(sub._id, status, `Marked ${status} via admin panel`);
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
      {submissions.length === 0 ? (
        <div style={styles.empty}>Queue is empty — nothing pending review.</div>
      ) : (
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={{ ...styles.col, flex: 1 }}>USER</span>
            <span style={{ ...styles.col, flex: 1 }}>PROBLEM</span>
            <span style={{ ...styles.col, width: '80px' }}>RATING</span>
            <span style={{ ...styles.col, width: '80px' }}>POINTS</span>
            <span style={{ ...styles.col, width: '180px' }}>ACTIONS</span>
          </div>
          {submissions.map((s) => (
            <div key={s._id} style={styles.tableRow} className="row-hover">
              <span style={{ flex: 1 }}>{s.userId?.name || 'Unknown'}</span>
              <span style={{ flex: 1 }} className="mono">{s.problemId}</span>
              <span style={{ width: '80px' }} className="mono">{s.problemRating}</span>
              <span style={{ width: '80px' }} className="mono">{s.points}</span>
              <span style={{ width: '180px', display: 'flex', gap: '6px' }}>
                <button style={styles.actionBtnGreen} disabled={busyId === s._id} onClick={() => handleReview(s, 'cleared')}>
                  Clear
                </button>
                <button style={styles.actionBtnRed} disabled={busyId === s._id} onClick={() => handleReview(s, 'flagged')}>
                  Flag
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Audit Tab ---------------- */

function AuditTab() {
  const [actions, setActions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminAuditLog().then(setActions).catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span style={{ ...styles.col, width: '120px' }}>ACTION</span>
          <span style={{ ...styles.col, flex: 1 }}>TARGET</span>
          <span style={{ ...styles.col, flex: 1 }}>REASON</span>
          <span style={{ ...styles.col, width: '160px' }}>WHEN</span>
        </div>
        {actions.map((a) => (
          <div key={a._id} style={styles.tableRow}>
            <span style={{ width: '120px' }}><ActionPill action={a.action} /></span>
            <span style={{ flex: 1 }} className="mono">{a.targetUserSnapshot?.name || '—'}</span>
            <span style={{ flex: 1, color: 'var(--text-dim)' }}>{a.reason || '—'}</span>
            <span style={{ width: '160px' }} className="mono">{new Date(a.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionPill({ action }) {
  const colorMap = {
    soft_remove: 'var(--accent-red)',
    reactivate: 'var(--accent-green)',
    hard_delete: 'var(--accent-red)',
    flag_submission: 'var(--accent-red)',
    clear_flag: 'var(--accent-green)'
  };
  return <span className="mono" style={{ color: colorMap[action] || 'var(--text-dim)', fontSize: '11px' }}>{action}</span>;
}

const styles = {
  page: { minHeight: '100vh' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-3) var(--space-5)',
    borderBottom: '1px solid var(--border)'
  },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '13px', fontFamily: 'var(--font-mono)' },
  headerTitle: { fontSize: '12px', color: 'var(--accent-gold)', letterSpacing: '2px' },
  main: { maxWidth: '960px', margin: '0 auto', padding: 'var(--space-5) var(--space-4)' },
  tabRow: { display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' },
  tab: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-dim)',
    padding: '8px 16px',
    fontSize: '12px'
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
    fontSize: '13px'
  },
  col: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '1px' },
  subtext: { fontSize: '11px', color: 'var(--text-dim)' },
  dim: { color: 'var(--text-dim)' },
  verifiedDot: { color: 'var(--accent-green)', marginLeft: '6px', fontSize: '10px' },
  pillGreen: {
    color: 'var(--accent-green)', background: 'var(--accent-green-dim)',
    border: '1px solid var(--accent-green)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px'
  },
  pillRed: {
    color: 'var(--accent-red)', background: 'var(--accent-red-dim)',
    border: '1px solid var(--accent-red)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px'
  },
  actionBtn: {
    background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '4px',
    color: 'var(--text)', padding: '6px 10px', fontSize: '11px'
  },
  actionBtnGreen: {
    background: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '4px',
    color: 'var(--accent-green)', padding: '6px 10px', fontSize: '11px'
  },
  actionBtnRed: {
    background: 'var(--accent-red)', border: 'none', borderRadius: '4px',
    color: '#2A0A08', padding: '6px 10px', fontSize: '11px', fontWeight: 600
  },
  actionBtnRedOutline: {
    background: 'transparent', border: '1px solid var(--accent-red)', borderRadius: '4px',
    color: 'var(--accent-red)', padding: '6px 10px', fontSize: '11px'
  },
  error: { color: 'var(--accent-red)', marginBottom: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: '13px' },
  infoMsg: { color: 'var(--accent-gold)', marginBottom: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: '12px' },
  empty: { padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '13px' }
};
