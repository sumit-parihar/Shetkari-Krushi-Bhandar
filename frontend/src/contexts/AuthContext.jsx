import { createContext, useContext, useState, useCallback } from 'react'
import { authAPI, connectRealTimeUpdates, disconnectRealTimeUpdates } from '../services/api'
import { useEffect } from 'react'
import toast from 'react-hot-toast'
import i18n from '../i18n'
 
const AuthContext = createContext(null)
 
// BUG FIX: Use sessionStorage instead of localStorage so session clears on browser close
const storage = sessionStorage
 
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const u = storage.getItem('skb_user')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(false)
 
  const login = useCallback(async (email, password) => {
    setLoading(true)
    try {
      const res = await authAPI.login({ email, password })
      const { token, user: userData } = res.data.data
      storage.setItem('skb_token', token)
      storage.setItem('skb_user', JSON.stringify(userData))
      setUser(userData)
      toast.success(i18n.t('toast.welcomeBack', { name: userData.name }))
      return { success: true, role: userData.role }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || i18n.t('toast.loginFailed')
      toast.error(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])
 
  const register = useCallback(async (name, email, password, phone, address) => {
    setLoading(true)
    try {
      await authAPI.register({ name, email, password, phone, address })
      toast.success(i18n.t('toast.accountCreated'))
      return { success: true }
    } catch (err) {
      const msg = err.response?.data?.message || i18n.t('toast.registrationFailed')
      toast.error(msg)
      return { success: false, error: msg }
    } finally {
      setLoading(false)
    }
  }, [])
 
  const logout = useCallback(() => {
    storage.removeItem('skb_token')
    storage.removeItem('skb_user')
    setUser(null)
    toast.success(i18n.t('toast.loggedOut'))
  }, [])
 
  const isAdmin = user?.role === 'admin'
  const isCustomer = user?.role === 'customer'
  const isDeliveryBoy = user?.role === 'delivery_boy'
  const isLoggedIn = !!user
 
  // Connect to SSE real-time updates when logged in
  useEffect(() => {
    if (isLoggedIn) {
      connectRealTimeUpdates((update) => {
        console.log('[SSE] Real-time update:', update)
      })
    } else {
      disconnectRealTimeUpdates()
    }
    return () => disconnectRealTimeUpdates()
  }, [isLoggedIn])
 
  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, isAdmin, isCustomer, isDeliveryBoy, isLoggedIn }}>
      {children}
    </AuthContext.Provider>
  )
}
 
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
 