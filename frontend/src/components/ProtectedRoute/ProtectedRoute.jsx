import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * ProtectedRoute
 *
 * Props:
 *   allowedRoles  — array of roles that may access this route.
 *                   Defaults to any authenticated user.
 *   children      — component(s) to render if access is granted.
 *
 * Behaviour:
 *   • While session is loading → show a full-screen spinner
 *   • Not authenticated       → redirect to /login (preserving intended URL)
 *   • Wrong role              → redirect to /unauthorized
 *   • Authorized              → render children
 */
export default function ProtectedRoute({
  children,
  allowedRoles = ['member', 'department_head', 'division_head'],
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: 'var(--bg-primary, #0f172a)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          border: '3px solid rgba(99,102,241,0.2)',
          borderTopColor: '#6366f1',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}
