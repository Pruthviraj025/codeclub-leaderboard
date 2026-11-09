import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { api, warmUpServer } from "../api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import GrainMass from '../components/GrainMass';
import ccLogo from '../assets/cc-logo-white.png';
import '../styles/LandingPage.css';

const BOOT_LINES = [
  '> initializing maximum productivity..... ',
  '> loading leaderboard protocol.........',
  '> syncing codeclub server...... ',
  '> ready.',
];

function CodeClubLoader() {
  const [text, setText] = useState('');

  useEffect(() => {
    const full = '<CODECLUB/>';
    let i = 0;
    let deleting = false;
    let timeoutId;

    function tick() {
      if (!deleting) {
        i++;
        setText(full.slice(0, i));
        if (i === full.length) {
          timeoutId = setTimeout(() => { deleting = true; tick(); }, 700);
          return;
        }
        timeoutId = setTimeout(tick, 90);
      } else {
        i--;
        setText(full.slice(0, i));
        if (i === 0) {
          timeoutId = setTimeout(() => { deleting = false; tick(); }, 300);
          return;
        }
        timeoutId = setTimeout(tick, 45);
      }
    }
    tick();
    return () => clearTimeout(timeoutId);
  }, []);

  const slashIndex = text.indexOf('/');

  return (
    <div className="codeclub-loader">
      {slashIndex === -1 ? (
        text
      ) : (
        <>
          {text.slice(0, slashIndex)}
          <span className="codeclub-loader-slash">/</span>
          {text.slice(slashIndex + 1)}
        </>
      )}
      <span className="cursor-blink">▍</span>
    </div>
  );
}

let hasPlayedEntranceAnimation = false;

export default function LandingPage() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const isLoginModeFromUrl = searchParams.get('mode') === 'login';

  const isLoggedIn = Boolean(auth?.isAuthenticated || localStorage.getItem("token"));

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/leaderboard', { replace: true });
    }
  }, [isLoggedIn, navigate]);

  const rememberedEmail = localStorage.getItem("rememberedEmail") || "";
  const [showForm, setShowForm] = useState(isLoginModeFromUrl);
  const [joinTransition, setJoinTransition] = useState(false);
  const [mode, setMode] = useState(isLoginModeFromUrl ? 'login' : 'join');
  const [form, setForm] = useState({ name: '', usn: '', email: rememberedEmail, password: '' });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootLines, setBootLines] = useState(isLoginModeFromUrl ? BOOT_LINES : []);
  const [bootDone, setBootDone] = useState(isLoginModeFromUrl);
  const [slowHint, setSlowHint] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false));
  const [skipEntrance] = useState(() => hasPlayedEntranceAnimation || isLoginModeFromUrl);

  useEffect(() => {
    hasPlayedEntranceAnimation = true;
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    warmUpServer();
  }, []);

  useEffect(() => {
    if (isLoginModeFromUrl) {
      setBootLines(BOOT_LINES);
      setBootDone(true);
      return;
    }
    let lineIdx = 0;
    let charIdx = 0;
    let timeoutId;

    function typeNext() {
      if (lineIdx >= BOOT_LINES.length) {
        setBootDone(true);
        return;
      }
      const line = BOOT_LINES[lineIdx];
      charIdx++;
      setBootLines((prev) => {
        const copy = [...prev];
        copy[lineIdx] = line.slice(0, charIdx);
        return copy;
      });
      if (charIdx === line.length) {
        lineIdx++;
        charIdx = 0;
        timeoutId = setTimeout(typeNext, 300);
      } else {
        timeoutId = setTimeout(typeNext, 22);
      }
    }
    typeNext();
    return () => clearTimeout(timeoutId);
  }, [isLoginModeFromUrl]);

  function handleJoinClick() {
    setJoinTransition(true);
    setTimeout(() => {
      setShowForm(true);
      setMode('login');
      setJoinTransition(false);
    }, 550);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSlowHint(false);
    const slowTimer = setTimeout(() => setSlowHint(true), 2500);
    try {
      const data = mode === 'join'
        ? await api.signup({ ...form, rememberMe })
        : await api.login({ email: form.email, password: form.password, rememberMe });
      if (mode === 'login') {
        if (rememberMe) {
          localStorage.setItem("rememberedEmail", form.email);
        } else {
          localStorage.removeItem("rememberedEmail");
        }
      }
      auth.login(data.token, data.user, rememberMe);
      navigate("/leaderboard");
    } catch (err) {
      setError(err.message);
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlowHint(false);
    }
  }

  if (isLoggedIn) {
    return null;
  }

  return (
    <div className="landing-page" style={{ ...styles.page, background: isDark ? '#000000' : '#F8FAFC' }}>

      <div className={`landing-bg-overlay ${skipEntrance ? 'entrance-done' : ''}`}>
        <GrainMass
          background={isDark ? "#000000" : "#F8FAFC"}
          scale={isMobile ? 85 : 150}
          rotateSpeed={5}
          boil={6}
          glow={3.8}
        />
        <div className="landing-radial-glow" />
        <div className="landing-vignette" />
      </div>

      <div style={styles.bootLine} className="landing-boot-line">
        {bootLines.map((line, i) => (
          <div key={i}>
            {line}
            {!bootDone && i === bootLines.length - 1 && <span className="cursor-blink">▍</span>}
          </div>
        ))}
      </div>

      <div className="landing-corner" style={{ ...styles.corner, top: 'var(--space-4)', left: 'var(--space-4)', borderRight: 'none', borderBottom: 'none' }} />
      <div className="landing-corner" style={{ ...styles.corner, top: 'var(--space-4)', right: 'var(--space-4)', borderLeft: 'none', borderBottom: 'none' }} />
      <div className="landing-corner" style={{ ...styles.corner, bottom: 'var(--space-4)', left: 'var(--space-4)', borderRight: 'none', borderTop: 'none' }} />
      <div className="landing-corner" style={{ ...styles.corner, bottom: 'var(--space-4)', right: 'var(--space-4)', borderLeft: 'none', borderTop: 'none' }} />

      <button
        type="button"
        className="landing-theme-toggle"
        onClick={toggleTheme}
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        aria-label="Toggle dark and light theme"
      >
        {isDark ? (
          <Sun size={15} strokeWidth={2} style={{ color: '#FCD34D' }} />
        ) : (
          <Moon size={15} strokeWidth={2} style={{ color: '#4300FF' }} />
        )}
        <span>{isDark ? 'Light' : 'Dark'}</span>
      </button>

      <div style={styles.quote} className="fade-up landing-quote">
        {'// "Productive days are the days where you do what you want to do"'}
      </div>

      <div style={styles.center} className={skipEntrance ? 'entrance-done' : ''}>
        <div className="stage">
          <div className={`ring-wrap ${showForm ? 'ring-hidden' : ''} ${joinTransition ? 'ring-burst' : ''}`}>
            <img src={ccLogo} alt="CodeClub" className="ring-logo" />
            <div className={`ring-subtitle ${showForm ? 'ring-hidden' : ''}`}>
              LEADERBOARD
            </div>
          </div>

          {joinTransition && <div className="join-flash" />}

          {showForm && (
            <div className="form-overlay-wrap">
              <form
                id="auth-form"
                method="post"
                autoComplete="on"
                style={styles.form}
                className="scale-in form-overlay"
                onSubmit={handleSubmit}
              >
                <div style={styles.tabRow}>
                  <button
                    type="button"
                    className={`landing-tab ${mode === 'join' ? 'landing-tab-active' : ''}`}
                    onClick={() => setMode('join')}
                    style={{ ...styles.tab, ...(mode === 'join' ? styles.tabActive : {}) }}
                  >
                    New here
                  </button>
                  <button
                    type="button"
                    className={`landing-tab ${mode === 'login' ? 'landing-tab-active' : ''}`}
                    onClick={() => setMode('login')}
                    style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
                  >
                    Already a member
                  </button>
                </div>

                {mode === 'join' && (
                  <>
                    <input
                      id="join-name"
                      name="name"
                      autoComplete="name"
                      style={styles.input}
                      placeholder="Full name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                    <input
                      id="join-usn"
                      name="usn"
                      autoComplete="off"
                      style={styles.input}
                      placeholder="USN"
                      value={form.usn}
                      onChange={(e) => setForm({ ...form, usn: e.target.value })}
                      required
                    />
                  </>
                )}
                <input
                  id="login-email"
                  name="email"
                  autoComplete="username email"
                  style={styles.input}
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <input
                  id="login-password"
                  name="password"
                  autoComplete={mode === 'join' ? "new-password" : "current-password"}
                  style={styles.input}
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />

                {error && <div style={styles.error}>✕ {error}</div>}

                {loading && (
                  <div style={styles.loadingWrap}>
                    {slowHint ? (
                      <>
                        <CodeClubLoader />
                        <div style={styles.hint}>Server was asleep — waking it up, hang tight…</div>
                      </>
                    ) : (
                      <CodeClubLoader />
                    )}
                  </div>
                )}

                {mode === 'login' && (
                  <div className="landing-remember-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px 10px', fontSize: '12px', color: 'var(--text-secondary, rgba(255, 255, 255, 0.8))' }}>
                    <label className="landing-remember-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ cursor: 'pointer', width: '14px', height: '14px' }}
                      />
                      <span>Remember me</span>
                    </label>
                    <Link to="/forgot-password" className="landing-forgot-link" style={{ ...styles.backLink, margin: 0, fontSize: '12px' }}>Forgot password?</Link>
                  </div>
                )}

                <button className="landing-submit-btn" style={styles.submitBtn} type="submit" disabled={loading}>
                  {loading ? 'Please wait…' : mode === 'join' ? 'Create account' : 'Log in'}
                </button>
                {mode === 'join' && (
                  <Link to="/forgot-password" className="landing-forgot-link" style={styles.backLink}>Forgot password?</Link>
                )}
              </form>
            </div>
          )}
        </div>

        {!showForm && !joinTransition && (
          <button
            className="join-btn-redesign"
            onClick={handleJoinClick}
          >
            Join
          </button>
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
    position: 'relative',
    background: '#000',
    overflow: 'hidden',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  corner: {
    position: 'absolute',
    width: '20px',
    height: '20px',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    opacity: 0.6,
    pointerEvents: 'none',
    zIndex: 2,
  },
  bootLine: {
    position: 'absolute',
    top: 'var(--space-4)',
    left: 'var(--space-4)',
    fontSize: '17px',
    color: 'var(--text, #FFFFFF)',
    opacity: 0.95,
    zIndex: 2,
    lineHeight: '1.75',
    letterSpacing: '0.5px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: 500,
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.95), 0 0 12px rgba(255, 255, 255, 0.15)',
  },
  quote: {
    position: 'absolute',
    bottom: 'var(--space-4)',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '17px',
    color: 'var(--text, #FFFFFF)',
    letterSpacing: '0.6px',
    opacity: 0.9,
    textAlign: 'center',
    maxWidth: '90vw',
    padding: '0 var(--space-3)',
    zIndex: 2,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: 500,
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.95), 0 0 10px rgba(255, 255, 255, 0.15)',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '32px',
    position: 'relative',
    zIndex: 10,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    width: 'min(360px, 92vw)',
    background: 'var(--card-bg, rgba(10, 12, 17, 0.88))',
    border: '1px solid var(--card-border, rgba(255, 255, 255, 0.12))',
    borderRadius: '14px',
    padding: 'var(--space-4)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  tabRow: { display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' },
  tab: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.12))',
    borderRadius: '8px',
    color: 'var(--text-dim, rgba(255, 255, 255, 0.65))',
    padding: '10px 6px',
    fontSize: '13px',
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    borderColor: 'var(--border-hover, rgba(255, 255, 255, 0.35))',
    color: 'var(--text, #FFFFFF)',
    background: 'var(--surface-raised, rgba(255, 255, 255, 0.08))',
    boxShadow: '0 0 16px rgba(255, 255, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  input: {
    background: 'var(--input-bg, rgba(10, 12, 16, 0.85))',
    border: '1px solid var(--input-border, rgba(255, 255, 255, 0.18))',
    borderRadius: '8px',
    padding: '12px 14px',
    color: 'var(--input-text, #FFFFFF)',
    fontSize: '16px',
    fontFamily: "'Space Grotesk', sans-serif",
    outline: 'none',
  },
  submitBtn: {
    background: 'var(--btn-primary-bg, #FFFFFF)',
    color: 'var(--btn-primary-text, #0A0A0A)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontWeight: 600,
    fontSize: '16px',
    letterSpacing: '0.5px',
    fontFamily: "'Space Grotesk', sans-serif",
    marginTop: 'var(--space-1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  error: {
    color: 'var(--accent-red)',
    fontSize: '13px',
    fontFamily: "'Space Grotesk', sans-serif",
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 0',
  },
  hint: {
    color: 'var(--text-secondary, #FFFFFF)',
    fontSize: '12px',
    fontFamily: "'Space Grotesk', sans-serif",
    textAlign: 'center',
    opacity: 0.85,
  },
  backLink: {
    color: 'var(--text-dim, rgba(255, 255, 255, 0.7))',
    fontSize: '12px',
    fontFamily: "'Space Grotesk', sans-serif",
    textAlign: 'center',
    marginTop: '4px',
    textDecoration: 'none',
  }
};
