import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import Sidebar from '../components/Sidebar/Sidebar'
import { useAuth } from '../hooks/useAuth'
import RoleBadge from '../components/RoleBadge/RoleBadge'
import './Forecast.css'

const METRICS = [
  { value: 'overall', label: 'Overall Demand' },
  { value: 'application', label: 'By Application' },
  { value: 'department', label: 'By Department' },
  { value: 'priority', label: 'By Priority' },
  { value: 'project_type', label: 'By Project Type' },
  { value: 'work_area', label: 'By Work Area' },
  { value: 'vertical', label: 'By Vertical' },
  { value: 'pm_department', label: 'By PM Department' },
]

function formatDate() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

// ── Custom Recharts Tooltip ──────────────────────────────────────────────────
const ForecastTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div
      className="recharts-default-tooltip"
      style={{ padding: '8px 12px', backgroundColor: 'var(--bg, #F7F9FC)', borderRadius: 4 }}
    >
      <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: 'var(--muted)', marginBottom: 2 }}>
          {p.name}:{' '}
          <strong style={{ color: p.stroke || p.fill }}>
            {p.value !== null && p.value !== undefined ? Math.round(p.value) : '—'}
          </strong>
        </p>
      ))}
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function ForecastKPI({ label, value, sub, valueClass }) {
  return (
    <div className="forecast-kpi-card">
      <div className="forecast-kpi-label">{label}</div>
      <div className={`forecast-kpi-value ${valueClass || ''}`}>{value}</div>
      {sub && <div className="forecast-kpi-sub">{sub}</div>}
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="forecast-state">
      <div className="forecast-state-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
      </div>
      <div className="forecast-state-title">No Forecast Generated</div>
      <div className="forecast-state-sub">
        Select a metric, optionally enter a category, set the forecast horizon, and click
        <strong> Run Forecast</strong>.
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function Forecast() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Controls state
  const [metric, setMetric] = useState('overall')
  const [category, setCategory] = useState('')
  const [months, setMonths] = useState(6)

  // Result state
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  const runForecast = useCallback(async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          metric,
          category: category.trim() || null,
          months: Number(months),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Forecast failed.')
      setResult(data)
    } catch (err) {
      setError(err.message || 'Could not reach the AI service.')
    } finally {
      setLoading(false)
    }
  }, [metric, category, months])

  // Merge historical + forecast for chart
  const chartData = result
    ? [
      ...result.historical.map(p => ({
        name: p.label,
        Actual: p.actual,
        Forecast: p.yhat ?? null,
        Lower: p.yhat_lower ?? null,
        Upper: p.yhat_upper ?? null,
        type: 'historical',
      })),
      ...result.forecast.map(p => ({
        name: p.label,
        Actual: null,
        Forecast: p.yhat,
        Lower: p.yhat_lower,
        Upper: p.yhat_upper,
        type: 'forecast',
      })),
    ]
    : []

  // Date of last historical point (for reference line)
  const lastHistoricalLabel = result?.historical?.at(-1)?.label ?? null

  const needsCategory = metric !== 'overall'
  const trendClass = result
    ? result.trend === 'increasing'
      ? 'trend-increasing'
      : result.trend === 'decreasing'
        ? 'trend-decreasing'
        : 'trend-stable'
    : ''

  const metricLabel = METRICS.find(m => m.value === metric)?.label ?? metric

  return (
    <div className="forecast-page">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(v => !v)}
        mobileOpen={mobileOpen}
      />

      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 150 }}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={`forecast-main${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        {/* ── Top bar (same structure as dashboard) ── */}
        <header className="dash-topbar">
          <div className="dash-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(v => !v)} aria-label="Open sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2>Demand Forecasting</h2>
              <p>{formatDate()}</p>
            </div>
          </div>
          <div className="dash-topbar-right">
            {user && <RoleBadge role={user.role} />}
            <div className="dash-topbar-avatar" role="img" aria-label={`Avatar for ${user?.name}`} title={user?.name}>
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <button id="forecast-logout-btn" className="dash-logout-btn" onClick={handleLogout} title="Sign out">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}>
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="forecast-content" id="forecast-content">

          {/* ── Controls ── */}
          <p className="forecast-section-title">Forecast Configuration</p>
          <div className="forecast-controls-card">
            <div className="forecast-controls-grid">
              {/* Metric */}
              <div className="forecast-field">
                <label className="forecast-label" htmlFor="fc-metric">Metric</label>
                <select
                  id="fc-metric"
                  className="forecast-select"
                  value={metric}
                  onChange={e => { setMetric(e.target.value); setCategory('') }}
                >
                  {METRICS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div className="forecast-field">
                <label className="forecast-label" htmlFor="fc-category">
                  Category {!needsCategory && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(not required for Overall)</span>}
                </label>
                <input
                  id="fc-category"
                  className="forecast-input"
                  type="text"
                  placeholder={needsCategory ? 'e.g. SAP, Finance, High…' : 'Not required'}
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  disabled={!needsCategory}
                />
              </div>

              {/* Months */}
              <div className="forecast-field">
                <label className="forecast-label" htmlFor="fc-months">
                  Forecast Horizon: <strong style={{ color: 'var(--text)' }}>{months} month{months !== 1 ? 's' : ''}</strong>
                </label>
                <input
                  id="fc-months"
                  type="range"
                  min={1}
                  max={12}
                  value={months}
                  onChange={e => setMonths(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#3B82F6', marginTop: 10 }}
                />
                <div className="forecast-month-display">
                  1 month &nbsp;·&nbsp; 6 months &nbsp;·&nbsp; 12 months
                </div>
              </div>

              {/* Run button */}
              <div className="forecast-field">
                <label className="forecast-label" style={{ visibility: 'hidden' }}>Run</label>
                <button
                  id="forecast-run-btn"
                  className="forecast-run-btn"
                  onClick={runForecast}
                  disabled={loading || (needsCategory && !category.trim())}
                >
                  {loading
                    ? <><div className="forecast-run-spinner" /> Forecasting…</>
                    : <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={15} height={15}>
                        <path d="M3 3v18h18" />
                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
                      </svg>
                      Run Forecast
                    </>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* ── Results ── */}
          {!result && !loading && !error && <EmptyState />}

          {loading && (
            <div className="forecast-state">
              <div className="forecast-spinner" />
              <div className="forecast-state-title">Generating Forecast…</div>
              <div className="forecast-state-sub">Running Prophet model on your demand data.</div>
            </div>
          )}

          {error && (
            <div className="forecast-error-card" role="alert">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18} style={{ flexShrink: 0 }}>
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div>
                <strong>Forecast Error</strong>
                <div style={{ marginTop: 2 }}>{error}</div>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Error from API (insufficient data etc.) */}
              {result.error && (
                <div className="forecast-error-card" role="alert" style={{ marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18} style={{ flexShrink: 0 }}>
                    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <div>
                    <strong>Note</strong>
                    <div style={{ marginTop: 2 }}>{result.error}</div>
                  </div>
                </div>
              )}

              {/* KPI cards */}
              {!result.error && (
                <>
                  <p className="forecast-section-title">Forecast Summary</p>
                  <div className="forecast-kpi-grid">
                    <ForecastKPI
                      label="Trend"
                      value={result.trend ? result.trend.charAt(0).toUpperCase() + result.trend.slice(1) : '—'}
                      sub={`${metricLabel}${result.category ? ` · ${result.category}` : ''}`}
                      valueClass={trendClass}
                    />
                    <ForecastKPI
                      label="Peak Month"
                      value={result.peak_month || '—'}
                      sub="Highest predicted demand"
                    />
                    <ForecastKPI
                      label="Projected Change"
                      value={
                        result.growth_pct != null
                          ? `${result.growth_pct >= 0 ? '+' : ''}${result.growth_pct}%`
                          : '—'
                      }
                      sub={`Compared to current demand over the next ${result.months_ahead} month(s)`}
                      valueClass="trend-increasing"
                    />
                    <div className="forecast-kpi-card">
                      <div className="forecast-kpi-label">Confidence</div>
                      <div className="forecast-kpi-value">
                        <span className={`confidence-badge ${result.confidence || 'low'}`}>
                          {result.confidence || 'low'}
                        </span>
                      </div>
                      <div className="forecast-kpi-sub">
                        Based on {result.historical.length} months of data
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Chart */}
              {chartData.length > 0 && (
                <>
                  <p className="forecast-section-title">Forecast Chart</p>
                  <div className="forecast-chart-card">
                    <div className="forecast-chart-header">
                      <div>
                        <div className="forecast-chart-title">
                          {metricLabel}{result.category ? ` — ${result.category}` : ''}
                        </div>
                        <div className="forecast-chart-subtitle">
                          Historical demand vs. {result.months_ahead}-month Prophet forecast with 80% confidence interval
                        </div>
                      </div>
                      <div className="forecast-legend">
                        <div className="forecast-legend-item">
                          <div className="forecast-legend-dot" style={{ background: '#3B82F6' }} />
                          Actual
                        </div>
                        <div className="forecast-legend-item">
                          <div className="forecast-legend-dot" style={{ background: '#10B981' }} />
                          Forecast
                        </div>
                        <div className="forecast-legend-item">
                          <div className="forecast-legend-dot" style={{ background: '#D1FAE5', border: '1px dashed #10B981' }} />
                          80% Confidence
                        </div>
                      </div>
                    </div>

                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart
                        data={chartData}
                        margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10B981" stopOpacity={0.08} />
                            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />

                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: 'var(--muted, #6B7280)' }}
                          axisLine={false}
                          tickLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: 'var(--muted, #6B7280)' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />

                        <Tooltip content={<ForecastTooltip />} />

                        {/* Confidence band (lower) */}
                        <Area
                          type="monotone"
                          dataKey="Lower"
                          stroke="none"
                          fill="url(#ciGrad)"
                          dot={false}
                          activeDot={false}
                          name="Lower Bound"
                          connectNulls
                        />

                        {/* Confidence band (upper) */}
                        <Area
                          type="monotone"
                          dataKey="Upper"
                          stroke="#10B981"
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          fill="url(#ciGrad)"
                          dot={false}
                          activeDot={false}
                          name="Upper Bound"
                          connectNulls
                        />

                        {/* Forecast line */}
                        <Area
                          type="monotone"
                          dataKey="Forecast"
                          stroke="#10B981"
                          strokeWidth={2}
                          strokeDasharray="6 3"
                          fill="url(#forecastGrad)"
                          dot={{ r: 3, fill: '#10B981', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                          name="Forecast"
                          connectNulls
                        />

                        {/* Actual line */}
                        <Area
                          type="monotone"
                          dataKey="Actual"
                          stroke="#3B82F6"
                          strokeWidth={2}
                          fill="url(#actualGrad)"
                          dot={{ r: 3, fill: '#3B82F6', strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: '#3B82F6', stroke: '#fff', strokeWidth: 2 }}
                          name="Actual"
                        />

                        {/* Reference line between history and forecast */}
                        {lastHistoricalLabel && (
                          <ReferenceLine
                            x={lastHistoricalLabel}
                            stroke="#9CA3AF"
                            strokeDasharray="4 3"
                            label={{
                              value: 'Forecast →',
                              position: 'insideTopRight',
                              fontSize: 10,
                              fill: '#9CA3AF',
                            }}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
