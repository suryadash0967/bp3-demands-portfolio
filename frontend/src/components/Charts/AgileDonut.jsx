import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#10B981', '#6B7280']

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

/**
 * AgileDonut — classifies values into Agile / Non Agile.
 * Truthy values for "agile": yes, y, true, agile, 1
 */
export default function AgileDonut({ data }) {
  if (!data || !data.length) return <div className="data-loading"><div className="spinner" /><p>No data</p></div>

  const agileValues = new Set(['yes', 'y', 'true', 'agile', '1'])
  let agile = 0, nonAgile = 0
  data.forEach(row => {
    const v = row.name ? String(row.name).trim().toLowerCase() : ''
    if (agileValues.has(v)) agile += row.value
    else nonAgile += row.value
  })

  const total = agile + nonAgile
  const chartData = [
    { name: 'Agile', value: agile, percent: ((agile / total) * 100).toFixed(1) },
    { name: 'Non Agile', value: nonAgile, percent: ((nonAgile / total) * 100).toFixed(1) },
  ].filter(d => d.value > 0)

  if (!chartData.length) return <div className="data-loading"><div className="spinner" /><p>No data</p></div>

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          dataKey="value"
          nameKey="name"
          paddingAngle={3}
        >
          {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '0.78rem', paddingTop: '8px' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
