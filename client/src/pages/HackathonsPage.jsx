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
      return 0; 
    });

  return (
    <SidebarLayout active="hackathons">
      <div style={styles.container}>
        <div style={styles.headerRow} className="hackathons-header-row">
          <div>
            <div style={styles.eyebrow}>
              <Sparkles size={13} style={{ marginRight: '6px', color: '#5EEAD4' }} />
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
              <Rocket size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.total}</div>
              <div style={styles.statLabel}>Active Builds</div>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'unstop' ? '#38BDF8' : 'rgba(255, 255, 255, 0.08)',
              boxShadow: platform === 'unstop'
                ? '0 12px 30px rgba(0, 0, 0, 0.55), 0 0 16px rgba(56, 189, 248, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'unstop' ? 'all' : 'unstop')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(56, 189, 248, 0.12)', color: '#38BDF8' }}>
              <Layers size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.unstopCount}</div>
              <div style={styles.statLabel}>Unstop</div>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'devfolio' ? '#60A5FA' : 'rgba(255, 255, 255, 0.08)',
              boxShadow: platform === 'devfolio'
                ? '0 12px 30px rgba(0, 0, 0, 0.55), 0 0 16px rgba(96, 165, 250, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'devfolio' ? 'all' : 'devfolio')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(96, 165, 250, 0.12)', color: '#60A5FA' }}>
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.devfolioCount}</div>
              <div style={styles.statLabel}>Devfolio</div>
            </div>
          </div>

          <div
            style={{
              ...styles.statCard,
              borderColor: platform === 'hackerearth' ? '#C084FC' : 'rgba(255, 255, 255, 0.08)',
              boxShadow: platform === 'hackerearth'
                ? '0 12px 30px rgba(0, 0, 0, 0.55), 0 0 16px rgba(192, 132, 252, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                : '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
              cursor: 'pointer'
            }}
            onClick={() => setPlatform(platform === 'hackerearth' ? 'all' : 'hackerearth')}
          >
            <div style={{ ...styles.statIconWrapper, background: 'rgba(192, 132, 252, 0.12)', color: '#C084FC' }}>
              <Code2 size={18} />
            </div>
            <div>
              <div style={styles.statValue}>{loading ? '-' : stats.hackerEarthCount}</div>
              <div style={styles.statLabel}>HackerEarth</div>
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
              <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#60A5FA', marginRight: '6px' }}></span>
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

          <div style={styles.searchAndFilters} className="mobile-stack">
            <div style={styles.searchWrapper} className="mobile-full-width">
              <Search size={16} style={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search hackathons..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={styles.searchInput}
              />
            </div>

            <select
              value={mode}
              onChange={e => setMode(e.target.value)}
              style={styles.selectFilter}
              className="mobile-full-width"
            >
              <option value="all">All Formats</option>
              <option value="online">Online Only</option>
              <option value="offline">In-Person / Hybrid</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={styles.selectFilter}
              className="mobile-full-width"
            >
              <option value="relevant">Most Relevant</option>
              <option value="participants">Most Popular</option>
              <option value="title">Alphabetical</option>
            </select>
          </div>
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading && (
          <div style={styles.grid} className="hackathons-grid-responsive">
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

        {!loading && filteredHackathons.length === 0 && (
          <div style={styles.emptyContainer}>
            <Rocket size={48} color="var(--text-dim)" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 6px 0', fontSize: '18px' }}>No hackathons found</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', margin: 0 }}>
              Try adjusting your search terms or platform filters.
            </p>
          </div>
        )}

        {!loading && filteredHackathons.length > 0 && (
          <div style={styles.grid} className="hackathons-grid-responsive">
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
                ? 'rgba(55, 112, 255, 0.22)'
                : (isHackerEarth ? 'rgba(168, 85, 247, 0.22)' : 'rgba(56, 189, 248, 0.22)');
              const platformColor = isDevfolio ? '#60A5FA' : (isHackerEarth ? '#C084FC' : '#38BDF8');
              const platformBorder = isDevfolio ? 'rgba(96, 165, 250, 0.4)' : (isHackerEarth ? 'rgba(192, 132, 252, 0.4)' : 'rgba(56, 189, 248, 0.4)');

              const modeBg = isOnline ? 'rgba(94, 234, 212, 0.15)' : 'rgba(216, 180, 254, 0.15)';
              const modeColor = isOnline ? '#5EEAD4' : '#D8B4FE';
              const modeBorder = isOnline ? 'rgba(94, 234, 212, 0.35)' : 'rgba(216, 180, 254, 0.35)';

              return (
                <div key={h.id} style={styles.card} className="hackathon-card">
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

                    <div
                      style={{
                        ...styles.platformBadge,
                        background: platformBg,
                        color: platformColor,
                        borderColor: platformBorder
                      }}
                    >
                      {platformLabel}
                    </div>

                    <div
                      style={{
                        ...styles.modeBadge,
                        background: modeBg,
                        color: modeColor,
                        borderColor: modeBorder
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

                    {tagsList.length > 0 && (
                      <div style={styles.tagRow}>
                        {tagsList.slice(0, 3).map((tag, idx) => (
                          <span key={idx} style={styles.tagPill}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={styles.cardMetaFooter}>
                      <div style={styles.metaLeft}>
                        {Number(h.participantsCount) > 0 && (
                          <div style={styles.metaItem} title="Registered Hackers">
                            <Users size={13} color="rgba(255, 255, 255, 0.55)" />
                            <span>{Number(h.participantsCount).toLocaleString()}</span>
                          </div>
                        )}
                        {prizesStr && (
                          <div style={{ ...styles.metaItem, color: '#FCD34D' }} title="Prizes">
                            <Award size={13} />
                            <span style={{ fontWeight: 600 }}>{prizesStr}</span>
                          </div>
                        )}
                        {daysLeftStr && (
                          <div style={styles.metaItem} title="Time Remaining">
                            <Clock size={13} color="#5EEAD4" />
                            <span style={{ color: '#5EEAD4', fontWeight: 600 }}>{daysLeftStr}</span>
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
                            ? 'rgba(96, 165, 250, 0.12)'
                            : (isHackerEarth ? 'rgba(192, 132, 252, 0.12)' : 'rgba(94, 234, 212, 0.12)'),
                          color: isDevfolio
                            ? '#60A5FA'
                            : (isHackerEarth ? '#C084FC' : '#5EEAD4'),
                          borderColor: isDevfolio
                            ? 'rgba(96, 165, 250, 0.35)'
                            : (isHackerEarth ? 'rgba(192, 132, 252, 0.35)' : 'rgba(94, 234, 212, 0.35)')
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
    color: '#5EEAD4',
    marginBottom: '8px',
    textTransform: 'uppercase',
    userSelect: 'none'
  },
  title: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 'clamp(24px, 4vw, 32px)',
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.3px',
    color: '#FFFFFF',
    textShadow: '0 0 24px rgba(255, 255, 255, 0.12)'
  },
  subtitle: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '8px 0 0 0',
    maxWidth: '650px'
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '10px',
    color: '#FFFFFF',
    padding: '9px 18px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    letterSpacing: '0.3px',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
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
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '16px 18px',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
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
    color: '#FFFFFF',
    letterSpacing: '0.2px'
  },
  statLabel: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '12px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.55)',
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
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '5px',
    gap: '4px',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    whiteSpace: 'nowrap'
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    whiteSpace: 'nowrap',
    background: 'transparent',
    border: '1px solid transparent',
    color: 'rgba(255, 255, 255, 0.65)',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  tabActive: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    color: '#FFFFFF',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
  },
  tabActiveUnstop: {
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    color: '#38BDF8',
    fontWeight: 600,
    boxShadow: '0 2px 10px rgba(56, 189, 248, 0.15)'
  },
  tabActiveDevfolio: {
    background: 'rgba(96, 165, 250, 0.12)',
    border: '1px solid rgba(96, 165, 250, 0.3)',
    color: '#60A5FA',
    fontWeight: 600,
    boxShadow: '0 2px 10px rgba(96, 165, 250, 0.15)'
  },
  tabActiveHackerEarth: {
    background: 'rgba(192, 132, 252, 0.12)',
    border: '1px solid rgba(192, 132, 252, 0.3)',
    color: '#C084FC',
    fontWeight: 600,
    boxShadow: '0 2px 10px rgba(192, 132, 252, 0.15)'
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
    maxWidth: '360px'
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'rgba(255, 255, 255, 0.45)'
  },
  searchInput: {
    width: '100%',
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderRadius: '10px',
    padding: '9px 14px 9px 38px',
    color: '#FFFFFF',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    outline: 'none',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    transition: 'all 0.2s ease'
  },
  selectFilter: {
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderRadius: '10px',
    padding: '9px 14px',
    color: '#FFFFFF',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    outline: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    transition: 'all 0.2s ease'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '18px'
  },
  card: {
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease'
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
    fontSize: '10px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: 600,
    letterSpacing: '0.8px',
    padding: '4px 10px',
    borderRadius: '999px',
    textTransform: 'uppercase',
    border: '1px solid transparent',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    zIndex: 2
  },
  modeBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    fontSize: '10px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: 600,
    letterSpacing: '0.4px',
    padding: '4px 10px',
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid transparent',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    zIndex: 2
  },
  cardBody: {
    padding: '18px',
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
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.55)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  locationTag: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '11px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.65)',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '2px 8px',
    borderRadius: '6px'
  },
  cardTitle: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '17px',
    fontWeight: 700,
    color: '#FFFFFF',
    margin: '0 0 8px 0',
    lineHeight: '1.35',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  cardTagline: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.65)',
    margin: '0 0 14px 0',
    lineHeight: '1.45',
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
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.65)',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '3px 8px'
  },
  cardMetaFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: '14px',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
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
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.55)'
  },
  applyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    border: '1px solid transparent',
    textDecoration: 'none',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    whiteSpace: 'nowrap'
  },
  errorBox: {
    color: 'var(--accent-red)',
    background: 'var(--accent-red-dim)',
    padding: '14px',
    borderRadius: 'var(--radius)',
    marginBottom: '20px',
    fontSize: '14px',
    fontFamily: "'Space Grotesk', sans-serif"
  },
  emptyContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'rgba(10, 13, 19, 0.72)',
    borderRadius: '14px',
    border: '1px dashed rgba(255, 255, 255, 0.12)',
    fontFamily: "'Space Grotesk', sans-serif"
  },
  skeletonCard: {
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    overflow: 'hidden',
    height: '280px'
  },
  skeletonBanner: {
    height: '140px',
    background: 'rgba(255, 255, 255, 0.05)',
    opacity: 0.6
  },
  skeletonLine: (widthPercent, heightPx) => ({
    width: typeof widthPercent === 'number' ? `${widthPercent}%` : widthPercent,
    height: `${heightPx}px`,
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: '4px',
    marginBottom: '10px',
    opacity: 0.5
  })
};
