import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, EllipsisVertical, Pencil, Check, X } from 'lucide-react';
import { api, getSessionUser } from '../api';

export default function AdminPage() {
  const [tab, setTab] = useState('users');
  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    if (user.role !== 'admin') { navigate('/leaderboard'); return; }
  }, []);

  if (!user || user.role !== 'admin') return null;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.backBtn} className="admin-back-btn" onClick={() => navigate('/leaderboard')}>← Leaderboard</button>
        <div style={styles.headerTitle}>ADMIN CONSOLE</div>
      </header>

      <main style={styles.main} className="page-main">
        <div style={styles.tabRow} className="admin-tab-row">
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
          <TabButton active={tab === 'review'} onClick={() => setTab('review')}>Review Queue</TabButton>
          <TabButton active={tab === 'suggestions'} onClick={() => setTab('suggestions')}>User Suggestions</TabButton>
          <TabButton active={tab === 'audit'} onClick={() => setTab('audit')}>Audit Log</TabButton>
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'review' && <ReviewTab />}
        {tab === 'suggestions' && <SuggestionsTab />}
        {tab === 'audit' && <AuditTab />}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`admin-tab-btn${active ? ' admin-tab-active' : ''}`}
      style={{ ...styles.tab, ...(active ? styles.tabActive : {}) }}
    >
      {children}
    </button>
  );
}


function UsersTab() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null); 
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const res = await api.adminListUsers();
      setUsers(res);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSoftRemove(u) {
    setBusyId(u._id);
    try {
      await api.adminSoftRemove(u._id, 'Removed via admin panel');
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleReactivate(u) {
    setBusyId(u._id);
    try {
      await api.adminReactivate(u._id, 'Reactivated via admin panel');
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleHardDelete(u) {
    setBusyId(u._id);
    try {
      await api.adminHardDelete(u._id, 'Hard deleted via admin panel');
      setMsg('Deleted. Leaderboard updates automatically.');
      setConfirmDelete(null);
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}
      {msg && <div style={styles.infoMsg}>{msg}</div>}

      <div style={styles.table} className="admin-table-scroll">
        <div className="admin-table-inner">
          <div style={styles.tableHeader}>
            <span style={{ ...styles.col, flex: 2 }}>NAME / USN</span>
            <span style={{ ...styles.col, flex: 1 }}>CF HANDLE</span>
            <span style={{ ...styles.col, flex: 1 }}>LC HANDLE</span>
            <span style={{ ...styles.col, flex: 1 }}>CC HANDLE</span>
            <span style={{ ...styles.col, width: '95px' }}>STATUS</span>
            <span style={{ ...styles.col, width: '90px' }}>ROLE</span>
            <span style={{ ...styles.col, width: '210px' }}>ACTIONS</span>
          </div>

          {users.map(u => (
            <div key={u._id} style={styles.tableRow}>
              <div style={{ flex: 2 }}>
                <div style={styles.userName}>{u.name}</div>
                <div style={styles.subtext}>{u.usn} · {u.email}</div>
              </div>

              <div style={{ flex: 1 }}>
                {u.cfHandle ? (
                  <span>
                    {u.cfHandle}
                    {u.cfConnected && <span style={styles.verifiedDot} title="Verified">✓</span>}
                  </span>
                ) : (
                  <span style={styles.dim}>—</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                {u.lcUsername ? (
                  <span>
                    {u.lcUsername}
                    {u.lcConnected && <span style={styles.verifiedDot} title="Verified">✓</span>}
                  </span>
                ) : (
                  <span style={styles.dim}>—</span>
                )}
              </div>

              <div style={{ flex: 1 }}>
                {u.ccHandle ? (
                  <span>
                    {u.ccHandle}
                    {u.ccConnected && <span style={styles.verifiedDot} title="Verified">✓</span>}
                  </span>
                ) : (
                  <span style={styles.dim}>—</span>
                )}
              </div>

              <div style={{ width: '95px' }}>
                <span style={u.isActive ? styles.pillGreen : styles.pillRed}>
                  {u.isActive ? 'Active' : 'Soft-Rem'}
                </span>
              </div>

              <div style={{ width: '90px' }}>
                <span style={styles.dim}>{u.role}</span>
              </div>

              <div style={{ width: '210px', display: 'flex', gap: '8px' }}>
                {u.isActive ? (
                  <button
                    style={styles.actionBtn}
                    className="admin-btn-warm"
                    disabled={busyId === u._id}
                    onClick={() => handleSoftRemove(u)}
                  >
                    Soft-Remove
                  </button>
                ) : (
                  <button
                    style={styles.actionBtnGreen}
                    className="admin-btn-primary"
                    disabled={busyId === u._id}
                    onClick={() => handleReactivate(u)}
                  >
                    Reactivate
                  </button>
                )}

                {confirmDelete === u._id ? (
                  <button
                    style={styles.actionBtnRed}
                    className="admin-btn-danger"
                    disabled={busyId === u._id}
                    onClick={() => handleHardDelete(u)}
                  >
                    Confirm?
                  </button>
                ) : (
                  <button
                    style={styles.actionBtnRedOutline}
                    className="admin-btn-danger"
                    onClick={() => setConfirmDelete(u._id)}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function ReviewTab() {
  const [submissions, setSubmissions] = useState([]);
  const [filter, setFilter] = useState('unreviewed');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { load(); }, [filter]);

  async function load() {
    try {
      const res = await api.adminListSubmissions(filter);
      setSubmissions(res);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReview(s, status) {
    setBusyId(s._id);
    try {
      await api.adminReviewSubmission(s._id, status, `Marked as ${status} via admin panel`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
        {['unreviewed', 'flagged', 'cleared'].map(st => (
          <button
            key={st}
            onClick={() => setFilter(st)}
            className="admin-btn-warm"
            style={{ ...styles.actionBtn, ...(filter === st ? styles.tabActive : {}) }}
          >
            {st.toUpperCase()}
          </button>
        ))}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {submissions.length === 0 ? (
        <div style={styles.empty}>No {filter} submissions found.</div>
      ) : (
        <div style={styles.table} className="admin-table-scroll">
          <div className="admin-table-inner">
            <div style={styles.tableHeader}>
              <span style={{ ...styles.col, flex: 2 }}>USER</span>
              <span style={{ ...styles.col, flex: 3 }}>CONTEST / PROBLEM</span>
              <span style={{ ...styles.col, width: '105px' }}>POINTS</span>
              <span style={{ ...styles.col, width: '185px' }}>ACTIONS</span>
            </div>

            {submissions.map(s => {
              const u = s.userId || {};
              const isCf = s.platform === 'codeforces' || (!s.platform && s.cfSubmissionId);
              const isCc = s.platform === 'codechef';
              
              let contestId = s.contestId;
              let problemIndex = s.problemIndex;
              if (isCf && !contestId && s.problemId) {
                const m = String(s.problemId).match(/^(\d+)([a-zA-Z0-9]+)$/);
                if (m) {
                  contestId = m[1];
                  problemIndex = problemIndex || m[2].toUpperCase();
                } else if (!problemIndex) {
                  problemIndex = s.problemId;
                }
              } else if (!problemIndex && s.problemId) {
                problemIndex = s.problemId;
              }

              const subId = s.submissionId || s.cfSubmissionId || s.lcSubmissionId || s.ccSubmissionId;
              
              const problemUrl = s.problemUrl || (
                isCf
                  ? (contestId && problemIndex ? `https://codeforces.com/contest/${contestId}/problem/${problemIndex}` : (s.problemId ? `https://codeforces.com/problemset/problem/${s.problemId}` : null))
                  : (isCc ? (s.problemId ? `https://www.codechef.com/problems/${s.problemId}` : null) : (s.problemId ? `https://leetcode.com/problems/${s.problemId}/` : null))
              );

              const submissionUrl = s.submissionUrl || (
                isCf
                  ? (contestId && s.cfSubmissionId ? `https://codeforces.com/contest/${contestId}/submission/${s.cfSubmissionId}` : (s.cfSubmissionId ? `https://codeforces.com/submission/${s.cfSubmissionId}` : null))
                  : (isCc ? (s.ccSubmissionId ? `https://www.codechef.com/viewsolution/${s.ccSubmissionId}` : null) : (s.lcSubmissionId ? `https://leetcode.com/submissions/detail/${s.lcSubmissionId}/` : null))
              );

              const problemTitle = s.problemName || (isCf ? (contestId && problemIndex ? `Contest ${contestId} · Prob ${problemIndex}` : s.problemId) : s.problemId) || 'Problem';

              const userPlatformHandle = isCf
                ? (u.cfHandle ? `CF: ${u.cfHandle}` : null)
                : (isCc ? (u.ccHandle ? `CC: ${u.ccHandle}` : null) : (u.lcUsername ? `LC: ${u.lcUsername}` : null));

              return (
                <div key={s._id} style={styles.tableRow}>
                  <div style={{ flex: 2 }}>
                    <div style={styles.userName}>{u.name || 'Unknown'}</div>
                    <div style={styles.subtext}>
                      {u.usn ? `${u.usn} ` : ''}
                      {userPlatformHandle ? `(${userPlatformHandle})` : (u.cfHandle ? `(${u.cfHandle})` : '')}
                    </div>
                  </div>

                  <div style={{ flex: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={isCf ? styles.pillCf : (isCc ? styles.pillCc : styles.pillLc)}>
                        {isCf ? 'CF' : (isCc ? 'CC' : 'LC')}
                      </span>
                      {problemUrl ? (
                        <a
                          href={problemUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={styles.problemLink}
                          title="Open problem on platform"
                        >
                          {problemTitle} ↗
                        </a>
                      ) : (
                        <span style={{ fontWeight: 600 }}>{problemTitle}</span>
                      )}
                      {s.problemRating != null && (
                        <span style={styles.ratingBadge}>★ {s.problemRating}</span>
                      )}
                      {s.difficulty && (
                        <span style={styles.difficultyBadge}>{s.difficulty}</span>
                      )}
                    </div>

                    <div style={{ ...styles.subtext, marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {isCf && contestId && (
                        <span>Contest {contestId}{problemIndex ? ` · Prob ${problemIndex}` : ''}</span>
                      )}
                      {!isCf && s.problemId && (
                        <span>Problem: {s.problemId}</span>
                      )}
                      {subId && (
                        <span>
                          · Sub{' '}
                          {submissionUrl ? (
                            <a
                              href={submissionUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={styles.subLink}
                              title="Inspect submission code on platform"
                            >
                              #{subId} ↗
                            </a>
                          ) : (
                            `#${subId}`
                          )}
                        </span>
                      )}
                      {s.solvedAt && (
                        <span style={{ opacity: 0.7 }}>
                          · {new Date(s.solvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ width: '105px' }}>
                    <span style={styles.pillGreen}>+{s.points} pts</span>
                  </div>

                  <div style={{ width: '185px', display: 'flex', gap: '8px' }}>
                    <button
                      style={styles.actionBtnGreen}
                      className="admin-btn-primary"
                      disabled={busyId === s._id}
                      onClick={() => handleReview(s, 'cleared')}
                    >
                      Clear
                    </button>
                    <button
                      style={styles.actionBtnRedOutline}
                      className="admin-btn-danger"
                      disabled={busyId === s._id}
                      onClick={() => handleReview(s, 'flagged')}
                    >
                      Flag Plag
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


const SUGGESTION_STATUS = {
  pending: { label: 'PENDING', color: 'var(--text-dim, rgba(255, 255, 255, 0.55))', border: 'var(--border, rgba(255, 255, 255, 0.15))' },
  accepted: { label: 'ACCEPTED', color: 'var(--admin-accent, #FCD34D)', border: 'var(--admin-accent-border, rgba(255, 193, 43, 0.4))' },
  rejected: { label: 'REJECTED', color: 'var(--accent-red)', border: 'var(--accent-red)' }
};

const REPLY_EDIT_WINDOW_MS = 5 * 60 * 1000;

function canEditReply(s) {
  if (!s.adminReply || !s.repliedAt) return true; 
  return Date.now() - new Date(s.repliedAt).getTime() <= REPLY_EDIT_WINDOW_MS;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [replyDrafts, setReplyDrafts] = useState({}); 
  const [rowError, setRowError] = useState({ id: null, msg: '' });
  const [editingId, setEditingId] = useState(null); 
  const [menuId, setMenuId] = useState(null);         
  const [, setTick] = useState(0); 

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!menuId) return;
    const close = () => setMenuId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuId]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.adminListSuggestions();
      setSuggestions(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(s) {
    setBusyId(s._id);
    try {
      await api.adminDeleteSuggestion(s._id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function draftFor(s) {
    return replyDrafts[s._id] !== undefined ? replyDrafts[s._id] : '';
  }

  function startEdit(s) {
    setMenuId(null);
    setRowError({ id: null, msg: '' });
    setReplyDrafts(prev => ({ ...prev, [s._id]: s.adminReply || '' }));
    setEditingId(s._id);
  }

  function cancelEdit(s) {
    setEditingId(null);
    setReplyDrafts(prev => {
      const next = { ...prev };
      delete next[s._id];
      return next;
    });
  }

  async function handleReview(s, body) {
    setBusyId(s._id);
    setError('');
    setRowError({ id: null, msg: '' });
    try {
      const { suggestion } = await api.adminReviewSuggestion(s._id, body);
      setSuggestions(prev => prev.map(x => (x._id === suggestion._id ? suggestion : x)));
      setReplyDrafts(prev => {
        const next = { ...prev };
        delete next[s._id];
        return next;
      });
      setEditingId(null);
    } catch (err) {
      setRowError({ id: s._id, msg: err.message || 'Failed to save review.' });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <div style={styles.empty}>Loading suggestions...</div>
      ) : suggestions.length === 0 ? (
        <div style={styles.empty}>No user suggestions received yet.</div>
      ) : (
        <div style={styles.table} className="admin-table-scroll">
          <div className="admin-table-inner">
            <div style={styles.tableHeader}>
              <span style={{ ...styles.col, flex: 2 }}>SUBMITTED BY</span>
              <span style={{ ...styles.col, flex: 4 }}>SUGGESTION DETAILS</span>
              <span style={{ ...styles.col, flex: 2 }}>DATE &amp; TIME</span>
              <span style={{ ...styles.col, width: '115px', textAlign: 'right' }}>ACTION</span>
            </div>

            {suggestions.map(s => {
              const u = s.userId || {};
              const status = s.status || 'pending';
              const meta = SUGGESTION_STATUS[status] || SUGGESTION_STATUS.pending;
              const busy = busyId === s._id;
              const draft = draftFor(s);
              const hasReply = !!s.adminReply;
              const editable = hasReply && canEditReply(s);
              const editing = editingId === s._id;

              return (
                <div key={s._id} style={{ ...styles.tableRow, alignItems: 'flex-start', padding: '16px 18px' }}>
                  <div style={{ flex: 2 }}>
                    <div style={styles.userName}>{u.name || 'User'}</div>
                    <div style={styles.subtext}>{u.usn ? `USN: ${u.usn}` : ''}</div>
                    <div style={styles.subtext}>{u.email || ''}</div>
                  </div>

                  <div style={{ flex: 4, color: 'var(--text)', lineHeight: '1.55', fontFamily: 'inherit' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{
                        color: meta.color, border: `1px solid ${meta.border}`, borderRadius: '4px',
                        padding: '3px 9px', fontSize: '11px', letterSpacing: '1px', fontWeight: 600,
                        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
                      }}>
                        {meta.label}
                      </span>
                    </div>

                    <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{s.text}</div>
                    {s.editedAt && (
                      <div style={{ ...styles.subtext, fontStyle: 'italic', marginTop: '4px' }}>
                        Edited {fmtDate(s.editedAt)}
                      </div>
                    )}
                    {(s.additions || []).map(a => (
                      <div key={a._id} style={{ marginTop: '8px', paddingLeft: '10px', borderLeft: '2px solid rgba(255, 193, 43, 0.3)' }}>
                        <div style={styles.subtext}>
                          Added {fmtDate(a.createdAt)}
                          {a.editedAt && <span style={{ fontStyle: 'italic' }}> · edited {fmtDate(a.editedAt)}</span>}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '13.5px' }}>{a.text}</div>
                      </div>
                    ))}

                    <div style={{ marginTop: '12px' }}>
                      {hasReply && !editing ? (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                            <div style={{
                              flex: 1, background: 'rgba(255, 193, 43, 0.08)', border: '1px solid rgba(255, 193, 43, 0.3)',
                              borderRadius: '8px', padding: '10px 14px', fontSize: '14px',
                              whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: '1.55', color: 'var(--text, #FFFBEB)'
                            }}>
                              {s.adminReply}
                            </div>
                            {editable && (
                              <div style={{ position: 'relative' }}>
                                <button
                                  aria-label="Reply options"
                                  style={{
                                    background: 'transparent', border: 'none', color: 'var(--text-dim, rgba(255, 255, 255, 0.6))',
                                    cursor: 'pointer', padding: '6px 2px', display: 'flex'
                                  }}
                                  onClick={e => { e.stopPropagation(); setMenuId(menuId === s._id ? null : s._id); }}
                                >
                                  <EllipsisVertical size={16} />
                                </button>
                                {menuId === s._id && (
                                  <div
                                    style={{
                                      position: 'absolute', right: 0, top: '100%', zIndex: 5,
                                      background: 'var(--surface-raised)', border: '1px solid var(--border)',
                                      borderRadius: '6px', minWidth: '96px', overflow: 'hidden'
                                    }}
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <button
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                                        background: 'transparent', border: 'none', color: 'var(--text)',
                                        padding: '8px 12px', fontSize: '13px', cursor: 'pointer'
                                      }}
                                      onClick={() => startEdit(s)}
                                    >
                                      <Pencil size={13} /> Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ ...styles.subtext, marginTop: '6px', color: 'var(--admin-accent, #FCD34D)' }}>
                            <Check size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                            Sent {fmtDate(s.repliedAt)}
                            {s.replyUpdatedAt && <span style={{ fontStyle: 'italic' }}> · updated {fmtDate(s.replyUpdatedAt)}</span>}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <textarea
                            style={{
                              width: '100%', boxSizing: 'border-box', background: 'var(--input-bg, rgba(0, 0, 0, 0.35))',
                              border: '1px solid var(--input-border, rgba(255, 193, 43, 0.25))', borderRadius: '6px',
                              color: 'var(--input-text, #FFFFFF)', padding: '10px 12px', fontSize: '14px',
                              fontFamily: 'inherit', resize: 'vertical', outline: 'none', lineHeight: '1.55'
                            }}
                            rows={2}
                            maxLength={2000}
                            autoFocus={editing}
                            placeholder="Write a reply for the user…"
                            value={draft}
                            onChange={e => setReplyDrafts(prev => ({ ...prev, [s._id]: e.target.value }))}
                          />
                          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <button
                              className="admin-btn-primary"
                              style={{
                                ...styles.actionBtnGreen,
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                opacity: busy || !draft.trim() || (editing && draft.trim() === s.adminReply) ? 0.5 : 1,
                                cursor: busy || !draft.trim() || (editing && draft.trim() === s.adminReply) ? 'not-allowed' : 'pointer'
                              }}
                              disabled={busy || !draft.trim() || (editing && draft.trim() === s.adminReply)}
                              onClick={() => handleReview(s, { reply: draft })}
                            >
                              <Send size={13} />
                              {busy ? 'Sending...' : editing ? 'Update' : 'Send'}
                            </button>
                            {editing && (
                              <button style={styles.actionBtn} className="admin-btn-warm" disabled={busy} onClick={() => cancelEdit(s)}>
                                <X size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                        <button
                          className="admin-btn-primary"
                          style={{ ...styles.actionBtnGreen, opacity: busy || !hasReply || status === 'accepted' ? 0.5 : 1 }}
                          disabled={busy || !hasReply || status === 'accepted'}
                          title={hasReply ? '' : 'Send a reply first'}
                          onClick={() => handleReview(s, { status: 'accepted' })}
                        >
                          Accept
                        </button>
                        <button
                          className="admin-btn-danger"
                          style={{ ...styles.actionBtnRedOutline, opacity: busy || !hasReply || status === 'rejected' ? 0.5 : 1 }}
                          disabled={busy || !hasReply || status === 'rejected'}
                          title={hasReply ? '' : 'Send a reply first'}
                          onClick={() => handleReview(s, { status: 'rejected' })}
                        >
                          Reject
                        </button>
                        {status !== 'pending' && (
                          <button
                            className="admin-btn-warm"
                            style={styles.actionBtn}
                            disabled={busy}
                            onClick={() => handleReview(s, { status: 'pending' })}
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      {rowError.id === s._id && (
                        <div style={{ ...styles.error, marginTop: '8px', marginBottom: 0, fontSize: '13px' }}>{rowError.msg}</div>
                      )}
                    </div>
                  </div>

                  <div style={{ flex: 2, fontSize: '12.5px', color: 'var(--text-dim)' }}>
                    {fmtDate(s.createdAt)}
                  </div>

                  <div style={{ width: '115px', textAlign: 'right' }}>
                    <button
                      className="admin-btn-danger"
                      style={styles.actionBtnRedOutline}
                      disabled={busy}
                      onClick={() => handleDelete(s)}
                    >
                      {busy ? 'Working...' : 'Dismiss'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


function AuditTab() {
  const [actions, setActions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.adminAuditLog()
      .then(res => setActions(res))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.table} className="admin-table-scroll">
        <div className="admin-table-inner">
          <div style={styles.tableHeader}>
            <span style={{ ...styles.col, flex: 2 }}>TIMESTAMP</span>
            <span style={{ ...styles.col, flex: 1.5 }}>ACTION</span>
            <span style={{ ...styles.col, flex: 2 }}>REASON</span>
          </div>

          {actions.map(a => (
            <div key={a._id} style={styles.tableRow}>
              <div style={{ flex: 2, fontSize: '13px', color: 'var(--text)' }}>
                {new Date(a.createdAt).toLocaleString()}
              </div>
              <div style={{ flex: 1.5 }}>
                <span style={a.action.includes('remove') || a.action.includes('flag') ? styles.pillRed : styles.pillGreen}>
                  {a.action}
                </span>
              </div>
              <div style={{ flex: 2, color: 'var(--text-dim)', fontSize: '13.5px' }}>
                {a.reason || '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: 'var(--bg)' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 'var(--space-3)',
    padding: '18px 24px',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.07))'
  },
  backBtn: {
    background: 'var(--card-bg, rgba(255, 255, 255, 0.03))',
    border: '1px solid var(--admin-accent-border, rgba(255, 193, 43, 0.22))',
    color: 'var(--text, rgba(255, 255, 255, 0.78))',
    fontSize: '14.5px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontWeight: 500,
    cursor: 'pointer',
    padding: '8px 20px',
    borderRadius: '8px'
  },
  headerTitle: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--admin-accent, #FCD34D)',
    letterSpacing: '1.4px',
    userSelect: 'none'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: 'var(--space-5) var(--space-4)'
  },
  tabRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: 'var(--space-4)',
    flexWrap: 'wrap'
  },
  tab: {
    background: 'var(--card-bg, rgba(255, 255, 255, 0.025))',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
    borderRadius: '8px',
    color: 'var(--text-dim, rgba(255, 255, 255, 0.65))',
    padding: '12px 24px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '15px',
    fontWeight: 500,
    letterSpacing: '0.3px',
    userSelect: 'none',
    cursor: 'pointer',
    minHeight: '46px'
  },
  tabActive: {
    background: 'var(--admin-accent-dim, rgba(255, 193, 43, 0.1))',
    borderColor: 'var(--admin-accent-border, rgba(255, 193, 43, 0.42))',
    color: 'var(--admin-accent, #FCD34D)',
    fontWeight: 600,
    boxShadow: '0 2px 12px rgba(255, 193, 43, 0.1)'
  },
  table: {
    border: '1px solid var(--card-border, rgba(255, 255, 255, 0.07))',
    borderRadius: '12px',
    overflow: 'hidden',
    background: 'var(--card-bg, #090B0F)'
  },
  tableHeader: {
    display: 'flex',
    padding: '14px 22px',
    background: 'var(--surface-raised, rgba(255, 255, 255, 0.025))',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.06))'
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 22px',
    background: 'transparent',
    borderBottom: '1px solid var(--border, rgba(255, 255, 255, 0.05))',
    fontSize: '15px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'var(--text)'
  },
  col: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-dim, rgba(255, 255, 255, 0.52))',
    letterSpacing: '1.1px',
    userSelect: 'none'
  },
  userName: {
    fontWeight: 600,
    fontSize: '16.5px',
    color: 'var(--text, #FFFFFF)'
  },
  subtext: {
    fontSize: '13.5px',
    color: 'var(--text-dim, rgba(255, 255, 255, 0.55))',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    marginTop: '3px'
  },
  dim: {
    color: 'var(--text-dim, rgba(255, 255, 255, 0.5))',
    fontSize: '15px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  verifiedDot: {
    color: 'var(--accent-green, #5EEAD4)',
    marginLeft: '6px',
    fontSize: '13px'
  },
  pillGreen: {
    color: 'var(--accent-green, #5EEAD4)',
    background: 'var(--accent-green-dim, rgba(94, 234, 212, 0.1))',
    border: '1px solid var(--accent-green-dim, rgba(94, 234, 212, 0.3))',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  pillRed: {
    color: '#F87171',
    background: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  pillCf: {
    color: 'var(--cf-accent, #7DD3FC)',
    background: 'var(--cf-dim, rgba(99, 223, 255, 0.12))',
    border: '1px solid var(--cf-border, rgba(99, 223, 255, 0.28))',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  pillLc: {
    color: 'var(--lc-accent, #FCD34D)',
    background: 'var(--lc-dim, rgba(252, 211, 77, 0.12))',
    border: '1px solid var(--lc-border, rgba(252, 211, 77, 0.28))',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  pillCc: {
    color: 'var(--cc-accent, #D8B4FE)',
    background: 'var(--cc-dim, rgba(216, 180, 254, 0.12))',
    border: '1px solid var(--cc-border, rgba(216, 180, 254, 0.28))',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  problemLink: {
    color: 'var(--text)',
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: '15.5px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  subLink: {
    color: 'var(--admin-accent, #FCD34D)',
    textDecoration: 'none',
    fontSize: '14px',
    borderBottom: '1px dashed var(--admin-accent-border, rgba(252, 211, 77, 0.5))'
  },
  ratingBadge: {
    color: 'var(--admin-accent, #FCD34D)',
    fontSize: '13px',
    fontWeight: 600,
    background: 'var(--admin-accent-dim, rgba(255, 193, 43, 0.12))',
    border: '1px solid var(--admin-accent-border, rgba(255, 193, 43, 0.3))',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  difficultyBadge: {
    color: 'var(--text-dim, rgba(255, 255, 255, 0.65))',
    fontSize: '13px',
    fontWeight: 500,
    background: 'var(--card-bg, rgba(255, 255, 255, 0.04))',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.08))',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  actionBtn: {
    background: 'var(--admin-accent-dim, rgba(255, 193, 43, 0.06))',
    border: '1px solid var(--admin-accent-border, rgba(255, 193, 43, 0.22))',
    borderRadius: '7px',
    color: 'var(--text, rgba(255, 230, 160, 0.9))',
    padding: '9px 16px',
    fontSize: '13.5px',
    fontWeight: 500,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: 'pointer',
    minHeight: '38px'
  },
  actionBtnGreen: {
    background: 'var(--admin-accent-dim, rgba(255, 193, 43, 0.14))',
    border: '1px solid var(--admin-accent-border, rgba(255, 193, 43, 0.42))',
    borderRadius: '7px',
    color: 'var(--admin-accent, #FCD34D)',
    padding: '9px 16px',
    fontSize: '13.5px',
    fontWeight: 600,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: 'pointer',
    minHeight: '38px',
    boxShadow: '0 2px 8px rgba(255, 193, 43, 0.08)'
  },
  actionBtnRed: {
    background: 'rgba(248, 113, 113, 0.85)',
    border: '1px solid rgba(248, 113, 113, 0.9)',
    borderRadius: '7px',
    color: '#1A0505',
    padding: '9px 16px',
    fontSize: '13.5px',
    fontWeight: 700,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: 'pointer',
    minHeight: '38px'
  },
  actionBtnRedOutline: {
    background: 'rgba(248, 113, 113, 0.04)',
    border: '1px solid rgba(248, 113, 113, 0.28)',
    borderRadius: '7px',
    color: '#F87171',
    padding: '9px 16px',
    fontSize: '13.5px',
    fontWeight: 500,
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    cursor: 'pointer',
    minHeight: '38px'
  },
  error: {
    color: 'var(--accent-red)',
    marginBottom: 'var(--space-3)',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '15px'
  },
  infoMsg: {
    color: 'var(--admin-accent, #FCD34D)',
    marginBottom: 'var(--space-3)',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '15px'
  },
  empty: {
    padding: 'var(--space-5)',
    textAlign: 'center',
    color: 'var(--text-dim)',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '16px'
  }
};
