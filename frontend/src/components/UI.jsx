import { Loader2, AlertCircle, PackageSearch, ChevronLeft, ChevronRight } from 'lucide-react'

// ─── Spinner ─────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size]
  return <Loader2 className={`animate-spin text-leaf-600 ${s} ${className}`} />
}

// ─── Page Loader ─────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-3 border-earth-200 border-t-leaf-600 animate-spin" />
      </div>
      <p className="text-earth-500 text-sm font-medium">Loading…</p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function ProductCardSkeleton() {
  return (
    <div className="card p-0">
      <Skeleton className="h-48 w-full rounded-t-xl rounded-b-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="table-cell">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

// ─── Empty State ───────────────────────────────────────
export function EmptyState({ title = 'Nothing here', desc = '', icon: Icon = PackageSearch, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-earth-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-earth-400" />
      </div>
      <div>
        <p className="font-display font-semibold text-lg text-bark">{title}</p>
        {desc && <p className="text-earth-500 text-sm mt-1 max-w-xs">{desc}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Error Banner ─────────────────────────────────────
export function ErrorBanner({ message }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
      <AlertCircle className="w-5 h-5 shrink-0" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────
export function Pagination({ page, totalPages, onPage, total, limit }) {
  if (totalPages <= 1) return null
  const pages = []
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, page + 2)
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-earth-100">
      <p className="text-sm text-earth-500">
        Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-2 rounded-lg hover:bg-earth-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {start > 1 && (
          <>
            <button onClick={() => onPage(1)} className="w-8 h-8 rounded-lg text-sm hover:bg-earth-100 transition-colors">1</button>
            {start > 2 && <span className="px-1 text-earth-400">…</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${p === page ? 'bg-leaf-600 text-white' : 'hover:bg-earth-100'}`}
          >
            {p}
          </button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="px-1 text-earth-400">…</span>}
            <button onClick={() => onPage(totalPages)} className="w-8 h-8 rounded-lg text-sm hover:bg-earth-100 transition-colors">{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="p-2 rounded-lg hover:bg-earth-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ─── Modal ─────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }) {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-bark/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} card animate-scale-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-earth-100">
          <h2 className="font-display text-lg font-semibold text-bark">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── Status Badge ──────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    Pending: 'bg-amber-100 text-amber-800',
    Shipped: 'bg-blue-100 text-blue-800',
    Delivered: 'bg-leaf-100 text-leaf-800',
    Cancelled: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`badge ${map[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
  )
}

// ─── Confirm Dialog ────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-earth-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={() => { onConfirm(); onClose() }} className={danger ? 'btn-danger' : 'btn-primary'}>
          Confirm
        </button>
      </div>
    </Modal>
  )
}

// ─── Stats Card ────────────────────────────────────────
export function StatsCard({ title, value, icon: Icon, color = 'leaf', subtitle }) {
  const colors = {
    leaf: 'bg-leaf-50 text-leaf-700 border-leaf-200',
    earth: 'bg-earth-50 text-earth-700 border-earth-200',
    soil: 'bg-soil-50 text-soil-700 border-soil-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <div className="card p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-earth-500 font-medium">{title}</p>
          <p className="font-display text-2xl font-bold text-bark mt-1">{value}</p>
          {subtitle && <p className="text-xs text-earth-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
