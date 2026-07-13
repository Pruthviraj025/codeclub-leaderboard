import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getSessionUser } from '../api';

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };
const OUTCOME_LABEL = { green: 'AC', red: 'WA', none: '—' };

export default function HistoryPage() {
  const [weeks, setWeeks] = useState(null);
  const [error, setError] = useState('');
  const [openWeekId, setOpenWeekId] = useState(null);
  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    api.leaderboardHistory()
      .then((data) => {
        setWeeks(data);
        if (data.length > 0) setOpenWeekId(data[0]._id);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (!user) return null;

  return (
    <div style={styles.page}>
      <header style={styles.header} className="site-header">
        <button style={styles.backBtn} onClick={() => navigate('/leaderboard')}>← Leaderboard</button>
        <div style={styles.headerTitle} className="mono">WEEK HISTORY</div>
      </header>

      <main style={styles.main} className="page-main">
        {error && <div style={styles.error}>{error}</div>}

        {weeks === null ? (
          <div style={styles.empty} className="fade-up">Loading history…</div>
        ) : weeks.length === 0 ? (
          <div style={styles.empty}>No weeks have finalized yet — check back after the first reset.</div>
        ) : (
          weeks.map((week, idx) => {
            const isOpen = openWeekId === week._id;
            const greenCount = week.results.filter(r => r.outcome === 'green').length;
            const redCount = week.results.filter(r => r.outcome === 'red').length;

            return (
              <div
                key={week._id}
                style={{ ...styles.weekCard, animationDelay: `${idx * 0.04}s` }}
                className="fade-up"
              >
                <button
                  style={styles.weekHeader}
                  onClick={() => setOpenWeekId(isOpen ? null : week._id)}
                >
                  <div style={styles.weekHeaderLeft}>
                    <span style={styles.weekNum} className="mono">WEEK {week.weekNumber}</span>
                    <span style={styles.weekDates}>
                      {formatDate(week.startsAt)} – {formatDate(week.endsAt)}
                    </span>
                  </div>
                  <div style={styles.weekHeaderRight}>
                    <span style={styles.tallyGreen} className="mono">{greenCount} AC</span>
                    <span style={styles.tallyRed} className="mono">{redCount} WA</span>
                    <span style={styles.chevron}>{isOpen ? '▾' : '▸'}</span>
                  </div>
                </button>

                {isOpen && (
                  <div style={styles.resultsTable} className="scale-in">
                    <div style={styles.resultsHeader}>
                      <span style={{ ...styles.col, width: '50px' }}>RANK</span>
                      <span style={{ ...styles.col, flex: 1 }}>HANDLE</span>
                      <span style={{ ...styles.col, width: '80px', textAlign: 'right' }} className="queue-col-points">POINTS</span>
                      <span style={{ ...styles.col, width: '60px', textAlign: 'right' }}>VERDICT</span>
                    </div>
                    {week.results.map((r) => (
                      <div key={r.userId} style={styles.resultRow} className="row-hover">
                        <span style={{ width: '50px' }} className="mono">
                          {MEDALS[r.rank] ? `${MEDALS[r.rank]} #${r.rank}` : `#${r.rank}`}
                        </span>
                        <span
                          style={styles.nameCell}
                          className="mono"
                          onClick={() => navigate(`/profile/${r.userId}`)}
                        >
                          {r.cfHandle || r.name}
                        </span>
                        <span style={{ width: '80px', textAlign: 'right' }} className="mono">{r.points}</span>
                        <span
                          style={{
                            width: '60px', textAlign: 'right',
                            color: r.outcome === 'green' ? 'var(--accent-green)' : r.outcome === 'red' ? 'var(--accent-red)' : 'var(--text-dim)'
                          }}
                          className="mono"
                        >
                          {OUTCOME_LABEL[r.outcome]}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}

function formatDate(d) {
  return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const styles = {
  page: { minHeight: '100vh' },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-4)',
    padding: 'var(--space-3) var(--space-5)',
    borderBottom: '1px solid var(--border)'
  },
  backBtn: { background: 'transparent', border: 'none', color: 'var(--text-dim)', fontSize: '13px', fontFamily: 'var(--font-mono)' },
  headerTitle: { fontSize: '12px', color: 'var(--accent-gold)', letterSpacing: '2px' },
  main: { maxWidth: '720px', margin: '0 auto', padding: 'var(--space-5) var(--space-4)' },
  error: { color: 'var(--accent-red)', marginBottom: 'var(--space-3)', fontFamily: 'var(--font-mono)', fontSize: '13px' },
  empty: { padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '13px' },
  weekCard: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    marginBottom: 'var(--space-3)',
    overflow: 'hidden',
    background: 'var(--surface)'
  },
  weekHeader: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 'var(--space-3) var(--space-4)',
    background: 'transparent',
    border: 'none',
    color: 'var(--text)',
    textAlign: 'left'
  },
  weekHeaderLeft: { display: 'flex', flexDirection: 'column', gap: '4px' },
  weekNum: { fontSize: '14px', fontWeight: 700, letterSpacing: '1px', color: 'var(--text)' },
  weekDates: { fontSize: '12px', color: 'var(--text-dim)' },
  weekHeaderRight: { display: 'flex', alignItems: 'center', gap: 'var(--space-3)' },
  tallyGreen: { fontSize: '12px', color: 'var(--accent-green)' },
  tallyRed: { fontSize: '12px', color: 'var(--accent-red)' },
  chevron: { color: 'var(--text-dim)', fontSize: '12px' },
  resultsTable: { borderTop: '1px solid var(--border)' },
  resultsHeader: {
    display: 'flex',
    padding: '8px 16px',
    background: 'var(--surface-raised)',
    borderBottom: '1px solid var(--border)'
  },
  col: { fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-dim)', letterSpacing: '1px' },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px'
  },
  nameCell: { flex: 1, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
};
