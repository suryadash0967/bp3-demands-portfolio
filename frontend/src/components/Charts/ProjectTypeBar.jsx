import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

const COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6']

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="recharts-default-tooltip"
        style={{ padding: '8px 12px', backgroundColor: 'var(--bg)', borderRadius: 4 }}
      >
        <p
          style={{
            fontWeight: 600,
            color: 'var(--text)',
            marginBottom: 2
          }}
        >
          {label}
        </p>
        <p style={{ color: 'var(--muted)' }}>
          Count:{' '}
          <strong style={{ color: 'var(--text)' }}>
            {payload[0].value}
          </strong>
        </p>
      </div>
    )
  }

  return null
}

export default function ProjectTypeBar({ data }) {
  if (!data || !data.length)
    return (
      <div className="data-loading">
        <div className="spinner" />
        <p>No data</p>
      </div>
    )

  const sorted = [...data].sort((a, b) => b.value - a.value)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 12, left: 35, bottom: 0 }}
        barSize={22}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#F3F4F6"
          horizontal={true}
          vertical={false}
        />

        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
        />

        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 12, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(0,0,0,0.04)' }}
        />

        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {sorted.map((_, i) => (
            <Cell
              key={i}
              fill={COLORS[i % COLORS.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}