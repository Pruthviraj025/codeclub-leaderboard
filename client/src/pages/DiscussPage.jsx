import { useState, useEffect, useCallback } from 'react';
import { Send, Pencil, Trash2, Check, X, Shield, Loader2, Sparkles } from 'lucide-react';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';

const MAX_LEN = 2000;
const POLL_MS = 20000;

function timeAgo(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 45) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(m, 1)}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DiscussPage() {
  const user = getSessionUser();
  const myId = user?.id ? String(user.id) : null;
  const isAdmin = user?.role === 'admin';

  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [error, setError] = useState('');
  const [, forceTick] = useState(0);

  const mergeHead = useCallback((page) => {
    setMessages(prev => {
      if (page.length === 0) return prev.length ? [] : prev;
      const oldestInPage = new Date(page[page.length - 1].createdAt).getTime();
      const tail = prev.filter(m => new Date(m.createdAt).getTime() < oldestInPage);
      return [...page, ...tail];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.discussList()
      .then(data => {
        if (cancelled) return;
        setMessages(data.messages);
        setHasMore(data.hasMore);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Failed to load messages.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      forceTick(t => t + 1);
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await api.discussList();
        mergeHead(data.messages);
        setHasMore(prev => prev || data.hasMore);
      } catch {
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [mergeHead]);

  if (!user) return null;

  async function handleSend(e) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError('');
    try {
      const { message } = await api.discussPost(trimmed);
      setMessages(prev => [message, ...prev.filter(m => m.id !== message.id)]);
      setText('');
    } catch (err) {
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSend(e);
  }

  async function handleLoadMore() {
    if (!messages.length || loadingMore) return;
    setLoadingMore(true);
    setError('');
    try {
      const before = messages[messages.length - 1].createdAt;
      const data = await api.discussList({ before });
      setMessages(prev => {
        const seen = new Set(prev.map(m => m.id));
        return [...prev, ...data.messages.filter(m => !seen.has(m.id))];
      });
      setHasMore(data.hasMore);
    } catch (err) {
      setError(err.message || 'Failed to load older messages.');
    } finally {
      setLoadingMore(false);
    }
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditText(m.text);
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function saveEdit(m) {
    const trimmed = editText.trim();
    if (!trimmed || savingEdit) return;
    if (trimmed === m.text) return cancelEdit();

    setSavingEdit(true);
    setError('');
    try {
      const { message } = await api.discussEdit(m.id, trimmed);
      setMessages(prev => prev.map(x => (x.id === message.id ? message : x)));
      cancelEdit();
    } catch (err) {
      setError(err.message || 'Failed to save edit.');
    } finally {
      setSavingEdit(false);
    }
  }

  function handleEditKeyDown(e, m) {
    if (e.key === 'Escape') cancelEdit();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEdit(m);
  }

  async function handleDelete(m) {
    const own = String(m.userId) === myId;
    const prompt = own
      ? 'Delete this message? This cannot be undone.'
      : `Delete ${m.userName}'s message as admin? This cannot be undone.`;
    if (!window.confirm(prompt)) return;

    setBusyId(m.id);
    setError('');
    try {
      await api.discussDelete(m.id);
      setMessages(prev => prev.filter(x => x.id !== m.id));
      setEditingId(cur => (cur === m.id ? null : cur));
    } catch (err) {
      setError(err.message || 'Failed to delete message.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SidebarLayout active="discuss">
      <div style={styles.wrap}>
        <div style={styles.header}>
          <div style={styles.eyebrow}>
            <Sparkles size={13} style={{ marginRight: '6px', color: '#5EEAD4' }} />
            COMMUNITY &amp; DISCUSSIONS
          </div>
          <h1 style={styles.title}>Discuss</h1>
          <p style={styles.subtitle}>
            Open to everyone in CodeClub. Ask questions, share resources, and talk competitive programming.
          </p>
        </div>

        <form onSubmit={handleSend} style={styles.form} className="discuss-composer">
          <textarea
            style={styles.textarea}
            placeholder="Share your thoughts, contest solutions, or questions…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            maxLength={MAX_LEN}
            rows={3}
          />
          <div style={styles.formFooter} className="discuss-footer-row">
            <span style={styles.charCount}>
              {text.length}/{MAX_LEN} · Press Ctrl+Enter to send
            </span>
            <button
              type="submit"
              className="discuss-send-btn"
              style={{
                ...styles.sendBtn,
                opacity: sending || !text.trim() ? 0.6 : 1,
                cursor: sending || !text.trim() ? 'not-allowed' : 'pointer'
              }}
              disabled={sending || !text.trim()}
            >
              <Send size={14} style={{ marginRight: '6px' }} />
              {sending ? 'Sending…' : 'Post'}
            </button>
          </div>
        </form>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.feed}>
          {loading && (
            <div style={styles.empty}>
              <Loader2 size={16} className="spin" style={{ marginRight: '8px' }} /> Loading discussion messages…
            </div>
          )}

          {!loading && messages.length === 0 && (
            <div style={styles.empty}>No messages yet. Start the conversation!</div>
          )}

          {messages.map(m => {
            const mine = String(m.userId) === myId;
            const isEditing = editingId === m.id;
            const canDelete = mine || isAdmin;

            return (
              <div
                key={m.id}
                className="discuss-card"
                style={{ ...styles.card, ...(mine ? styles.cardMine : {}) }}
              >
                <div style={styles.cardHead}>
                  <div style={styles.authorRow}>
                    <span style={styles.author}>{m.userName}</span>
                    {m.userRole === 'admin' && (
                      <span style={styles.adminTag}>
                        <Shield size={10} style={{ marginRight: '3px' }} /> Admin
                      </span>
                    )}
                    {mine && <span style={styles.youTag}>You</span>}
                    <span style={styles.time} title={new Date(m.createdAt).toLocaleString()}>
                      {timeAgo(m.createdAt)}
                    </span>
                    {m.editedAt && (
                      <span style={styles.edited} title={new Date(m.editedAt).toLocaleString()}>
                        (edited)
                      </span>
                    )}
                  </div>

                  {!isEditing && (mine || canDelete) && (
                    <div style={styles.actions}>
                      {mine && (
                        <button
                          style={styles.iconBtn}
                          onClick={() => startEdit(m)}
                          aria-label="Edit message"
                          title="Edit"
                          disabled={busyId === m.id}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          style={{ ...styles.iconBtn, ...styles.iconBtnDanger }}
                          onClick={() => handleDelete(m)}
                          aria-label="Delete message"
                          title="Delete"
                          disabled={busyId === m.id}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <textarea
                      style={styles.editTextarea}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => handleEditKeyDown(e, m)}
                      maxLength={MAX_LEN}
                      rows={3}
                      autoFocus
                    />
                    <div style={styles.editFooter}>
                      <span style={styles.charCount}>{editText.length}/{MAX_LEN}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button style={styles.cancelBtn} onClick={cancelEdit} disabled={savingEdit}>
                          <X size={13} style={{ marginRight: '4px' }} /> Cancel
                        </button>
                        <button
                          style={{
                            ...styles.saveBtn,
                            opacity: savingEdit || !editText.trim() ? 0.6 : 1,
                            cursor: savingEdit || !editText.trim() ? 'not-allowed' : 'pointer'
                          }}
                          onClick={() => saveEdit(m)}
                          disabled={savingEdit || !editText.trim()}
                        >
                          <Check size={13} style={{ marginRight: '4px' }} />
                          {savingEdit ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p style={styles.body}>{m.text}</p>
                )}
              </div>
            );
          })}

          {hasMore && (
            <button style={styles.loadMoreBtn} onClick={handleLoadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : 'Load older messages'}
            </button>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

const styles = {
  wrap: {
    maxWidth: '780px',
    margin: '0 auto',
    paddingBottom: '40px'
  },
  header: {
    marginBottom: '26px'
  },
  eyebrow: {
    display: 'flex',
    alignItems: 'center',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '2.5px',
    color: '#5EEAD4',
    marginBottom: '8px',
    textTransform: 'uppercase',
    userSelect: 'none'
  },
  title: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 'clamp(24px, 4vw, 32px)',
    fontWeight: 700,
    margin: '0 0 6px 0',
    letterSpacing: '-0.3px',
    color: '#FFFFFF',
    textShadow: '0 0 24px rgba(255, 255, 255, 0.12)'
  },
  subtitle: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '24px',
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderRadius: '16px',
    padding: '20px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)'
  },
  textarea: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderRadius: '10px',
    color: '#FFFFFF',
    padding: '14px 16px',
    fontSize: '15px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    resize: 'vertical',
    outline: 'none',
    lineHeight: '1.6',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
    transition: 'border-color 0.2s ease'
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
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.45)'
  },
  sendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(94, 234, 212, 0.12)',
    border: '1px solid rgba(94, 234, 212, 0.35)',
    color: '#5EEAD4',
    borderRadius: '10px',
    padding: '9px 20px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    letterSpacing: '0.3px',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 4px 14px rgba(94, 234, 212, 0.15)',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  error: {
    marginBottom: '20px',
    color: '#F87171',
    background: 'rgba(248, 113, 113, 0.12)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    padding: '12px 18px',
    borderRadius: '10px',
    fontSize: '13px',
    fontFamily: "'Space Grotesk', sans-serif"
  },
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px'
  },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255, 255, 255, 0.55)',
    fontSize: '14px',
    fontFamily: "'Space Grotesk', sans-serif",
    padding: '48px 20px',
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px dashed rgba(255, 255, 255, 0.12)',
    borderRadius: '14px'
  },
  card: {
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '18px 22px',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
  },
  cardMine: {
    background: 'rgba(12, 17, 25, 0.82)',
    border: '1px solid rgba(99, 223, 255, 0.2)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45), 0 0 16px rgba(99, 223, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.07)'
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '10px'
  },
  authorRow: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
    minWidth: 0
  },
  author: {
    fontWeight: 600,
    fontSize: '15px',
    color: '#FFFFFF',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  adminTag: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: '#FCD34D',
    background: 'rgba(252, 211, 77, 0.12)',
    border: '1px solid rgba(252, 211, 77, 0.3)',
    borderRadius: '999px',
    padding: '2px 8px',
    letterSpacing: '0.4px'
  },
  youTag: {
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: '#7DD3FC',
    background: 'rgba(99, 223, 255, 0.12)',
    border: '1px solid rgba(99, 223, 255, 0.3)',
    borderRadius: '999px',
    padding: '2px 8px',
    letterSpacing: '0.4px'
  },
  time: {
    fontSize: '12px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.48)'
  },
  edited: {
    fontSize: '11px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic'
  },
  actions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0
  },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.65)',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  iconBtnDanger: {
    color: '#F87171',
    borderColor: 'rgba(248, 113, 113, 0.25)',
    background: 'rgba(248, 113, 113, 0.08)'
  },
  body: {
    margin: 0,
    fontSize: '15px',
    lineHeight: '1.65',
    color: 'rgba(255, 255, 255, 0.88)',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  },
  editTextarea: {
    width: '100%',
    boxSizing: 'border-box',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: '10px',
    color: '#FFFFFF',
    padding: '12px 14px',
    fontSize: '15px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    resize: 'vertical',
    outline: 'none',
    lineHeight: '1.6'
  },
  editFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginTop: '10px',
    flexWrap: 'wrap'
  },
  cancelBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: 'rgba(255, 255, 255, 0.65)',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '12px',
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(94, 234, 212, 0.12)',
    border: '1px solid rgba(94, 234, 212, 0.35)',
    color: '#5EEAD4',
    borderRadius: '8px',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', sans-serif",
    transition: 'all 0.15s ease'
  },
  loadMoreBtn: {
    alignSelf: 'center',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '10px',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: "'Space Grotesk', sans-serif",
    cursor: 'pointer',
    marginTop: '6px',
    transition: 'all 0.2s ease'
  }
};