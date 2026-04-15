import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

export function RequireCustomer({ children }) {
  const { isLoggedIn, isCustomer } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isCustomer) return <Navigate to="/admin" replace />
  return children
}

export function RequireAdmin({ children }) {
  const { isLoggedIn, isAdmin } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

export function RequireDeliveryBoy({ children }) {
  const { isLoggedIn, isDeliveryBoy } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />
  if (!isDeliveryBoy) return <Navigate to="/" replace />
  return children
}

export function RedirectIfLoggedIn({ children }) {
  const { isLoggedIn, isAdmin, isDeliveryBoy } = useAuth()
  if (!isLoggedIn) return children
  if (isAdmin) return <Navigate to="/admin" replace />
  if (isDeliveryBoy) return <Navigate to="/delivery" replace />
  return <Navigate to="/" replace />
}
