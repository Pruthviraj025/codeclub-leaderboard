import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';

const DIVISION_ORDER = ['Div. 1', 'Div. 2', 'Div. 3', 'Div. 4', 'Div. 1 + 2', 'Educational', 'Global', 'Other'];

export default function ContestsPage() {
  const [grouped, setGrouped] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    api.contests()
      .then(res => setGrouped(res.grouped))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  const divisions = grouped ? DIVISION_ORDER.filter(d => grouped[d]?.length) : [];

  return (
    <SidebarLayout active="contests">
      <div style={styles.titleRow}>
        <div>
          <div style={styles.eyebrow}>CODEFORCES · ALL DIVISIONS</div>
          <h1 style={styles.title}>Contests</h1>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {loading && <div style={styles.empty}>Loading contests…</div>}

      {!loading && divisions.map(div => (
        <section key={div} style={styles.section}>
          <div style={styles.sectionTitle}>{div}</div>
          <div style={styles.grid}>
            {grouped[div].map(c => (
              <a
                key={c.id}
                href={c.url}
                target="_blank"
                rel="noreferrer"
                style={styles.card}
                className="row-hover"
              >
                <div style={styles.cardTop}>
                  <span style={{ ...styles.phaseBadge, ...phaseStyle(c.phase) }}>
                    {phaseLabel(c.phase)}
                  </span>
                  <ExternalLink size={13} color="var(--text-dim)" />
                </div>
                <div style={styles.cardName}>{c.name}</div>
                <div style={styles.cardMeta} className="mono">
                  {c.startTimeSeconds
                    ? new Date(c.startTimeSeconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'TBA'}
                </div>
              </a>
            ))}
          </div>
        </section>
      ))}

      {!loading && divisions.length === 0 && !error && (
        <div style={styles.empty}>No contests found right now.</div>
      )}
    </SidebarLayout>
  );
}

function phaseLabel(phase) {
  if (phase === 'BEFORE') return 'UPCOMING';
  if (phase === 'CODING') return 'LIVE';
  return 'FINISHED';
}
function phaseStyle(phase) {
  if (phase === 'BEFORE') return { background: 'var(--accent-gold-dim)', color: 'var(--accent-gold)' };
  if (phase === 'CODING') return { background: 'var(--accent-green-dim)', color: 'var(--accent-green)' };
  return { background: 'var(--border)', color: 'var(--text-dim)' };
}

const styles = {
  titleRow: { marginBottom: 'var(--space-4)' },
  eyebrow: {
    fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em',
    color: 'var(--text-dim)', marginBottom: 'var(--space-1)'
  },
  title: { fontSize: '32px', fontWeight: 700, margin: 0 },
  error: {
    color: 'var(--accent-red)', background: 'var(--accent-red-dim)',
    padding: 'var(--space-3)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-3)'
  },
  empty: { color: 'var(--text-dim)', padding: 'var(--space-4) 0' },
  section: { marginBottom: 'var(--space-5)' },
  sectionTitle: {
    fontSize: '13px', fontWeight: 700, letterSpacing: '0.04em',
    color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 'var(--space-2)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 'var(--space-2)'
  },
  card: {
    display: 'block',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: 'var(--space-3)'
  },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' },
  phaseBadge: {
    fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
    padding: '3px 8px', borderRadius: '999px'
  },
  cardName: { fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--space-1)' },
  cardMeta: { fontSize: '12px', color: 'var(--text-dim)' }
};
