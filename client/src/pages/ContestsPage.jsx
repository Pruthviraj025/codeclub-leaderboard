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
  const [platform, setPlatform] = useState('all'); // 'all', 'codeforces', 'leetcode'
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'upcoming', 'live'
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
        {/* Title Header */}
        <div style={styles.headerRow}>
          <div>
            <div style={styles.eyebrow}>
              <Sparkles size={13} style={{ marginRight: '6px', color: 'var(--accent-gold)' }} />
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
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {loading ? 'Fetching...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div style={{ ...styles.statCard, cursor: 'pointer' }} onClick={() => setPlatform('all')}>
            <div style={styles.statIconWrapper}>
              <CalendarDays size={18} color="#10B981" />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.totalCount}</div>
              <div style={styles.statLabel}>Total Contests</div>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'codeforces' ? '#3B82F6' : 'var(--border)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'codeforces' ? 'all' : 'codeforces')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA' }}>
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
              borderColor: platform === 'leetcode' ? '#F97316' : 'var(--border)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'leetcode' ? 'all' : 'leetcode')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(249, 115, 22, 0.15)', color: '#F97316' }}>
              <Flame size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.lcCount}</div>
              <div style={styles.statLabel}>LeetCode</div>
            </div>
          </div>

          <div style={styles.statCard}>
            <div style={{ ...styles.statIconWrapper, background: 'rgba(234, 179, 8, 0.15)', color: '#EAB308' }}>
              <Clock size={18} />
            </div>
            <div>
              <div style={styles.statValue}>
                {loading ? '-' : `${stats.upcomingCount} Upcoming / ${stats.liveCount} Live`}
              </div>
              <div style={styles.statLabel}>Active Contests</div>
            </div>
          </div>
        </div>

        {/* Controls Bar: Tabs, Search, Filters */}
        <div style={styles.controlsBar}>
          <div style={styles.tabsContainer}>
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
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#60A5FA', marginRight: '6px' }}></span>
              Codeforces
            </button>
            <button
              style={{ ...styles.tab, ...(platform === 'leetcode' ? styles.tabActiveLC : {}) }}
              onClick={() => setPlatform('leetcode')}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#F97316', marginRight: '6px' }}></span>
              LeetCode
            </button>
          </div>

          <div style={styles.searchAndFilters}>
            <div style={styles.searchWrapper}>
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
            >
              <option value="all">All Phases</option>
              <option value="upcoming">Upcoming Only</option>
              <option value="live">Live Only</option>
            </select>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {loading && <div style={styles.empty}>Loading contests...</div>}

        {/* Codeforces Section */}
        {!loading && (platform === 'all' || platform === 'codeforces') && (
          <div style={{ marginBottom: '40px' }}>
            <div style={styles.platformHeader}>
              <Trophy size={18} color="#60A5FA" style={{ marginRight: '8px' }} />
              <span style={{ color: '#60A5FA' }}>Codeforces Contests</span>
            </div>

            {cfDivisions.map(div => {
              const list = cfGrouped[div].filter(filterContest);
              if (list.length === 0) return null;

              return (
                <section key={div} style={styles.section}>
                  <div style={styles.sectionTitle}>{div}</div>
                  <div style={styles.grid}>
                    {list.map(c => (
                      <a
                        key={c.id}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        style={styles.card}
                        className="row-hover"
                      >
                        <div style={styles.cardTop}>
                          <div style={styles.badgeRow}>
                            <span style={{ ...styles.platformBadge, background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA' }}>
                              Codeforces
                            </span>
                            <span style={{ ...styles.phaseBadge, ...phaseStyle(c.phase) }}>
                              {phaseLabel(c.phase)}
                            </span>
                          </div>
                          <ExternalLink size={13} color="var(--text-dim)" />
                        </div>

                        <div style={styles.cardName}>{c.name}</div>

                        <div style={styles.cardMetaRow}>
                          <div style={styles.cardMeta} className="mono">
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

        {/* LeetCode Section */}
        {!loading && (platform === 'all' || platform === 'leetcode') && (
          <div style={{ marginBottom: '40px' }}>
            <div style={styles.platformHeader}>
              <Flame size={18} color="#F97316" style={{ marginRight: '8px' }} />
              <span style={{ color: '#F97316' }}>LeetCode Contests</span>
            </div>

            {lcCategories.map(cat => {
              const list = lcGrouped[cat].filter(filterContest);
              if (list.length === 0) return null;

              return (
                <section key={cat} style={styles.section}>
                  <div style={styles.sectionTitle}>{cat}</div>
                  <div style={styles.grid}>
                    {list.map(c => (
                      <a
                        key={c.id}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ ...styles.card, borderColor: 'rgba(249, 115, 22, 0.25)' }}
                        className="row-hover"
                      >
                        <div style={styles.cardTop}>
                          <div style={styles.badgeRow}>
                            <span style={{ ...styles.platformBadge, background: 'rgba(249, 115, 22, 0.2)', color: '#F97316' }}>
                              LeetCode
                            </span>
                            <span style={{ ...styles.phaseBadge, ...phaseStyle(c.phase) }}>
                              {phaseLabel(c.phase)}
                            </span>
                          </div>
                          <ExternalLink size={13} color="var(--text-dim)" />
                        </div>

                        <div style={styles.cardName}>{c.name}</div>

                        <div style={styles.cardMetaRow}>
                          <div style={styles.cardMeta} className="mono">
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
  if (phase === 'BEFORE') return { background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)' };
  if (phase === 'CODING') return { background: 'var(--accent-green-dim)', color: 'var(--accent-green)' };
  return { background: 'var(--border)', color: 'var(--text-dim)' };
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
    marginBottom: '24px',
    gap: '16px',
    flexWrap: 'wrap'
  },
  eyebrow: {
    display: 'flex',
    alignItems: 'center',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '11px',
    letterSpacing: '2px',
    color: 'var(--text-dim)',
    marginBottom: '6px',
    textTransform: 'uppercase'
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '32px',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '1px',
    color: '#FFF'
  },
  subtitle: {
    color: 'var(--text-dim)',
    fontSize: '14px',
    margin: '8px 0 0 0',
    maxWidth: '650px'
  },
  refreshBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '8px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px'
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px',
    transition: 'all 0.2s ease'
  },
  statIconWrapper: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    background: 'rgba(16, 185, 129, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  statValue: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    color: '#FFF'
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    marginTop: '2px'
  },
  controlsBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  tabsContainer: {
    display: 'flex',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '4px',
    gap: '4px'
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
    padding: '7px 16px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  tabActive: {
    background: 'var(--border)',
    color: '#FFF',
    fontWeight: 600
  },
  tabActiveCF: {
    background: 'rgba(59, 130, 246, 0.3)',
    color: '#60A5FA',
    fontWeight: 600
  },
  tabActiveLC: {
    background: 'rgba(249, 115, 22, 0.3)',
    color: '#F97316',
    fontWeight: 600
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
    minWidth: '220px',
    flex: 1,
    maxWidth: '320px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-dim)'
  },
  searchInput: {
    width: '100%',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '8px 12px 8px 36px',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none'
  },
  selectFilter: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '8px 12px',
    color: 'var(--text)',
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer'
  },
  platformHeader: {
    display: 'flex',
    alignItems: 'center',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '16px',
    fontWeight: 700,
    letterSpacing: '1px',
    marginBottom: '16px',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--border)'
  },
  section: { marginBottom: '24px' },
  sectionTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
    marginBottom: '12px',
    userSelect: 'none'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '14px'
  },
  card: {
    display: 'block',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '16px',
    textDecoration: 'none',
    transition: 'transform 0.2s ease, border-color 0.2s ease'
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
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '1px',
    padding: '3px 8px',
    borderRadius: '999px',
    textTransform: 'uppercase'
  },
  phaseBadge: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '1px',
    padding: '3px 8px',
    borderRadius: '999px',
    userSelect: 'none'
  },
  cardName: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '10px',
    lineHeight: '1.3'
  },
  cardMetaRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px'
  },
  cardMeta: {
    fontSize: '12px',
    color: 'var(--text-dim)'
  },
  durationPill: {
    fontSize: '11px',
    color: 'var(--text-dim)',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '2px 6px'
  },
  error: {
    color: 'var(--accent-red)',
    background: 'var(--accent-red-dim)',
    padding: '14px',
    borderRadius: 'var(--radius)',
    marginBottom: '20px'
  },
  empty: {
    color: 'var(--text-dim)',
    padding: '30px 0',
    textAlign: 'center'
  }
};