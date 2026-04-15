export const formatCurrency = (amount) => {
  const num = Number(amount) || 0
  return '₹' + num.toLocaleString('en-IN')
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export const getStatusColor = (status) => {
  const map = {
    Pending: 'badge-pending',
    Shipped: 'badge-shipped',
    Delivered: 'badge-delivered',
    Cancelled: 'badge-cancelled',
  }
  return map[status] || 'badge bg-gray-100 text-gray-700'
}

export const truncate = (str, n = 60) =>
  str && str.length > n ? str.slice(0, n) + '…' : str

export const debounce = (fn, delay) => {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay) }
}
