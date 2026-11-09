import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, CalendarDays, BarChart3, Rocket, Shield, User, LogOut, Menu, X, MessageSquarePlus, MessageCircle } from 'lucide-react';
import { getSessionUser, clearSession } from '../api';
import { useAuth } from '../context/AuthContext';

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
              <Icon size={17} strokeWidth={isActive ? 2.2 : 1.7} />
              <span>{item.label}</span>
            </button>
          );
        })}

        <button
          className={`nav-link${active === 'profile' ? ' active' : ''}`}
          onClick={() => go(`/profile/${user?.id}`)}
        >
          <User size={17} strokeWidth={active === 'profile' ? 2.2 : 1.7} />
          <span>My Profile</span>
        </button>

        {user?.role === 'admin' && (
          <button
            style={styles.adminBtn}
            className={active === 'admin' ? 'admin-active' : ''}
            onClick={() => go('/admin')}
          >
            <Shield size={16} strokeWidth={2} />
            <span>Admin</span>
          </button>
        )}

        <button className="nav-link" onClick={handleLogout} style={{ marginTop: 'auto' }}>
          <LogOut size={17} strokeWidth={1.7} />
          <span>Log out</span>
        </button>
      </>
    );
  }

  function renderSuggestionBtn() {
    return (
      <button
        style={styles.suggestionBtn}
        className={active === 'suggestions' ? 'suggestion-active' : ''}
        onClick={() => go('/suggestions')}
      >
        <MessageSquarePlus size={16} strokeWidth={1.8} />
        <span>Feedback & Ideas</span>
      </button>
    );
  }

  return (
    <div style={styles.shell} className="sidebar-shell">
      <aside style={styles.sidebar} className="app-sidebar">
        <div style={styles.sidebarTop} className="app-sidebar-top">
          <div style={styles.logoMark} onClick={() => go('/leaderboard')}>
            <span style={styles.logoText}>CodeClub</span>
            <span style={styles.logoPill}>SUITE</span>
          </div>

          <button
            style={styles.hamburgerBtn}
            className="mobile-menu-btn"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
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
          <div style={styles.mobileMenuHeader}>
            <div style={styles.logoMark} onClick={() => go('/leaderboard')}>
              <span style={styles.logoText}>CodeClub</span>
              <span style={styles.logoPill}>SUITE</span>
            </div>
            <button
              style={{ ...styles.hamburgerBtn, display: 'flex' }}
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X size={20} />
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
    backgroundColor: 'var(--color-warm-parchment, #f2f0eb)',
    color: 'var(--color-ink-charcoal, #292827)'
  },
  sidebar: {
    width: '240px',
    flexShrink: 0,
    borderRight: '1px solid var(--color-soft-mist, #e3e3e2)',
    backgroundColor: 'var(--color-warm-parchment, #f2f0eb)',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    position: 'sticky',
    top: 0,
    height: '100vh',
    alignSelf: 'flex-start',
    boxSizing: 'border-box'
  },
  sidebarTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px'
  },
  logoMark: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    userSelect: 'none'
  },
  logoText: {
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    fontWeight: 600,
    fontSize: '18px',
    letterSpacing: '-0.022em',
    color: 'var(--color-ink-charcoal, #292827)'
  },
  logoPill: {
    fontFamily: "var(--font-mono, monospace)",
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    background: 'var(--color-midnight-wine, #421d24)',
    color: '#ffffff',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  hamburgerBtn: {
    display: 'none',
    background: 'var(--color-paper-white, #ffffff)',
    border: '1px solid var(--color-soft-mist, #e3e3e2)',
    borderRadius: '8px',
    color: 'var(--color-ink-charcoal, #292827)',
    padding: '8px',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
    overflowY: 'auto',
    minHeight: 0
  },
  sidebarBottom: {
    borderTop: '1px solid var(--color-soft-mist, #e3e3e2)',
    paddingTop: '16px'
  },
  mobileMenuBottom: {
    marginTop: 'auto',
    padding: '16px',
    borderTop: '1px solid var(--color-soft-mist, #e3e3e2)'
  },
  suggestionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--color-paper-white, #ffffff)',
    color: 'var(--color-ink-charcoal, #292827)',
    border: '1px solid var(--color-soft-mist, #e3e3e2)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13.5px',
    fontWeight: 460,
    width: '100%',
    justifyContent: 'flex-start',
    cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
  },
  adminBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--color-lilac-mist, #d4c7ff)',
    color: 'var(--color-ink-charcoal, #292827)',
    border: '1px solid rgba(113, 76, 182, 0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13.5px',
    fontWeight: 540,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left'
  },
  mobileMenuPage: {
    display: 'none',
    position: 'fixed',
    inset: 0,
    zIndex: 999,
    background: 'rgba(242, 240, 235, 0.98)',
    backdropFilter: 'blur(16px)',
    flexDirection: 'column'
  },
  mobileMenuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--color-soft-mist, #e3e3e2)',
    background: 'var(--color-paper-white, #ffffff)'
  },
  mobileMenuNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '20px',
    overflowY: 'auto'
  },
  contentCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    backgroundColor: 'var(--color-warm-parchment, #f2f0eb)'
  },
  main: {
    flex: 1,
    padding: '32px 40px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box'
  }
};