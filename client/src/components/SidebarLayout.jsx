import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, CalendarDays, BarChart3, Rocket, Shield, User, LogOut, Menu, X, MessageSquarePlus, MessageCircle } from 'lucide-react';
import { getSessionUser, clearSession } from '../api';
import { useAuth } from '../context/AuthContext';
import SidebarParticles from './SidebarParticles';

const NAV_ITEMS = [
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
  { key: 'contests', label: 'Contests', icon: CalendarDays, path: '/contests' },
  { key: 'hackathons', label: 'Hackathons', icon: Rocket, path: '/hackathons' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { key: 'discuss', label: 'Discuss', icon: MessageCircle, path: '/discuss' }
];



export default function SidebarLayout({ active, children }) {
  const user = getSessionUser();
  const navigate = useNavigate();
  const auth = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  // Auto-close mobile drawer on desktop resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768 && mobileOpen) {
        setMobileOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileOpen]);

  function handleLogout() {
    if (auth?.logout) {
      auth.logout();
    } else {
      clearSession();
    }
    navigate('/?mode=login', { replace: true });
  }

  function go(path) {
    navigate(path);
    setMobileOpen(false);
  }

  function renderNavItems() {
    return (
      <>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              className={`nav-link${isActive ? ' active' : ''}`}
              onClick={() => go(item.path)}
            >
              <Icon size={18} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}

        <button
          className={`nav-link${active === 'profile' ? ' active' : ''}`}
          onClick={() => go(`/profile/${user?.id}`)}
        >
          <User size={18} strokeWidth={2} /> My Profile
        </button>

        {user?.role === 'admin' && (
          <button
            className={`nav-link nav-link-admin${active === 'admin' ? ' active' : ''}`}
            onClick={() => go('/admin')}
          >
            <Shield size={18} strokeWidth={2} /> Admin
          </button>
        )}

        <button className="nav-link" onClick={handleLogout}>
          <LogOut size={18} strokeWidth={2} /> Log out
        </button>
      </>
    );
  }

  function renderSuggestionBtn() {
    return (
      <button
        style={styles.suggestionBtn}
        className={`suggestion-btn ${active === 'suggestions' ? 'suggestion-active' : ''}`}
        onClick={() => go('/suggestions')}
      >
        <MessageSquarePlus size={18} strokeWidth={2} /> Give a suggestion
      </button>
    );
  }

  return (
    <div style={styles.shell} className="sidebar-shell">
      <aside style={styles.sidebar} className="app-sidebar">
        {/* Subtle, atmospheric Grain Mass-inspired floating particles */}
        <SidebarParticles />

        <div style={styles.sidebarTop} className="app-sidebar-top">
          <div
            style={styles.logoMark}
            onClick={() => go('/leaderboard')}
            className="sidebar-brand-wordmark"
            title="CodeClub Leaderboard"
          >
            <span className="brand-bracket">&lt;</span>
            <span className="brand-word">CODECLUB</span>
            <span className="brand-slash">/</span>
            <span className="brand-bracket">&gt;</span>
          </div>

          <button
            style={styles.hamburgerBtn}
            className="mobile-menu-btn"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>
        </div>

        <nav style={styles.nav} className="app-nav-desktop">
          {renderNavItems()}
        </nav>

        <div style={styles.sidebarBottom} className="app-sidebar-bottom">
          {renderSuggestionBtn()}
        </div>
      </aside>

      {mobileOpen && (
        <div style={styles.mobileMenuPage} className="mobile-nav-page">
          <SidebarParticles />
          <div style={styles.mobileMenuHeader}>
            <div
              style={styles.logoMark}
              onClick={() => go('/leaderboard')}
              className="sidebar-brand-wordmark"
              title="CodeClub Leaderboard"
            >
              <span className="brand-bracket">&lt;</span>
              <span className="brand-word">CODECLUB</span>
              <span className="brand-slash">/</span>
              <span className="brand-bracket">&gt;</span>
            </div>
            <button
              style={{ ...styles.hamburgerBtn, display: 'flex' }}
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X size={22} />
            </button>
          </div>

          <nav style={styles.mobileMenuNav}>
            {renderNavItems()}
          </nav>

          <div style={styles.mobileMenuBottom}>
            {renderSuggestionBtn()}
          </div>
        </div>
      )}

      <div style={styles.contentCol} className="app-content-col">
        <main style={styles.main} className="page-main">
          {children}
        </main>
      </div>
    </div>
  );
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#050608'
  },
  sidebar: {
    width: '220px',
    flexShrink: 0,
    borderRight: '1px solid rgba(255, 255, 255, 0.055)',
    background:
      'radial-gradient(ellipse 220px 160px at 50% 0%, rgba(67, 0, 255, 0.07) 0%, transparent 75%), ' +
      'radial-gradient(ellipse 180px 220px at 0% 55%, rgba(67, 0, 255, 0.035) 0%, transparent 70%), ' +
      'radial-gradient(ellipse 160px 180px at 100% 90%, rgba(251, 146, 60, 0.015) 0%, transparent 70%), ' +
      'linear-gradient(180deg, rgba(7, 9, 14, 0.88) 0%, rgba(3, 4, 7, 0.95) 55%, #020204 100%)',
    boxShadow: 'inset -1px 0 0 rgba(255, 255, 255, 0.02), 6px 0 28px rgba(0, 0, 0, 0.65)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    padding: 'var(--space-4) var(--space-3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    position: 'sticky',
    top: 0,
    height: '100vh',
    alignSelf: 'flex-start',
    boxSizing: 'border-box',
    overflow: 'hidden',
    zIndex: 10
  },
  sidebarTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
    position: 'relative',
    zIndex: 2
  },
  hamburgerBtn: {
    display: 'none',
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '8px',
    minWidth: '42px',
    minHeight: '42px',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  logoMark: {
    padding: '4px 6px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    userSelect: 'none'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
    position: 'relative',
    zIndex: 2
  },
  sidebarBottom: {
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    paddingTop: 'var(--space-3)',
    position: 'relative',
    zIndex: 2
  },
  mobileMenuBottom: {
    marginTop: 'auto',
    padding: '14px 16px',
    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
    position: 'relative',
    zIndex: 2
  },
  suggestionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.025)',
    color: 'rgba(255, 255, 255, 0.85)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '11px 14px',
    fontSize: '14px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: 500,
    width: '100%',
    justifyContent: 'flex-start',
    cursor: 'pointer',
    minHeight: '44px',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
    position: 'relative',
    zIndex: 2
  },
  mobileMenuPage: {
    display: 'none',
    position: 'fixed',
    inset: 0,
    height: '100vh',
    maxHeight: '100dvh',
    zIndex: 9999,
    background:
      'radial-gradient(ellipse 260px 180px at 50% 0%, rgba(99, 223, 255, 0.08) 0%, transparent 75%), ' +
      'linear-gradient(180deg, rgba(12, 16, 23, 0.98) 0%, rgba(6, 8, 12, 0.99) 100%)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    flexDirection: 'column',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch'
  },
  mobileMenuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(12, 16, 23, 0.9)',
    position: 'relative',
    zIndex: 2
  },
  mobileMenuNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '16px',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    flex: 1,
    position: 'relative',
    zIndex: 2
  },
  contentCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },
  main: {
    flex: 1,
    padding: 'var(--space-4) var(--space-5)',
    background:
      'radial-gradient(ellipse 90% 50% at 50% -12%, rgba(99, 223, 255, 0.04) 0%, transparent 65%), ' +
      'radial-gradient(ellipse 65% 45% at 88% 22%, rgba(216, 180, 254, 0.028) 0%, transparent 55%), ' +
      'radial-gradient(ellipse 55% 40% at 12% 48%, rgba(252, 211, 77, 0.018) 0%, transparent 50%), ' +
      'radial-gradient(ellipse at 50% 0%, #0D111A 0%, #06080C 55%, #000000 100%)',
    minHeight: '100vh'
  }
};