import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sparkles, AlertCircle } from 'lucide-react';
import { api, getSessionUser } from '../api';
import SidebarLayout from '../components/SidebarLayout';

const MODES = [
  { key: 'range', label: 'Past 7 days' },
  { key: 'day', label: 'Pick a day' }
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
      <div style={styles.container}>
        <div style={styles.titleRow}>
          <div>
            <div style={styles.eyebrow}>
              <Sparkles size={13} style={{ marginRight: '6px', color: '#5EEAD4' }} />
              YOUR ACTIVITY
            </div>
            <h1 style={styles.title}>Analytics &amp; Insights</h1>
            <p style={styles.subtitle}>
              Track your problem-solving frequency, distribution across difficulty ratings, and expiring points.
            </p>
          </div>
        </div>

        <div style={styles.controls} className="mobile-stack">
          <div style={styles.tabRow} className="mobile-full-width analytics-tabs-row">
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
              className="mobile-full-width"
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
            >
              {days.map(d => (
                <option key={d.date} value={d.date}>{d.label}</option>
              ))}
            </select>
          )}

          {mode === 'range' && expiringToday !== null && (
            <div style={styles.expireBadge} className="mobile-full-width">
              <AlertCircle size={14} color="#F87171" />
              Points to expire today: <span style={styles.expireValue}>{expiringToday}</span>
            </div>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.chartCard} className="analytics-chart-card">
          <div style={styles.chartHeader}>
            <div style={styles.chartTitle}>Difficulty Breakdown</div>
            <div style={styles.chartSubtitle}>Solved problems grouped by Codeforces rating bracket</div>
          </div>

          {loading ? (
            <div style={styles.empty}>Loading analytics…</div>
          ) : chartData.length === 0 || chartData.every(d => d.value === 0) ? (
            <div style={styles.empty}>Nothing solved in this window yet.</div>
          ) : (
            <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={chartData} margin={{ top: 20, right: 15, left: -10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: 'rgba(255, 255, 255, 0.65)', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}
                    stroke="rgba(255, 255, 255, 0.15)"
                    label={{ value: xLabel, position: 'insideBottom', offset: -14, fill: 'rgba(255, 255, 255, 0.55)', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}
                  />
                  <YAxis
                    tick={{ fill: 'rgba(255, 255, 255, 0.65)', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}
                    stroke="rgba(255, 255, 255, 0.15)"
                    label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: 15, fill: 'rgba(255, 255, 255, 0.55)', fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}
                    allowDecimals={false}
                  />

                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    contentStyle={{
                      background: 'rgba(12, 16, 23, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.14)',
                      borderRadius: 10,
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontFamily: "'Space Grotesk', sans-serif",
                      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.7)'
                    }}
                    formatter={(value) => [value, yLabel]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="#5EEAD4" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

const styles = {
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
    paddingBottom: '40px'
  },
  titleRow: { marginBottom: '26px' },
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
    margin: 0,
    letterSpacing: '-0.3px',
    color: '#FFFFFF',
    textShadow: '0 0 24px rgba(255, 255, 255, 0.12)'
  },
  subtitle: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: '14px',
    lineHeight: '1.5',
    margin: '8px 0 0 0',
    maxWidth: '650px'
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '14px',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px'
  },
  tabRow: {
    display: 'flex',
    gap: '4px',
    background: 'rgba(10, 13, 19, 0.72)',
    padding: '5px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  },
  tab: {
    background: 'transparent',
    border: '1px solid transparent',
    color: 'rgba(255, 255, 255, 0.65)',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.2px',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  tabActive: {
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    color: '#FFFFFF',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
  },
  select: {
    background: 'rgba(10, 13, 19, 0.72)',
    color: '#FFFFFF',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '9px 14px',
    fontSize: '13px',
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    outline: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
  },
  expireBadge: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.8)',
    background: 'rgba(248, 113, 113, 0.1)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: '10px',
    padding: '9px 16px',
    userSelect: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px'
  },
  expireValue: {
    color: '#F87171',
    fontWeight: 700,
    fontSize: '14px'
  },
  error: {
    color: 'var(--accent-red)',
    background: 'var(--accent-red-dim)',
    padding: '14px',
    borderRadius: 'var(--radius)',
    marginBottom: '20px',
    fontFamily: "'Space Grotesk', sans-serif"
  },
  chartCard: {
    background: 'rgba(10, 13, 19, 0.72)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '24px 28px',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 24px 60px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.09)'
  },
  chartHeader: {
    marginBottom: '20px'
  },
  chartTitle: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '16px',
    fontWeight: 700,
    color: '#FFFFFF',
    letterSpacing: '0.2px',
    margin: '0 0 4px 0'
  },
  chartSubtitle: {
    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.55)',
    margin: 0
  },
  empty: {
    color: 'rgba(255, 255, 255, 0.55)',
    textAlign: 'center',
    padding: '60px 0',
    fontFamily: "'Space Grotesk', sans-serif",
    fontSize: '14px'
  }
};