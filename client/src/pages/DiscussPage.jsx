import { useState, useEffect, useCallback } from 'react';
import { Send, Pencil, Trash2, Check, X, Shield, Loader2 } from 'lucide-react';
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
          <h1 style={styles.title}>Discuss</h1>
          <p style={styles.subtitle}>
            Open to everyone in CodeClub. Ask questions, share resources, talk contests.
          </p>
        </div>

        <form onSubmit={handleSend} style={styles.form}>
          <textarea
            style={styles.textarea}
            placeholder="Write a message…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleComposerKeyDown}
            maxLength={MAX_LEN}
            rows={3}
          />
          <div style={styles.formFooter}>
            <span style={styles.charCount}>
              {text.length}/{MAX_LEN} · Ctrl+Enter to send
            </span>
            <button
              type="submit"
              style={{
                ...styles.sendBtn,
                opacity: sending || !text.trim() ? 0.6 : 1,
                cursor: sending || !text.trim() ? 'not-allowed' : 'pointer'
              }}
              disabled={sending || !text.trim()}
            >
              <Send size={13} style={{ marginRight: '6px' }} />
              {sending ? 'Sending…' : 'Post'}
            </button>
          </div>
        </form>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.feed}>
          {loading && (
            <div style={styles.empty}>
              <Loader2 size={16} style={{ marginRight: '8px' }} /> Loading messages…
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
  wrap: { maxWidth: '720px', margin: '0 auto', paddingBottom: '40px' },
  header: { marginBottom: '20px' },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text)',
    margin: '0 0 6px'
  },
  subtitle: { color: 'var(--text-dim)', fontSize: '14px', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' },
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
  charCount: { fontSize: '12px', color: 'var(--text-dim)' },
  sendBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid var(--accent-green)',
    color: 'var(--accent-green)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 22px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Orbitron', sans-serif",
    minHeight: '40px'
  },
  error: {
    marginBottom: '16px',
    color: '#ff6b6b',
    background: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    padding: '12px 16px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px'
  },
  feed: { display: 'flex', flexDirection: 'column', gap: '12px' },
  empty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-dim)',
    fontSize: '13px',
    padding: '32px 0',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius)'
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px 14px'
  },
  cardMine: { borderColor: 'var(--border-hover)', background: 'var(--surface-raised)' },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginBottom: '6px'
  },
  authorRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', minWidth: 0 },
  author: { fontWeight: 600, fontSize: '14px', color: 'var(--text)' },
  adminTag: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--accent-gold)',
    background: 'var(--accent-gold-dim)',
    border: '1px solid var(--accent-gold)',
    borderRadius: 'var(--radius-sm)',
    padding: '1px 6px'
  },
  youTag: {
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--accent-green)',
    border: '1px solid var(--accent-green)',
    borderRadius: 'var(--radius-sm)',
    padding: '1px 6px'
  },
  time: { fontSize: '12px', color: 'var(--text-dim)' },
  edited: { fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' },
  actions: { display: 'flex', gap: '4px', flexShrink: 0 },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-dim)',
    width: '30px',
    height: '30px',
    cursor: 'pointer'
  },
  iconBtnDanger: { color: 'var(--accent-red)' },
  body: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.55',
    color: 'var(--text)',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  },
  editTextarea: {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--bg)',
    border: '1px solid var(--border-hover)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text)',
    padding: '10px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    lineHeight: '1.5'
  },
  editFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    marginTop: '8px',
    flexWrap: 'wrap'
  },
  cancelBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-dim)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid var(--accent-green)',
    color: 'var(--accent-green)',
    borderRadius: 'var(--radius-sm)',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600
  },
  loadMoreBtn: {
    alignSelf: 'center',
    background: 'transparent',
    border: '1px dashed var(--border)',
    color: 'var(--text-dim)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 20px',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '4px'
  }
};