import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, CalendarDays, Search, Clock, Sparkles, RefreshCw, Trophy, Flame } from 'lucide-react';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';

const CF_DIVISION_ORDER = ['Div. 1', 'Div. 2', 'Div. 3', 'Div. 4', 'Div. 1 + 2', 'Educational', 'Global', 'Other'];
const LC_CATEGORY_ORDER = ['Upcoming & Live', 'Weekly Contest', 'Biweekly Contest', 'Past Contests'];

export default function ContestsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchContests();
  }, []);

  function fetchContests() {
    setLoading(true);
    setError('');
    api.contests()
      .then(res => setData(res))
      .catch(err => setError(err.message || 'Failed to load contests.'))
      .finally(() => setLoading(false));
  }

  if (!user) return null;

  const cfGrouped = data?.codeforces?.grouped || {};
  const lcGrouped = data?.leetcode?.grouped || {};
  const stats = data?.stats || { totalCount: 0, cfCount: 0, lcCount: 0, upcomingCount: 0, liveCount: 0 };

  const cfDivisions = CF_DIVISION_ORDER.filter(d => cfGrouped[d]?.length);
  const lcCategories = LC_CATEGORY_ORDER.filter(c => lcGrouped[c]?.length);

  function filterContest(c) {
    if (statusFilter === 'upcoming' && c.phase !== 'BEFORE') return false;
    if (statusFilter === 'live' && c.phase !== 'CODING') return false;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const name = String(c.name || '').toLowerCase();
      const division = String(c.division || '').toLowerCase();
      return name.includes(q) || division.includes(q);
    }
    return true;
  }

  function formatDuration(sec) {
    if (!sec) return '1h 30m';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
  }

  return (
    <SidebarLayout active="contests">
      <div style={styles.container}>
        <div style={styles.headerRow} className="contests-header-row">
          <div>
            <div style={styles.eyebrow}>
              <Sparkles size={13} style={{ marginRight: '6px', color: '#5EEAD4' }} />
              CODEFORCES &amp; LEETCODE CONTESTS
            </div>
            <h1 style={styles.title}>Contests &amp; Competitions</h1>
            <p style={styles.subtitle}>
              Track upcoming and live programming contests across Codeforces and LeetCode. Never miss a round!
            </p>
          </div>

          <button
            style={styles.refreshBtn}
            onClick={fetchContests}
            disabled={loading}
            title="Refresh Contests"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            {loading ? 'Fetching...' : 'Refresh'}
          </button>
        </div>

        <div style={styles.statsRow} className="mobile-grid-2">
          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'all' ? '#5EEAD4' : 'rgba(255, 255, 255, 0.08)',
              boxShadow: platform === 'all'
                ? '0 12px 30px rgba(0, 0, 0, 0.55), 0 0 16px rgba(94, 234, 212, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform('all')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(94, 234, 212, 0.12)', color: '#5EEAD4' }}>
              <CalendarDays size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.totalCount}</div>
              <div style={styles.statLabel}>Total Contests</div>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'codeforces' ? '#7DD3FC' : 'rgba(255, 255, 255, 0.08)',
              boxShadow: platform === 'codeforces'
                ? '0 12px 30px rgba(0, 0, 0, 0.55), 0 0 16px rgba(125, 211, 252, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'codeforces' ? 'all' : 'codeforces')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(99, 223, 255, 0.12)', color: '#7DD3FC' }}>
              <Trophy size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.cfCount}</div>
              <div style={styles.statLabel}>Codeforces</div>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'leetcode' ? '#FCD34D' : 'rgba(255, 255, 255, 0.08)',
              boxShadow: platform === 'leetcode'
                ? '0 12px 30px rgba(0, 0, 0, 0.55), 0 0 16px rgba(252, 211, 77, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'leetcode' ? 'all' : 'leetcode')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(252, 211, 77, 0.12)', color: '#FCD34D' }}>
              <Flame size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.lcCount}</div>
              <div style={styles.statLabel}>LeetCode</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIconWrapper, background: 'rgba(216, 180, 254, 0.12)', color: '#D8B4FE' }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={styles.statValue}>
                {loading ? '-' : `${stats.upcomingCount} Up / ${stats.liveCount} Live`}
              </div>
              <div style={styles.statLabel}>Active Contests</div>
            </div>
          </div>
        </div>

        <div style={styles.controlsBar} className="mobile-stack">
          <div style={styles.tabsContainer} className="scroll-x-touch mobile-full-width">
            <button
              style={{ ...styles.tab, ...(platform === 'all' ? styles.tabActive : {}) }}
              onClick={() => setPlatform('all')}
            >
              All Platforms
            </button>
            <button
              style={{ ...styles.tab, ...(platform === 'codeforces' ? styles.tabActiveCF : {}) }}
              onClick={() => setPlatform('codeforces')}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#7DD3FC', marginRight: '6px' }}></span>
              Codeforces
            </button>
            <button
              style={{ ...styles.tab, ...(platform === 'leetcode' ? styles.tabActiveLC : {}) }}
              onClick={() => setPlatform('leetcode')}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#FCD34D', marginRight: '6px' }}></span>
              LeetCode
            </button>
          </div>

          <div style={styles.searchAndFilters} className="mobile-stack">
            <div style={styles.searchWrapper} className="mobile-full-width">
              <Search size={16} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search contests..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={styles.selectFilter}
              className="mobile-full-width"
            >
              <option value="all">All Phases</option>
              <option value="upcoming">Upcoming Only</option>
              <option value="live">Live Only</option>
            </select>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {loading && <div style={styles.empty}>Loading contests...</div>}

        {!loading && (platform === 'all' || platform === 'codeforces') && (
          <div style={{ marginBottom: '40px' }}>
            <div style={styles.platformHeader}>
              <Trophy size={18} color="#7DD3FC" style={{ marginRight: '8px' }} />
              <span style={{ color: '#7DD3FC' }}>Codeforces Contests</span>
            </div>

            {cfDivisions.map(div => {
              const list = cfGrouped[div].filter(filterContest);
              if (list.length === 0) return null;

              return (
                <section key={div} style={styles.section}>
                  <div style={styles.sectionTitle}>{div}</div>
                  <div style={styles.grid} className="contests-grid-responsive">
                    {list.map(c => (
                      <a
                        key={c.id}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.card}
                        className="contest-card contest-card-cf"
                      >
                        <div style={styles.cardTop}>
                          <div style={styles.badgeRow}>
                            <span style={{ ...styles.platformBadge, background: 'var(--cf-dim, rgba(99, 223, 255, 0.12))', color: 'var(--cf-color, #7DD3FC)', border: '1px solid var(--cf-border, rgba(99, 223, 255, 0.25))' }}>
                              Codeforces
                            </span>
                            <span style={{ ...styles.phaseBadge, ...phaseStyle(c.phase) }}>
                              {phaseLabel(c.phase)}
                            </span>
                          </div>
                          <ExternalLink size={14} color="var(--text-dim, rgba(255, 255, 255, 0.4))" />
                        </div>

                        <div style={styles.cardName}>{c.name}</div>

                        <div style={styles.cardMetaRow}>
                          <div style={styles.cardMeta}>
                            {c.startTimeSeconds
                              ? new Date(c.startTimeSeconds * 1000).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                              : 'TBA'}
                          </div>
                          <div style={styles.durationPill}>
                            {formatDuration(c.durationSeconds)}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!loading && (platform === 'all' || platform === 'leetcode') && (
          <div style={{ marginBottom: '40px' }}>
            <div style={styles.platformHeader}>
              <Flame size={18} color="var(--lc-color, #FCD34D)" style={{ marginRight: '8px' }} />
              <span style={{ color: 'var(--lc-color, #FCD34D)' }}>LeetCode Contests</span>
            </div>

            {lcCategories.map(cat => {
              const list = lcGrouped[cat].filter(filterContest);
              if (list.length === 0) return null;

              return (
                <section key={cat} style={styles.section}>
                  <div style={styles.sectionTitle}>{cat}</div>
                  <div style={styles.grid} className="contests-grid-responsive">
                    {list.map(c => (
                      <a
                        key={c.id}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.card}
                        className="contest-card contest-card-lc"
                      >
                        <div style={styles.cardTop}>
                          <div style={styles.badgeRow}>
                            <span style={{ ...styles.platformBadge, background: 'var(--lc-dim, rgba(252, 211, 77, 0.12))', color: 'var(--lc-color, #FCD34D)', border: '1px solid var(--lc-border, rgba(252, 211, 77, 0.25))' }}>
                              LeetCode
                            </span>
                            <span style={{ ...styles.phaseBadge, ...phaseStyle(c.phase) }}>
                              {phaseLabel(c.phase)}
                            </span>
                          </div>
                          <ExternalLink size={14} color="var(--text-dim, rgba(255, 255, 255, 0.4))" />
                        </div>

                        <div style={styles.cardName}>{c.name}</div>

                        <div style={styles.cardMetaRow}>
                          <div style={styles.cardMeta}>
                            {c.startTimeSeconds
                              ? new Date(c.startTimeSeconds * 1000).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                              : 'TBA'}
                          </div>
                          <div style={styles.durationPill}>
                            {formatDuration(c.durationSeconds)}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!loading && stats.totalCount === 0 && !error && (
          <div style={styles.empty}>No contests found right now.</div>
        )}
      </div>
    </SidebarLayout>
  );
}

function phaseLabel(phase) {
  if (phase === 'BEFORE') return 'UPCOMING';
  if (phase === 'CODING') return 'LIVE';
  return 'FINISHED';
}

function phaseStyle(phase) {
  if (phase === 'BEFORE') return { background: 'var(--accent-gold-dim, rgba(252, 211, 77, 0.12))', color: 'var(--accent-gold, #FCD34D)', border: '1px solid var(--accent-gold-dim, rgba(252, 211, 77, 0.25))' };
  if (phase === 'CODING') return { background: 'var(--accent-green-dim, rgba(94, 234, 212, 0.12))', color: 'var(--accent-green, #5EEAD4)', border: '1px solid var(--accent-green-dim, rgba(94, 234, 212, 0.3))' };
  return { background: 'var(--surface-raised, rgba(255, 255, 255, 0.05))', color: 'var(--text-dim, rgba(255, 255, 255, 0.45))', border: '1px solid var(--border, rgba(255, 255, 255, 0.08))' };
}

const styles = {
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
    paddingBottom: '40px'
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '26px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  eyebrow: {
    display: 'flex',
    alignItems: 'center',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '2.5px',
    color: 'var(--accent-green, #5EEAD4)',
    marginBottom: '8px',
    textTransform: 'uppercase'
  },
  title: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 'clamp(24px, 4vw, 32px)',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.3px',
    color: 'var(--text, #FFFFFF)'
  },
  subtitle: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'var(--text-secondary, rgba(255, 255, 255, 0.65))',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '8px 0 0 0',
    maxWidth: '650px'
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--surface-raised, rgba(255, 255, 255, 0.04))',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.14))',
    borderRadius: '10px',
    color: 'var(--text, #FFFFFF)',
    padding: '9px 18px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    letterSpacing: '0.3px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
    gap: '14px',
    marginBottom: '26px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    background: 'var(--card-bg, rgba(10, 13, 19, 0.72))',
    border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
    borderRadius: '14px',
    padding: '16px 18px',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: 'var(--card-shadow, 0 12px 30px rgba(0, 0, 0, 0.55))',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  statIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statValue: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text, #FFFFFF)',
    letterSpacing: '0.2px'
  },
  statLabel: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-dim, rgba(255, 255, 255, 0.55))',
    marginTop: '3px'
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '28px',
    flexWrap: 'wrap'
  },
  tabsContainer: {
    display: 'flex',
    background: 'var(--card-bg, rgba(10, 13, 19, 0.72))',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
    borderRadius: '12px',
    padding: '5px',
    gap: '4px',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: 'var(--card-shadow, 0 8px 24px rgba(0, 0, 0, 0.4))'
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    whiteSpace: 'nowrap',
    background: 'transparent',
    border: '1px solid transparent',
    color: 'var(--text-dim, rgba(255, 255, 255, 0.65))',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  tabActive: {
    background: 'rgba(67, 0, 255, 0.1)',
    border: '1px solid rgba(67, 0, 255, 0.3)',
    color: 'var(--text, #FFFFFF)',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
  },
  tabActiveCF: {
    background: 'var(--cf-dim, rgba(99, 223, 255, 0.1))',
    border: '1px solid var(--cf-border, rgba(99, 223, 255, 0.3))',
    color: 'var(--cf-color, #7DD3FC)',
    fontWeight: 600,
    boxShadow: '0 2px 10px rgba(99, 223, 255, 0.15)'
  },
  tabActiveLC: {
    background: 'var(--lc-dim, rgba(252, 211, 77, 0.1))',
    border: '1px solid var(--lc-border, rgba(252, 211, 77, 0.3))',
    color: 'var(--lc-color, #FCD34D)',
    fontWeight: 600,
    boxShadow: '0 2px 10px rgba(252, 211, 77, 0.15)'
  },
  searchAndFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    flex: 1,
    justifyContent: 'flex-end'
  },
  searchWrapper: {
    position: 'relative',
    minWidth: '200px',
    flex: 1,
    maxWidth: '320px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-dim, rgba(255, 255, 255, 0.45))'
  },
  searchInput: {
    width: '100%',
    background: 'var(--input-bg, rgba(10, 13, 19, 0.72))',
    border: '1px solid var(--input-border, rgba(255, 255, 255, 0.09))',
    borderRadius: '10px',
    padding: '9px 14px 9px 38px',
    color: 'var(--input-text, #FFFFFF)',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    outline: 'none',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    transition: 'all 0.2s ease'
  },
  selectFilter: {
    background: 'var(--input-bg, rgba(10, 13, 19, 0.72))',
    border: '1px solid var(--input-border, rgba(255, 255, 255, 0.09))',
    borderRadius: '10px',
    padding: '9px 14px',
    color: 'var(--input-text, #FFFFFF)',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    transition: 'all 0.2s ease'
  },
  platformHeader: {
    display: 'flex',
    alignItems: 'center',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '0.4px',
    marginBottom: '18px',
    paddingBottom: '10px',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.08))'
  },
  section: { marginBottom: '26px' },
  sectionTitle: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '1.8px',
    color: 'var(--text-dim, rgba(255, 255, 255, 0.55))',
    textTransform: 'uppercase',
    marginBottom: '14px',
    userSelect: 'none'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '16px'
  },
  card: {
    display: 'block',
    background: 'var(--card-bg, rgba(10, 13, 19, 0.72))',
    border: '1px solid var(--card-border, rgba(255, 255, 255, 0.08))',
    borderRadius: '14px',
    padding: '18px',
    textDecoration: 'none',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: 'var(--card-shadow, 0 12px 30px rgba(0, 0, 0, 0.55))',
    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  platformBadge: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.8px',
    padding: '3px 9px',
    borderRadius: '999px',
    textTransform: 'uppercase'
  },
  phaseBadge: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '0.8px',
    padding: '3px 9px',
    borderRadius: '999px',
    userSelect: 'none'
  },
  cardName: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '15px',
    fontWeight: 600,
    color: 'var(--text, #FFFFFF)',
    marginBottom: '12px',
    lineHeight: '1.4'
  },
  cardMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px'
  },
  cardMeta: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-dim, rgba(255, 255, 255, 0.55))'
  },
  durationPill: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '11px',
    fontWeight: 500,
    color: 'var(--text-secondary, rgba(255, 255, 255, 0.65))',
    background: 'var(--surface-raised, rgba(255, 255, 255, 0.05))',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
    borderRadius: '6px',
    padding: '3px 8px'
  },
  error: {
    color: 'var(--accent-red)',
    background: 'var(--accent-red-dim)',
    padding: '14px',
    borderRadius: 'var(--radius)',
    marginBottom: '20px',
    fontFamily: "'Space Grotesk', sans-serif"
  },
  empty: {
    color: 'var(--text-dim, rgba(255, 255, 255, 0.55))',
    padding: '36px 0',
    textAlign: 'center',
    fontFamily: "'Space Grotesk', sans-serif"
  }
};