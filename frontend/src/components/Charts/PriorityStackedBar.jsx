import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'

const PRIORITY_COLORS = {
  Critical: '#EF4444',
  High: '#F59E0B',
  Medium: '#3B82F6',
  Low: '#10B981',
}
const PRIORITY_ORDER = ['Critical', 'High', 'Medium', 'Low']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="recharts-default-tooltip" style={{ padding: '8px 12px', backgroundColor: 'var(--bg)', borderRadius: 4 }}>
        <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{label}</p>
        {payload.map(p => (
          <p key={p.dataKey} style={{ color: 'var(--muted)', marginBottom: 2 }}>
            {p.dataKey}: <strong style={{ color: p.fill }}>{p.value}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function PriorityStackedBar({ data, priorities }) {
  if (!data || !data.length) return <div className="data-loading"><div className="spinner" /><p>No data</p></div>

  // Use provided priority keys or fall back to discovered ones
  const keys = priorities && priorities.length ? priorities : PRIORITY_ORDER.filter(p =>
    data.some(row => row[p] !== undefined)
  )

  // Fallback: if no known priorities found, use all numeric keys except 'name'
  const bars = keys.length
    ? keys
    : Object.keys(data[0] || {}).filter(k => k !== 'name')

  const dynamicHeight = Math.max(300, data.length * 32 + 60)

  return (
    <ResponsiveContainer width="100%" height={dynamicHeight}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 12, bottom: 0 }}
        barSize={14}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }} />
        {bars.map(p => (
          <Bar
            key={p}
            dataKey={p}
            stackId="stack"
            fill={PRIORITY_COLORS[p] || '#8B5CF6'}
            radius={bars[bars.length - 1] === p ? [0, 4, 4, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
