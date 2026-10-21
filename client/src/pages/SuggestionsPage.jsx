import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Send, CheckCircle2, Lock, Pencil, PlusCircle, Check, X } from 'lucide-react';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';

const MAX_LEN = 2000;
const EDIT_WINDOW_MS = 5 * 60 * 1000; 

function canEdit(iso) {
  return Date.now() - new Date(iso).getTime() <= EDIT_WINDOW_MS;
}

const STATUS_META = {
  pending: { label: 'Pending', color: 'var(--text-dim)', bg: 'transparent', border: 'var(--border)' },
  accepted: { label: 'Accepted', color: 'var(--accent-green)', bg: 'rgba(16, 185, 129, 0.12)', border: 'var(--accent-green)' },
  rejected: { label: 'Rejected', color: '#ff6b6b', bg: 'rgba(255, 107, 107, 0.1)', border: '#ff6b6b' }
};

function fmt(iso) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function SuggestionsPage() {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [mine, setMine] = useState([]);
  const [loadingMine, setLoadingMine] = useState(true);

  const [panel, setPanel] = useState(null);
  const [draft, setDraft] = useState('');
  const [savingPanel, setSavingPanel] = useState(false);
  const [panelError, setPanelError] = useState('');

  const [, setTick] = useState(0); 

  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    api.mySuggestions()
      .then(data => { if (!cancelled) setMine(data.suggestions); })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load your suggestions.'); })
      .finally(() => { if (!cancelled) setLoadingMine(false); });
    return () => { cancelled = true; };
  }, []);

  if (!user) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const { suggestion } = await api.submitSuggestion(trimmed);
      setMine(prev => [suggestion, ...prev]);
      setText('');
      setNotice('Thank you! Your suggestion has been submitted privately to the admin team.');
    } catch (err) {
      setError(err.message || 'Failed to submit suggestion.');
    } finally {
      setSubmitting(false);
    }
  }

  function openPanel(s, mode, addition) {
    setPanel({ id: s._id, mode, additionId: addition ? addition._id : null });
    setDraft(mode === 'edit' ? s.text : mode === 'editAddition' ? addition.text : '');
    setPanelError('');
  }

  function closePanel() {
    setPanel(null);
    setDraft('');
    setPanelError('');
  }

  async function savePanel(s) {
    const trimmed = draft.trim();
    if (!trimmed || savingPanel) return;
    if (panel.mode === 'edit' && trimmed === s.text) return closePanel();
    if (panel.mode === 'editAddition') {
      const current = (s.additions || []).find(a => a._id === panel.additionId);
      if (current && current.text === trimmed) return closePanel();
    }

    setSavingPanel(true);
    setPanelError('');
    try {
      let res;
      if (panel.mode === 'edit') res = await api.editSuggestion(s._id, trimmed);
      else if (panel.mode === 'editAddition') res = await api.editAddition(s._id, panel.additionId, trimmed);
      else res = await api.addToSuggestion(s._id, trimmed);
      const { suggestion } = res;
      setMine(prev => prev.map(x => (x._id === suggestion._id ? suggestion : x)));
      closePanel();
    } catch (err) {
      setPanelError(err.message || 'Failed to save.');
    } finally {
      setSavingPanel(false);
    }
  }

  function handlePanelKeyDown(e, s) {
    if (e.key === 'Escape') closePanel();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) savePanel(s);
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
            <span>Suggestions are private. Edits allowed within 5 minutes of sending.</span>
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
            maxLength={MAX_LEN}
            rows={6}
          />
          <div style={styles.formFooter}>
            <span style={styles.charCount}>{text.length}/{MAX_LEN}</span>
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

        <div style={styles.mineHeader}>
          <h2 style={styles.mineTitle}>My suggestions</h2>
          {!loadingMine && <span style={styles.charCount}>{mine.length}</span>}
        </div>

        {loadingMine && <div style={styles.empty}>Loading your suggestions…</div>}
        {!loadingMine && mine.length === 0 && (
          <div style={styles.empty}>You haven&apos;t sent any suggestions yet.</div>
        )}

        <div style={styles.list}>
          {mine.map(s => {
            const open = panel && panel.id === s._id;
            const additions = s.additions || [];
            const meta = STATUS_META[s.status] || STATUS_META.pending;

            return (
              <div key={s._id} style={styles.card}>
                <div style={styles.cardHead}>
                  <span style={styles.time}>
                    {fmt(s.createdAt)}
                    {s.editedAt && (
                      <span style={styles.edited} title={fmt(s.editedAt)}> · edited</span>
                    )}
                    <span style={{ ...styles.badge, color: meta.color, background: meta.bg, borderColor: meta.border }}>
                      {meta.label}
                    </span>
                  </span>

                  {!open && (
                    <div style={styles.actions}>
                      {canEdit(s.createdAt) && (
                        <button style={styles.linkBtn} onClick={() => openPanel(s, 'edit')}>
                          <Pencil size={13} style={{ marginRight: '4px' }} /> Edit
                        </button>
                      )}
                      <button style={styles.linkBtn} onClick={() => openPanel(s, 'add')}>
                        <PlusCircle size={13} style={{ marginRight: '4px' }} /> Add more
                      </button>
                    </div>
                  )}
                </div>

                {open && panel.mode === 'edit' ? (
                  <PanelEditor
                    label="Edit your suggestion"
                    draft={draft}
                    setDraft={setDraft}
                    onKeyDown={e => handlePanelKeyDown(e, s)}
                    onCancel={closePanel}
                    onSave={() => savePanel(s)}
                    saving={savingPanel}
                    error={panelError}
                  />
                ) : (
                  <p style={styles.body}>{s.text}</p>
                )}

                {additions.length > 0 && (
                  <div style={styles.additions}>
                    {additions.map(a => {
                      const editingThis = open && panel.mode === 'editAddition' && panel.additionId === a._id;
                      return (
                        <div key={a._id} style={styles.addition}>
                          <div style={{ ...styles.additionTime, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>
                              Added {fmt(a.createdAt)}
                              {a.editedAt && <span style={styles.edited} title={fmt(a.editedAt)}> · edited</span>}
                            </span>
                            {!open && canEdit(a.createdAt) && (
                              <button style={styles.linkBtn} onClick={() => openPanel(s, 'editAddition', a)}>
                                <Pencil size={11} style={{ marginRight: '4px' }} /> Edit
                              </button>
                            )}
                          </div>
                          {editingThis ? (
                            <PanelEditor
                              label="Edit your follow-up"
                              draft={draft}
                              setDraft={setDraft}
                              onKeyDown={e => handlePanelKeyDown(e, s)}
                              onCancel={closePanel}
                              onSave={() => savePanel(s)}
                              saving={savingPanel}
                              error={panelError}
                            />
                          ) : (
                            <p style={{ ...styles.body, fontSize: '13px' }}>{a.text}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {s.adminReply && (
                  <div style={{ ...styles.reply, borderColor: meta.border }}>
                    <div style={styles.replyHead}>
                      <Shield size={12} style={{ marginRight: '6px', color: 'var(--accent-gold)' }} />
                      Admin reply{s.repliedAt && <span style={{ marginLeft: '6px' }}>· {fmt(s.repliedAt)}</span>}
                      {s.replyUpdatedAt && (
                        <span style={{ marginLeft: '6px', fontStyle: 'italic' }} title={fmt(s.replyUpdatedAt)}>
                          · updated {fmt(s.replyUpdatedAt)}
                        </span>
                      )}
                    </div>
                    <p style={{ ...styles.body, fontSize: '13px' }}>{s.adminReply}</p>
                  </div>
                )}

                {open && panel.mode === 'add' && (
                  <PanelEditor
                    label="Add more details"
                    draft={draft}
                    setDraft={setDraft}
                    onKeyDown={e => handlePanelKeyDown(e, s)}
                    onCancel={closePanel}
                    onSave={() => savePanel(s)}
                    saving={savingPanel}
                    error={panelError}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </SidebarLayout>
  );
}

function PanelEditor({ label, draft, setDraft, onKeyDown, onCancel, onSave, saving, error }) {
  return (
    <div style={{ marginTop: '8px' }}>
      <textarea
        style={styles.editTextarea}
        aria-label={label}
        placeholder={label}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={MAX_LEN}
        rows={4}
        autoFocus
      />
      {error && <div style={{ ...styles.error, marginTop: '8px' }}>{error}</div>}
      <div style={styles.editFooter}>
        <span style={styles.charCount}>{draft.length}/{MAX_LEN}</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={styles.cancelBtn} onClick={onCancel} disabled={saving}>
            <X size={13} style={{ marginRight: '4px' }} /> Cancel
          </button>
          <button
            style={{
              ...styles.saveBtn,
              opacity: saving || !draft.trim() ? 0.6 : 1,
              cursor: saving || !draft.trim() ? 'not-allowed' : 'pointer'
            }}
            onClick={onSave}
            disabled={saving || !draft.trim()}
          >
            <Check size={13} style={{ marginRight: '4px' }} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { maxWidth: '680px', margin: '0 auto', paddingBottom: '40px' },
  header: { marginBottom: '20px' },
  title: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text)',
    margin: '0 0 6px'
  },
  subtitle: { color: 'var(--text-dim)', fontSize: '14px', margin: '0 0 10px' },
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
  form: { display: 'flex', flexDirection: 'column', gap: '10px' },
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
  },
  mineHeader: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    margin: '32px 0 12px',
    paddingTop: '20px',
    borderTop: '1px solid var(--border)'
  },
  mineTitle: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text)',
    margin: 0
  },
  empty: {
    color: 'var(--text-dim)',
    fontSize: '13px',
    padding: '24px 0',
    textAlign: 'center',
    border: '1px dashed var(--border)',
    borderRadius: 'var(--radius)'
  },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '12px 14px'
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '6px'
  },
  time: { fontSize: '12px', color: 'var(--text-dim)' },
  edited: { fontStyle: 'italic' },
  badge: {
    marginLeft: '10px',
    border: '1px solid',
    borderRadius: '4px',
    padding: '1px 8px',
    fontSize: '11px',
    fontWeight: 600
  },
  reply: {
    marginTop: '12px',
    background: 'var(--bg)',
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px'
  },
  replyHead: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '11px',
    color: 'var(--accent-gold)',
    fontWeight: 600,
    marginBottom: '4px'
  },
  actions: { display: 'flex', gap: '4px' },
  linkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-dim)',
    padding: '4px 8px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  body: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '1.55',
    color: 'var(--text)',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  },
  additions: {
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    borderLeft: '2px solid var(--border-hover)',
    paddingLeft: '12px'
  },
  addition: {},
  additionTime: { fontSize: '11px', color: 'var(--text-dim)', marginBottom: '2px' },
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
  }
};