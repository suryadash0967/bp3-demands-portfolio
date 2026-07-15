import { FunnelChart, Funnel, Tooltip, LabelList, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#1F4E79', '#2563A8', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4']

const FUNNEL_ORDER = [
  'submitted', 'under review', 'review', 'approved', 'in progress',
  'development', 'testing', 'uat', 'completed', 'closed',
  'on hold', 'cancelled', 'rejected'
]

function sortFunnel(data) {
  return [...data].sort((a, b) => {
    const ai = FUNNEL_ORDER.indexOf(a.name.toLowerCase())
    const bi = FUNNEL_ORDER.indexOf(b.name.toLowerCase())
    if (ai !== -1 && bi !== -1) return ai - bi
    if (ai !== -1) return -1
    if (bi !== -1) return 1
    return b.value - a.value
  })
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="recharts-default-tooltip" style={{ padding: '8px 12px', backgroundColor: 'var(--bg)', borderRadius: 4 }}>
        <p style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{payload[0].payload.name}</p>
        <p style={{ color: 'var(--muted)' }}>Count: <strong style={{ color: 'var(--text)' }}>{payload[0].value}</strong></p>
      </div>
    )
  }
  return null
}

export default function DemandFunnel({ data }) {
  if (!data || !data.length) return <div className="data-loading"><div className="spinner" /><p>No data</p></div>

  const sorted = sortFunnel(data)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <FunnelChart margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
        <Tooltip content={<CustomTooltip />} />
        <Funnel dataKey="value" data={sorted} isAnimationActive>
          {sorted.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
          {/* <LabelList
            dataKey="name"
            position="center"
            style={{ fontSize: '0.72rem', fontWeight: "normal" }}
          /> */}
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  )
}
