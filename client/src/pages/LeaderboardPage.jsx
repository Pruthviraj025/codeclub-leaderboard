import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';
import '../styles/LeaderboardPaper.css';

const AVATAR_COLORS = [
  { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' }, // mint
  { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3' }, // coral/rose
  { bg: '#EEF2FF', text: '#3730A3', border: '#C7D2FE' }, // lavender
  { bg: '#FEF9C3', text: '#854D0E', border: '#FDE047' }, // butter yellow
  { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' }, // sky blue
  { bg: '#FFF7ED', text: '#9A3412', border: '#FED7AA' }, // apricot/peach
];

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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('total'); // 'total' | 'cf' | 'lc' | 'cc'

  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
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
      setCfMsg(added > 0 ? `Codeforces: +${added} points added!` : 'Codeforces: Up to date, no new solves found.');
      await loadLeaderboard();
    } catch (err) {
      setCfMsg(`Codeforces error: ${err.message}`);
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
      setLcMsg(added > 0 ? `LeetCode: +${added} points added!` : 'LeetCode: Up to date, no new solves found.');
      await loadLeaderboard();
    } catch (err) {
      setLcMsg(`LeetCode error: ${err.message}`);
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
      setCcMsg(added > 0 ? `CodeChef: +${added} points added!` : 'CodeChef: Up to date, no new solves found.');
      await loadLeaderboard();
    } catch (err) {
      setCcMsg(`CodeChef error: ${err.message}`);
    } finally {
      setRefreshingCc(false);
    }
  }

  // Filter and sort solvers
  const leaderboardList = data?.leaderboard || [];

  const filteredAndSortedList = useMemo(() => {
    let list = [...leaderboardList];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(row => {
        const name = (row.name || '').toLowerCase();
        const cf = (row.cfHandle || '').toLowerCase();
        const lc = (row.lcUsername || '').toLowerCase();
        const cc = (row.ccHandle || '').toLowerCase();
        return name.includes(q) || cf.includes(q) || lc.includes(q) || cc.includes(q);
      });
    }

    if (sortBy === 'cf') {
      list.sort((a, b) => (b.codeforcesPoints || 0) - (a.codeforcesPoints || 0));
    } else if (sortBy === 'lc') {
      list.sort((a, b) => (b.leetcodePoints || 0) - (a.leetcodePoints || 0));
    } else if (sortBy === 'cc') {
      list.sort((a, b) => (b.codechefPoints || 0) - (a.codechefPoints || 0));
    } else {
      list.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    }

    return list;
  }, [leaderboardList, searchQuery, sortBy]);

  // Overall statistics
  const stats = useMemo(() => {
    const totalPoints = leaderboardList.reduce((acc, r) => acc + (r.totalPoints || 0), 0);
    const cfTotal = leaderboardList.reduce((acc, r) => acc + (r.codeforcesPoints || 0), 0);
    const lcTotal = leaderboardList.reduce((acc, r) => acc + (r.leetcodePoints || 0), 0);
    const ccTotal = leaderboardList.reduce((acc, r) => acc + (r.codechefPoints || 0), 0);
    
    let topPlatform = 'Codeforces';
    let maxPts = cfTotal;
    if (lcTotal > maxPts) { topPlatform = 'LeetCode'; maxPts = lcTotal; }
    if (ccTotal > maxPts) { topPlatform = 'CodeChef'; }

    return {
      activeSolvers: leaderboardList.length,
      totalPoints,
      topPlatform
    };
  }, [leaderboardList]);

  // Top 3 for the Podium
  const top3 = useMemo(() => {
    return leaderboardList.slice(0, 3);
  }, [leaderboardList]);

  if (!user) return null;

  return (
    <SidebarLayout active="leaderboard">
      <div className="lb-container">
        
        {/* TOP HERO BANNER — Superhuman Editorial Header */}
        <div className="lb-top-banner">
          <div className="lb-banner-content">
            <div className="lb-banner-badge-row">
              <span className="lb-pill-live">
                <span className="lb-pulse-dot"></span>
                Trailing 7 Days · Live
              </span>
              <span className="lb-pill-meta">
                {stats.activeSolvers} Solvers Competing
              </span>
              {stats.totalPoints > 0 && (
                <span className="lb-pill-meta">
                  {stats.totalPoints.toLocaleString()} Points Scored
                </span>
              )}
            </div>

            <h1 className="lb-banner-title">
              CodeClub Leaderboard
            </h1>
            <p className="lb-banner-desc">
              Competitive standings recalculated continuously across Codeforces, LeetCode, and CodeChef.
              Every accepted solution counts toward your rolling 7-day score.
            </p>

            <div className="lb-banner-actions">
              <div className="lb-refresh-group">
                <button
                  className="lb-btn-primary"
                  onClick={handleRefreshCf}
                  disabled={refreshingCf}
                  title="Check Codeforces for recent solves"
                >
                  <CfIcon />
                  {refreshingCf ? 'Checking CF…' : 'Refresh Codeforces'}
                </button>

                <button
                  className="lb-btn-secondary"
                  onClick={handleRefreshLc}
                  disabled={refreshingLc}
                  title="Check LeetCode for recent solves"
                >
                  <LeetCodeIcon />
                  {refreshingLc ? 'Checking LC…' : 'Refresh LeetCode'}
                </button>

                <button
                  className="lb-btn-secondary"
                  onClick={handleRefreshCc}
                  disabled={refreshingCc}
                  title="Check CodeChef for recent solves"
                >
                  <CodeChefIcon />
                  {refreshingCc ? 'Checking CC…' : 'Refresh CodeChef'}
                </button>
              </div>

              <button
                className="lb-btn-ghost"
                onClick={() => setShowInfo(true)}
              >
                <span>Scoring Guide →</span>
              </button>
            </div>
          </div>
        </div>

        {/* FEEDBACK TOASTS */}
        {(cfMsg || lcMsg || ccMsg || error) && (
          <div className="lb-toast-row">
            {cfMsg && <div className="lb-toast lb-toast-cf">{cfMsg}</div>}
            {lcMsg && <div className="lb-toast lb-toast-lc">{lcMsg}</div>}
            {ccMsg && <div className="lb-toast lb-toast-cc">{ccMsg}</div>}
            {error && <div className="lb-toast lb-toast-error">⚠️ {error}</div>}
          </div>
        )}

        {/* TOP 3 PODIUM SPOTLIGHT (Hall of Fame cards inspired by the Notion reference image) */}
        {!loadingBoard && top3.length > 0 && (
          <section className="lb-podium-section">
            <div className="lb-podium-header">
              <div className="lb-podium-label">
                <span>Top Solvers Spotlight</span>
                <span className="lb-podium-badge">Podium</span>
              </div>
            </div>

            <div className="lb-podium-grid">
              {top3.map((solver, idx) => {
                const rankNum = idx + 1;
                const isChampion = rankNum === 1;
                const isRunnerUp = rankNum === 2;
                const isThird = rankNum === 3;
                
                const cardClass = isChampion
                  ? 'lb-podium-rank1'
                  : isRunnerUp
                  ? 'lb-podium-rank2'
                  : 'lb-podium-rank3';

                const medalEmoji = isChampion ? '🥇' : isRunnerUp ? '🥈' : '🥉';
                const medalTitle = isChampion ? 'Champion' : isRunnerUp ? 'Runner-Up' : 'Third Place';
                const displayName = solver.cfHandle || solver.lcUsername || solver.ccHandle || solver.name || 'Anonymous';
                const initial = displayName.charAt(0).toUpperCase();

                return (
                  <div
                    key={solver.userId}
                    className={`lb-podium-card ${cardClass}`}
                    onClick={() => navigate(`/profile/${solver.userId}`)}
                  >
                    <div>
                      <div className="lb-podium-top">
                        <span className="lb-podium-medal-pill">
                          <span>{medalEmoji}</span>
                          <span>{medalTitle}</span>
                        </span>
                        <span className="lb-podium-rank-tag">#{rankNum}</span>
                      </div>

                      <div className="lb-podium-profile">
                        <div className="lb-podium-avatar">
                          {initial}
                        </div>
                        <div className="lb-podium-user-info">
                          <div className="lb-podium-username" title={displayName}>
                            {displayName}
                          </div>
                          <div className="lb-podium-links">
                            {solver.cfHandle && (
                              <a
                                href={`https://codeforces.com/profile/${solver.cfHandle}`}
                                target="_blank"
                                rel="noreferrer"
                                className="lb-platform-chip"
                                onClick={(e) => e.stopPropagation()}
                                title={`Open ${solver.cfHandle} on Codeforces`}
                              >
                                <CfIcon size={13} />
                              </a>
                            )}
                            {solver.lcUsername && (
                              <a
                                href={`https://leetcode.com/${solver.lcUsername}`}
                                target="_blank"
                                rel="noreferrer"
                                className="lb-platform-chip"
                                onClick={(e) => e.stopPropagation()}
                                title={`Open ${solver.lcUsername} on LeetCode`}
                              >
                                <LeetCodeIcon size={13} />
                              </a>
                            )}
                            {solver.ccHandle && (
                              <a
                                href={`https://www.codechef.com/users/${solver.ccHandle}`}
                                target="_blank"
                                rel="noreferrer"
                                className="lb-platform-chip"
                                onClick={(e) => e.stopPropagation()}
                                title={`Open ${solver.ccHandle} on CodeChef`}
                              >
                                <CodeChefIcon size={13} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="lb-podium-score-row">
                        <div>
                          <div className="lb-podium-score-label">Total Points</div>
                          <div className="lb-podium-score-num">
                            {(solver.totalPoints || 0).toLocaleString()}
                          </div>
                        </div>
                        {solver.userId === user?.id && (
                          <span className="lb-you-tag">YOU</span>
                        )}
                      </div>

                      <div className="lb-podium-breakdown">
                        <div className="lb-podium-mini-stat">
                          <div className="platform-label" style={{ color: '#2563EB' }}>CF</div>
                          <div className="platform-val">{solver.codeforcesPoints || 0}</div>
                        </div>
                        <div className="lb-podium-mini-stat">
                          <div className="platform-label" style={{ color: '#D97706' }}>LC</div>
                          <div className="platform-val">{solver.leetcodePoints || 0}</div>
                        </div>
                        <div className="lb-podium-mini-stat">
                          <div className="platform-label" style={{ color: '#EA580C' }}>CC</div>
                          <div className="platform-val">{solver.codechefPoints || 0}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SEARCH & FILTER TOOLBAR */}
        <div className="lb-toolbar">
          <div className="lb-search-wrap">
            <span className="lb-search-icon">🔍</span>
            <input
              type="text"
              className="lb-search-input"
              placeholder="Filter by name or platform handle…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="lb-toolbar-right">
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className={`lb-filter-btn ${sortBy === 'total' ? 'active' : ''}`}
                onClick={() => setSortBy('total')}
              >
                Total
              </button>
              <button
                className={`lb-filter-btn ${sortBy === 'cf' ? 'active' : ''}`}
                onClick={() => setSortBy('cf')}
              >
                CF
              </button>
              <button
                className={`lb-filter-btn ${sortBy === 'lc' ? 'active' : ''}`}
                onClick={() => setSortBy('lc')}
              >
                LC
              </button>
              <button
                className={`lb-filter-btn ${sortBy === 'cc' ? 'active' : ''}`}
                onClick={() => setSortBy('cc')}
              >
                CC
              </button>
            </div>

            <span className="lb-count-pill">
              {filteredAndSortedList.length} Solvers
            </span>
          </div>
        </div>

        {/* STANDINGS TABLE (Tactile Paper Rows) */}
        <div className="lb-list-wrap">
          <div className="lb-table-header">
            <span style={{ width: '44px', textAlign: 'center' }}>Rank</span>
            <span style={{ flex: 1, paddingLeft: '12px' }}>Solver</span>
            <span className="lb-col-cf">CF Pts</span>
            <span className="lb-col-lc">LC Pts</span>
            <span className="lb-col-cc">CC Pts</span>
            <span className="lb-col-total">Total</span>
          </div>

          {loadingBoard ? (
            <div className="lb-empty-box">
              <div className="lb-empty-title">Fetching live standings…</div>
              <div className="lb-empty-desc">Pulling the latest accepted solves from the database.</div>
            </div>
          ) : filteredAndSortedList.length > 0 ? (
            filteredAndSortedList.map((row, idx) => {
              const isSelf = row.userId === user?.id;
              const displayName = row.cfHandle || row.lcUsername || row.ccHandle || row.name || 'Anonymous';
              const initial = displayName.charAt(0).toUpperCase();
              const palette = AVATAR_COLORS[idx % AVATAR_COLORS.length];

              return (
                <div
                  key={row.userId}
                  className={`lb-row-card ${isSelf ? 'lb-row-self' : ''}`}
                  onClick={() => navigate(`/profile/${row.userId}`)}
                >
                  <div className="lb-row-rank">
                    <span className={`lb-rank-badge ${
                      row.rank === 1 ? 'lb-rank-medal-1' :
                      row.rank === 2 ? 'lb-rank-medal-2' :
                      row.rank === 3 ? 'lb-rank-medal-3' : ''
                    }`}>
                      {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
                    </span>
                  </div>

                  <div className="lb-row-user">
                    <div
                      className="lb-avatar-circle"
                      style={{
                        background: palette.bg,
                        color: palette.text,
                        border: `1px solid ${palette.border}`
                      }}
                    >
                      {initial}
                    </div>

                    <div className="lb-user-details">
                      <div className="lb-user-name-row">
                        <span className="lb-username">
                          {displayName}
                        </span>
                        {isSelf && <span className="lb-you-tag">YOU</span>}
                      </div>

                      <div className="lb-platform-links">
                        {row.cfHandle && (
                          <a
                            href={`https://codeforces.com/profile/${row.cfHandle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="lb-platform-link-icon"
                            onClick={(e) => e.stopPropagation()}
                            title={`Codeforces: ${row.cfHandle}`}
                          >
                            <CfIcon size={12} />
                          </a>
                        )}
                        {row.lcUsername && (
                          <a
                            href={`https://leetcode.com/${row.lcUsername}`}
                            target="_blank"
                            rel="noreferrer"
                            className="lb-platform-link-icon"
                            onClick={(e) => e.stopPropagation()}
                            title={`LeetCode: ${row.lcUsername}`}
                          >
                            <LeetCodeIcon size={12} />
                          </a>
                        )}
                        {row.ccHandle && (
                          <a
                            href={`https://www.codechef.com/users/${row.ccHandle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="lb-platform-link-icon"
                            onClick={(e) => e.stopPropagation()}
                            title={`CodeChef: ${row.ccHandle}`}
                          >
                            <CodeChefIcon size={12} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="lb-col-cf">
                    <span className="lb-pts-chip lb-pts-cf">
                      {row.codeforcesPoints || 0}
                    </span>
                  </div>

                  <div className="lb-col-lc">
                    <span className="lb-pts-chip lb-pts-lc">
                      {row.leetcodePoints || 0}
                    </span>
                  </div>

                  <div className="lb-col-cc">
                    <span className="lb-pts-chip lb-pts-cc">
                      {row.codechefPoints || 0}
                    </span>
                  </div>

                  <div className="lb-col-total">
                    <span className="lb-total-pill">
                      {(row.totalPoints || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="lb-empty-box">
              <div className="lb-empty-title">No solves recorded yet</div>
              <div className="lb-empty-desc">
                {searchQuery
                  ? `No solvers matched "${searchQuery}". Try clearing your search.`
                  : "No solves found in the trailing 7-day window. Solve a problem on Codeforces, LeetCode, or CodeChef and click Refresh to lead the board!"}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="lb-footer">
          <div>CodeClub · Where solvers turn into algorithmic masters ⚡</div>
          <div className="lb-footer-sub">Trailing 7-day rolling leaderboard · Built with 💖 by PTVRJ</div>
        </footer>

        {/* SCORING FIELD GUIDE MODAL */}
        {showInfo && <InfoModal onClose={() => setShowInfo(false)} />}
      </div>
    </SidebarLayout>
  );
}

/* ==========================================================================
   SCORING FIELD GUIDE MODAL (STATIONERY NOTEBOOK STYLE)
   ========================================================================== */

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
  { difficulty: 'Easy', color: '#16A34A', range: '200–400' },
  { difficulty: 'Medium', color: '#D97706', range: '700–1200' },
  { difficulty: 'Hard', color: '#DC2626', range: '1500–2500' }
];

const CODECHEF_MAP = [
  ['< 500', 100], ['500–599', 100], ['600–699', 150], ['700–799', 200],
  ['800–899', 250], ['900–999', 300], ['1000–1099', 400], ['1100–1199', 500],
  ['1200–1299', 600], ['1300–1399', 700], ['1400–1499', 900], ['1500–1599', 1100],
  ['1600–1699', 1300], ['1700–1799', 1500], ['1800–1899', 1800], ['1900–1999', 2000],
  ['2000–2099', 2300], ['2100–2199', 2600], ['2200–2299', 2900], ['2300–2399', 3200],
  ['2400–2499', 3500], ['2500–2599', 3800], ['2600–2699', 4100], ['2700–2799', 4400],
  ['2800–2899', 4700], ['2900–2999', 5000], ['3000+', 5500]
];

function InfoModal({ onClose }) {
  return (
    <div className="lb-modal-overlay" onClick={onClose}>
      <div className="lb-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="lb-modal-header">
          <div className="lb-modal-header-left">
            <span>📓</span>
            <h2 className="lb-modal-title">Scoring Field Guide</h2>
          </div>
          <button className="lb-modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="lb-modal-body">
          {/* Supported Platforms */}
          <div className="lb-modal-section" style={{ background: '#FFFDF9' }}>
            <div className="lb-modal-section-title">
              <span>🎯</span>
              <span>Supported Platforms & Rules</span>
            </div>
            <ul className="lb-modal-list">
              <li><strong>Codeforces</strong>: Accepted (AC) submissions within the rolling window.</li>
              <li><strong>LeetCode</strong>: Accepted solutions scored by difficulty, popularity & acceptance.</li>
              <li><strong>CodeChef</strong>: 100-point accepted submissions scaled by problem rating.</li>
              <li>All points from all three platforms sum into your unified <strong>Total Points</strong>.</li>
            </ul>
          </div>

          {/* Rolling Window */}
          <div className="lb-modal-section" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
            <div className="lb-modal-section-title" style={{ color: '#065F46' }}>
              <span>🗓️</span>
              <span>The 7-Day Rolling Window</span>
            </div>
            <ul className="lb-modal-list">
              <li>The leaderboard recalculates continuously based on problems solved in the <strong>trailing 7 days</strong>.</li>
              <li>There is no sudden Sunday reset — each solve stays active for exactly 168 hours (7 days) from the moment of submission.</li>
              <li>Solvers need at least 1 active solve within the last 7 days to rank on the live board.</li>
            </ul>
          </div>

          {/* Codeforces */}
          <div className="lb-modal-section" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
            <div className="lb-modal-section-title" style={{ color: '#1D4ED8' }}>
              <CfIcon size={16} />
              <span>Codeforces Rating → Points</span>
            </div>
            <div className="lb-rating-chips">
              <div className="lb-rating-chip">
                <div className="lb-rating-chip-range">Unrated</div>
                <div className="lb-rating-chip-pts">{UNRATED_POINTS}</div>
              </div>
              {RATING_MAP.map(([rating, points]) => (
                <div key={rating} className="lb-rating-chip">
                  <div className="lb-rating-chip-range">{rating}</div>
                  <div className="lb-rating-chip-pts">{points}</div>
                </div>
              ))}
            </div>
          </div>

          {/* LeetCode */}
          <div className="lb-modal-section" style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}>
            <div className="lb-modal-section-title" style={{ color: '#B45309' }}>
              <LeetCodeIcon size={16} />
              <span>LeetCode Difficulty Brackets</span>
            </div>
            <div className="lb-rating-chips" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {LEETCODE_POINTS.map(item => (
                <div key={item.difficulty} className="lb-rating-chip" style={{ background: '#FFFFFF' }}>
                  <div className="lb-rating-chip-range" style={{ fontWeight: 700, color: item.color }}>
                    {item.difficulty}
                  </div>
                  <div className="lb-rating-chip-pts">{item.range}</div>
                </div>
              ))}
            </div>
            <div className="lb-formula-memo">
              Final Score = Base × Acceptance Factor × Submission Factor<br />
              • Acceptance Factor = 1 + (50 − Acceptance Rate) / 100<br />
              • Submission Factor = 1 + log₁₀(50,000,000 / Total Submissions) × 0.08<br />
              • Rounded to nearest 100 points.
            </div>
          </div>

          {/* CodeChef */}
          <div className="lb-modal-section" style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}>
            <div className="lb-modal-section-title" style={{ color: '#C2410C' }}>
              <CodeChefIcon size={16} />
              <span>CodeChef Difficulty → Points</span>
            </div>
            <div className="lb-rating-chips">
              {CODECHEF_MAP.map(([range, points]) => (
                <div key={range} className="lb-rating-chip">
                  <div className="lb-rating-chip-range">{range}</div>
                  <div className="lb-rating-chip-pts" style={{ color: '#EA580C' }}>{points}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   CUSTOM SVG ICONS
   ========================================================================== */

function CfIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="0.5" y="6" width="4" height="9" rx="1.2" fill="#FF7F00" />
      <rect x="6" y="3" width="4" height="12" rx="1.2" fill="#3776AB" />
      <rect x="11.5" y="0.5" width="4" height="14.5" rx="1.2" fill="#1FA83B" />
    </svg>
  );
}

function LeetCodeIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M16.5 18.5L21 14l-4.5-4.5" stroke="#FFA116" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 14H9" stroke="#FFA116" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10 5L3 12l7 7" stroke="#78716C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CodeChefIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3C8.5 3 6.5 5.5 6.5 8.5C5.5 8.8 4 9.8 4 12C4 14.5 6 15.5 7 15.8V19C7 19.6 7.4 20 8 20H16C16.6 20 17 19.6 17 19V15.8C18 15.5 20 14.5 20 12C20 9.8 18.5 8.8 17.5 8.5C17.5 5.5 15.5 3 12 3Z" fill="#D48843" />
      <circle cx="9.5" cy="11.5" r="1.3" fill="#1A1815" />
      <circle cx="14.5" cy="11.5" r="1.3" fill="#1A1815" />
      <path d="M10 15C11 15.8 13 15.8 14 15" stroke="#1A1815" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
