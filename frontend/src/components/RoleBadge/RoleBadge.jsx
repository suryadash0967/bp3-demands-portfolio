/**
 * RoleBadge — displays a styled pill showing the user's role label.
 * Used in the Dashboard top bar.
 */
const ROLE_CONFIG = {
  member: {
    label: 'Member',
    bg: 'rgba(99,102,241,0.15)',
    color: '#818cf8',
    border: 'rgba(99,102,241,0.3)',
  },
  department_head: {
    label: 'Dept Head',
    bg: 'rgba(16,185,129,0.15)',
    color: '#34d399',
    border: 'rgba(16,185,129,0.3)',
  },
  division_head: {
    label: 'Division Head',
    bg: 'rgba(245,158,11,0.15)',
    color: '#fbbf24',
    border: 'rgba(245,158,11,0.3)',
  },
}

export default function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.member
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.03em',
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        userSelect: 'none',
      }}
    >
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: cfg.color, flexShrink: 0,
      }} />
      {cfg.label}
    </span>
  )
}
