import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, ShoppingBag, Clock, Truck, CheckCircle,
  XCircle, DollarSign, AlertTriangle, ArrowRight, Tag, Users
} from 'lucide-react'
import { dashboardAPI, orderAPI, productAPI, authAPI } from '../../services/api'
import { useAutoRefresh } from '../../hooks/useAutoRefresh'
import { StatsCard, PageLoader, StatusBadge } from '../../components/UI'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [loading, setLoading] = useState(true)

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

  useAutoRefresh(fetchAll, 5000)

  if (loading) return <PageLoader />

  const statusData = [
    { name: 'Pending', value: stats?.pending || 0, color: '#f59e0b' },
    { name: 'Shipped', value: stats?.shipped || 0, color: '#3b82f6' },
    { name: 'Delivered', value: stats?.delivered || 0, color: '#4a9635' },
    { name: 'Cancelled', value: stats?.cancelled || 0, color: '#ef4444' },
  ]

  const cards = [
    { title: 'Total Revenue', value: formatCurrency(stats?.revenue || 0), icon: DollarSign, color: 'leaf', subtitle: 'Excl. cancelled' },
    { title: 'Total Orders', value: stats?.total_orders || 0, icon: ShoppingBag, color: 'earth' },
    { title: 'Pending', value: stats?.pending || 0, icon: Clock, color: 'amber' },
    { title: 'Shipped', value: stats?.shipped || 0, icon: Truck, color: 'blue' },
    { title: 'Delivered', value: stats?.delivered || 0, icon: CheckCircle, color: 'leaf' },
    { title: 'Total Users', value: totalUsers, icon: Users, color: 'soil' },
  ]

  const quickLinks = [
    { to: '/admin/products', label: 'Manage Products', icon: Package, color: 'bg-leaf-50 text-leaf-700 border-leaf-200' },
    { to: '/admin/categories', label: 'Manage Categories', icon: Tag, color: 'bg-earth-50 text-earth-700 border-earth-200' },
    { to: '/admin/orders', label: 'View All Orders', icon: ShoppingBag, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { to: '/admin/users', label: 'Manage Users', icon: Users, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  ]

  return (
    <div className="p-6 animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="page-header">Admin Dashboard</h1>
        <p className="text-earth-500 mt-1">Here's what's happening in your store today</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map(c => <StatsCard key={c.title} {...c} />)}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display font-semibold text-bark mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickLinks.map(({ to, label, icon: Icon, color }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all hover:shadow-warm hover:-translate-y-0.5 ${color}`}
            >
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
            <h2 className="font-display font-semibold text-bark">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm text-leaf-600 hover:text-leaf-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="px-5 py-10 text-center text-earth-400 text-sm">No orders yet</div>
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
          {/* Low Stock Alert */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-earth-100">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h2 className="font-display font-semibold text-bark">Low Stock</h2>
              </div>
              <Link to="/admin/products" className="text-sm text-leaf-600 hover:text-leaf-700 font-medium flex items-center gap-1">
                Manage <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {lowStockProducts.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <CheckCircle className="w-8 h-8 text-leaf-400 mx-auto mb-2" />
                <p className="text-sm text-earth-400">All products are well stocked</p>
              </div>
            ) : (
              <div className="divide-y divide-earth-50">
                {lowStockProducts.map(p => (
                  <div key={p.product_id} className="flex items-center justify-between px-5 py-3">
                    <p className="text-sm font-medium text-bark truncate mr-3">{p.name}</p>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${
                      p.stock_quantity === 0
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {p.stock_quantity === 0 ? 'Out of stock' : `${p.stock_quantity} left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chart */}
          <div className="card p-5">
            <h2 className="font-display font-semibold text-bark mb-4">Orders by Status</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={statusData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9e5f26' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9e5f26' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e5cfb0', fontFamily: 'DM Sans', fontSize: 12 }}
                  cursor={{ fill: '#f2e8d9' }}
                />
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
