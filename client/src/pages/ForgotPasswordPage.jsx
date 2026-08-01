import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from "../api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('email'); // email -> otp -> password -> done
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.forgotPassword(email);
      setInfo(data.message);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.verifyOtp(email, otp);
      setResetToken(data.resetToken);
      setStep('password');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.resetPassword(resetToken, newPassword);
      setStep('done');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.center}>
        <div style={styles.logoBlock}>
          <div style={styles.logoText}>{'<CODECLUB/>'}</div>
          <div style={styles.logoRule} />
          <div style={styles.logoSubtitle}>RESET PASSWORD</div>
        </div>

        {step === 'email' && (
          <form style={styles.form} onSubmit={handleEmailSubmit}>
            <p style={styles.helper}>Enter your registered email. We'll send a one-time code.</p>
            <input
              style={styles.input}
              type="email"
              placeholder="Registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <div style={styles.error}>✕ {error}</div>}
            <button style={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
            <Link to="/" style={styles.backLink}>Back to login</Link>
          </form>
        )}

        {step === 'otp' && (
          <form style={styles.form} onSubmit={handleOtpSubmit}>
            {info && <p style={styles.helper}>{info}</p>}
            <input
              style={styles.input}
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
            />
            {error && <div style={styles.error}>✕ {error}</div>}
            <button style={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify OTP'}
            </button>
            <button
              type="button"
              style={styles.linkBtn}
              onClick={() => { setStep('email'); setError(''); }}
            >
              Use a different email
            </button>
          </form>
        )}

        {step === 'password' && (
          <form style={styles.form} onSubmit={handlePasswordSubmit}>
            <input
              style={styles.input}
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {error && <div style={styles.error}>✕ {error}</div>}
            <button style={styles.submitBtn} type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Reset password'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div style={styles.form}>
            <p style={styles.helper}>Password reset. Redirecting to login…</p>
          </div>
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
    padding: 'var(--space-4)'
  },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)' },
  logoBlock: { textAlign: 'center' },
  logoText: {
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: 'clamp(22px, 6vw, 30px)',
    letterSpacing: '2px',
    color: 'var(--text)'
  },
  logoRule: {
    width: '80px',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, var(--accent-green), transparent)',
    margin: '18px auto 0',
    opacity: 0.7
  },
  logoSubtitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 500,
    letterSpacing: '4px',
    color: 'var(--accent-green)',
    opacity: 0.65,
    marginTop: '12px'
  },
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
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    textDecoration: 'underline',
    padding: '4px'
  },
  backLink: {
    color: 'var(--text-dim)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    textAlign: 'center',
    textDecoration: 'underline'
  },
  helper: {
    color: 'var(--text-dim)',
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    margin: 0
  },
  error: {
    color: 'var(--accent-red)',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)'
  }
};
