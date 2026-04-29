import { Fragment, useState, useCallback, useEffect } from 'react'
import { Search, ChevronDown, Package, Truck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { orderAPI, authAPI, addUpdateListener, removeUpdateListener } from '../../services/api'
import { StatusBadge, Pagination, EmptyState, TableRowSkeleton, Modal, Spinner } from '../../components/UI'
import { formatCurrency, formatDateTime, debounce } from '../../utils/helpers'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
 
const STATUS_KEYS = ['', 'Pending', 'Shipped', 'Delivered', 'Cancelled']
const VALID_TRANSITIONS = {
  Pending:   ['Shipped', 'Cancelled'],
  Shipped:   ['Delivered', 'Cancelled'],
  Delivered: [],
  Cancelled: [],
}
 
export default function AdminOrdersPage() {
  const { t } = useTranslation()
  const [orders, setOrders]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch]           = useState('')
  const [liveSearch, setLiveSearch]   = useState('')
  const [expanded, setExpanded]       = useState(null)
  const [updateModal, setUpdateModal] = useState(null)
  const [newStatus, setNewStatus]     = useState('')
  const [updating, setUpdating]       = useState(false)
  const [assignModal, setAssignModal] = useState(null)
  const [deliveryBoys, setDeliveryBoys] = useState([])
  const [selectedDb, setSelectedDb]   = useState('')
  const [assigning, setAssigning]     = useState(false)
  const limit = 15
 
  const debouncedSearch = useCallback(debounce(v => { setSearch(v); setPage(1) }, 400), [])
  useEffect(() => { debouncedSearch(liveSearch) }, [liveSearch])
 
  const fetchOrders = useCallback(() => {
    setLoading(true)
    const params = { page, limit }
    if (statusFilter && statusFilter !== 'All') params.status = statusFilter
    if (search) params.search = search
    orderAPI.adminAll(params)
      .then(r => {
        setOrders(r.data.data?.orders || [])
        setTotal(r.data.data?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, statusFilter, search])
 
  useEffect(() => { fetchOrders() }, [fetchOrders])
 
  useEffect(() => {
    const handleUpdate = (update) => {
      if (update.type === 'new_order' || update.type === 'order_status_changed') fetchOrders()
    }
    addUpdateListener(handleUpdate)
    return () => removeUpdateListener(handleUpdate)
  }, [fetchOrders])
 
  useEffect(() => {
    authAPI.getDeliveryBoys()
      .then(r => setDeliveryBoys(r.data.data?.delivery_boys || []))
      .catch(() => {})
  }, [])
 
  const openUpdate = (order) => {
    setUpdateModal({ order_id: order.order_id, current_status: order.order_status })
    setNewStatus(VALID_TRANSITIONS[order.order_status]?.[0] || '')
  }
 
  const handleUpdate = async () => {
    if (!newStatus) return
    setUpdating(true)
    try {
      await orderAPI.updateStatus(updateModal.order_id, { order_status: newStatus })
      toast.success(i18n.t('toast.orderUpdated', { orderId: updateModal.order_id, status: newStatus }))
      setUpdateModal(null)
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || i18n.t('errors.somethingWrong'))
    } finally {
      setUpdating(false)
    }
  }
 
  const openAssign = (order) => {
    setAssignModal({
      order_id: order.order_id,
      current_db: order.delivery_boy_id,
      current_db_name: order.delivery_boy_name,
    })
    setSelectedDb(order.delivery_boy_id ? String(order.delivery_boy_id) : '')
  }
 
  const handleAssign = async () => {
    setAssigning(true)
    try {
      await orderAPI.assignDeliveryBoy(assignModal.order_id, {
        delivery_boy_id: selectedDb ? Number(selectedDb) : null,
      })
      const isUnassign = !selectedDb && assignModal?.current_db
      const isReassign = selectedDb && assignModal?.current_db
      if (isUnassign) toast.success(i18n.t('toast.deliveryBoyRemoved',   { orderId: assignModal.order_id }))
      else if (isReassign) toast.success(i18n.t('toast.deliveryBoyReassigned', { orderId: assignModal.order_id }))
      else toast.success(i18n.t('toast.deliveryBoyAssigned', { orderId: assignModal.order_id }))
      setAssignModal(null)
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || i18n.t('errors.somethingWrong'))
    } finally {
      setAssigning(false)
    }
  }
 
  const statusLabels = [
    t('status.all'),
    t('status.pending'),
    t('status.shipped'),
    t('status.delivered'),
    t('status.cancelled'),
  ]
 
  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">{t('admin.orders.title')}</h1>
          <p className="text-earth-500 text-sm mt-0.5">{t('admin.orders.total', { count: total })}</p>
        </div>
      </div>
 
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
          <input className="input-field pl-10" placeholder={t('admin.orders.searchPlaceholder')}
            value={liveSearch} onChange={e => setLiveSearch(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
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
      </div>
 
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              {[
                t('admin.orders.orderId'),
                t('admin.orders.customer'),
                t('admin.orders.totalCol'),
                t('admin.orders.status'),
                t('admin.orders.deliveryBoy'),
                t('admin.orders.date'),
                t('admin.orders.actions'),
              ].map(h => <th key={h} className="table-header text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
              : orders.length === 0
              ? <tr><td colSpan={7}><EmptyState title={t('common.nothingHere')} icon={Package} /></td></tr>
              : orders.map(o => (
                <Fragment key={o.order_id}>
                  <tr className="hover:bg-earth-50/50 transition-colors cursor-pointer"
                    onClick={() => setExpanded(expanded === o.order_id ? null : o.order_id)}>
                    <td className="table-cell font-mono text-xs">#{o.order_id}</td>
                    <td className="table-cell font-medium text-sm">{o.user_name}</td>
                    <td className="table-cell font-semibold text-leaf-700">{formatCurrency(o.total_amount)}</td>
                    <td className="table-cell"><StatusBadge status={o.order_status} /></td>
                    <td className="table-cell text-xs">
                      {o.delivery_boy_name
                        ? <span className="flex items-center gap-1 text-leaf-700"><Truck className="w-3 h-3" />{o.delivery_boy_name}</span>
                        : <span className="text-earth-400 italic">{t('admin.orders.unassigned')}</span>
                      }
                    </td>
                    <td className="table-cell text-xs text-earth-500">{formatDateTime(o.order_date)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        {VALID_TRANSITIONS[o.order_status]?.length > 0 && (
                          <button onClick={e => { e.stopPropagation(); openUpdate(o) }}
                            className="text-xs border border-earth-200 px-2.5 py-1 rounded-lg hover:bg-earth-100 text-earth-600 hover:text-leaf-700 transition-colors flex items-center gap-1">
                            {t('admin.orders.update')} <ChevronDown className="w-3 h-3" />
                          </button>
                        )}
                        {['Pending', 'Shipped'].includes(o.order_status) && (
                          <button onClick={e => { e.stopPropagation(); openAssign(o) }}
                            className="text-xs border border-earth-200 px-2.5 py-1 rounded-lg hover:bg-earth-100 text-earth-600 hover:text-leaf-700 transition-colors flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            {o.delivery_boy_id ? t('admin.orders.reassign') : t('admin.orders.assign')}
                          </button>
                        )}
                        <span className={`text-xs text-earth-400 transition-transform ${expanded === o.order_id ? 'rotate-180' : ''}`}>▼</span>
                      </div>
                    </td>
                  </tr>
                  {expanded === o.order_id && (
                    <tr className="bg-earth-50/70">
                      <td colSpan={7} className="px-5 py-3">
                        <p className="text-xs font-semibold text-earth-500 mb-2 uppercase tracking-wide">{t('admin.orders.orderItems')}</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-1">
                          {o.items.map((item, i) => (
                            <span key={i} className="text-xs text-earth-700">
                              {item.name} × {item.quantity} — {formatCurrency(item.price * item.quantity)}
                            </span>
                          ))}
                        </div>
                        {o.delivery_address && (
                          <p className="text-xs text-earth-500 mt-2">
                            <span className="font-semibold">{t('admin.orders.deliveryAddress')}:</span> {o.delivery_address}
                          </p>
                        )}
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
 
      {/* Update Status Modal */}
      <Modal open={!!updateModal} onClose={() => setUpdateModal(null)}
        title={t('admin.orders.updateTitle', { orderId: updateModal?.order_id })} size="sm">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-earth-600 mb-3 flex items-center gap-2">
              {t('admin.orders.currentStatus')} <StatusBadge status={updateModal?.current_status} />
            </p>
            <label className="block text-sm font-medium mb-1.5">{t('admin.orders.newStatus')}</label>
            <div className="space-y-2">
              {VALID_TRANSITIONS[updateModal?.current_status]?.map(s => (
                <label key={s} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${newStatus === s ? 'border-leaf-400 bg-leaf-50' : 'border-earth-200 hover:border-earth-300'}`}>
                  <input type="radio" name="status" value={s} checked={newStatus === s} onChange={() => setNewStatus(s)} className="accent-leaf-600" />
                  <StatusBadge status={s} />
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setUpdateModal(null)} className="btn-secondary">{t('admin.orders.cancel')}</button>
            <button onClick={handleUpdate} disabled={updating || !newStatus} className="btn-primary">
              {updating ? <Spinner size="sm" /> : t('admin.orders.updateStatus')}
            </button>
          </div>
        </div>
      </Modal>
 
      {/* Assign Modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)}
        title={`${assignModal?.current_db ? t('admin.orders.reassign') : t('admin.orders.assignTitle')} — #${assignModal?.order_id}`}
        size="sm">
        <div className="space-y-4">
          {assignModal?.current_db && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-semibold text-amber-800 mb-2 uppercase">{t('admin.orders.currentlyAssigned')}</p>
              <div className="flex items-center gap-3">
                <Truck className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-sm font-semibold text-bark">{assignModal.current_db_name}</p>
                  <p className="text-xs text-earth-500">ID: {assignModal.current_db}</p>
                </div>
              </div>
            </div>
          )}
 
          {deliveryBoys.length === 0 ? (
            <div className="text-center py-6">
              <Truck className="w-10 h-10 text-earth-300 mx-auto mb-2" />
              <p className="text-sm text-earth-500">{t('admin.orders.noDeliveryBoys')}</p>
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium mb-1.5">{t('admin.orders.selectDeliveryBoy')}</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {assignModal?.current_db && (
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${!selectedDb ? 'border-red-300 bg-red-50' : 'border-earth-200 hover:border-earth-300'}`}>
                    <input type="radio" name="db" value="" checked={!selectedDb} onChange={() => setSelectedDb('')} className="accent-red-600" />
                    <div>
                      <p className="text-sm font-medium text-red-700">{t('admin.orders.unassign')}</p>
                    </div>
                  </label>
                )}
                {deliveryBoys.map(db => (
                  <label key={db.user_id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selectedDb === String(db.user_id) ? 'border-leaf-400 bg-leaf-50' : 'border-earth-200 hover:border-earth-300'}`}>
                    <input type="radio" name="db" value={db.user_id} checked={selectedDb === String(db.user_id)} onChange={() => setSelectedDb(String(db.user_id))} className="accent-leaf-600" />
                    <div>
                      <p className="text-sm font-medium text-bark">{db.name}</p>
                      <p className="text-xs text-earth-400">{db.phone || db.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </>
          )}
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setAssignModal(null)} className="btn-secondary">{t('admin.orders.cancel')}</button>
            {deliveryBoys.length > 0 && (
              <button onClick={handleAssign} disabled={assigning} className="btn-primary">
                {assigning ? <Spinner size="sm" /> : (!selectedDb ? t('admin.orders.unassign') : assignModal?.current_db ? t('admin.orders.reassign') : t('admin.orders.assign'))}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
 