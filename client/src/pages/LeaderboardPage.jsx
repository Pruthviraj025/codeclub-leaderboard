import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getSessionUser, clearSession } from '../api';

export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');
  const [showInfo, setShowInfo] = useState(false);
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
            <div style={styles.titleWithInfo}>
              <h1 style={styles.title}>Leaderboard</h1>
              <button
                style={styles.infoBtn}
                onClick={() => setShowInfo(true)}
                aria-label="How scoring works"
                title="How scoring works"
              >
                i
              </button>
            </div>
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

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
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

// Mirrors utils/ratingMap.js on the backend — keep in sync if that ever changes.
const RATING_MAP = [
  [800, 100], [900, 200], [1000, 500], [1100, 600], [1200, 900],
  [1300, 1000], [1400, 1300], [1500, 1400], [1600, 1700], [1700, 1800],
  [1800, 2100], [1900, 2200], [2000, 2500], [2100, 2600], [2200, 2900],
  [2300, 3000], [2400, 3300], [2500, 3400], [2600, 3700], [2700, 3800],
  [2800, 4100], [2900, 4200], [3000, 4500], [3100, 4600], [3200, 4900],
  [3300, 5000], [3400, 5300], [3500, 5400]
];

function InfoModal({ onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} className="scale-in">
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>How this works</h2>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={styles.modalBody}>
          <section style={styles.section}>
            <div style={styles.sectionTitle}>Counting a solve</div>
            <ul style={styles.list}>
              <li>Connect your Codeforces handle on your Profile page first — only submissions made <em>after</em> connecting are counted.</li>
              <li>Only <strong>Accepted (AC)</strong> submissions count. Wrong answers, TLEs, etc. don't score anything.</li>
              <li>Each problem counts once — resubmitting an already-solved problem doesn't add points again.</li>
              <li>Unrated problems (no CF rating) don't count at all.</li>
              <li>Nothing updates automatically — hit <strong>"↻ Refresh my solves"</strong> on this page to pull your latest submissions from Codeforces. There's a short cooldown between refreshes.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>Points by problem rating</div>
            <div style={styles.ratingGrid}>
              {RATING_MAP.map(([rating, points]) => (
                <div key={rating} style={styles.ratingCell}>
                  <span className="mono" style={styles.ratingNum}>{rating}</span>
                  <span className="mono" style={styles.ratingPts}>{points}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>Weekly stars (at Monday reset)</div>
            <ul style={styles.list}>
              <li><span style={{ color: 'var(--accent-green)' }}>●</span> <strong>7 or more solvers</strong> that week → top 3 by points get a green star, bottom 3 get a red star, everyone else gets nothing.</li>
              <li><span style={{ color: 'var(--accent-green)' }}>●</span> <strong>6 or fewer solvers</strong> that week → top half get a green star, bottom half get a red star (the exact middle gets nothing if the count is odd).</li>
              <li>Earning a green star clears your oldest un-cleared red star, if you have one.</li>
              <li>A red star does not get cleared by anything except a later green star.</li>
              <li>Only people who solved at least one problem that week appear in the ranking — solving nothing means you simply don't appear, not a red star.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
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
  titleWithInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  infoBtn: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'var(--surface-raised)',
    color: 'var(--text-dim)',
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    fontStyle: 'italic',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-4)',
    zIndex: 100
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    maxWidth: '540px',
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    background: 'var(--surface)'
  },
  modalTitle: { margin: 0, fontSize: '18px' },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '16px', cursor: 'pointer' },
  modalBody: { padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
  section: {},
  sectionTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '12px',
    letterSpacing: '1.5px',
    color: 'var(--accent-green)',
    marginBottom: 'var(--space-2)'
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text)',
    lineHeight: 1.5
  },
  ratingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '6px'
  },
  ratingCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '6px 4px',
    background: 'var(--surface-raised)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)'
  },
  ratingNum: { fontSize: '11px', color: 'var(--text-dim)' },
  ratingPts: { fontSize: '13px', color: 'var(--accent-green)', fontWeight: 700 },
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
