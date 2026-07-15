import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

/**
 * useAuth — consume the global AuthContext.
 * Returns: { user, loading, login, logout }
 *
 * user.role is one of: 'member' | 'department_head' | 'division_head'
 */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
