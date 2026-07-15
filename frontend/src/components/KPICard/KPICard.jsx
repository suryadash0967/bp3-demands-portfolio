export default function KPICard({ label, value, icon, iconBg, iconColor, trend, trendDir }) {
  return (
    <div className="kpi-card" role="article" aria-label={`${label}: ${value}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon" style={{ background: iconBg }} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8">
            {icon}
          </svg>
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-trend ${trendDir}`}>{trend}</div>
    </div>
  )
}
