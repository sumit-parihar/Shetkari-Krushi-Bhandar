import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, Truck, CheckCircle, XCircle, ShoppingBag, MapPin, FileText } from 'lucide-react'
import { dashboardAPI, orderAPI, addUpdateListener, removeUpdateListener } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { StatsCard, PageLoader, StatusBadge, EmptyState, Pagination, ConfirmDialog } from '../components/UI'
import { formatCurrency, formatDateTime } from '../utils/helpers'
import toast from 'react-hot-toast'

// ─── Order Status Timeline ─────────────────────────────
function OrderTimeline({ status }) {
  const steps = [
    { key: 'Pending',   label: 'Order Placed', icon: Clock,       desc: 'Your order has been received' },
    { key: 'Shipped',   label: 'Shipped',       icon: Truck,       desc: 'Order is on the way' },
    { key: 'Delivered', label: 'Delivered',     icon: CheckCircle, desc: 'Order delivered successfully' },
  ]
  const isCancelled = status === 'Cancelled'
  const stepIndex   = isCancelled ? -1 : steps.findIndex(s => s.key === status)

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-red-50 rounded-lg border border-red-200">
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        <span className="text-xs font-medium text-red-700">This order was cancelled</span>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-0 my-2">
      {steps.map((step, idx) => {
        const done   = idx <= stepIndex
        const active = idx === stepIndex
        const Icon   = step.icon
        return (
          <div key={step.key} className="flex-1 flex flex-col items-center">
            <div className="flex items-center w-full">
              <div className={`flex-1 h-0.5 ${idx === 0 ? 'invisible' : done ? 'bg-leaf-500' : 'bg-earth-200'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                active  ? 'bg-leaf-600 border-leaf-600 text-white shadow-leaf' :
                done    ? 'bg-leaf-100 border-leaf-400 text-leaf-700' :
                          'bg-white border-earth-200 text-earth-300'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className={`flex-1 h-0.5 ${idx === steps.length - 1 ? 'invisible' : done && idx < stepIndex ? 'bg-leaf-500' : 'bg-earth-200'}`} />
            </div>
            <p className={`text-[10px] font-medium mt-1 text-center leading-tight ${active ? 'text-leaf-700' : done ? 'text-leaf-600' : 'text-earth-400'}`}>
              {step.label}
            </p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Invoice Generator ─────────────────────────────────
function downloadInvoice(order, userName) {
  const pad  = (str, n) => String(str).padEnd(n)
  const rpad = (str, n) => String(str).padStart(n)
  const div  = '─'.repeat(66)
  const lines = order.items.map(i =>
    `${pad(i.name, 28)} x${pad(i.quantity, 5)} ${rpad(formatCurrency(i.price), 12)}  ${rpad(formatCurrency(i.price * i.quantity), 12)}`
  ).join('\n')

  const content = [
    'SHETKARI KRUSHI BHANDAR',
    "Maharashtra's Trusted Agricultural Store",
    div,
    'INVOICE / BILL',
    div,
    `Order ID      : #${order.order_id}`,
    `Date          : ${formatDateTime(order.order_date)}`,
    `Customer      : ${userName}`,
    `Payment       : Cash on Delivery (COD)`,
    `Delivery To   : ${order.delivery_address || 'Registered address'}`,
    div,
    `${'Product'.padEnd(28)} Qty    Unit Price    Amount`,
    div,
    lines,
    div,
    `${'TOTAL AMOUNT'.padEnd(52)} ${rpad(formatCurrency(order.total_amount), 12)}`,
    div,
    `Status        : ${order.order_status}`,
    div,
    'Thank you for shopping with Shetkari Krushi Bhandar!',
  ].join('\n')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `Invoice_Order_${order.order_id}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Customer Dashboard ────────────────────────────────
export function CustomerDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(() => {
    dashboardAPI.customer()
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const cards = [
    { title: 'Total Orders', value: stats?.total_orders ?? 0, icon: Package,     color: 'earth' },
    { title: 'Pending',      value: stats?.pending      ?? 0, icon: Clock,       color: 'amber' },
    { title: 'Shipped',      value: stats?.shipped      ?? 0, icon: Truck,       color: 'blue'  },
    { title: 'Delivered',    value: stats?.delivered    ?? 0, icon: CheckCircle, color: 'leaf'  },
    { title: 'Cancelled',    value: stats?.cancelled    ?? 0, icon: XCircle,     color: 'red'   },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="mb-7">
        <h1 className="page-header">Welcome, {user?.name}!</h1>
        <p className="text-earth-500 mt-1">Here's your order overview</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map(c => <StatsCard key={c.title} {...c} />)}
      </div>
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100">
          <h2 className="font-display font-semibold text-bark">Recent Orders</h2>
          <Link to="/orders" className="text-sm text-leaf-600 hover:text-leaf-700 font-medium">View all →</Link>
        </div>
        {!stats?.recent_orders?.length ? (
          <EmptyState title="No orders yet" desc="Start shopping to see your orders here" icon={ShoppingBag}
            action={<Link to="/products" className="btn-primary text-sm">Shop Now</Link>} />
        ) : (
          <div className="divide-y divide-earth-50">
            {stats.recent_orders.map(o => (
              <div key={o.order_id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="font-semibold text-sm text-bark">Order #{o.order_id}</p>
                  <p className="text-xs text-earth-400">{formatDateTime(o.order_date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">{formatCurrency(o.total_amount)}</span>
                  <StatusBadge status={o.order_status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Orders Page ───────────────────────────────────────
export function OrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [total, setTotal]           = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage]             = useState(1)
  const [status, setStatus]         = useState('')
  const [expanded, setExpanded]     = useState(null)
  const [cancelOrderId, setCancelOrderId] = useState(null)
  const limit = 10

  const fetchOrders = useCallback(() => {
    setLoading(true)
    const params = { page, limit }
    if (status && status !== 'All') params.status = status
    orderAPI.history(params)
      .then(r => {
        setOrders(r.data.data?.orders || [])
        setTotal(r.data.data?.total || 0)
        setTotalPages(r.data.data?.total_pages || 1)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, status])

  // Initial fetch on mount
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // Real-time updates via SSE
  useEffect(() => {
    const handleUpdate = (update) => {
      if (update.type === 'order_status_changed') {
        fetchOrders()
      }
    }
    addUpdateListener(handleUpdate)
    return () => removeUpdateListener(handleUpdate)
  }, [fetchOrders])

  const handleCancel = async () => {
    try {
      await orderAPI.cancel(cancelOrderId)
      toast.success('Order cancelled successfully')
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel this order')
    }
  }

  const statuses = ['All', 'Pending', 'Shipped', 'Delivered', 'Cancelled']

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="page-header mb-6">My Orders</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {statuses.map(s => (
          <button key={s}
            onClick={() => { setStatus(s === 'All' ? '' : s); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
              (s === 'All' && !status) || s === status
                ? 'bg-leaf-600 text-white border-leaf-600'
                : 'border-earth-200 text-earth-600 hover:border-leaf-400 bg-white'
            }`}
          >{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-20 skeleton" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders found" desc="You haven't placed any orders yet" icon={ShoppingBag}
          action={<Link to="/products" className="btn-primary text-sm">Start Shopping</Link>} />
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.order_id} className="card overflow-hidden">
              {/* Header */}
              <button onClick={() => setExpanded(expanded === o.order_id ? null : o.order_id)}
                className="w-full text-left px-5 py-4 hover:bg-earth-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-earth-100 rounded-xl flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-earth-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-bark text-sm">Order #{o.order_id}</p>
                      <p className="text-xs text-earth-400">{formatDateTime(o.order_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-leaf-700">{formatCurrency(o.total_amount)}</span>
                    <StatusBadge status={o.order_status} />
                    <span className={`text-xs text-earth-400 transition-transform inline-block ${expanded === o.order_id ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>
              </button>

              {/* Expanded */}
              {expanded === o.order_id && (
                <div className="border-t border-earth-100 px-5 py-4 bg-earth-50/50 space-y-4">

                  {/* Tracking timeline */}
                  <div>
                    <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-2">Order Tracking</p>
                    <OrderTimeline status={o.order_status} />
                  </div>

                  {/* Delivery address */}
                  {o.delivery_address && (
                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-earth-100">
                      <MapPin className="w-4 h-4 text-earth-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-0.5">Delivery Address</p>
                        <p className="text-sm text-earth-700">{o.delivery_address}</p>
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div>
                    <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-2">Items</p>
                    <div className="space-y-1.5">
                      {o.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-earth-700">{item.name} × {item.quantity}</span>
                          <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold pt-2 border-t border-earth-100 mt-1">
                        <span>Total</span>
                        <span className="text-leaf-700">{formatCurrency(o.total_amount)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-earth-500 font-medium">{o.payment_method}</span>
                    <div className="flex items-center gap-2">
                      {o.order_status === 'Delivered' && (
                        <button onClick={() => downloadInvoice(o, user?.name || 'Customer')}
                          className="text-xs flex items-center gap-1 border border-leaf-300 text-leaf-700 px-3 py-1.5 rounded-lg hover:bg-leaf-50 transition-colors">
                          <FileText className="w-3.5 h-3.5" /> Download Invoice
                        </button>
                      )}
                      {(o.order_status === 'Pending' || o.order_status === 'Shipped') && (
                        <button onClick={() => setCancelOrderId(o.order_id)}
                          className="text-xs text-red-500 hover:text-red-600 font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPage={setPage} />
      </div>

      <ConfirmDialog
        open={!!cancelOrderId}
        onClose={() => setCancelOrderId(null)}
        onConfirm={handleCancel}
        title="Cancel Order"
        message={`Are you sure you want to cancel Order #${cancelOrderId}? This action cannot be undone.`}
        danger
      />
    </div>
  )
}
