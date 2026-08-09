import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';

const MODES = [
  { key: 'day', label: 'Pick a day' },
  { key: 'range', label: 'Past 7 days' }
];

export default function AnalyticsPage() {
  const [mode, setMode] = useState('range');
  const [days, setDays] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expiringToday, setExpiringToday] = useState(null);
  const user = getSessionUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    api.analyticsDays()
      .then(res => {
        setDays(res.days);
        setSelectedDay(res.days[res.days.length - 1]?.date || '');
      })
      .catch(err => setError(err.message));

    api.analyticsDeductions()
      .then(res => {
        const today = res.forecast?.[0];
        setExpiringToday(today ? today.pointsExpiring : 0);
      })
      .catch(() => setExpiringToday(null));
  }, []);

  useEffect(() => {
    if (!user) return;
    if (mode === 'day' && !selectedDay) return;
    load();
  }, [mode, selectedDay]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      if (mode === 'day') {
        const res = await api.analyticsForDay(selectedDay);
        setChartData(res.breakdown.map(b => ({ label: String(b.rating), value: b.count })));
      } else {
        const res = await api.analyticsRange();
        setChartData(res.breakdown.map(b => ({ label: String(b.rating), value: b.count })));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  const yLabel = 'Problems solved';
  const xLabel = 'Rating';

  return (
    <SidebarLayout active="analytics">
      <div style={styles.titleRow}>
        <div>
          <div style={styles.eyebrow}>YOUR ACTIVITY</div>
          <h1 style={styles.title}>Analytics</h1>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.tabRow}>
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{ ...styles.tab, ...(mode === m.key ? styles.tabActive : {}) }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === 'day' && (
          <select
            style={styles.select}
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
          >
            {days.map(d => (
              <option key={d.date} value={d.date}>{d.label}</option>
            ))}
          </select>
        )}

        {mode === 'range' && expiringToday !== null && (
          <div style={styles.expireBadge}>
            Points to expire today: <span style={styles.expireValue}>{expiringToday}</span>
          </div>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.chartCard}>
        {loading ? (
          <div style={styles.empty}>Loading…</div>
        ) : chartData.length === 0 || chartData.every(d => d.value === 0) ? (
          <div style={styles.empty}>Nothing solved in this window yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--text-dim)', fontSize: 12 }}
                label={{ value: xLabel, position: 'insideBottom', offset: -10, fill: 'var(--text-dim)', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: 'var(--text-dim)', fontSize: 12 }}
                label={{ value: yLabel, angle: -90, position: 'insideLeft', fill: 'var(--text-dim)', fontSize: 12 }}
                allowDecimals={false}
              />

              <Tooltip
                cursor={{ fill: 'var(--surface-raised)', opacity: 0.5 }}
                contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                formatter={(value) => [value, yLabel]}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill="var(--accent-green)" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </SidebarLayout>
  );
}

const styles = {
  titleRow: { marginBottom: 'var(--space-3)' },
  eyebrow: {
    fontFamily: "'Orbitron', sans-serif", fontSize: '11px', letterSpacing: '2px',
    color: 'var(--text-dim)', marginBottom: 'var(--space-1)', userSelect: 'none'
  },
  title: {
    fontFamily: "'Orbitron', sans-serif", fontSize: '32px', fontWeight: 700, margin: 0,
    letterSpacing: '1px'
  },
  controls: {
    display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)',
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)'
  },
  tabRow: { display: 'flex', gap: 'var(--space-1)', background: 'var(--surface)', padding: '4px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' },
  tab: {
    background: 'transparent', border: 'none', color: 'var(--text-dim)',
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px',
    padding: '8px 14px', borderRadius: 'var(--radius-sm)', userSelect: 'none'
  },
  tabActive: { background: 'var(--surface-raised)', color: 'var(--text)' },
  select: {
    background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: '13px', fontFamily: 'var(--font-mono)'
  },
  expireBadge: {
    fontFamily: "'Orbitron', sans-serif",
    fontSize: '13px',
    color: 'var(--text-dim)',
    letterSpacing: '0.5px',
    background: 'var(--accent-red-dim)',
    border: '1px solid var(--accent-red)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 14px',
    userSelect: 'none'
  },
  expireValue: {
    color: 'var(--accent-red)',
    fontWeight: 700
  },
  hint: { color: 'var(--text-dim)', fontSize: '13px', marginBottom: 'var(--space-3)' },
  error: {
    color: 'var(--accent-red)', background: 'var(--accent-red-dim)',
    padding: 'var(--space-3)', borderRadius: 'var(--radius)', marginBottom: 'var(--space-3)'
  },
  chartCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 'var(--space-4)'
  },
  empty: { color: 'var(--text-dim)', textAlign: 'center', padding: 'var(--space-5) 0' }
};