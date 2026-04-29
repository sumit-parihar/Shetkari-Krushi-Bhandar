import { useState, useCallback, Fragment, useEffect } from 'react'
import { Truck, MapPin, Package, CheckCircle, Clock, BarChart2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orderAPI, addUpdateListener, removeUpdateListener } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { StatusBadge, Pagination, EmptyState, TableRowSkeleton } from '../components/UI'
import { formatCurrency, formatDateTime } from '../utils/helpers'
import i18n from '../i18n'
import toast from 'react-hot-toast'
 
const STATUS_KEYS = ['', 'Pending', 'Shipped', 'Delivered']
 
export default function DeliveryDashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
 
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [expanded, setExpanded]     = useState(null)
  const [markingId, setMarkingId]   = useState(null)
  const [summary, setSummary]       = useState(null)
  const [activeTab, setActiveTab]   = useState('active')
  const [histOrders, setHistOrders] = useState([])
  const [histLoading, setHistLoading] = useState(true)
  const [histTotal, setHistTotal]   = useState(0)
  const [histPage, setHistPage]     = useState(1)
  const histLimit = 15
  const limit = 15
 
  const fetchOrders = useCallback(() => {
    setLoading(true)
    const params = { page, limit }
    if (statusFilter && statusFilter !== 'All') params.status = statusFilter
    orderAPI.myAssignedOrders(params)
      .then(r => {
        setOrders(r.data.data?.orders || [])
        setTotal(r.data.data?.total || 0)
      })
      .catch(() => toast.error(i18n.t('delivery.dashboard.failedToLoad')))
      .finally(() => setLoading(false))
  }, [page, statusFilter])
 
  const fetchHistory = useCallback(() => {
    setHistLoading(true)
    orderAPI.myAssignedOrders({ page: 1, limit: 1000 })
      .then(r => {
        const all = r.data.data?.orders || []
        setSummary({
          total:     all.length,
          pending:   all.filter(o => o.order_status === 'Pending').length,
          shipped:   all.filter(o => o.order_status === 'Shipped').length,
          delivered: all.filter(o => o.order_status === 'Delivered').length,
        })
      })
      .catch(() => {})
 
    orderAPI.myAssignedOrders({ page: histPage, limit: histLimit, status: 'Delivered' })
      .then(r => {
        setHistOrders(r.data.data?.orders || [])
        setHistTotal(r.data.data?.total || 0)
      })
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }, [histPage])
 
  useEffect(() => { fetchOrders(); fetchHistory() }, [fetchOrders, fetchHistory])
 
  useEffect(() => {
    const handleUpdate = (update) => {
      if (update.type === 'order_status_changed' || update.type === 'delivery_boy_assigned') {
        fetchOrders()
        fetchHistory()
      }
    }
    addUpdateListener(handleUpdate)
    return () => removeUpdateListener(handleUpdate)
  }, [fetchOrders, fetchHistory])
 
  const markDelivered = async (orderId) => {
    setMarkingId(orderId)
    try {
      const order = orders.find(o => o.order_id === orderId)
      const newStatus = order?.order_status === 'Pending' ? 'Shipped' : 'Delivered'
      await orderAPI.deliveryUpdateStatus(orderId, { order_status: newStatus })
      toast.success(i18n.t('delivery.dashboard.markedAs', { orderId, status: newStatus }))
      fetchOrders()
      fetchHistory()
    } catch (err) {
      toast.error(err.response?.data?.message || i18n.t('errors.somethingWrong'))
    } finally {
      setMarkingId(null)
    }
  }
 
  const statusLabels = [
    t('status.all'),
    t('status.pending'),
    t('status.shipped'),
    t('status.delivered'),
  ]
 
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
 
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-leaf-100 flex items-center justify-center">
            <Truck className="w-5 h-5 text-leaf-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-bark">{t('delivery.dashboard.title')}</h1>
            <p className="text-earth-500 text-sm">{t('delivery.dashboard.welcome', { name: user?.name })}</p>
          </div>
        </div>
      </div>
 
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: t('delivery.dashboard.totalAssigned'), value: summary.total,     color: 'bg-earth-100 text-earth-700', icon: Package },
            { label: t('delivery.dashboard.toPickUp'),      value: summary.pending,   color: 'bg-amber-100 text-amber-700', icon: Clock },
            { label: t('delivery.dashboard.inTransit'),     value: summary.shipped,   color: 'bg-blue-100 text-blue-700',   icon: Truck },
            { label: t('delivery.dashboard.delivered'),     value: summary.delivered, color: 'bg-leaf-100 text-leaf-700',   icon: CheckCircle },
          ].map(s => (
            <div key={s.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-earth-500">{s.label}</p>
                <p className="text-xl font-bold text-bark">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}
 
      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-earth-100">
        {[
          { key: 'active',  label: t('delivery.dashboard.activeOrders'), icon: Truck },
          { key: 'history', label: t('delivery.dashboard.history'),      icon: BarChart2 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === tab.key
                ? 'border-leaf-600 text-leaf-700'
                : 'border-transparent text-earth-500 hover:text-bark'
            }`}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>
 
      {/* Active Orders Tab */}
      {activeTab === 'active' && (
        <>
          <div className="flex gap-2 mb-5 overflow-x-auto pb-0.5">
            {statusLabels.map((s, idx) => (
              <button key={s}
                onClick={() => { setStatusFilter(STATUS_KEYS[idx]); setPage(1) }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                  statusFilter === STATUS_KEYS[idx]
                    ? 'bg-leaf-600 text-white border-leaf-600'
                    : 'border-earth-200 text-earth-600 hover:border-leaf-400 bg-white'
                }`}
              >{s}</button>
            ))}
          </div>
 
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr>{[
                  t('delivery.dashboard.orderId'),
                  t('delivery.dashboard.customer'),
                  t('delivery.dashboard.total'),
                  t('delivery.dashboard.status'),
                  t('delivery.dashboard.date'),
                  t('delivery.dashboard.action'),
                ].map(h => (
                  <th key={h} className="table-header text-left">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                  : orders.length === 0
                  ? <tr><td colSpan={6}><EmptyState title={t('delivery.dashboard.noOrders')} icon={Truck} /></td></tr>
                  : orders.map(o => (
                    <Fragment key={o.order_id}>
                      <tr className="hover:bg-earth-50/50 transition-colors cursor-pointer"
                        onClick={() => setExpanded(expanded === o.order_id ? null : o.order_id)}>
                        <td className="table-cell font-mono text-xs">#{o.order_id}</td>
                        <td className="table-cell font-medium text-sm">{o.customer_name}</td>
                        <td className="table-cell font-semibold text-leaf-700">{formatCurrency(o.total_amount)}</td>
                        <td className="table-cell"><StatusBadge status={o.order_status} /></td>
                        <td className="table-cell text-xs text-earth-500">{formatDateTime(o.order_date)}</td>
                        <td className="table-cell">
                          {o.order_status === 'Pending' && (
                            <button onClick={e => { e.stopPropagation(); markDelivered(o.order_id) }}
                              disabled={markingId === o.order_id}
                              className="text-xs bg-leaf-600 text-white px-3 py-1.5 rounded-lg hover:bg-leaf-700 transition-colors disabled:opacity-50 flex items-center gap-1">
                              <Truck className="w-3.5 h-3.5" />
                              {markingId === o.order_id ? t('delivery.dashboard.updating') : t('delivery.dashboard.markShipped')}
                            </button>
                          )}
                          {o.order_status === 'Shipped' && (
                            <button onClick={e => { e.stopPropagation(); markDelivered(o.order_id) }}
                              disabled={markingId === o.order_id}
                              className="text-xs bg-leaf-600 text-white px-3 py-1.5 rounded-lg hover:bg-leaf-700 transition-colors disabled:opacity-50 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {markingId === o.order_id ? t('delivery.dashboard.updating') : t('delivery.dashboard.markDelivered')}
                            </button>
                          )}
                          {o.order_status === 'Delivered' && (
                            <span className="text-xs text-leaf-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" /> {t('delivery.dashboard.done')}
                            </span>
                          )}
                        </td>
                      </tr>
                      {expanded === o.order_id && (
                        <tr className="bg-earth-50/70">
                          <td colSpan={6} className="px-5 py-3">
                            <div className="flex flex-col gap-2">
                              {o.delivery_address && (
                                <div className="flex items-start gap-1.5 text-xs text-earth-600">
                                  <MapPin className="w-3.5 h-3.5 mt-0.5 text-earth-400 shrink-0" />
                                  <span>{o.delivery_address}</span>
                                </div>
                              )}
                              <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide">{t('delivery.dashboard.items')}</p>
                              <div className="flex flex-wrap gap-x-6 gap-y-1">
                                {o.items.map((item, i) => (
                                  <span key={i} className="text-xs text-earth-700">
                                    {item.name} × {item.quantity} — {formatCurrency(item.price * item.quantity)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                }
              </tbody>
            </table>
            <div className="px-4 py-4">
              <Pagination page={page} totalPages={Math.ceil(total / limit)} total={total} limit={limit} onPage={setPage} />
            </div>
          </div>
        </>
      )}
 
      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="card overflow-x-auto">
          <div className="px-5 py-4 border-b border-earth-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-leaf-600" />
            <h2 className="font-semibold text-bark text-sm">{t('delivery.dashboard.completed')}</h2>
            <span className="ml-auto text-xs text-earth-500">
              {t('delivery.dashboard.totalDelivered', { count: histTotal })}
            </span>
          </div>
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>{[
                t('delivery.dashboard.orderId'),
                t('delivery.dashboard.customer'),
                t('delivery.dashboard.total'),
                t('delivery.dashboard.deliveredOn'),
                t('delivery.dashboard.address'),
              ].map(h => (
                <th key={h} className="table-header text-left">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {histLoading
                ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                : histOrders.length === 0
                ? <tr><td colSpan={5}><EmptyState title={t('delivery.dashboard.noDeliveries')} icon={CheckCircle} /></td></tr>
                : histOrders.map(o => (
                  <tr key={o.order_id} className="hover:bg-earth-50/50 transition-colors">
                    <td className="table-cell font-mono text-xs">#{o.order_id}</td>
                    <td className="table-cell font-medium text-sm">{o.customer_name}</td>
                    <td className="table-cell font-semibold text-leaf-700">{formatCurrency(o.total_amount)}</td>
                    <td className="table-cell text-xs text-earth-500">{formatDateTime(o.order_date)}</td>
                    <td className="table-cell text-xs text-earth-500 max-w-[180px] truncate">{o.delivery_address || '—'}</td>
                  </tr>
                ))
              }
            </tbody>
          </table>
          <div className="px-4 py-4">
            <Pagination page={histPage} totalPages={Math.ceil(histTotal / histLimit)} total={histTotal} limit={histLimit} onPage={setHistPage} />
          </div>
        </div>
      )}
    </div>
  )
}
 