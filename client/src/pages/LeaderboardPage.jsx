import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';


export default function LeaderboardPage() {
  const [data, setData] = useState(null);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [error, setError] = useState('');
  const [refreshingCf, setRefreshingCf] = useState(false);
  const [refreshingLc, setRefreshingLc] = useState(false);
  const [refreshingCc, setRefreshingCc] = useState(false);
  const [cfMsg, setCfMsg] = useState('');
  const [lcMsg, setLcMsg] = useState('');
  const [ccMsg, setCcMsg] = useState('');
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

  async function handleRefreshCf() {
    setRefreshingCf(true);
    setCfMsg('');
    try {
      const res = await api.refreshCf();
      const added = res.pointsAdded || 0;
      setCfMsg(added > 0 ? `CF: +${added} points` : 'CF: No new solves found.');
      await loadLeaderboard();
    } catch (err) {
      setCfMsg(`CF: ${err.message}`);
    } finally {
      setRefreshingCf(false);
    }
  }

  async function handleRefreshLc() {
    setRefreshingLc(true);
    setLcMsg('');
    try {
      const res = await api.refreshLc();
      const added = res.pointsAdded || 0;
      setLcMsg(added > 0 ? `LC: +${added} points` : 'LC: No new solves found.');
      await loadLeaderboard();
    } catch (err) {
      setLcMsg(`LC: ${err.message}`);
    } finally {
      setRefreshingLc(false);
    }
  }

  async function handleRefreshCc() {
    setRefreshingCc(true);
    setCcMsg('');
    try {
      const res = await api.refreshCc();
      const added = res.pointsAdded || 0;
      setCcMsg(added > 0 ? `CC: +${added} points` : 'CC: No new solves found.');
      await loadLeaderboard();
    } catch (err) {
      setCcMsg(`CC: ${err.message}`);
    } finally {
      setRefreshingCc(false);
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
              className="info-btn"
              onClick={() => setShowInfo(true)}
              aria-label="How scoring works"
              title="How scoring works"
            >
              i
            </button>
          </div>
        </div>
        <div style={styles.refreshBtnGroup} className="refresh-btn-group">
          <button style={styles.refreshBtnCf} className="refresh-btn refresh-btn-cf" onClick={handleRefreshCf} disabled={refreshingCf}>
            {refreshingCf ? 'Checking…' : '↻ Refresh CF'}
          </button>
          <button style={styles.refreshBtnLc} className="refresh-btn refresh-btn-lc" onClick={handleRefreshLc} disabled={refreshingLc}>
            {refreshingLc ? 'Checking…' : '↻ Refresh LC'}
          </button>
          <button style={styles.refreshBtnCc} className="refresh-btn refresh-btn-cc" onClick={handleRefreshCc} disabled={refreshingCc}>
            {refreshingCc ? 'Checking…' : '↻ Refresh CC'}
          </button>
        </div>
      </div>

      {cfMsg && <div style={{ ...styles.refreshMsg, color: '#7DD3FC' }}>{cfMsg}</div>}
      {lcMsg && <div style={{ ...styles.refreshMsg, color: '#FCD34D' }}>{lcMsg}</div>}
      {ccMsg && <div style={{ ...styles.refreshMsg, color: '#D8B4FE' }}>{ccMsg}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.queue} className="leaderboard-queue">
        <div style={styles.queueHeader} className="leaderboard-queue-header">
          <span style={{ ...styles.col, width: '48px' }} className="queue-col-rank">RANK</span>
          <span style={{ ...styles.col, flex: 1 }}>USER</span>
          <span style={{ ...styles.col, width: '80px', textAlign: 'right' }} className="queue-col-cf">CF</span>
          <span style={{ ...styles.col, width: '80px', textAlign: 'right' }} className="queue-col-lc">LC</span>
          <span style={{ ...styles.col, width: '80px', textAlign: 'right' }} className="queue-col-cc">CC</span>
          <span style={{ ...styles.col, width: '85px', textAlign: 'right', color: 'var(--text, #FFFFFF)' }} className="queue-col-points">TOTAL</span>
        </div>

        {loadingBoard ? (
          <div style={styles.empty}>Loading standings…</div>
        ) : data?.leaderboard?.length ? (
          data.leaderboard.map((row, idx) => (
            <div
              key={row.userId}
              className="row-hover leaderboard-queue-row"
              style={{
                ...styles.queueRow,
                ...(row.userId === user.id ? styles.queueRowSelf : {}),
                ...(idx === data.leaderboard.length - 1 ? { borderBottom: 'none' } : {})
              }}
              onClick={() => navigate(`/profile/${row.userId}`)}
            >
              <span style={{ ...styles.col, width: '48px' }} className="queue-col-rank">
                <RankBadge rank={row.rank} />
              </span>

              <span style={{ ...styles.col, flex: 1, display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                {row.cfHandle && (

                  <a href={`https://codeforces.com/profile/${row.cfHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={styles.cfIconLink}
                    className="platform-icon-link"
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
                    className="platform-icon-link"
                    title={`Open ${row.lcUsername} on LeetCode`}
                  >
                    <LeetCodeIcon />
                  </a>
                )}
                {row.ccHandle && (

                  <a href={`https://www.codechef.com/users/${row.ccHandle}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={styles.cfIconLink}
                    className="platform-icon-link"
                    title={`Open ${row.ccHandle} on CodeChef`}
                  >
                    <CodeChefIcon />
                  </a>
                )}
                <span
                  style={styles.nameLink}
                  className="user-name-link"
                  onClick={(e) => { e.stopPropagation(); navigate(`/profile/${row.userId}`); }}
                >
                  {row.cfHandle || row.lcUsername || row.ccHandle || row.name}
                </span>
              </span>

              <span style={{ ...styles.col, width: '80px', textAlign: 'right', color: 'var(--cf-color, #7DD3FC)', fontWeight: 600, fontSize: '15px' }} className="queue-col-cf">
                {row.codeforcesPoints}
              </span>

              <span style={{ ...styles.col, width: '80px', textAlign: 'right', color: 'var(--lc-color, #FB923C)', fontWeight: 600, fontSize: '15px' }} className="queue-col-lc">
                {row.leetcodePoints}
              </span>

              <span style={{ ...styles.col, width: '80px', textAlign: 'right', color: 'var(--cc-color, #D8B4FE)', fontWeight: 600, fontSize: '15px' }} className="queue-col-cc">
                {row.codechefPoints || 0}
              </span>

              <span style={{ ...styles.col, width: '85px', textAlign: 'right', fontWeight: 700, color: 'var(--text, #FFFFFF)', fontSize: '16px' }} className="queue-col-points">
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
    return <span>{MEDALS[rank]} <span style={{ color: 'var(--text-dim, rgba(255, 255, 255, 0.6))', fontSize: '13px', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" }}>#{rank}</span></span>;
  }
  return <span style={{ color: 'var(--text-dim, rgba(255, 255, 255, 0.6))', fontWeight: 600, fontSize: '14px', fontFamily: "'Space Grotesk', sans-serif" }}>#{rank}</span>;
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

function CodeChefIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3C8.5 3 6.5 5.5 6.5 8.5C5.5 8.8 4 9.8 4 12C4 14.5 6 15.5 7 15.8V19C7 19.6 7.4 20 8 20H16C16.6 20 17 19.6 17 19V15.8C18 15.5 20 14.5 20 12C20 9.8 18.5 8.8 17.5 8.5C17.5 5.5 15.5 3 12 3Z" fill="#D48843" />
      <circle cx="9.5" cy="11.5" r="1.3" fill="#1A1815" />
      <circle cx="14.5" cy="11.5" r="1.3" fill="#1A1815" />
      <path d="M10 15C11 15.8 13 15.8 14 15" stroke="#1A1815" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

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

const CODECHEF_MAP = [
  ['< 500 / Unrated', 100],
  ['500–599', 100],
  ['600–699', 150],
  ['700–799', 200],
  ['800–899', 250],
  ['900–999', 300],
  ['1000–1099', 400],
  ['1100–1199', 500],
  ['1200–1299', 600],
  ['1300–1399', 700],
  ['1400–1499', 900],
  ['1500–1599', 1100],
  ['1600–1699', 1300],
  ['1700–1799', 1500],
  ['1800–1899', 1800],
  ['1900–1999', 2000],
  ['2000–2099', 2300],
  ['2100–2199', 2600],
  ['2200–2299', 2900],
  ['2300–2399', 3200],
  ['2400–2499', 3500],
  ['2500–2599', 3800],
  ['2600–2699', 4100],
  ['2700–2799', 4400],
  ['2800–2899', 4700],
  ['2900–2999', 5000],
  ['3000+', 5500]
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
              <li>LeetCode Accepted submissions are scored.</li>
              <li>CodeChef Accepted submissions are scored.</li>
              <li>All platforms contribute toward your <strong>Total Points</strong>.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>Codeforces scoring</div>
            <ul style={styles.list}>
              <li>Connect your handle on your Profile page — accepted submissions within the trailing 7-day window are counted.</li>
              <li>Only <strong>Accepted (AC)</strong> submissions count.</li>
              <li>Each problem counts once — resubmitting doesn't add points again.</li>
              <li>Points scale according to problem difficulty rating mapped to standard rating brackets.</li>
              <li>Unrated problems award {UNRATED_POINTS} points.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <div style={styles.sectionTitle}>CodeChef scoring</div>
            <ul style={styles.list}>
              <li>Connect your CodeChef handle on your Profile page by submitting non-compiling code to problem TEST.</li>
              <li>Only <strong>Accepted (100 pts)</strong> solutions count.</li>
              <li>Each problem awards points once within the 7-day rolling window.</li>
              <li>Points scale based on problem difficulty rating intervals (see table below).</li>
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
            <div style={styles.sectionTitle}>CodeChef rating → points</div>
            <div style={styles.ratingGrid}>
              {CODECHEF_MAP.map(([range, points]) => (
                <div key={range} style={styles.ratingCell}>
                  <span className="mono" style={{ ...styles.ratingNum, fontSize: '9px' }}>{range}</span>
                  <span className="mono" style={{ ...styles.ratingPts, color: '#D8B4FE' }}>{points}</span>
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
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '14px',
    color: 'var(--text-dim, rgba(255, 255, 255, 0.45))',
    padding: '40px 0 24px',
    lineHeight: 1.8
  },
  headerRight: { display: 'flex', gap: 'var(--space-2)' },
  main: { maxWidth: '860px', margin: '0 auto', padding: 'var(--space-5) var(--space-4)' },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 'var(--space-4)',
    marginTop: 0,
    gap: '16px',
    flexWrap: 'wrap'
  },
  eyebrow: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '12px',
    color: 'var(--accent-green, #5EEAD4)',
    letterSpacing: '3.5px',
    fontWeight: 600,
    textTransform: 'uppercase',
    marginBottom: 'var(--space-1)'
  },
  title: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '34px',
    margin: 0,
    letterSpacing: '0.5px',
    fontWeight: 700,
    color: 'var(--text, #FFFFFF)'
  },
  titleWithInfo: { display: 'flex', alignItems: 'center', gap: '12px' },
  infoBtn: {
    width: '26px',
    height: '26px',
    borderRadius: '50%',
    border: '1px solid var(--border-hover, rgba(255, 255, 255, 0.18))',
    background: 'var(--card-bg, rgba(255, 255, 255, 0.05))',
    color: 'var(--text, #FFFFFF)',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    fontStyle: 'italic',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--modal-overlay, rgba(0,0,0,0.7))',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-4)',
    zIndex: 100
  },
  modal: {
    background: 'var(--modal-bg, rgba(10, 12, 17, 0.95))',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '14px',
    maxWidth: '620px',
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    boxShadow: 'var(--card-shadow, 0 24px 60px rgba(0, 0, 0, 0.8))',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
    position: 'sticky',
    top: 0,
    background: 'var(--modal-header-bg, rgba(11, 14, 20, 0.98))',
    backdropFilter: 'blur(12px)',
    zIndex: 10
  },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text, #FFFFFF)', fontFamily: "'Space Grotesk', sans-serif" },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-dim, rgba(255, 255, 255, 0.6))', fontSize: '16px', cursor: 'pointer', fontFamily: "'Space Grotesk', sans-serif" },
  modalBody: { padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' },
  section: {},
  sectionTitle: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '13px',
    letterSpacing: '1px',
    fontWeight: 600,
    color: 'var(--accent-green, #5EEAD4)',
    marginBottom: 'var(--space-2)'
  },
  list: {
    margin: 0,
    paddingLeft: '18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary, rgba(255, 255, 255, 0.85))',
    lineHeight: 1.6,
    fontFamily: "'Space Grotesk', sans-serif"
  },
  ratingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
    gap: '6px'
  },
  lcGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))',
    gap: '10px'
  },
  ratingCell: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '6px 4px',
    background: 'var(--surface-raised, rgba(255, 255, 255, 0.04))',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
    borderRadius: 'var(--radius-sm)'
  },
  ratingNum: { fontSize: '11px', color: 'var(--text-dim, rgba(255, 255, 255, 0.5))', fontFamily: "'Space Grotesk', sans-serif" },
  ratingPts: { fontSize: '13px', color: 'var(--cf-color, #7DD3FC)', fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif" },
  formulaBox: {
    marginTop: '10px',
    padding: '12px',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface-raised, rgba(255, 255, 255, 0.03))',
    overflowX: 'auto',
    fontSize: '13px',
    lineHeight: 1.8,
    color: 'var(--text-secondary, rgba(255, 255, 255, 0.75))',
    fontFamily: "'Space Grotesk', monospace"
  },
  formulaNote: {
    marginTop: '14px',
    color: 'var(--text-dim, rgba(255, 255, 255, 0.65))',
    lineHeight: 1.7,
    fontSize: '13px',
    fontFamily: "'Space Grotesk', sans-serif"
  },
  refreshBtnGroup: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    flex: 1
  },
  refreshBtnCf: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    background: 'var(--cf-dim, rgba(99, 223, 255, 0.04))',
    border: '1px solid var(--cf-border, rgba(99, 223, 255, 0.22))',
    color: 'var(--cf-color, #7DD3FC)',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '0.4px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    cursor: 'pointer'
  },
  refreshBtnLc: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    background: 'var(--lc-dim, rgba(252, 211, 77, 0.04))',
    border: '1px solid var(--lc-border, rgba(252, 211, 77, 0.22))',
    color: 'var(--lc-color, #FCD34D)',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '0.4px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    cursor: 'pointer'
  },
  refreshBtnCc: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    background: 'var(--cc-dim, rgba(216, 180, 254, 0.04))',
    border: '1px solid var(--cc-border, rgba(216, 180, 254, 0.22))',
    color: 'var(--cc-color, #D8B4FE)',
    borderRadius: '10px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '0.4px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    cursor: 'pointer'
  },
  refreshMsg: {
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--accent-gold, #FCD34D)',
    marginBottom: 'var(--space-3)'
  },
  error: { color: 'var(--accent-red, #F87171)', marginBottom: 'var(--space-3)', fontFamily: "'Space Grotesk', sans-serif", fontSize: '13px' },
  queue: {
    marginTop: 0,
    background: 'var(--card-bg, rgba(10, 12, 17, 0.72))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
    borderRadius: '14px',
    overflow: 'hidden',
    boxShadow: 'var(--card-shadow, 0 24px 60px rgba(0, 0, 0, 0.75))'
  },
  queueHeader: {
    display: 'flex',
    gap: '10px',
    padding: '14px 22px',
    background: 'var(--surface-raised, rgba(255, 255, 255, 0.025))',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.06))'
  },
  col: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    color: 'var(--text-dim, rgba(255, 255, 255, 0.6))',
    fontWeight: 600,
    letterSpacing: '1px'
  },
  queueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 22px',
    background: 'transparent',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.05))',
    cursor: 'pointer'
  },
  queueRowSelf: {
    background: 'rgba(99, 223, 255, 0.06)',
    borderLeft: '2px solid var(--accent-aqua, rgba(99, 223, 255, 0.7))'
  },
  cfIconLink: { display: 'flex', alignItems: 'center', flexShrink: 0 },
  nameLink: {
    color: 'var(--text, #FFFFFF)',
    fontWeight: 600,
    fontSize: '15px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  empty: { padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-dim, rgba(255, 255, 255, 0.55))', fontFamily: "'Space Grotesk', sans-serif", fontSize: '14px' }
};

