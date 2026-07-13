import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getSessionUser, clearSession } from '../api';

export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    try {
      const res = await api.currentLeaderboard();
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBoard(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await api.refresh();
      setRefreshMsg(
        res.pointsAdded > 0
          ? `+${res.pointsAdded} points from ${res.newlyScored.length} new solve(s)`
          : 'No new solves found'
      );
      await loadLeaderboard();
    } catch (err) {
      setRefreshMsg(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  function handleLogout() {
    clearSession();
    navigate('/');
  }

  if (!user) return null;

  return (
    <div style={styles.page}>
      <header style={styles.header} className="site-header">
        <div style={styles.logoMark}>{'<CODECLUB/>'}</div>
        <div style={styles.headerRight} className="header-right">
          <button style={styles.historyBtn} onClick={() => navigate('/history')}>History</button>
          {user.role === 'admin' && (
            <button style={styles.adminBtn} onClick={() => navigate('/admin')}>Admin</button>
          )}
          <button style={styles.profileBtn} onClick={() => navigate(`/profile/${user.id}`)}>
            My Profile
          </button>
          <button style={styles.logoutBtn} onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main style={styles.main} className="page-main">
        <div style={styles.titleRow} className="title-row">
          <div>
            <div style={styles.eyebrow}>WEEK {data?.weekNumber ?? '—'} · LIVE STANDINGS</div>
            <h1 style={styles.title}>Leaderboard</h1>
          </div>
          <button style={styles.refreshBtn} className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? 'Checking CF…' : '↻ Refresh my solves'}
          </button>
        </div>
        {refreshMsg && <div style={styles.refreshMsg}>{refreshMsg}</div>}

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.queue}>
          <div style={styles.queueHeader}>
            <span style={{ ...styles.col, width: '60px' }}>RANK</span>
            <span style={{ ...styles.col, flex: 1 }}>HANDLE</span>
            <span style={{ ...styles.col, width: '100px', textAlign: 'right' }} className="queue-col-points">POINTS</span>
          </div>
          {loadingBoard ? (
            <div style={styles.empty} className="fade-up">Loading standings…</div>
          ) : data?.leaderboard?.length ? (
            data.leaderboard.map((row, idx) => (
              <div
                key={row.userId}
                className="row-hover fade-up"
                style={{
                  ...styles.queueRow,
                  ...(row.userId === user.id ? styles.queueRowSelf : {}),
                  animationDelay: `${idx * 0.03}s`
                }}
                onClick={() => navigate(`/profile/${row.userId}`)}
              >
                <span style={{ ...styles.col, width: '60px' }} className="mono">
                  <RankBadge rank={row.rank} />
                </span>
                <span style={{ ...styles.col, flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  {row.cfHandle && (
                    <a
                      href={`https://codeforces.com/profile/${row.cfHandle}`}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      style={styles.cfIconLink}
                      title={`Open ${row.cfHandle} on Codeforces`}
                    >
                      <CfIcon />
                    </a>
                  )}
                  <span
                    className="mono"
                    style={styles.nameLink}
                    onClick={(e) => { e.stopPropagation(); navigate(`/profile/${row.userId}`); }}
                  >
                    {row.cfHandle || row.name}
                  </span>
                </span>
                <span style={{ ...styles.col, width: '100px', textAlign: 'right' }} className="mono queue-col-points">
                  {row.points}
                </span>
              </div>
            ))
          ) : (
            <div style={styles.empty}>No solves recorded yet this week. Be the first.</div>
          )}
        </div>
      </main>
    </div>
  );
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

function RankBadge({ rank }) {
  if (MEDALS[rank]) {
    return <span>{MEDALS[rank]} <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>#{rank}</span></span>;
  }
  return <span style={{ color: 'var(--text-dim)', fontWeight: 600 }}>#{rank}</span>;
}

function CfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="6" width="4" height="9" rx="1.2" fill="#FF7F00" />
      <rect x="6" y="3" width="4" height="12" rx="1.2" fill="#3776AB" />
      <rect x="11.5" y="0.5" width="4" height="14.5" rx="1.2" fill="#1FA83B" />
    </svg>
  );
}

const styles = {
  page: { minHeight: '100vh' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-3) var(--space-5)',
    borderBottom: '1px solid var(--border)'
  },
  logoMark: {
    fontFamily: 'var(--font-mono)',
    fontSize: '14px',
    color: 'var(--accent-green)',
    letterSpacing: '1px'
  },
  headerRight: { display: 'flex', gap: 'var(--space-2)' },
  historyBtn: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-dim)',
    padding: '8px 16px',
    fontSize: '13px'
  },
  adminBtn: {
    background: 'var(--accent-gold-dim)',
    border: '1px solid var(--accent-gold)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--accent-gold)',
    padding: '8px 16px',
    fontSize: '13px'
  },
  profileBtn: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    padding: '8px 16px',
    fontSize: '13px'
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-dim)',
    padding: '8px 16px',
    fontSize: '13px'
  },
  main: { maxWidth: '720px', margin: '0 auto', padding: 'var(--space-5) var(--space-4)' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-2)' },
  eyebrow: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--accent-green)',
    letterSpacing: '2px',
    marginBottom: 'var(--space-1)'
  },
  title: { fontSize: '28px', margin: 0, fontWeight: 700 },
  refreshBtn: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--accent-green)',
    color: 'var(--accent-green)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 16px',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)'
  },
  refreshMsg: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    color: 'var(--accent-gold)',
    marginBottom: 'var(--space-3)'
  },
  error: { color: 'var(--accent-red)', marginBottom: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: '13px' },
  queue: {
    marginTop: 'var(--space-4)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden'
  },
  queueHeader: {
    display: 'flex',
    padding: '10px 16px',
    background: 'var(--surface-raised)',
    borderBottom: '1px solid var(--border)'
  },
  col: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    letterSpacing: '1px'
  },
  queueRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer'
  },
  queueRowSelf: { background: 'var(--accent-green-dim)' },
  cfIconLink: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  nameLink: { cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  empty: { padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '13px' }
};
