import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ExternalLink,
  Search,
  Globe,
  MapPin,
  Users,
  Award,
  Sparkles,
  Rocket,
  RefreshCw,
  Clock,
  Layers,
  CheckCircle2,
  Code2
} from 'lucide-react';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';

export default function HackathonsPage() {
  const [hackathons, setHackathons] = useState([]);
  const [stats, setStats] = useState({ total: 0, unstopCount: 0, devfolioCount: 0, hackerEarthCount: 0, onlineCount: 0, offlineCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [platform, setPlatform] = useState('all');
  const [mode, setMode] = useState('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('relevant');

  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }
    fetchHackathons();
  }, [platform, mode]);

  function fetchHackathons() {
    setLoading(true);
    setError('');
    api.hackathons({ platform, mode })
      .then(res => {
        setHackathons(res.hackathons || []);
        if (res.stats) setStats(res.stats);
      })
      .catch(err => {
        setError(err.message || 'Failed to fetch hackathons.');
      })
      .finally(() => {
        setLoading(false);
      });
  }

  if (!user) return null;

  // Safe filtering & sorting
  const filteredHackathons = hackathons
    .filter(h => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const title = String(h.title || '').toLowerCase();
      const tagline = String(h.tagline || '').toLowerCase();
      const organizer = String(h.organizer || '').toLowerCase();
      const location = String(h.location || '').toLowerCase();
      const tags = Array.isArray(h.tags) ? h.tags.map(t => String(t || '').toLowerCase()) : [];

      return (
        title.includes(q) ||
        tagline.includes(q) ||
        organizer.includes(q) ||
        location.includes(q) ||
        tags.some(t => t.includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'participants') {
        return (Number(b.participantsCount) || 0) - (Number(a.participantsCount) || 0);
      }
      if (sortBy === 'title') {
        return String(a.title || '').localeCompare(String(b.title || ''));
      }
      return 0; // default relevant order from API
    });

  return (
    <SidebarLayout active="hackathons">
      <div style={styles.container}>
        {/* Top Header */}
        <div style={styles.headerRow}>
          <div>
            <div style={styles.eyebrow}>
              <Sparkles size={13} style={{ marginRight: '6px', color: 'var(--accent-gold)' }} />
              UNSTOP · DEVFOLIO · HACKEREARTH
            </div>
            <h1 style={styles.title}>Hackathons &amp; Builds</h1>
            <p style={styles.subtitle}>
              Discover live hackathons, build innovative projects, win prizes, and boost your developer rank across top global platforms.
            </p>
          </div>

          <button
            style={styles.refreshBtn}
            onClick={fetchHackathons}
            disabled={loading}
            title="Refresh Hackathons"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {loading ? 'Fetching...' : 'Refresh'}
          </button>
        </div>

        {/* Stats Row */}
        <div style={styles.statsRow}>
          <div
            style={{ ...styles.statCard, cursor: 'pointer' }}
            onClick={() => setPlatform('all')}
          >
            <div style={styles.statIconWrapper}>
              <Rocket size={18} color="#10B981" />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.total}</div>
              <div style={styles.statLabel}>Active Opportunities</div>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'unstop' ? '#1C4980' : 'var(--border)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'unstop' ? 'all' : 'unstop')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(28, 73, 128, 0.15)', color: '#38BDF8' }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.unstopCount}</div>
              <div style={styles.statLabel}>Unstop Hackathons</div>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'devfolio' ? '#3770FF' : 'var(--border)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'devfolio' ? 'all' : 'devfolio')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(55, 112, 255, 0.15)', color: '#60A5FA' }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.devfolioCount}</div>
              <div style={styles.statLabel}>Devfolio Hackathons</div>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'hackerearth' ? '#A855F7' : 'var(--border)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'hackerearth' ? 'all' : 'hackerearth')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(168, 85, 247, 0.15)', color: '#C084FC' }}>
              <Code2 size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.hackerEarthCount}</div>
              <div style={styles.statLabel}>HackerEarth</div>
            </div>
          </div>
        </div>

        {/* Controls Bar: Tabs, Search, Filters */}
        <div style={styles.controlsBar}>
          {/* Platform Tabs */}
          <div style={styles.tabsContainer}>
            <button
              style={{ ...styles.tab, ...(platform === 'all' ? styles.tabActive : {}) }}
              onClick={() => setPlatform('all')}
            >
              All Platforms
            </button>
            <button
              style={{ ...styles.tab, ...(platform === 'unstop' ? styles.tabActiveUnstop : {}) }}
              onClick={() => setPlatform('unstop')}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#38BDF8', marginRight: '6px' }}></span>
              Unstop
            </button>
            <button
              style={{ ...styles.tab, ...(platform === 'devfolio' ? styles.tabActiveDevfolio : {}) }}
              onClick={() => setPlatform('devfolio')}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#3770FF', marginRight: '6px' }}></span>
              Devfolio
            </button>
            <button
              style={{ ...styles.tab, ...(platform === 'hackerearth' ? styles.tabActiveHackerEarth : {}) }}
              onClick={() => setPlatform('hackerearth')}
            >
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#C084FC', marginRight: '6px' }}></span>
              HackerEarth
            </button>
          </div>

          {/* Search & Select */}
          <div style={styles.searchAndFilters}>
            <div style={styles.searchWrapper}>
              <Search size={16} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search hackathons, tags, location..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="all">All Formats</option>
              <option value="online">Online Only</option>
              <option value="offline">In-Person / Hybrid</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={styles.selectFilter}
            >
              <option value="relevant">Most Relevant</option>
              <option value="participants">Most Popular</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Error alert */}
        {error && <div style={styles.errorBox}>{error}</div>}

        {/* Skeleton Loading State */}
        {loading && (
          <div style={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={styles.skeletonCard}>
                <div style={styles.skeletonBanner} />
                <div style={{ padding: '16px' }}>
                  <div style={styles.skeletonLine('60%', 16)} />
                  <div style={styles.skeletonLine('90%', 20)} />
                  <div style={styles.skeletonLine('75%', 14)} />
                  <div style={styles.skeletonLine('40%', 12)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredHackathons.length === 0 && (
          <div style={styles.emptyContainer}>
            <Rocket size={48} color="var(--text-dim)" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>No hackathons found</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>
              Try adjusting your search terms or platform filters.
            </p>
          </div>
        )}

        {/* Hackathon Cards Grid */}
        {!loading && filteredHackathons.length > 0 && (
          <div style={styles.grid}>
            {filteredHackathons.map(h => {
              const isDevfolio = h.platform === 'devfolio';
              const isHackerEarth = h.platform === 'hackerearth';
              const isOnline = h.mode === 'Online';
              const titleStr = String(h.title || 'Untitled Hackathon');
              const taglineStr = String(h.tagline || '');
              const organizerStr = String(h.organizer || 'Partner');
              const locationStr = String(h.location || '');
              const daysLeftStr = typeof h.daysLeft === 'string' ? h.daysLeft : '';
              const prizesStr = typeof h.prizes === 'string' ? h.prizes : null;
              const tagsList = Array.isArray(h.tags) ? h.tags.filter(t => typeof t === 'string') : [];

              const platformLabel = isDevfolio ? 'Devfolio' : (isHackerEarth ? 'HackerEarth' : 'Unstop');
              const platformBg = isDevfolio
                ? 'rgba(55, 112, 255, 0.9)'
                : (isHackerEarth ? 'rgba(168, 85, 247, 0.9)' : 'rgba(28, 73, 128, 0.9)');
              const platformBorder = isDevfolio ? '#60A5FA' : (isHackerEarth ? '#C084FC' : '#38BDF8');

              return (
                <div key={h.id} style={styles.card} className="row-hover">
                  {/* Card Banner */}
                  <div style={styles.cardBannerWrapper}>
                    {h.banner ? (
                      <img
                        src={h.banner}
                        alt={titleStr}
                        style={styles.cardBannerImg}
                        onError={e => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : null}

                    <div
                      style={{
                        ...styles.bannerFallbackGradient(isDevfolio, isHackerEarth),
                        display: h.banner ? 'none' : 'block'
                      }}
                    />

                    {/* Platform Badge */}
                    <div
                      style={{
                        ...styles.platformBadge,
                        background: platformBg,
                        borderColor: platformBorder
                      }}
                    >
                      {platformLabel}
                    </div>

                    {/* Mode Badge */}
                    <div
                      style={{
                        ...styles.modeBadge,
                        background: isOnline ? 'rgba(16, 185, 129, 0.9)' : 'rgba(139, 92, 246, 0.9)'
                      }}
                    >
                      {isOnline ? (
                        <>
                          <Globe size={11} style={{ marginRight: '4px' }} /> Online
                        </>
                      ) : (
                        <>
                          <MapPin size={11} style={{ marginRight: '4px' }} /> In-Person
                        </>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={styles.cardBody}>
                    <div style={styles.organizerRow}>
                      <span style={styles.organizerText} title={organizerStr}>
                        {organizerStr}
                      </span>
                      {locationStr && locationStr !== 'Online' && (
                        <span style={styles.locationTag} title={locationStr}>
                          <MapPin size={11} style={{ marginRight: '3px' }} />
                          {locationStr}
                        </span>
                      )}
                    </div>

                    <h3 style={styles.cardTitle}>{titleStr}</h3>

                    <p style={styles.cardTagline}>{taglineStr}</p>

                    {/* Tags */}
                    {tagsList.length > 0 && (
                      <div style={styles.tagRow}>
                        {tagsList.slice(0, 3).map((tag, idx) => (
                          <span key={idx} style={styles.tagPill}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stats / Highlights Footer */}
                    <div style={styles.cardMetaFooter}>
                      <div style={styles.metaLeft}>
                        {Number(h.participantsCount) > 0 && (
                          <div style={styles.metaItem} title="Registered Hackers">
                            <Users size={13} color="var(--text-dim)" />
                            <span>{Number(h.participantsCount).toLocaleString()}</span>
                          </div>
                        )}
                        {prizesStr && (
                          <div style={{ ...styles.metaItem, color: 'var(--accent-gold)' }} title="Prizes">
                            <Award size={13} />
                            <span style={{ fontWeight: 600 }}>{prizesStr}</span>
                          </div>
                        )}
                        {daysLeftStr && (
                          <div style={styles.metaItem} title="Time Remaining">
                            <Clock size={13} color="var(--accent-green)" />
                            <span style={{ color: 'var(--accent-green)' }}>{daysLeftStr}</span>
                          </div>
                        )}
                      </div>

                      <a
                        href={h.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          ...styles.applyBtn,
                          background: isDevfolio
                            ? 'rgba(55, 112, 255, 0.15)'
                            : (isHackerEarth ? 'rgba(168, 85, 247, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                          color: isDevfolio
                            ? '#60A5FA'
                            : (isHackerEarth ? '#C084FC' : 'var(--accent-green)'),
                          borderColor: isDevfolio
                            ? 'rgba(55, 112, 255, 0.4)'
                            : (isHackerEarth ? 'rgba(168, 85, 247, 0.4)' : 'rgba(16, 185, 129, 0.4)')
                        }}
                      >
                        Apply <ExternalLink size={13} style={{ marginLeft: '4px' }} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
    gap: '4px',
    flexWrap: 'wrap'
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
  tabActiveUnstop: {
    background: 'rgba(28, 73, 128, 0.4)',
    color: '#38BDF8',
    borderColor: '#1C4980',
    fontWeight: 600
  },
  tabActiveDevfolio: {
    background: 'rgba(55, 112, 255, 0.3)',
    color: '#60A5FA',
    fontWeight: 600
  },
  tabActiveHackerEarth: {
    background: 'rgba(168, 85, 247, 0.3)',
    color: '#C084FC',
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
    minWidth: '240px',
    flex: 1,
    maxWidth: '360px'
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
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease'
  },
  cardBannerWrapper: {
    position: 'relative',
    width: '100%',
    height: '140px',
    backgroundColor: '#0D1117',
    overflow: 'hidden'
  },
  cardBannerImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  bannerFallbackGradient: (isDevfolio, isHackerEarth) => ({
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    background: isDevfolio
      ? 'linear-gradient(135deg, #1E293B 0%, #1E40AF 100%)'
      : (isHackerEarth
          ? 'linear-gradient(135deg, #2E1065 0%, #7E22CE 100%)'
          : 'linear-gradient(135deg, #0F172A 0%, #047857 100%)')
  }),
  platformBadge: {
    position: 'absolute',
    top: '12px',
    left: '12px',
    color: '#FFF',
    fontSize: '10px',
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    letterSpacing: '1px',
    padding: '4px 10px',
    borderRadius: '999px',
    textTransform: 'uppercase',
    border: '1px solid transparent',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    zIndex: 2
  },
  modeBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    color: '#FFF',
    fontSize: '10px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    zIndex: 2
  },
  cardBody: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    flex: 1
  },
  organizerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    gap: '8px'
  },
  organizerText: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-dim)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  locationTag: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11px',
    color: 'var(--text-dim)',
    background: 'rgba(255,255,255,0.05)',
    padding: '2px 8px',
    borderRadius: '4px'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#FFF',
    margin: '0 0 8px 0',
    lineHeight: '1.3',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  cardTagline: {
    fontSize: '13px',
    color: 'var(--text-dim)',
    margin: '0 0 14px 0',
    lineHeight: '1.4',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    flex: 1
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '16px'
  },
  tagPill: {
    fontSize: '11px',
    color: 'var(--text-dim)',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    padding: '3px 8px'
  },
  cardMetaFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '12px',
    borderTop: '1px solid var(--border)',
    gap: '12px'
  },
  metaLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap'
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: 'var(--text-dim)'
  },
  applyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '7px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12px',
    fontWeight: 600,
    border: '1px solid transparent',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },
  errorBox: {
    color: 'var(--accent-red)',
    background: 'var(--accent-red-dim)',
    padding: '14px',
    borderRadius: 'var(--radius)',
    marginBottom: '20px',
    fontSize: '14px'
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    border: '1px dashed var(--border)'
  },
  skeletonCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    height: '280px'
  },
  skeletonBanner: {
    height: '140px',
    background: 'var(--border)',
    opacity: 0.6
  },
  skeletonLine: (widthPercent, heightPx) => ({
    width: typeof widthPercent === 'number' ? `${widthPercent}%` : widthPercent,
    height: `${heightPx}px`,
    background: 'var(--border)',
    borderRadius: '4px',
    marginBottom: '10px',
    opacity: 0.5
  })
};
