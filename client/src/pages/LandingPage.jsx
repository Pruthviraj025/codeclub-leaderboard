import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, warmUpServer } from "../api";
import { useAuth } from "../context/AuthContext";
import ccLogo from '../assets/cc-logo-white.png';
import '../styles/LandingPage.css';

const BOOT_LINES = [
  '> initializing maximum productivity..... ',
  '> loading leaderboard protocol.........',
  '> syncing codeclub server...... ',
  '> ready.',
];

const NUM_LIGHTS = 8;
const LIGHT_STAGGER = 0.08;
const NUM_PARTICLES = 61;

const RING_LIGHTS = Array.from({ length: NUM_LIGHTS }).map((_, i) => {
  const angle = (360 / NUM_LIGHTS) * i - 90;
  const rad = (angle * Math.PI) / 180;
  const radiusPercent = 43.75;
  return {
    x: 50 + radiusPercent * Math.cos(rad),
    y: 50 + radiusPercent * Math.sin(rad),
    delay: i * LIGHT_STAGGER,
  };
});

const PARTICLES = Array.from({ length: NUM_PARTICLES }).map(() => ({
  top: Math.random() * 100,
  left: Math.random() * 100,
  size: 2 + Math.random() * 3,
  delay: Math.random() * 8,
  duration: 6 + Math.random() * 6,
}));

// Loops "<CODECLUB/>" typing forever — used as a loading indicator
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
  const [showForm, setShowForm] = useState(false);
  const [joinTransition, setJoinTransition] = useState(false);
  const [mode, setMode] = useState('join');
  const [form, setForm] = useState({ name: '', usn: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootLines, setBootLines] = useState([]);
  const [bootDone, setBootDone] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    warmUpServer();
  }, []);

  useEffect(() => {
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
        ? await api.signup(form)
        : await api.login({ email: form.email, password: form.password });
      auth.login(data.token, data.user);
      navigate("/leaderboard");
    } catch (err) {
      setError(err.message);
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlowHint(false);
    }
  }

  return (
    <div style={styles.page}>

      <div className="landing-bg-overlay">
        <div className="ocean-gradient" />
        <div className="electric-wave-1" />
        <div className="electric-wave-2" />
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="space-particle"
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      <div style={styles.bootLine} className="mono landing-boot-line">
        {bootLines.map((line, i) => (
          <div key={i}>
            {line}
            {!bootDone && i === bootLines.length - 1 && <span className="cursor-blink">▍</span>}
          </div>
        ))}
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
            {RING_LIGHTS.map((l, i) => (
              <div
                key={i}
                className="ring-light"
                style={{
                  left: `${l.x}%`,
                  top: `${l.y}%`,
                  animationDelay: `${l.delay}s`,
                }}
              />
            ))}
            <img src={ccLogo} alt="CodeClub" className="ring-logo" />
            <div className={`ring-subtitle ${showForm ? 'ring-hidden' : ''}`}>
              LEADERBOARD
            </div>
          </div>

          {joinTransition && <div className="join-flash" />}

          {showForm && (
            <div className="form-overlay-wrap">
              <form style={styles.form} className="scale-in form-overlay" onSubmit={handleSubmit}>
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

              <button style={styles.submitBtn} type="submit" disabled={loading}>
                {loading ? 'Please wait…' : mode === 'join' ? 'Create account' : 'Log in'}
              </button>
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
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)', position: 'relative', zIndex: 1 },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-3)',
    width: 'min(320px, 100%)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 'var(--space-4)'
  },
  tabRow: { display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' },
  tab: {
    flex: 1,
    minWidth: 0,
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-dim)',
    padding: '8px 4px',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
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
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 0'
  },
  hint: {
    color: 'var(--accent-gold)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    textAlign: 'center'
  }
};
