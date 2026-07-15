import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899']

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="recharts-default-tooltip" style={{ padding: '8px 12px', backgroundColor: 'var(--bg)', borderRadius: 4  }}>
        <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{payload[0].name}</p>
        <p style={{ color: 'var(--muted)' }}>Count: <strong style={{ color: 'var(--text)' }}>{payload[0].value}</strong></p>
        <p style={{ color: 'var(--muted)' }}>Share: <strong style={{ color: 'var(--text)' }}>{payload[0].payload.percent}%</strong></p>
      </div>
    )
  }
  return null
}

export default function DemandTypePie({ data }) {
  if (!data || !data.length) return <div className="data-loading"><div className="spinner"/><p>No data</p></div>

  const total = data.reduce((s, d) => s + d.value, 0)
  const withPct = data.map(d => ({ ...d, percent: ((d.value / total) * 100).toFixed(1) }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={withPct} cx="50%" cy="50%" outerRadius={90}
          dataKey="value" nameKey="name" paddingAngle={2}>
          {withPct.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
