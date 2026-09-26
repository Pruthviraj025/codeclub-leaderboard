import { useState, useEffect } from 'react';
import { Rocket, CalendarDays, Lock, X } from 'lucide-react';

const RELEASE_VERSION_KEY = 'hasSeenRelease_v1.4.0';

export default function ReleaseNotesModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(RELEASE_VERSION_KEY);
      if (!seen) {
        setOpen(true);
      }
    } catch {
      // Fallback if localStorage is restricted
    }
  }, []);

  function handleDismiss() {
    try {
      localStorage.setItem(RELEASE_VERSION_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div style={styles.backdrop} onClick={handleDismiss}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={handleDismiss} aria-label="Close modal">
          <X size={18} />
        </button>

        <div style={styles.header}>
          <span style={styles.versionBadge}>v1.4.0 UPDATE</span>
          <h2 style={styles.title}>What's New in CodeClub v1.4</h2>
          <p style={styles.subtitle}>
            Here is a quick summary of the latest features added in this release:
          </p>
        </div>

        <div style={styles.featureList}>
          <div style={styles.featureItem}>
            <div style={{ ...styles.iconBox, background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-green)' }}>
              <Rocket size={18} />
            </div>
            <div>
              <div style={styles.featureTitle}>Hackathons Explorer</div>
              <div style={styles.featureDesc}>
                Discover live hackathons across Unstop, Devfolio, and HackerEarth with mode filters and direct apply links.
              </div>
            </div>
          </div>

          <div style={styles.featureItem}>
            <div style={{ ...styles.iconBox, background: 'rgba(96, 165, 250, 0.12)', color: '#60A5FA' }}>
              <CalendarDays size={18} />
            </div>
            <div>
              <div style={styles.featureTitle}>LeetCode Contests</div>
              <div style={styles.featureDesc}>
                Track upcoming and live LeetCode Weekly &amp; Biweekly Contests alongside Codeforces rounds.
              </div>
            </div>
          </div>

          <div style={styles.featureItem}>
            <div style={{ ...styles.iconBox, background: 'rgba(245, 158, 11, 0.12)', color: 'var(--accent-gold)' }}>
              <Lock size={18} />
            </div>
            <div>
              <div style={styles.featureTitle}>Website Suggestions</div>
              <div style={styles.featureDesc}>
                Now you can provide suggestions for improvement of the website.
              </div>
            </div>
          </div>
        </div>

        <button style={styles.submitBtn} onClick={handleDismiss}>
          Got it, Let's Code!
        </button>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px'
  },
  modal: {
    position: 'relative',
    width: '100%',
    maxWidth: '480px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '24px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  versionBadge: {
    alignSelf: 'flex-start',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '1.5px',
    color: 'var(--accent-green)',
    background: 'var(--accent-green-dim)',
    border: '1px solid var(--accent-green)',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '20px',
    fontWeight: 700,
    color: '#FFF',
    margin: '4px 0 0'
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-dim)',
    margin: 0,
    lineHeight: '1.4'
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  featureItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px'
  },
  iconBox: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  featureTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    color: '#FFF',
    marginBottom: '3px'
  },
  featureDesc: {
    fontSize: '12px',
    color: 'var(--text-dim)',
    lineHeight: '1.4'
  },
  submitBtn: {
    width: '100%',
    background: 'var(--accent-green-dim)',
    border: '1px solid var(--accent-green)',
    color: 'var(--accent-green)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '1px',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s ease'
  }
};
