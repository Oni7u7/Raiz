import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/database'

export function ProtectedRoute({ role }: { role?: UserRole }) {
  const { session, profile, loading } = useAuth()

  if (loading) return <p className="loading">Cargando…</p>
  if (!session) return <Navigate to="/login" replace />
  if (role && profile?.role !== role) return <Navigate to="/" replace />

  return <Outlet />
}
