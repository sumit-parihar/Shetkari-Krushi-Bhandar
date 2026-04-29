import { useState, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, ShoppingBag, Clock, Truck, CheckCircle,
  XCircle, IndianRupee, AlertTriangle, ArrowRight, Tag, Users
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { dashboardAPI, orderAPI, productAPI, authAPI } from '../../services/api'
import { StatsCard, PageLoader, StatusBadge } from '../../components/UI'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
 
export default function AdminDashboardPage() {
  const { t } = useTranslation()
  const [stats, setStats]                   = useState(null)
  const [recentOrders, setRecentOrders]     = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [totalUsers, setTotalUsers]         = useState(0)
  const [loading, setLoading]               = useState(true)
 
  const fetchAll = useCallback(() => {
    Promise.all([
      dashboardAPI.admin(),
      orderAPI.adminAll({ page: 1, limit: 6 }),
      productAPI.search({ low_stock: 'true', page: 1, page_size: 5 }),
      authAPI.getUsers({ page: 1, page_size: 1 }),
    ]).then(([statsRes, ordersRes, stockRes, usersRes]) => {
      setStats(statsRes.data.data)
      setRecentOrders(ordersRes.data.data?.orders || [])
      setLowStockProducts(stockRes.data.data?.products || [])
      setTotalUsers(usersRes.data.data?.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])
 
  useEffect(() => { fetchAll() }, [fetchAll])
 
  const statusData = [
    { name: t('status.pending'),   value: stats?.pending   || 0, color: '#f59e0b' },
    { name: t('status.shipped'),   value: stats?.shipped   || 0, color: '#3b82f6' },
    { name: t('status.delivered'), value: stats?.delivered || 0, color: '#4a9635' },
    { name: t('status.cancelled'), value: stats?.cancelled || 0, color: '#ef4444' },
  ]
 
  const cards = [
    { title: t('admin.dashboard.totalRevenue'), value: formatCurrency(stats?.revenue || 0), icon: IndianRupee, color: 'leaf', subtitle: t('admin.dashboard.revenueSubtitle') },
    { title: t('admin.dashboard.totalOrders'),  value: stats?.total_orders || 0,             icon: ShoppingBag, color: 'earth' },
    { title: t('admin.dashboard.pending'),      value: stats?.pending      || 0,             icon: Clock,       color: 'amber' },
    { title: t('admin.dashboard.shipped'),      value: stats?.shipped      || 0,             icon: Truck,       color: 'blue' },
    { title: t('admin.dashboard.delivered'),    value: stats?.delivered    || 0,             icon: CheckCircle, color: 'leaf' },
    { title: t('admin.dashboard.totalUsers'),   value: totalUsers,                           icon: Users,       color: 'soil' },
  ]
 
  const quickLinks = [
    { to: '/admin/products',   label: t('admin.dashboard.manageProducts'),   icon: Package,   color: 'bg-leaf-50 text-leaf-700 border-leaf-200' },
    { to: '/admin/categories', label: t('admin.dashboard.manageCategories'), icon: Tag,       color: 'bg-earth-50 text-earth-700 border-earth-200' },
    { to: '/admin/orders',     label: t('admin.dashboard.viewOrders'),       icon: ShoppingBag, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { to: '/admin/users',      label: t('admin.dashboard.manageUsers'),      icon: Users,     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ]
 
  return (
    <div className="p-6 animate-fade-in space-y-8">
      <div>
        <h1 className="page-header">{t('admin.dashboard.title')}</h1>
        <p className="text-earth-500 mt-1">{t('admin.dashboard.subtitle')}</p>
      </div>
 
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map(c => <StatsCard key={c.title} {...c} />)}
      </div>
 
      <div>
        <h2 className="font-display font-semibold text-bark mb-4">{t('admin.dashboard.quickActions')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map(({ to, label, icon: Icon, color }) => (
            <Link key={to} to={to}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-warm hover:-translate-y-0.5 ${color}`}>
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm font-semibold leading-snug">{label}</span>
              <ArrowRight className="w-3.5 h-3.5 ml-auto shrink-0 opacity-60" />
            </Link>
          ))}
        </div>
      </div>
 
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100">
            <h2 className="font-display font-semibold text-bark">{t('admin.dashboard.recentOrders')}</h2>
            <Link to="/admin/orders" className="text-sm text-leaf-600 hover:text-leaf-700 font-medium flex items-center gap-1">
              {t('admin.dashboard.viewAll')} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-5 py-10 text-center text-earth-400 text-sm">{t('admin.dashboard.noOrders')}</div>
          ) : (
            <div className="divide-y divide-earth-50">
              {recentOrders.map(o => (
                <div key={o.order_id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-bark">#{o.order_id}</p>
                      <StatusBadge status={o.order_status} />
                    </div>
                    <p className="text-xs text-earth-400 mt-0.5 truncate">{o.user_name} · {formatDateTime(o.order_date)}</p>
                  </div>
                  <span className="font-display font-bold text-leaf-700 text-sm shrink-0 ml-3">
                    {formatCurrency(o.total_amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
 
        <div className="space-y-6">
          {/* Low Stock */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="font-display font-semibold text-bark">{t('admin.dashboard.lowStock')}</h2>
              </div>
              <Link to="/admin/products" className="text-sm text-leaf-600 hover:text-leaf-700 font-medium flex items-center gap-1">
                {t('admin.dashboard.manage')} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {lowStockProducts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle className="w-8 h-8 text-leaf-400 mx-auto mb-2" />
                <p className="text-sm text-earth-400">{t('admin.dashboard.wellStocked')}</p>
              </div>
            ) : (
              <div className="divide-y divide-earth-50">
                {lowStockProducts.map(p => (
                  <div key={p.product_id} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm font-medium text-bark truncate mr-3">{p.name}</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      p.stock_quantity === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.stock_quantity === 0
                        ? t('admin.dashboard.outOfStock')
                        : t('admin.dashboard.left', { count: p.stock_quantity })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
 
          {/* Chart */}
          <div className="card p-5">
            <h2 className="font-display font-semibold text-bark mb-4">{t('admin.dashboard.ordersByStatus')}</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={statusData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9e5f26' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9e5f26' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5cfb0', fontFamily: 'DM Sans', fontSize: 12 }} cursor={{ fill: '#f2e8d9' }} />
                <Bar dataKey="value" radius={[5, 5, 0, 0]} maxBarSize={50}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
 