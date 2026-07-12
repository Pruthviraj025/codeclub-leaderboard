import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getSessionUser } from '../api';

export default function ProfilePage() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [cfHandle, setCfHandle] = useState('');
  const [verifyInfo, setVerifyInfo] = useState(null);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const sessionUser = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionUser) { navigate('/'); return; }
    load();
  }, [userId]);

  async function load() {
    try {
      const res = await api.profile(userId);
      setProfile(res);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleStartVerification(e) {
    e.preventDefault();
    try {
      const res = await api.startCfVerification(cfHandle);
      setVerifyInfo(res);
    } catch (err) {
      setVerifyMsg(err.message);
    }
  }

  async function handleCheckVerification() {
    try {
      const res = await api.checkCfVerification();
      if (res.verified) {
        setVerifyMsg('Verified! Reloading…');
        await load();
      } else {
        setVerifyMsg(res.expired ? 'Window expired — start again' : 'Not verified yet — try again in a moment');
      }
    } catch (err) {
      setVerifyMsg(err.message);
    }
  }

  async function handleUpdateEmail(e) {
    e.preventDefault();
    setEmailMsg('');
    setSavingEmail(true);
    try {
      await api.updateEmail(newEmail);
      setEmailMsg('Email updated');
      setEditingEmail(false);
      await load();
    } catch (err) {
      setEmailMsg(err.message);
    } finally {
      setSavingEmail(false);
    }
  }

  if (!sessionUser) return null;
  if (error) return <div style={styles.pageCenter}><div style={styles.error}>{error}</div></div>;
  if (!profile) return <div style={styles.pageCenter}><div style={styles.dim}>Loading…</div></div>;

  const isOwner = profile.id === sessionUser.id;
  const greenStars = profile.stars.filter((s) => s.type === 'green');
  const redStars = profile.stars.filter((s) => s.type === 'red');

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/leaderboard')}>← Leaderboard</button>
      </header>

      <main style={styles.main}>
        <div style={styles.card} className="fade-up">
          <div style={styles.nameRow}>
            <h1 style={styles.name}>{profile.name}</h1>
            {isOwner && <span style={styles.youTag}>YOU</span>}
          </div>

          <div style={styles.statRow}>
            <Stat label="CF HANDLE" value={profile.cfHandle || '— not connected —'} />
            <Stat label="GREEN STARS" value={profile.greenStarCount} color="var(--accent-green)" />
            <Stat label="ACTIVE RED STARS" value={profile.activeRedStarCount} color="var(--accent-red)" />
          </div>

          {isOwner && profile.usn && (
            <div style={styles.privateBlock}>
              <div style={styles.privateLine}><span style={styles.dim}>USN</span> {profile.usn}</div>

              {!editingEmail ? (
                <div style={styles.privateLine}>
                  <span style={styles.dim}>Email</span> {profile.email}{' '}
                  <button
                    type="button"
                    style={styles.editLink}
                    onClick={() => { setEditingEmail(true); setNewEmail(profile.email); setEmailMsg(''); }}
                  >
                    edit
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUpdateEmail} style={styles.cfForm}>
                  <input
                    style={styles.input}
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                  />
                  <button style={styles.smallBtn} type="submit" disabled={savingEmail}>
                    {savingEmail ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    style={styles.editLink}
                    onClick={() => { setEditingEmail(false); setEmailMsg(''); }}
                  >
                    cancel
                  </button>
                </form>
              )}
              {emailMsg && <div style={styles.verifyMsg}>{emailMsg}</div>}
            </div>
          )}

          {isOwner && !profile.cfConnected && (
            <div style={styles.cfConnect}>
              <div style={styles.eyebrow}>CONNECT CODEFORCES</div>
              {!verifyInfo ? (
                <form onSubmit={handleStartVerification} style={styles.cfForm}>
                  <input
                    style={styles.input}
                    placeholder="Your CF handle"
                    value={cfHandle}
                    onChange={(e) => setCfHandle(e.target.value)}
                    required
                  />
                  <button style={styles.smallBtn} type="submit">Start verification</button>
                </form>
              ) : (
                <div>
                  <p style={styles.instructions}>
                    Within {verifyInfo.windowMinutes} minutes, submit any deliberately broken
                    (won't compile) code to{' '}
                    <a href={verifyInfo.problemUrl} target="_blank" rel="noreferrer" style={styles.link}>
                      problem {verifyInfo.contestId}{verifyInfo.problemIndex} →
                    </a>
                    {' '}then click Verify.
                  </p>
                  <button style={styles.smallBtn} onClick={handleCheckVerification}>I've submitted it — verify</button>
                </div>
              )}
              {verifyMsg && <div style={styles.verifyMsg}>{verifyMsg}</div>}
            </div>
          )}

          <div style={styles.starsSection}>
            <div style={styles.eyebrow}>VERDICT HISTORY</div>
            <div style={styles.badgeGrid}>
              {greenStars.map((s, i) => (
                <span key={`g${i}`} className="scale-in" style={{ ...styles.badgeGreen, animationDelay: `${i * 0.04}s` }}>AC · #{s.rank}</span>
              ))}
              {redStars.map((s, i) => (
                <span key={`r${i}`} className="scale-in" style={{ ...styles.badgeRed, animationDelay: `${(greenStars.length + i) * 0.04}s` }}>WA</span>
              ))}
              {greenStars.length === 0 && redStars.length === 0 && (
                <span style={styles.dim}>No verdicts yet — solve something this week.</span>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: color || 'var(--text)' }} className="mono">{value}</div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh' },
  pageCenter: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  header: { padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--border)' },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '13px', fontFamily: 'var(--font-mono)' },
  main: { maxWidth: '600px', margin: '0 auto', padding: 'var(--space-5) var(--space-4)' },
  card: { border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'var(--space-4)', background: 'var(--surface)' },
  nameRow: { display: 'flex', alignItems: 'center', gap: 'var(--space-2)' },
  name: { fontSize: '26px', margin: 0, fontWeight: 700 },
  youTag: {
    fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--accent-gold)',
    border: '1px solid var(--accent-gold)', borderRadius: '4px', padding: '2px 6px', letterSpacing: '1px'
  },
  statRow: { display: 'flex', gap: 'var(--space-5)', marginTop: 'var(--space-4)', flexWrap: 'wrap' },
  stat: {},
  statLabel: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '1px', marginBottom: '4px' },
  statValue: { fontSize: '16px', fontWeight: 600 },
  privateBlock: { marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' },
  privateLine: { fontFamily: 'var(--font-mono)', fontSize: '13px', marginBottom: '4px' },
  dim: { color: 'var(--text-dim)' },
  editLink: {
    background: 'transparent', border: 'none', color: 'var(--accent-green)',
    fontFamily: 'var(--font-mono)', fontSize: '11px', textDecoration: 'underline', padding: 0
  },
  cfConnect: { marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' },
  eyebrow: { fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-green)', letterSpacing: '2px', marginBottom: 'var(--space-2)' },
  cfForm: { display: 'flex', gap: 'var(--space-2)' },
  input: {
    flex: 1, background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    padding: '10px 12px', color: 'var(--text)', fontFamily: 'var(--font-mono)', fontSize: '13px'
  },
  smallBtn: {
    background: 'var(--accent-green)', color: '#0A1A10', border: 'none', borderRadius: 'var(--radius-sm)',
    padding: '10px 16px', fontSize: '13px', fontWeight: 600
  },
  instructions: { fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text)', marginBottom: 'var(--space-2)', lineHeight: 1.6 },
  link: { color: 'var(--accent-green)', textDecoration: 'underline', fontWeight: 600 },
  verifyMsg: { fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--accent-gold)', marginTop: 'var(--space-2)' },
  starsSection: { marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' },
  badgeGrid: { display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' },
  badgeGreen: {
    fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-green)',
    background: 'var(--accent-green-dim)', border: '1px solid var(--accent-green)', borderRadius: '4px', padding: '4px 10px'
  },
  badgeRed: {
    fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--accent-red)',
    background: 'var(--accent-red-dim)', border: '1px solid var(--accent-red)', borderRadius: '4px', padding: '4px 10px'
  },
  error: { color: 'var(--accent-red)', fontFamily: 'var(--font-mono)' }
};
