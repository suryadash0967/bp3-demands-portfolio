import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#6B7280']

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload
    return (
      <div className="recharts-default-tooltip" style={{ padding: '8px 12px', backgroundColor: 'var(--bg)', borderRadius: 4 }}>
        <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{d.name}</p>
        <p style={{ color: 'var(--muted)' }}>Count: <strong style={{ color: 'var(--text)' }}>{d.value}</strong></p>
        <p style={{ color: 'var(--muted)' }}>Share: <strong style={{ color: 'var(--text)' }}>{d.percent}%</strong></p>
      </div>
    )
  }
  return null
}

export default function MigrationPie({ data }) {
  if (!data || !data.length) return <div className="data-loading"><div className="spinner" /><p>No data</p></div>
  const total = data.reduce((s, d) => s + d.value, 0)
  const withPct = data.map(d => ({ ...d, percent: ((d.value / total) * 100).toFixed(1) }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={withPct}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          dataKey="value"
          nameKey="name"
          paddingAngle={3}
        >
          {withPct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
