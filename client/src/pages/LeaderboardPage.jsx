import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';


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
      setLoadingBoard(true);
      const res = await api.currentLeaderboard();
      setData(res);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard.');
    } finally {
      setLoadingBoard(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setRefreshMsg('');
    try {
      const res = await api.refresh();
      const cf = res.codeforces?.pointsAdded || 0;
      const lc = res.leetcode?.pointsAdded || 0;
      const total = res.totalPointsAdded || 0;

      const errs = [
        res.codeforces?.error ? `CF: ${res.codeforces.error}` : null,
        res.leetcode?.error ? `LC: ${res.leetcode.error}` : null
      ].filter(Boolean);

      if (errs.length) {
        setRefreshMsg(
          `Added ${total} points (CF +${cf}, LC +${lc}). ${errs.join(' · ')}`
        );
      } else {
        setRefreshMsg(
          total > 0
            ? `Added ${total} points (CF +${cf}, LC +${lc})`
            : 'No new solves found.'
        );
      }
      await loadLeaderboard();
    } catch (err) {
      setRefreshMsg(err.message);
    } finally {
      setRefreshing(false);
    }
  }

  if (!user) return null;

  return (
    <SidebarLayout active="leaderboard">
      <div style={styles.titleRow} className="title-row">
        <div>
          <div style={styles.eyebrow}>TRAILING 7 DAYS · LIVE STANDINGS</div>
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
          {refreshing ? 'Refreshing…' : '↻ Refresh my solves'}
        </button>
      </div>

      {refreshMsg && <div style={styles.refreshMsg}>{refreshMsg}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.queue}>
        <div style={styles.queueHeader}>
          <span style={{ ...styles.col, width: '60px' }} className="queue-col-rank">RANK</span>
          <span style={{ ...styles.col, flex: 1 }}>USER</span>
          <span style={{ ...styles.col, width: '90px', textAlign: 'right' }} className="queue-col-cf">CF</span>
          <span style={{ ...styles.col, width: '90px', textAlign: 'right' }} className="queue-col-lc">LC</span>
          <span style={{ ...styles.col, width: '100px', textAlign: 'right' }} className="queue-col-points">TOTAL</span>
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
              <span style={{ ...styles.col, width: '60px' }} className="mono queue-col-rank">
                <RankBadge rank={row.rank} />
              </span>

              <span style={{ ...styles.col, flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                {row.cfHandle && (

                  <a href={`https://codeforces.com/profile/${row.cfHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={styles.cfIconLink}
                    title={`Open ${row.cfHandle} on Codeforces`}
                  >
                    <CfIcon />
                  </a>
                )}
                {row.lcUsername && (

                  <a href={`https://leetcode.com/${row.lcUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={styles.cfIconLink}
                    title={`Open ${row.lcUsername} on LeetCode`}
                  >
                    <LeetCodeIcon />
                  </a>
                )}
                <span
                  className="mono"
                  style={styles.nameLink}
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${row.userId}`); }}
                >
                  {row.cfHandle || row.lcUsername || row.name}
                </span>
              </span>

              <span style={{ ...styles.col, width: '90px', textAlign: 'right', color: 'var(--accent-green)', fontFamily: "'Orbitron', sans-serif" }} className="queue-col-cf">
                {row.codeforcesPoints}
              </span>

              <span style={{ ...styles.col, width: '90px', textAlign: 'right', color: '#FFA116', fontFamily: "'Orbitron', sans-serif" }} className="queue-col-lc">
                {row.leetcodePoints}
              </span>

              <span style={{ ...styles.col, width: '100px', textAlign: 'right', fontWeight: 700, color: 'var(--text)', fontFamily: "'Orbitron', sans-serif" }} className="queue-col-points">
                {row.totalPoints}
              </span>
            </div>
          ))
        ) : (
          <div style={styles.empty}>No solves recorded in the last 7 days. Be the first.</div>
        )}
      </div>

      <div style={styles.footer}>
        <div>made with love 💖</div>
        <div>by PTVRJ</div>
      </div>

      {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
    </SidebarLayout>
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

function LeetCodeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M16.5 18.5L21 14l-4.5-4.5" stroke="#FFA116" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 14H9" stroke="#FFA116" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 5L3 12l7 7" stroke="#B3B3B3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Mirrors utils/ratingMap.js on the backend — keep in sync if that ever changes.
const RATING_MAP = [
  [800, 200], [900, 300], [1000, 600], [1100, 700], [1200, 1000],
  [1300, 1100], [1400, 1400], [1500, 1500], [1600, 1800], [1700, 1900],
  [1800, 2200], [1900, 2300], [2000, 2600], [2100, 2700], [2200, 3000],
  [2300, 3100], [2400, 3400], [2500, 3500], [2600, 3800], [2700, 3900],
  [2800, 4200], [2900, 4300], [3000, 4600], [3100, 4700], [3200, 5000],
  [3300, 5100], [3400, 5400], [3500, 5500]
];
const UNRATED_POINTS = 100;

const LEETCODE_POINTS = [
  { difficulty: 'Easy', color: '#4CAF50', range: '200–400' },
  { difficulty: 'Medium', color: '#FFC107', range: '700–1200' },
  { difficulty: 'Hard', color: '#F44336', range: '1500–2500' }
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
            <div style={styles.sectionTitle}>Supported platforms</div>
            <ul style={styles.list}>
              <li>Codeforces Accepted submissions are scored.</li>
              <li>LeetCode Accepted submissions are also scored.</li>
              <li>Both platforms contribute toward your <strong>Total Points</strong>.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>Codeforces scoring</div>
            <ul style={styles.list}>
              <li>Connect your Codeforces handle on your Profile page first — only submissions made <em>after</em> connecting are counted.</li>
              <li>Only <strong>Accepted (AC)</strong> submissions count.</li>
              <li>Each problem counts once — resubmitting doesn't add points again.</li>
              <li>Unrated problems count too — flat {UNRATED_POINTS} points each.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>LeetCode scoring</div>
            <ul style={styles.list}>
              <li>Only <strong>Accepted</strong> submissions are scored.</li>
              <li>Each problem awards points only once.</li>
              <li>Points depend on difficulty, acceptance rate, and popularity.</li>
              <li>Final scores are rounded to the nearest <strong>100</strong>.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>The 7-day window</div>
            <ul style={styles.list}>
              <li>The board always shows points from solves accepted in the <strong>trailing 7 days</strong>, recalculated live — no fixed weekly reset.</li>
              <li>A solve ages out after 7 days, but it's never un-scored — it just stops counting toward the current total.</li>
              <li>Only people with at least one solve in the current 7-day window appear in the ranking.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>Codeforces rating → points</div>
            <div style={styles.ratingGrid}>
              <div style={styles.ratingCell}>
                <span className="mono" style={styles.ratingNum}>unrated</span>
                <span className="mono" style={styles.ratingPts}>{UNRATED_POINTS}</span>
              </div>
              {RATING_MAP.map(([rating, points]) => (
                <div key={rating} style={styles.ratingCell}>
                  <span className="mono" style={styles.ratingNum}>{rating}</span>
                  <span className="mono" style={styles.ratingPts}>{points}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>LeetCode difficulty → possible points</div>
            <div style={styles.lcGrid}>
              {LEETCODE_POINTS.map(item => (
                <div key={item.difficulty} style={styles.ratingCell}>
                  <span className="mono" style={styles.ratingNum}>{item.difficulty}</span>
                  <span className="mono" style={{ ...styles.ratingPts, color: item.color }}>{item.range}</span>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>Scoring formula</div>
            <div className="mono" style={styles.formulaBox}>
              Final Score = Base Score × Acceptance Factor × Submission Factor
              <br /><br />
              Acceptance Factor = 1 + (50 − Acceptance Rate) / 100
              <br />
              Submission Factor = 1 + log₁₀(50,000,000 / Total Submissions) × 0.08
              <br /><br />
              Final Score = Round to nearest 100
              <br />
              Clamp to the range shown above.
            </div>
            <div style={styles.formulaNote}>
              Points depend on the problem's <strong>difficulty</strong>, <strong>acceptance rate</strong>, and <strong>popularity</strong>.
              <br />
              Scores are rounded to the nearest <strong>100</strong>.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh' },
  footer: {
    textAlign: 'center',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '12px',
    color: 'var(--text-dim)',
    padding: 'var(--space-4) 0',
    lineHeight: 1.8
  },
  headerRight: { display: 'flex', gap: 'var(--space-2)' },
  main: { maxWidth: '860px', margin: '0 auto', padding: 'var(--space-5) var(--space-4)' },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 'var(--space-2)',
    marginTop: 'var(--space-4)', // add this
    gap: '16px',
    flexWrap: 'wrap'
  },
  eyebrow: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '11px',
    color: 'var(--accent-green)',
    letterSpacing: '4px',
    marginBottom: 'var(--space-1)'
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '28px',
    margin: 0,
    letterSpacing: '4px',
    fontWeight: 700
  },
  titleWithInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
  infoBtn: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'var(--surface-raised)',
    color: 'var(--text-dim)',
    fontFamily: "'Orbitron', sans-serif",
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
    maxWidth: '620px',
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    fontFamily: "'Orbitron', sans-serif"
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
  modalTitle: { margin: 0, fontSize: '18px', fontFamily: "'Orbitron', sans-serif" },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '16px', cursor: 'pointer', fontFamily: "'Orbitron', sans-serif" },
  modalBody: { padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
  section: {},
  sectionTitle: {
    fontFamily: "'Orbitron', sans-serif",
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
    lineHeight: 1.5,
    fontFamily: "'Orbitron', sans-serif"
  },
  ratingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '6px'
  },
  lcGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '10px'
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
  formulaBox: {
    marginTop: '10px',
    padding: '12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface-raised)',
    overflowX: 'auto',
    fontSize: '13px',
    lineHeight: 1.8,
    color: 'var(--text-dim)'
  },
  formulaNote: {
    marginTop: '14px',
    color: 'var(--text-dim)',
    lineHeight: 1.7,
    fontSize: '13px',
    fontFamily: "'Orbitron', sans-serif"
  },
  refreshBtn: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--accent-green)',
    color: 'var(--accent-green)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 16px',
    fontSize: '13px',
    letterSpacing: '3.5px',
    fontFamily: "'Orbitron', sans-serif"
  },
  refreshMsg: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '12px',
    color: 'var(--accent-gold)',
    marginBottom: 'var(--space-3)'
  },
  error: { color: 'var(--accent-red)', marginBottom: 'var(--space-3)', fontFamily: "'Orbitron', sans-serif", fontSize: '13px' },
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
    fontFamily: "'Orbitron', sans-serif",
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
  empty: { padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-dim)', fontFamily: "'Orbitron', sans-serif", fontSize: '13px' }
};
