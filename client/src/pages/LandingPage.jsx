import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api, warmUpServer } from "../api";
import { useAuth } from "../context/AuthContext";
import ccLogo from '../assets/cc-logo-black.png';
import '../styles/LandingPage.css';



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

export default function LandingPage() {
  const navigate = useNavigate();
  const auth = useAuth();
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
  const [slowHint, setSlowHint] = useState(false);

  useEffect(() => {
    warmUpServer();
  }, []);

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
    <div style={styles.page}>

      <div className="landing-bg-overlay">
        <div className="ocean-gradient" />
        <div className="electric-wave-1" />
        <div className="electric-wave-2" />
      </div>

      <div style={{ ...styles.corner, top: 'var(--space-4)', left: 'var(--space-4)', borderRight: 'none', borderBottom: 'none' }} />
      <div style={{ ...styles.corner, top: 'var(--space-4)', right: 'var(--space-4)', borderLeft: 'none', borderBottom: 'none' }} />
      <div style={{ ...styles.corner, bottom: 'var(--space-4)', left: 'var(--space-4)', borderRight: 'none', borderTop: 'none' }} />
      <div style={{ ...styles.corner, bottom: 'var(--space-4)', right: 'var(--space-4)', borderLeft: 'none', borderTop: 'none' }} />

      <div style={styles.quote} className="mono fade-up landing-quote">
        {'// "Productive days are the days where you do what you want to do"'}
      </div>

      <div style={styles.center}>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 2px 10px', fontSize: '12px', color: 'var(--text-dim, #94a3b8)' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#22c55e', cursor: 'pointer', width: '14px', height: '14px' }}
                    />
                    <span>Remember me</span>
                  </label>
                  <Link to="/forgot-password" style={{ ...styles.backLink, margin: 0, fontSize: '12px' }}>Forgot password?</Link>
                </div>
              )}

              <button style={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'join' ? 'Create account' : 'Log in'}
              </button>
              {mode === 'join' && (
                <Link to="/forgot-password" style={styles.backLink}>Forgot password?</Link>
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
    backgroundColor: 'var(--color-warm-parchment, #f2f0eb)',
    overflow: 'hidden',
  },
  corner: {
    display: 'none'
  },
  quote: {
    position: 'absolute',
    bottom: 'var(--space-4)',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '13px',
    color: 'var(--color-stone-gray, #666666)',
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    fontWeight: 460,
    letterSpacing: '-0.01em',
    textAlign: 'center',
    maxWidth: '90vw',
    padding: '0 var(--space-3)'
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--space-5)',
    position: 'relative',
    zIndex: 1
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    width: 'min(360px, 100%)',
    background: 'var(--color-paper-white, #ffffff)',
    border: '1px solid var(--color-soft-mist, #e3e3e2)',
    borderRadius: '16px',
    padding: '28px',
    boxShadow: '0 4px 20px rgba(41, 40, 39, 0.04)'
  },
  tabRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px'
  },
  tab: {
    flex: 1,
    minWidth: 0,
    background: 'var(--color-warm-parchment, #f2f0eb)',
    border: '1px solid var(--color-soft-mist, #e3e3e2)',
    borderRadius: '8px',
    color: 'var(--color-stone-gray, #666666)',
    padding: '9px 12px',
    fontSize: '13px',
    fontWeight: 460,
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  tabActive: {
    background: 'var(--color-lilac-mist, #d4c7ff)',
    borderColor: 'rgba(113, 76, 182, 0.4)',
    color: 'var(--color-ink-charcoal, #292827)',
    fontWeight: 540
  },
  input: {
    background: 'var(--color-paper-white, #ffffff)',
    border: '1px solid var(--color-soft-mist, #e3e3e2)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: 'var(--color-ink-charcoal, #292827)',
    fontSize: '14px',
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    outline: 'none'
  },
  submitBtn: {
    background: 'var(--color-midnight-wine, #421d24)',
    color: '#ffffff',
    border: 'none',
    borderRadius: '16px',
    padding: '12px 18px',
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    fontWeight: 460,
    fontSize: '15px',
    marginTop: '6px'
  },
  backLink: {
    color: 'var(--color-royal-violet, #714cb6)',
    fontSize: '13px',
    textAlign: 'center',
    textDecoration: 'none',
    marginTop: '6px'
  },
  error: {
    color: '#8a1f2d',
    fontSize: '13px',
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)"
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 0'
  },
  hint: {
    color: 'var(--color-stone-gray, #666666)',
    fontSize: '12px',
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    textAlign: 'center'
  }
};
