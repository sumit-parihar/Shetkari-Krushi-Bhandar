import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// Landing page for each role. Sending a user who opened the wrong area to
// their own home (instead of another guarded page) avoids redirect chains
// that end on a blank page.
export function homeForRole(role) {
  if (role === 'admin') return '/admin'
  if (role === 'delivery_boy') return '/delivery'
  return '/dashboard'
}

function Guard({ allow, children }) {
  const { isLoggedIn, user } = useAuth()
  const location = useLocation()
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />
  if (allow && user?.role !== allow) return <Navigate to={homeForRole(user?.role)} replace />
  return children
}

export function RequireAuth({ children }) {
  return <Guard>{children}</Guard>
}

export function RequireCustomer({ children }) {
  return <Guard allow="customer">{children}</Guard>
}

export function RequireAdmin({ children }) {
  return <Guard allow="admin">{children}</Guard>
}

export function RequireDeliveryBoy({ children }) {
  return <Guard allow="delivery_boy">{children}</Guard>
}

export function RedirectIfLoggedIn({ children }) {
  const { isLoggedIn, isAdmin, isDeliveryBoy } = useAuth()
  if (!isLoggedIn) return children
  if (isAdmin) return <Navigate to="/admin" replace />
  if (isDeliveryBoy) return <Navigate to="/delivery" replace />
  return <Navigate to="/" replace />
}
