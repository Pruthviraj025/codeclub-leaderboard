import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from "../api";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('email'); 
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
      const data = await api.forgotPassword(email.trim());
      setInfo(data.message);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError('');
    setLoading(true);
    try {
      const data = await api.resendOtp(email.trim());
      setInfo(data.message || 'OTP resent. Please check your inbox and spam folder.');
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
      const data = await api.verifyOtp(email.trim(), otp.trim());
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
              <button
                type="button"
                style={styles.linkBtn}
                onClick={handleResendOtp}
                disabled={loading}
              >
                Resend code
              </button>
              <button
                type="button"
                style={styles.linkBtn}
                onClick={() => { setStep('email'); setError(''); }}
              >
                Change email
              </button>
            </div>
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
    padding: 'var(--space-4)',
    backgroundColor: 'var(--color-warm-parchment, #f2f0eb)'
  },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)' },
  logoBlock: { textAlign: 'center' },
  logoText: {
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    fontWeight: 600,
    fontSize: '24px',
    letterSpacing: '-0.022em',
    color: 'var(--color-ink-charcoal, #292827)'
  },
  logoRule: {
    display: 'none'
  },
  logoSubtitle: {
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.5px',
    color: 'var(--color-stone-gray, #666666)',
    marginTop: '6px'
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
    marginTop: '6px',
    cursor: 'pointer'
  },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-royal-violet, #714cb6)',
    fontSize: '13px',
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    padding: '4px',
    cursor: 'pointer'
  },
  backLink: {
    color: 'var(--color-royal-violet, #714cb6)',
    fontSize: '13px',
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    textAlign: 'center',
    textDecoration: 'none'
  },
  helper: {
    color: 'var(--color-stone-gray, #666666)',
    fontSize: '13.5px',
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)",
    margin: 0,
    lineHeight: 1.5
  },
  error: {
    color: '#8a1f2d',
    fontSize: '13px',
    fontFamily: "var(--font-super-sans-vf, 'Inter', sans-serif)"
  }
};
