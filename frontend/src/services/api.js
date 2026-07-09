import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Match sessionStorage used in AuthContext
const storage = sessionStorage

// ── SSE real-time updates ──────────────────────────────
let eventSource    = null
const updateListeners = new Set()

export function connectRealTimeUpdates() {
  if (eventSource) return eventSource

  const token = storage.getItem('skb_token')
  if (!token) return null

  eventSource = new EventSource(`${BASE_URL}/stream/updates`)

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      updateListeners.forEach(listener => listener(data))
    } catch {
      // silently ignore parse errors — not worth logging
    }
  }

  // Reconnect is handled automatically by EventSource — no need to log errors
  eventSource.onerror = () => {}

  return eventSource
}

export function disconnectRealTimeUpdates() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
    updateListeners.clear()
  }
}

export function addUpdateListener(listener) {
  updateListeners.add(listener)
}

export function removeUpdateListener(listener) {
  updateListeners.delete(listener)
}

// ── Axios instance ─────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10s — suitable for paid tier (always-on server)
})

// ── Request interceptor — attach JWT ───────────────────
api.interceptors.request.use(
  (config) => {
    const token = storage.getItem('skb_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — handle 401 ─────────────────
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || ''
    const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register')

    // Only treat 401 as session expiry if it comes from an authenticated route
    // A 401 on /auth/login means wrong credentials — not an expired session
    if (error.response?.status === 401 && !isAuthRoute) {
      storage.removeItem('skb_token')
      storage.removeItem('skb_user')

      // Fire a custom event so AuthContext can show the translated
      // "session expired" toast before the redirect happens
      window.dispatchEvent(new CustomEvent('skb:session-expired'))

      // Small delay so the toast is visible before navigation
      setTimeout(() => {
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }, 1200)
    }
    return Promise.reject(error)
  }
)

// ── AUTH ──────────────────────────────────────────────
export const authAPI = {
  register:      (data)        => api.post('/api/v1/auth/register',           data),
  login:         (data)        => api.post('/api/v1/auth/login',              data),
  getUsers:      (params)      => api.get('/api/v1/auth/users',               { params }),
  deleteUser:    (id)          => api.delete(`/api/v1/auth/users/${id}`),
  updateUser:    (id, data)    => api.put(`/api/v1/auth/users/${id}`,         data),
  getDeliveryBoys: ()          => api.get('/api/v1/auth/delivery-boys'),
  updateProfile: (data)        => api.put('/api/v1/auth/profile',             data),
  changePassword:(data)        => api.put('/api/v1/auth/change-password',     data),
}

// ── CATEGORIES ────────────────────────────────────────
export const categoryAPI = {
  list:   ()           => api.get('/api/v1/categories/'),
  get:    (id)         => api.get(`/api/v1/categories/${id}`),
  add:    (data)       => api.post('/api/v1/categories/',    data),
  update: (id, data)   => api.put(`/api/v1/categories/${id}`, data),
  delete: (id)         => api.delete(`/api/v1/categories/${id}`),
}

// ── PRODUCTS ──────────────────────────────────────────
export const productAPI = {
  list:   (params)     => api.get('/api/v1/products/',         { params }),
  search: (params)     => api.get('/api/v1/products/search',   { params }),
  get:    (id)         => api.get(`/api/v1/products/${id}`),
  add:    (data)       => api.post('/api/v1/products/',         data),
  update: (id, data)   => api.put(`/api/v1/products/${id}`,    data),
  delete: (id)         => api.delete(`/api/v1/products/${id}`),
}

// ── CART ──────────────────────────────────────────────
export const cartAPI = {
  get:    ()           => api.get('/api/v1/cart/'),
  add:    (data)       => api.post('/api/v1/cart/',             data),
  update: (itemId, data) => api.patch(`/api/v1/cart/${itemId}`, data),
  remove: (itemId)     => api.delete(`/api/v1/cart/${itemId}`),
}

// ── ORDERS ────────────────────────────────────────────
export const orderAPI = {
  place:              (data)       => api.post('/api/v1/orders/',                      data),
  history:            (params)     => api.get('/api/v1/orders/',                       { params }),
  detail:             (id)         => api.get(`/api/v1/orders/${id}/detail`),
  cancel:             (id)         => api.patch(`/api/v1/orders/${id}/cancel`),
  adminAll:           (params)     => api.get('/api/v1/orders/admin',                  { params }),
  updateStatus:       (id, data)   => api.patch(`/api/v1/orders/${id}`,               data),
  assignDeliveryBoy:  (id, data)   => api.patch(`/api/v1/orders/${id}/assign`,         data),
  myAssignedOrders:   (params)     => api.get('/api/v1/orders/delivery/my-orders',     { params }),
  deliveryUpdateStatus:(id, data)  => api.patch(`/api/v1/orders/delivery/${id}/status`, data),
}

// ── DASHBOARD ─────────────────────────────────────────
export const dashboardAPI = {
  customer:  ()  => api.get('/api/v1/dashboard/customer'),
  admin:     ()  => api.get('/api/v1/dashboard/admin'),
  report:    ()  => api.get('/api/v1/dashboard/admin/report'),
  exportCSV: ()  => api.get('/api/v1/dashboard/admin/export', { responseType: 'blob' }),
}

export default api