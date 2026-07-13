import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, saveSession } from '../api';

const BOOT_LINE = '> initializing maximum productivity';

export default function LandingPage() {
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState('join');
  const [form, setForm] = useState({ name: '', usn: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootText, setBootText] = useState('');
  const [bootDone, setBootDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setBootText(BOOT_LINE.slice(0, i + 1));
      i++;
      if (i === BOOT_LINE.length) {
        clearInterval(interval);
        setTimeout(() => setBootDone(true), 250);
      }
    }, 22);
    return () => clearInterval(interval);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'join'
        ? await api.signup(form)
        : await api.login({ email: form.email, password: form.password });
      saveSession(data.token, data.user);
      navigate('/leaderboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bootLine} className="mono">
        {bootText}
        {!bootDone && <span className="cursor-blink">▍</span>}
      </div>

      {/* Terminal-window corner framing */}
      <div style={{ ...styles.corner, top: 'var(--space-4)', left: 'var(--space-4)', borderRight: 'none', borderBottom: 'none' }} />
      <div style={{ ...styles.corner, top: 'var(--space-4)', right: 'var(--space-4)', borderLeft: 'none', borderBottom: 'none' }} />
      <div style={{ ...styles.corner, bottom: 'var(--space-4)', left: 'var(--space-4)', borderRight: 'none', borderTop: 'none' }} />
      <div style={{ ...styles.corner, bottom: 'var(--space-4)', right: 'var(--space-4)', borderLeft: 'none', borderTop: 'none' }} />

      {bootDone && (
        <div style={styles.quote} className="mono fade-up">
          {'// "Productive days are the days where you do what you want to do" — PTVRJ'}
        </div>
      )}

      <div style={styles.center}>
        {bootDone && (
          <>
            <div style={styles.logoBlock} className="fade-up">
              <div style={styles.logoText}>{'<CODECLUB/>'}</div>
              <div style={styles.logoRule} />
            </div>

            {!showForm ? (
              <button
                style={styles.joinBtn}
                className="fade-up"
                onClick={() => setShowForm(true)}
              >
                Join
              </button>
            ) : (
              <form style={styles.form} className="scale-in" onSubmit={handleSubmit}>
                <div style={styles.tabRow}>
                  <button
                    type="button"
                    onClick={() => setMode('join')}
                    style={{ ...styles.tab, ...(mode === 'join' ? styles.tabActive : {}) }}
                  >
                    New here
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
                  >
                    Already a member
                  </button>
                </div>

                {mode === 'join' && (
                  <>
                    <input
                      style={styles.input}
                      placeholder="Full name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    <input
                      style={styles.input}
                      placeholder="USN"
                      value={form.usn}
                      onChange={(e) => setForm({ ...form, usn: e.target.value })}
                      required
                    />
                  </>
                )}
                <input
                  style={styles.input}
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <input
                  style={styles.input}
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />

                {error && <div style={styles.error}>✕ {error}</div>}

                <button style={styles.submitBtn} type="submit" disabled={loading}>
                  {loading ? 'Please wait…' : mode === 'join' ? 'Create account' : 'Log in'}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 'var(--space-4)',
    position: 'relative'
  },
  corner: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    border: '1px solid var(--border-hover)',
    opacity: 0.6,
    pointerEvents: 'none'
  },
  bootLine: {
    position: 'absolute',
    top: 'var(--space-4)',
    left: 'var(--space-4)',
    fontSize: '12px',
    color: 'var(--accent-green)',
    opacity: 0.7
  },
  quote: {
    position: 'absolute',
    bottom: 'var(--space-4)',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '12px',
    color: 'var(--accent-green)',
    letterSpacing: '0.3px',
    opacity: 0.85,
    textAlign: 'center',
    maxWidth: '90vw',
    padding: '0 var(--space-3)'
  },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)' },
  logoBlock: { textAlign: 'center' },
  logoText: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: 'clamp(26px, 8vw, 38px)',
    letterSpacing: '1px',
    color: 'var(--text)',
    textShadow: '0 0 30px #ffffff22'
  },
  logoRule: {
    width: '80px',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, var(--accent-green), transparent)',
    margin: '18px auto 0',
    opacity: 0.7
  },
  joinBtn: {
    background: 'var(--accent-green)',
    color: '#0A1A10',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '14px 48px',
    fontSize: '16px',
    fontWeight: 600,
    letterSpacing: '1px',
    boxShadow: '0 0 0 1px var(--accent-green), 0 8px 24px -8px var(--accent-green-dim)'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    width: '100%',
    maxWidth: '320px',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 'var(--space-4)'
  },
  tabRow: { display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' },
  tab: {
    flex: 1,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-dim)',
    padding: '8px',
    fontSize: '12px'
  },
  tabActive: {
    borderColor: 'var(--accent-green)',
    color: 'var(--accent-green)'
  },
  input: {
    background: 'var(--surface-raised)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: 'var(--text)',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    outline: 'none'
  },
  submitBtn: {
    background: 'var(--accent-green)',
    color: '#0A1A10',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    padding: '12px',
    fontWeight: 600,
    marginTop: 'var(--space-1)'
  },
  error: {
    color: 'var(--accent-red)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)'
  }
};
