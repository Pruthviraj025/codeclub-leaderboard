import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, CalendarDays, BarChart3, Rocket, Shield, User, LogOut, Menu, X, MessageSquarePlus } from 'lucide-react';
import { getSessionUser, clearSession } from '../api';

const NAV_ITEMS = [
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
  { key: 'contests', label: 'Contests', icon: CalendarDays, path: '/contests' },
  { key: 'hackathons', label: 'Hackathons', icon: Rocket, path: '/hackathons' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' }
];


import ReleaseNotesModal from './ReleaseNotesModal';

export default function SidebarLayout({ active, children }) {
  const user = getSessionUser();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    clearSession();
    navigate('/');
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
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </button>
          );
        })}

        <button
          className={`nav-link${active === 'profile' ? ' active' : ''}`}
          onClick={() => go(`/profile/${user?.id}`)}
        >
          <User size={17} strokeWidth={2} /> My Profile
        </button>

        {user?.role === 'admin' && (
          <button
            style={styles.adminBtn}
            className={active === 'admin' ? 'admin-active' : ''}
            onClick={() => go('/admin')}
          >
            <Shield size={15} /> Admin
          </button>
        )}

        <button className="nav-link" onClick={handleLogout}>
          <LogOut size={17} strokeWidth={2} /> Log out
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
        <MessageSquarePlus size={17} strokeWidth={2} /> Give a suggestion
      </button>
    );
  }

  return (
    <div style={styles.shell} className="sidebar-shell">
      <aside style={styles.sidebar} className="app-sidebar">
        <div style={styles.sidebarTop} className="app-sidebar-top">
          <button
            style={styles.hamburgerBtn}
            className="mobile-menu-btn"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div style={styles.logoMark}>
            {'<CODECLUB'}<span style={{ color: 'var(--accent-green)' }}>/</span>{'>'}
          </div>
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
            <div style={styles.logoMark}>
              {'<CODECLUB'}<span style={{ color: 'var(--accent-green)' }}>/</span>{'>'}
            </div>
            <button
              style={styles.hamburgerBtn}
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
      <ReleaseNotesModal />
    </div>
  );
}

const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: 'var(--bg)'
  },
  sidebar: {
    width: '220px',
    flexShrink: 0,
    borderRight: '1px solid var(--border)',
    background: 'var(--surface)',
    padding: 'var(--space-4) var(--space-3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-5)',
    minHeight: '100vh'
  },
  sidebarTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  hamburgerBtn: {
    display: 'none',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    padding: '6px',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoMark: {
    fontFamily: "'Orbitron', sans-serif",
    fontWeight: 700,
    fontSize: '15px',
    color: '#fff',
    padding: '0 var(--space-2)',
    letterSpacing: '1px',
    userSelect: 'none'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)',
    flex: 1
  },
  sidebarBottom: {
    borderTop: '1px solid var(--border)',
    paddingTop: 'var(--space-3)'
  },
  mobileMenuBottom: {
    marginTop: 'auto',
    padding: 'var(--space-4)',
    borderTop: '1px solid var(--border)'
  },
  suggestionBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'transparent',
    color: 'var(--text-dim)',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontSize: '13px',
    width: '100%',
    justifyContent: 'flex-start',
    cursor: 'pointer'
  },
  mobileMenuPage: {
    display: 'none',
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: 'var(--bg)',
    flexDirection: 'column'
  },
  mobileMenuHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--border)'
  },
  mobileMenuNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-2)',
    padding: 'var(--space-4)'
  },
  adminBtn: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)',
    border: '1px solid var(--accent-gold)', borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px',
    userSelect: 'none',
    width: '100%',
    justifyContent: 'flex-start'
  },
  contentCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },
  main: {
    flex: 1,
    padding: 'var(--space-4) var(--space-5)'
  }
};