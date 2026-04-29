import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Package, Clock, Truck, CheckCircle, XCircle, ShoppingBag, MapPin, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { dashboardAPI, orderAPI, addUpdateListener, removeUpdateListener } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { StatsCard, PageLoader, StatusBadge, EmptyState, Pagination, ConfirmDialog } from '../components/UI'
import { formatCurrency, formatDateTime } from '../utils/helpers'
import i18n from '../i18n'
import toast from 'react-hot-toast'
 
// ─── Order Status Timeline ─────────────────────────────
function OrderTimeline({ status }) {
  const { t } = useTranslation()
  const steps = [
    { key: 'Pending',   label: t('customer.status.placed'),    icon: Clock,        desc: t('customer.status.placedDesc') },
    { key: 'Shipped',   label: t('customer.status.shipped'),   icon: Truck,        desc: t('customer.status.shippedDesc') },
    { key: 'Delivered', label: t('customer.status.delivered'), icon: CheckCircle,  desc: t('customer.status.deliveredDesc') },
  ]
  const isCancelled = status === 'Cancelled'
  const stepIndex   = isCancelled ? -1 : steps.findIndex(s => s.key === status)
 
  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-red-50 rounded-lg border border-red-200">
        <XCircle className="w-4 h-4 text-red-500 shrink-0" />
        <span className="text-xs font-medium text-red-700">{t('customer.status.cancelled')}</span>
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
  const t   = i18n.t.bind(i18n)
  const pad  = (str, n) => String(str).padEnd(n)
  const rpad = (str, n) => String(str).padStart(n)
  const div  = '─'.repeat(66)
  const lines = order.items.map(i =>
    `${pad(i.name, 28)} x${pad(i.quantity, 5)} ${rpad(formatCurrency(i.price), 12)}  ${rpad(formatCurrency(i.price * i.quantity), 12)}`
  ).join('\n')
 
  const content = [
    t('invoice.brandName'),
    t('invoice.tagline'),
    div,
    t('invoice.title'),
    div,
    `${t('invoice.orderId').padEnd(14)}: #${order.order_id}`,
    `${t('invoice.date').padEnd(14)}: ${formatDateTime(order.order_date)}`,
    `${t('invoice.customer').padEnd(14)}: ${userName}`,
    `${t('invoice.payment').padEnd(14)}: ${t('invoice.paymentValue')}`,
    `${t('invoice.deliveryTo').padEnd(14)}: ${order.delivery_address || t('invoice.registeredAddress')}`,
    div,
    `${t('invoice.product').padEnd(28)} ${t('invoice.qty').padEnd(6)} ${t('invoice.unitPrice').padEnd(12)}  ${t('invoice.amount')}`,
    div,
    lines,
    div,
    `${t('invoice.totalAmount').padEnd(52)} ${rpad(formatCurrency(order.total_amount), 12)}`,
    div,
    `${t('invoice.status').padEnd(14)}: ${order.order_status}`,
    div,
    t('invoice.thankYou'),
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
  const { t } = useTranslation()
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
 
  const fetchStats = useCallback(() => {
    dashboardAPI.customer()
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])
 
  useEffect(() => { fetchStats() }, [fetchStats])
 
  const cards = [
    { title: t('customer.totalOrders'), value: stats?.total_orders ?? 0, icon: Package,     color: 'earth' },
    { title: t('customer.pending'),     value: stats?.pending      ?? 0, icon: Clock,       color: 'amber' },
    { title: t('customer.shipped'),     value: stats?.shipped      ?? 0, icon: Truck,       color: 'blue'  },
    { title: t('customer.delivered'),   value: stats?.delivered    ?? 0, icon: CheckCircle, color: 'leaf'  },
    { title: t('customer.cancelled'),   value: stats?.cancelled    ?? 0, icon: XCircle,     color: 'red'   },
  ]
 
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="mb-7">
        <h1 className="page-header">{t('customer.welcome', { name: user?.name })}</h1>
        <p className="text-earth-500 mt-1">{t('customer.overview')}</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {cards.map(c => <StatsCard key={c.title} {...c} />)}
      </div>
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100">
          <h2 className="font-display font-semibold text-bark">{t('customer.recentOrders')}</h2>
          <Link to="/orders" className="text-sm text-leaf-600 hover:text-leaf-700 font-medium">{t('customer.viewAll')}</Link>
        </div>
        {!stats?.recent_orders?.length ? (
          <EmptyState
            title={t('customer.noOrdersYet')}
            desc={t('customer.startShopping')}
            icon={ShoppingBag}
            action={<Link to="/products" className="btn-primary text-sm">{t('customer.shopNow')}</Link>}
          />
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
  const { t } = useTranslation()
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
 
  useEffect(() => { fetchOrders() }, [fetchOrders])
 
  useEffect(() => {
    const handleUpdate = (update) => {
      if (update.type === 'order_status_changed') fetchOrders()
    }
    addUpdateListener(handleUpdate)
    return () => removeUpdateListener(handleUpdate)
  }, [fetchOrders])
 
  const handleCancel = async () => {
    try {
      await orderAPI.cancel(cancelOrderId)
      toast.success(i18n.t('toast.orderCancelled'))
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || i18n.t('errors.somethingWrong'))
    }
  }
 
  const statuses = [
    t('status.all'),
    t('status.pending'),
    t('status.shipped'),
    t('status.delivered'),
    t('status.cancelled'),
  ]
  const statusKeys = ['', 'Pending', 'Shipped', 'Delivered', 'Cancelled']
 
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="page-header mb-6">{t('customer.myOrders')}</h1>
 
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {statuses.map((s, idx) => (
          <button key={s}
            onClick={() => { setStatus(statusKeys[idx]); setPage(1) }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${
              status === statusKeys[idx]
                ? 'bg-leaf-600 text-white border-leaf-600'
                : 'border-earth-200 text-earth-600 hover:border-leaf-400 bg-white'
            }`}
          >{s}</button>
        ))}
      </div>
 
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card h-20 skeleton" />)}</div>
      ) : orders.length === 0 ? (
        <EmptyState
          title={t('customer.noOrders')}
          desc={t('customer.noOrdersStart')}
          icon={ShoppingBag}
          action={<Link to="/products" className="btn-primary text-sm">{t('customer.startShoppingNow')}</Link>}
        />
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <div key={o.order_id} className="card overflow-hidden">
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
 
              {expanded === o.order_id && (
                <div className="border-t border-earth-100 px-5 py-4 bg-earth-50/50 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-2">{t('customer.orderTracking')}</p>
                    <OrderTimeline status={o.order_status} />
                  </div>
 
                  {o.delivery_address && (
                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-earth-100">
                      <MapPin className="w-4 h-4 text-earth-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-0.5">{t('customer.deliveryAddress')}</p>
                        <p className="text-sm text-earth-700">{o.delivery_address}</p>
                      </div>
                    </div>
                  )}
 
                  <div>
                    <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-2">{t('customer.items')}</p>
                    <div className="space-y-1.5">
                      {o.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-earth-700">{item.name} × {item.quantity}</span>
                          <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm font-semibold pt-2 border-t border-earth-100 mt-1">
                        <span>{t('customer.total')}</span>
                        <span className="text-leaf-700">{formatCurrency(o.total_amount)}</span>
                      </div>
                    </div>
                  </div>
 
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-earth-500 font-medium">{t('customer.paymentMethod')}</span>
                    <div className="flex items-center gap-2">
                      {o.order_status === 'Delivered' && (
                        <button onClick={() => downloadInvoice(o, user?.name || 'Customer')}
                          className="text-xs flex items-center gap-1 border border-leaf-300 text-leaf-700 px-3 py-1.5 rounded-lg hover:bg-leaf-50 transition-colors">
                          <FileText className="w-3.5 h-3.5" /> {t('customer.downloadInvoice')}
                        </button>
                      )}
                      {(o.order_status === 'Pending' || o.order_status === 'Shipped') && (
                        <button onClick={() => setCancelOrderId(o.order_id)}
                          className="text-xs text-red-500 hover:text-red-600 font-medium border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          {t('customer.cancelOrder')}
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
        title={t('customer.cancelOrder')}
        message={t('customer.cancelConfirm', { orderId: cancelOrderId })}
        danger
      />
    </div>
  )
}
 