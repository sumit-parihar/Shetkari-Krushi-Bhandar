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

export const truncate = (str, n = 60) =>
  str && str.length > n ? str.slice(0, n) + '…' : str

export const debounce = (fn, delay) => {
  let t
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay) }
}

/**
 * Pick the message to show the user for a failed API call.
 * - 4xx: show the backend's specific reason (e.g. "only 5 in stock").
 * - 5xx / network error / no reason given: show the translated fallback,
 *   so users never see raw text like "Internal server error".
 */
export const getErrorMessage = (err, fallback) => {
  const status = err?.response?.status
  const reason = err?.response?.data?.error
  if (status && status < 500 && typeof reason === 'string' && reason.trim()) {
    return reason
  }
  return fallback
}
