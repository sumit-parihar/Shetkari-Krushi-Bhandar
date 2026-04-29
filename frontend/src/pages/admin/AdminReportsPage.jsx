import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'
import { TrendingUp, Download, Package, Tag, Truck, ShoppingBag } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { dashboardAPI } from '../../services/api'
import { PageLoader } from '../../components/UI'
import { formatCurrency } from '../../utils/helpers'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
 
export default function AdminReportsPage() {
  const { t } = useTranslation()
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [exporting, setExporting] = useState(false)
 
  useEffect(() => {
    dashboardAPI.report()
      .then(r => setData(r.data.data))
      .catch(() => toast.error(i18n.t('toast.failedToLoadReport')))
      .finally(() => setLoading(false))
  }, [])
 
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await dashboardAPI.exportCSV()
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }))
      const a   = document.createElement('a')
      a.href    = url
      a.download = `orders_export_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(i18n.t('admin.reports.exportSuccess'))
    } catch {
      toast.error(i18n.t('admin.reports.exportFailed'))
    } finally {
      setExporting(false)
    }
  }
 
  if (loading) return <PageLoader />
 
  const monthly        = data?.monthly || []
  const totalRevenue   = monthly.reduce((s, m) => s + (m.revenue      || 0), 0)
  const totalOrders    = monthly.reduce((s, m) => s + (m.total_orders  || 0), 0)
  const totalDelivered = monthly.reduce((s, m) => s + (m.delivered     || 0), 0)
  const totalCancelled = monthly.reduce((s, m) => s + (m.cancelled     || 0), 0)
 
  const chartData = monthly.map(m => ({
    ...m,
    label: m.month ? m.month.slice(0, 7) : m.month,
  }))
 
  const COLORS = ['#4a9635', '#e89a27', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4']
 
  const summaryCards = [
    { label: t('admin.reports.totalRevenue'), value: formatCurrency(totalRevenue), icon: TrendingUp,  color: 'bg-leaf-50 text-leaf-700 border-leaf-200' },
    { label: t('admin.reports.totalOrders'),  value: totalOrders,                  icon: ShoppingBag, color: 'bg-earth-50 text-earth-700 border-earth-200' },
    { label: t('admin.reports.delivered'),    value: totalDelivered,               icon: Truck,       color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: t('admin.reports.cancelled'),    value: totalCancelled,               icon: Package,     color: 'bg-red-50 text-red-700 border-red-200' },
  ]
 
  return (
    <div className="p-6 animate-fade-in space-y-6">
 
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="section-title">{t('admin.reports.title')}</h1>
          <p className="text-earth-500 text-sm mt-0.5">{t('admin.reports.subtitle')}</p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          {exporting ? t('admin.reports.exporting') : t('admin.reports.exportCSV')}
        </button>
      </div>
 
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map(c => (
          <div key={c.label} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-earth-500 font-medium">{c.label}</p>
                <p className="font-display text-2xl font-bold text-bark mt-1">{c.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${c.color}`}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
 
      {/* Monthly Revenue Line Chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-bark mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-leaf-600" /> {t('admin.reports.monthlyRevenue')} (₹)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2e8d9" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9e5f26' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9e5f26' }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v, name) => [
                  name === 'revenue' ? formatCurrency(v) : v,
                  name === 'revenue' ? t('admin.reports.revenue') : t('admin.reports.orders'),
                ]}
                contentStyle={{ borderRadius: 10, border: '1px solid #e5cfb0', fontSize: 12 }}
              />
              <Legend formatter={n => n === 'revenue' ? t('admin.reports.revenue') : t('admin.reports.orders')} />
              <Line type="monotone" dataKey="revenue"      stroke="#4a9635" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="total_orders" stroke="#e89a27" strokeWidth={2}   dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
 
      <div className="grid lg:grid-cols-2 gap-6">
 
        {/* Top Products */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-bark mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-leaf-600" /> {t('admin.reports.topProducts')}
          </h2>
          {!data?.top_products?.length ? (
            <p className="text-earth-400 text-sm text-center py-6">{t('admin.reports.noData')}</p>
          ) : (
            <div className="space-y-2">
              {data.top_products.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-earth-400 w-5 shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-sm font-medium text-bark truncate max-w-[160px]">{p.name}</span>
                      <span className="text-xs text-earth-500 shrink-0 ml-2">{p.total_sold} {t('admin.reports.units')}</span>
                    </div>
                    <div className="h-1.5 bg-earth-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-leaf-500 rounded-full"
                        style={{ width: `${Math.min(100, (p.total_sold / (data.top_products[0]?.total_sold || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-leaf-700 shrink-0">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
 
        {/* Revenue by Category */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-bark mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-leaf-600" /> {t('admin.reports.revenueByCategory')}
          </h2>
          {!data?.top_categories?.length ? (
            <p className="text-earth-400 text-sm text-center py-6">{t('admin.reports.noData')}</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.top_categories} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9e5f26' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="category_name" tick={{ fontSize: 11, fill: '#4a3728' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip formatter={v => formatCurrency(v)} contentStyle={{ borderRadius: 10, border: '1px solid #e5cfb0', fontSize: 12 }} />
                <Bar dataKey="revenue" radius={[0, 5, 5, 0]} maxBarSize={28}>
                  {data.top_categories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
 
      {/* Delivery Boy Performance */}
      {data?.delivery_perf?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-display font-semibold text-bark mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-leaf-600" /> {t('admin.reports.deliveryBoyPerformance')}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr>
                  {[
                    t('admin.reports.deliveryBoy'),
                    t('admin.reports.totalAssigned'),
                    t('admin.reports.delivered'),
                    t('admin.reports.completionRate'),
                  ].map(h => <th key={h} className="table-header text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.delivery_perf.map((d, i) => {
                  const rate = d.total_assigned > 0
                    ? Math.round((d.delivered / d.total_assigned) * 100)
                    : 0
                  return (
                    <tr key={i} className="hover:bg-earth-50/50 transition-colors">
                      <td className="table-cell font-medium text-sm">{d.name}</td>
                      <td className="table-cell text-sm">{d.total_assigned}</td>
                      <td className="table-cell text-sm text-leaf-700 font-semibold">{d.delivered}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-earth-100 rounded-full overflow-hidden max-w-[80px]">
                            <div className="h-full bg-leaf-500 rounded-full" style={{ width: `${rate}%` }} />
                          </div>
                          <span className="text-xs font-medium text-earth-600">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
 