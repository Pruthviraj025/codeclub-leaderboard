import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Send, CheckCircle2, Lock } from 'lucide-react';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';

export default function SuggestionsPage() {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const user = getSessionUser();
  const navigate = useNavigate();

  if (!user) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await api.submitSuggestion(trimmed);
      setText('');
      setNotice('Thank you! Your suggestion has been submitted privately to the admin team.');
    } catch (err) {
      setError(err.message || 'Failed to submit suggestion.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SidebarLayout active="suggestions">
      <div style={styles.wrap}>
        <div style={styles.header}>
          <h1 style={styles.title}>Give a Suggestion</h1>
          <p style={styles.subtitle}>
            Spotted a bug or got an idea for the leaderboard? Drop it below.
          </p>
          <div style={styles.privacyNote}>
            <Lock size={13} style={{ marginRight: '6px', color: 'var(--accent-green)' }} />
            <span>Suggestions are strictly private &amp; visible to admins only.</span>
          </div>
        </div>

        {user.role === 'admin' && (
          <div style={styles.adminBanner}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} color="var(--accent-gold)" />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-gold)' }}>
                Admin Access
              </span>
            </div>
            <p style={{ margin: '4px 0 10px', fontSize: '12px', color: 'var(--text-dim)' }}>
              As an admin, you can review and manage all user suggestions in the Admin Console.
            </p>
            <button style={styles.adminNavBtn} onClick={() => navigate('/admin')}>
              Open Admin Console →
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <textarea
            style={styles.textarea}
            placeholder="What should we build, fix, or improve?"
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={2000}
            rows={6}
          />
          <div style={styles.formFooter}>
            <span style={styles.charCount}>{text.length}/2000</span>
            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                opacity: submitting || !text.trim() ? 0.6 : 1,
                cursor: submitting || !text.trim() ? 'not-allowed' : 'pointer'
              }}
              disabled={submitting || !text.trim()}
            >
              <Send size={13} style={{ marginRight: '6px' }} />
              {submitting ? 'Sending…' : 'Send to Admins'}
            </button>
          </div>
        </form>

        {notice && (
          <div style={styles.notice}>
            <CheckCircle2 size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
            <span>{notice}</span>
          </div>
        )}
        {error && <div style={styles.error}>{error}</div>}
      </div>
    </SidebarLayout>
  );
}

const styles = {
  wrap: {
    maxWidth: '680px',
    margin: '0 auto',
    paddingBottom: '40px'
  },
  header: {
    marginBottom: '20px'
  },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text)',
    margin: '0 0 6px'
  },
  subtitle: {
    color: 'var(--text-dim)',
    fontSize: '14px',
    margin: '0 0 10px'
  },
  privacyNote: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '12px',
    color: 'var(--accent-green)'
  },
  adminBanner: {
    background: 'rgba(245, 158, 11, 0.08)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: 'var(--radius-sm)',
    padding: '14px 16px',
    marginBottom: '20px'
  },
  adminNavBtn: {
    background: 'var(--accent-gold-dim)',
    color: 'var(--accent-gold)',
    border: '1px solid var(--accent-gold)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  textarea: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    padding: '14px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    lineHeight: '1.5'
  },
  formFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap'
  },
  charCount: {
    fontSize: '12px',
    color: 'var(--text-dim)'
  },
  submitBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid var(--accent-green)',
    color: 'var(--accent-green)',
    borderRadius: 'var(--radius-sm)',
    padding: '12px 24px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Orbitron', sans-serif",
    transition: 'all 0.2s ease',
    minHeight: '44px',
    cursor: 'pointer'
  },
  notice: {
    marginTop: '16px',
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid var(--accent-green)',
    color: 'var(--accent-green)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px'
  },
  error: {
    marginTop: '16px',
    color: '#ff6b6b',
    background: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px'
  }
};