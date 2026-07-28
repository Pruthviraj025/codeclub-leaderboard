import { useNavigate } from 'react-router-dom';
import { Trophy, CalendarDays, BarChart3, Shield, User, LogOut } from 'lucide-react';
import { getSessionUser, clearSession } from '../api';

const NAV_ITEMS = [
  { key: 'leaderboard', label: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
  { key: 'contests', label: 'Contests', icon: CalendarDays, path: '/contests' },
  { key: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics' }
];


export default function SidebarLayout({ active, children }) {
  const user = getSessionUser();
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();
    navigate('/');
  }

  return (
    <div style={styles.shell} className="sidebar-shell">
      <aside style={styles.sidebar} className="app-sidebar">
        <div style={styles.logoMark}>{'<CODECLUB/>'}</div>
        <nav style={styles.nav}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                style={{ ...styles.navBtn, ...(isActive ? styles.navBtnActive : {}) }}
                onClick={() => navigate(item.path)}
              >
                <Icon size={17} strokeWidth={2} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <div style={styles.contentCol} className="app-content-col">
        <header style={styles.header} className="site-header">
          <div />
          <div style={styles.headerRight} className="header-right">
            {user?.role === 'admin' && (
              <button style={styles.adminBtn} onClick={() => navigate('/admin')}>
                <Shield size={15} /> Admin
              </button>
            )}
            <button style={styles.profileBtn} onClick={() => navigate(`/profile/${user?.id}`)}>
              <User size={15} /> My Profile
            </button>
            <button style={styles.logoutBtn} onClick={handleLogout}>
              <LogOut size={15} /> Log out
            </button>
          </div>
        </header>

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
    gap: 'var(--space-5)'
  },
  logoMark: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--accent-green)',
    padding: '0 var(--space-2)'
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-1)'
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-2)',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
    fontSize: '14px',
    fontWeight: 500,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    textAlign: 'left',
    width: '100%'
  },
  navBtnActive: {
    background: 'var(--surface-raised)',
    color: 'var(--text)',
    boxShadow: 'inset 3px 0 0 var(--accent-green)'
  },
  contentCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-4)'
  },
  headerRight: {
    display: 'flex',
    gap: 'var(--space-2)'
  },
  adminBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)',
    border: '1px solid var(--accent-gold)', borderRadius: 'var(--radius-sm)',
    padding: '8px 14px', fontSize: '13px', fontWeight: 600
  },
  profileBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'var(--surface-raised)', color: 'var(--text)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '8px 14px', fontSize: '13px', fontWeight: 600
  },
  logoutBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'transparent', color: 'var(--text-dim)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '8px 14px', fontSize: '13px', fontWeight: 600
  },
  main: {
    flex: 1,
    padding: 'var(--space-4) var(--space-5)'
  }
};
