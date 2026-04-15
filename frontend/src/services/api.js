import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// BUG FIX: match sessionStorage used in AuthContext
const storage = sessionStorage

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = storage.getItem('skb_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      storage.removeItem('skb_token')
      storage.removeItem('skb_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// ─── AUTH ────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getUsers: (params) => api.get('/auth/users', { params }),
  deleteUser: (id) => api.delete(`/auth/users/${id}`),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  getDeliveryBoys: () => api.get('/auth/delivery-boys'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
}

// ─── CATEGORIES ──────────────────────────────────────
export const categoryAPI = {
  list: () => api.get('/categories/'),
  get: (id) => api.get(`/categories/${id}`),
  add: (data) => api.post('/categories/', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
}

// ─── PRODUCTS ────────────────────────────────────────
export const productAPI = {
  list: (params) => api.get('/products/', { params }),
  search: (params) => api.get('/products/search', { params }),
  get: (id) => api.get(`/products/${id}`),
  add: (data) => api.post('/products/', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
}

// ─── CART ─────────────────────────────────────────────
export const cartAPI = {
  get: () => api.get('/cart/'),
  add: (data) => api.post('/cart/', data),
  update: (itemId, data) => api.patch(`/cart/${itemId}`, data),
  remove: (itemId) => api.delete(`/cart/${itemId}`),
}

// ─── ORDERS ──────────────────────────────────────────
export const orderAPI = {
  place: (data) => api.post('/orders/', data),
  history: (params) => api.get('/orders/', { params }),
  detail: (id) => api.get(`/orders/${id}/detail`),
  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  adminAll: (params) => api.get('/orders/admin', { params }),
  updateStatus: (id, data) => api.patch(`/orders/${id}`, data),
  assignDeliveryBoy: (id, data) => api.patch(`/orders/${id}/assign`, data),
  // Delivery boy
  myAssignedOrders: (params) => api.get('/orders/delivery/my-orders', { params }),
  deliveryUpdateStatus: (id, data) => api.patch(`/orders/delivery/${id}/status`, data),
}

// ─── DASHBOARD ───────────────────────────────────────
export const dashboardAPI = {
  customer: () => api.get('/dashboard/customer'),
  admin:    () => api.get('/dashboard/admin'),
  report:   () => api.get('/dashboard/admin/report'),
  exportCSV: () => api.get('/dashboard/admin/export', { responseType: 'blob' }),
}

export default api
