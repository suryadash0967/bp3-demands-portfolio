import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar/Sidebar'
import KPICard from '../components/KPICard/KPICard'

// ── Existing charts (kept) ──────────────────────────────────────────
import DemandStatusPie from '../components/Charts/DemandStatusPie'
import PriorityBar from '../components/Charts/PriorityBar'
import ProjectTypeBar from '../components/Charts/ProjectTypeBar'
import TopApplicationsBar from '../components/Charts/TopApplicationsBar'
import DemandTypePie from '../components/Charts/DemandTypePie'

// ── New charts ──────────────────────────────────────────────────────
import DemandFunnel from '../components/Charts/DemandFunnel'
import MonthlyDemandComparison from '../components/Charts/MonthlyDemandComparison'
import RequestorVerticalBar from '../components/Charts/RequestorVerticalBar'
import WorkAreaPie from '../components/Charts/WorkAreaPie'
import ProjectStatusBar from '../components/Charts/ProjectStatusBar'
import ImpactPie from '../components/Charts/ImpactPie'
import AgileDonut from '../components/Charts/AgileDonut'
import MigrationPie from '../components/Charts/MigrationPie'
import ProgramsProjectsBar from '../components/Charts/ProgramsProjectsBar'
import PriorityStackedBar from '../components/Charts/PriorityStackedBar'
import DepartmentBar from '../components/Charts/DepartmentBar'
import PMDepartmentBar from '../components/Charts/PMDepartmentBar'

import { useExcelData } from '../hooks/useExcelData'
import {
  groupByKey,
  groupByMonth,
  groupByKeyFiltered,
  groupByMonthDouble,
  priorityByApplication,
  topN,
  countWhere,
} from '../utils/dataUtils'
import { useAuth } from '../hooks/useAuth'
import RoleBadge from '../components/RoleBadge/RoleBadge'

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

/** Small helper: render a standard chart card */
function ChartCard({ title, subtitle, children, full = false }) {
  return (
    <div className={`chart-card${full ? ' full' : ''}`}>
      <div className="chart-header">
        <div className="chart-title">{title}</div>
        {subtitle && <div className="chart-subtitle">{subtitle}</div>}
      </div>
      <div className="chart-inner">{children}</div>
    </div>
  )
}

export default function Dashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data, loading, error } = useExcelData()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [teamUsers, setTeamUsers] = useState([])
  const canViewUsers = user?.role === 'department_head' || user?.role === 'division_head'
  const canExport = user?.role === 'division_head'

  // Fetch user list for dept_head / division_head
  useEffect(() => {
    if (!canViewUsers) return
    fetch('/api/users', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { users: [] })
      .then(d => setTeamUsers(d.users ?? []))
      .catch(() => { })
  }, [canViewUsers])

  const handleLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  // ── Aggregations ───────────────────────────────────────────────────────────
  const statusData      = useMemo(() => topN(data, 'Demand Status', 10), [data])
  const priorityData    = useMemo(() => groupByKey(data, 'Demand Priority'), [data])
  const projectTypeData = useMemo(() => groupByKey(data, 'Project Type'), [data])
  const topAppsData     = useMemo(() => topN(data, 'Application', 5), [data])
  const typeData        = useMemo(() => groupByKey(data, 'Demand Type'), [data])
  const monthlyComparisonData  = useMemo(() => groupByMonthDouble(data, 'Demand Request Date', 'Demand Status', ['approved']), [data])
  const requestorVerticalData  = useMemo(() => groupByKeyFiltered(data, 'Requestor Vertical'), [data])
  const workAreaData           = useMemo(() => groupByKeyFiltered(data, 'Work Area'), [data])
  const projectStatusData      = useMemo(() => groupByKeyFiltered(data, 'Project Status'), [data])
  const impactData             = useMemo(() => groupByKeyFiltered(data, 'Impact'), [data])
  const agileData              = useMemo(() => groupByKeyFiltered(data, 'Is Agile'), [data])
  const migrationData          = useMemo(() => groupByKeyFiltered(data, 'Is Migrated'), [data])
  const programsProjectsData   = useMemo(() => groupByKeyFiltered(data, 'Project Type'), [data])
  const priorityByAppData      = useMemo(() => priorityByApplication(data, 'Application', 'Demand Priority'), [data])
  const departmentData         = useMemo(() => topN(data, 'Requestor Department', 10), [data])
  const pmDepartmentData       = useMemo(() => groupByKeyFiltered(data, 'PM Department'), [data])

  // Discover priority keys present in the stacked bar data
  const priorityKeys = useMemo(() => {
    const order = ['Critical', 'High', 'Medium', 'Low']
    const present = new Set()
    priorityByAppData.forEach(row => {
      Object.keys(row).forEach(k => { if (k !== 'name') present.add(k) })
    })
    const ordered = order.filter(p => present.has(p))
    present.forEach(p => { if (!ordered.includes(p)) ordered.push(p) })
    return ordered
  }, [priorityByAppData])

  // ── KPI cards ────────────────────────────────────────────────────
  const total = data.length

  const highPriority = useMemo(
    () => countWhere(data, r => String(r['Demand Priority']).trim().toLowerCase() === 'high'),
    [data]
  )
  const applications = useMemo(
    () => new Set(data.map(r => r['Application']).filter(Boolean)).size,
    [data]
  )
  const projectTypes = useMemo(
    () => new Set(data.map(r => r['Project Type']).filter(Boolean)).size,
    [data]
  )

  const kpiCards = [
    {
      label: 'Total Demands',
      value: loading ? '—' : total,
      iconBg: '#EEF4FF',
      iconColor: '#3B82F6',
      trendDir: 'up',
      trend: 'All recorded demands',
      icon: (
        <>
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </>
      ),
    },
    {
      label: 'High Priority',
      value: loading ? '—' : highPriority,
      iconBg: '#FEF2F2',
      iconColor: '#EF4444',
      trendDir: 'down',
      trend: 'Requires immediate attention',
      icon: (
        <>
          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </>
      ),
    },
    {
      label: 'Applications',
      value: loading ? '—' : applications,
      iconBg: '#F0FDF4',
      iconColor: '#10B981',
      trendDir: 'up',
      trend: 'Business applications supported',
      icon: (
        <>
          <rect x="4" y="5" width="16" height="14" rx="2" />
          <path d="M8 9h8M8 13h5" />
        </>
      ),
    },
    {
      label: 'Project Types',
      value: loading ? '—' : projectTypes,
      iconBg: '#FFF7ED',
      iconColor: '#F59E0B',
      trendDir: 'up',
      trend: 'Distinct project categories',
      icon: (
        <>
          <path d="M3 7h5l2 2h11v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
        </>
      ),
    },
  ]

  return (
    <div className="dashboard-layout">
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

      <div className={`dashboard-main${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
        {/* ── Top bar ─────────────────────────────────────────────── */}
        <header className="dash-topbar">
          <div className="dash-topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="mobile-menu-btn" onClick={() => setMobileOpen(v => !v)} aria-label="Open sidebar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2>Analytics Dashboard</h2>
              <p>{formatDate()}</p>
            </div>
          </div>
          <div className="dash-topbar-right">
            {error && (
              <span style={{ fontSize: '0.75rem', color: '#F59E0B', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '4px 10px' }}>
                ⚠ Using sample data
              </span>
            )}
            {canExport && (
              <button
                id="dashboard-export-btn"
                className="dash-export-btn"
                title="Export data (Division Head only)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={14} height={14}>
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export
              </button>
            )}
            {user && <RoleBadge role={user.role} />}
            <div
              className="dash-topbar-avatar"
              role="img"
              aria-label={`Avatar for ${user?.name}`}
              title={user?.name}
            >
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <button
              id="dashboard-logout-btn"
              className="dash-logout-btn"
              onClick={handleLogout}
              title="Sign out"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}>
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </header>

        {/* ── Main content ─────────────────────────────────────────── */}
        <main className="dash-content" id="dashboard-content">
          {loading ? (
            <div className="data-loading" style={{ minHeight: 300 }}>
              <div className="spinner" />
              <p>Loading dashboard data…</p>
            </div>
          ) : (
            <>
              <p className="dash-section-title">Key Performance Indicators</p>
              <div className="kpi-grid" role="list">
                {kpiCards.map(k => <KPICard key={k.label} {...k} />)}
              </div>
              <p className="dash-section-title">Demand Overview</p>
              <div className="charts-grid">
                <ChartCard
                  title="Work Area Distribution"
                  subtitle="Demands distributed across work areas"
                >
                  <WorkAreaPie data={workAreaData} />
                </ChartCard>

                <ChartCard
                  title="Project Status Distribution"
                  subtitle="Breakdown by current project status"
                >
                  <ProjectStatusBar data={projectStatusData} />
                </ChartCard>
              </div>
              
              <div className="charts-grid">
                <ChartCard
                  title="Priority Distribution"
                  subtitle="Demands grouped by priority level"
                >
                  <PriorityBar data={priorityData} />
                </ChartCard>

                <ChartCard
                  title="Top 10 Requestor Department Distribution"
                  subtitle="Departments raising the most demands"
                >
                  <DepartmentBar data={departmentData} />
                </ChartCard>

              </div>

              {/* ═══════════════════════════════════════════════════
                  Project Type + Demand Type
              ═══════════════════════════════════════════════════ */}
              <div className="charts-grid">
                <ChartCard
                  title="Project Type Distribution"
                  subtitle="Breakdown of projects by project type"
                >
                  <ProjectTypeBar data={projectTypeData} />
                </ChartCard>

                <ChartCard
                  title="Demand Type Distribution"
                  subtitle="Categorization of all demand requests"
                >
                  <DemandTypePie data={typeData} />
                </ChartCard>
              </div>

              {/* ═══════════════════════════════════════════════════
                  Work Area + Impact
              ═══════════════════════════════════════════════════ */}
              <div className="charts-grid">
                <ChartCard
                  title="Demand Status Funnel"
                  subtitle="Flow of demands through their lifecycle"
                >
                  <DemandFunnel data={statusData} />
                </ChartCard>

                <ChartCard
                  title="Impact Distribution"
                  subtitle="Business impact level of demands"
                >
                  <ImpactPie data={impactData} />
                </ChartCard>
              </div>

              {/* ═══════════════════════════════════════════════════
                  Requestor Vertical + PM Department
              ═══════════════════════════════════════════════════ */}
              <div className="charts-grid">
                <ChartCard
                  title="Demand by Requestor Vertical"
                  subtitle="Sorted by demand volume descending"
                >
                  <RequestorVerticalBar data={requestorVerticalData} />
                </ChartCard>

                <ChartCard
                  title="PM Department Workload"
                  subtitle="Project Manager departments by demand count"
                >
                  <PMDepartmentBar data={pmDepartmentData} />
                </ChartCard>
              </div>

              {/* ═══════════════════════════════════════════════════
                  Agile + Migration
              ═══════════════════════════════════════════════════ */}
              {/* <div className="charts-grid">
                <ChartCard
                  title="Agile Adoption"
                  subtitle="Agile vs Non-Agile demand breakdown"
                >
                  <AgileDonut data={agileData} />
                </ChartCard>

                <ChartCard
                  title="Migration Status"
                  subtitle="Migrated vs non-migrated demands"
                >
                  <MigrationPie data={migrationData} />
                </ChartCard>
              </div> */}

              {/* ═══════════════════════════════════════════════════
                  Monthly Demand vs Approved — full width
              ═══════════════════════════════════════════════════ */}
              <div className="charts-grid">
                <ChartCard
                  title="Monthly Demand vs Approved"
                  subtitle="Month-wise total demands raised vs approved"
                  full
                >
                  <MonthlyDemandComparison data={monthlyComparisonData} />
                </ChartCard>
              </div>

              {/* ═══════════════════════════════════════════════════
                  Priority by Application — full width
              ═══════════════════════════════════════════════════ */}
              <div className="charts-grid">
                <ChartCard
                  title="Priority by Top 10 Most Updated Application"
                  subtitle="Stacked priority breakdown per application"
                  full
                >
                  <PriorityStackedBar data={priorityByAppData} priorities={priorityKeys} />
                </ChartCard>
              </div>

              {/* ═══════════════════════════════════════════════════
                  Requestor Department + Programs vs Projects
              ═══════════════════════════════════════════════════ */}
              {/* <div className="charts-grid">
                

                <ChartCard
                  title="Programs vs Projects"
                  subtitle="Demand count by project type category"
                >
                  <ProgramsProjectsBar data={programsProjectsData} />
                </ChartCard>
              </div> */}

              {/* ═══════════════════════════════════════════════════
                  Team Members panel — dept_head + division_head only
              ═══════════════════════════════════════════════════ */}
              {canViewUsers && teamUsers.length > 0 && (
                <div className="team-panel">
                  <p className="dash-section-title">Team Members</p>
                  <div className="team-table-wrap">
                    <table className="team-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th>Joined</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teamUsers.map(u => (
                          <tr key={u.id}>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div className="team-avatar">{u.name?.[0]?.toUpperCase()}</div>
                                {u.name}
                              </div>
                            </td>
                            <td style={{ color: '#94a3b8' }}>{u.email}</td>
                            <td><RoleBadge role={u.role} /></td>
                            <td style={{ color: '#64748b', fontSize: '0.8rem' }}>
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
