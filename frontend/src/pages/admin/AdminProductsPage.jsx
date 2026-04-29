import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Search, Package } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productAPI, categoryAPI } from '../../services/api'
import { Modal, ConfirmDialog, Pagination, EmptyState, TableRowSkeleton, Spinner } from '../../components/UI'
import { formatCurrency, debounce } from '../../utils/helpers'
import i18n from '../../i18n'
import toast from 'react-hot-toast'
 
const EMPTY_FORM = { name: '', description: '', price: '', stock_quantity: '', category_id: '', image_url: '' }
 
export default function AdminProductsPage() {
  const { t } = useTranslation()
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading]       = useState(true)
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [liveSearch, setLiveSearch] = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId]     = useState(null)
  const PAGE_SIZE = 10
 
  const debouncedSearch = useCallback(debounce(v => { setSearch(v); setPage(1) }, 400), [])
  useEffect(() => { debouncedSearch(liveSearch) }, [liveSearch])
 
  useEffect(() => {
    categoryAPI.list().then(r => setCategories(r.data.data || [])).catch(() => {})
  }, [])
 
  const fetchProducts = useCallback(() => {
    setLoading(true)
    const params = { page, page_size: PAGE_SIZE }
    const fn = search
      ? productAPI.search({ ...params, keyword: search })
      : productAPI.list(params)
    fn.then(r => {
      setProducts(r.data.data?.products || [])
      setTotal(r.data.data?.total || 0)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [page, search])
 
  useEffect(() => { fetchProducts() }, [fetchProducts])
 
  const openAdd = () => { setEditProduct(null); setForm(EMPTY_FORM); setFormErrors({}); setModalOpen(true) }
  const openEdit = (p) => {
    setEditProduct(p)
    setForm({ name: p.name, description: p.description || '', price: p.price, stock_quantity: p.stock_quantity, category_id: p.category_id || '', image_url: p.image_url || '' })
    setFormErrors({})
    setModalOpen(true)
  }
 
  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = t('common.required')
    if (!form.price || isNaN(form.price) || +form.price < 0) e.price = t('common.validPriceRequired')
    if ((!form.stock_quantity && form.stock_quantity !== 0) || isNaN(form.stock_quantity) || +form.stock_quantity < 0) e.stock_quantity = t('common.validStockRequired')
    setFormErrors(e)
    return !Object.keys(e).length
  }
 
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    const payload = { ...form, price: +form.price, stock_quantity: +form.stock_quantity, category_id: form.category_id ? +form.category_id : null }
    try {
      if (editProduct) {
        await productAPI.update(editProduct.product_id, payload)
        toast.success(i18n.t('toast.productUpdated'))
      } else {
        await productAPI.add(payload)
        toast.success(i18n.t('toast.productAdded'))
      }
      setModalOpen(false)
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.message || i18n.t('errors.somethingWrong'))
    } finally {
      setSubmitting(false)
    }
  }
 
  const handleDelete = async (id) => {
    try {
      await productAPI.delete(id)
      toast.success(i18n.t('toast.productDeleted'))
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.message || i18n.t('errors.somethingWrong'))
    }
  }
 
  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">{t('admin.products.title')}</h1>
          <p className="text-earth-500 text-sm mt-0.5">{t('admin.products.total', { count: total })}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus className="w-4 h-4" /> {t('admin.products.addProduct')}
        </button>
      </div>
 
      <div className="relative mb-5 max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
        <input
          type="text"
          className="input-field pl-10"
          placeholder={t('Search Product')}
          value={liveSearch}
          onChange={e => setLiveSearch(e.target.value)}
        />
      </div>
 
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              {[t('admin.products.id'), t('admin.products.name'), t('admin.products.category'), t('admin.products.price'), t('admin.products.stock'), t('admin.products.actions')].map(h => (
                <th key={h} className="table-header text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              : products.length === 0
              ? (
                <tr><td colSpan={6}>
                  <EmptyState title={t('admin.products.noProducts')} desc={t('admin.products.noProductsDesc')} icon={Package} />
                </td></tr>
              )
              : products.map(p => (
                <tr key={p.product_id} className="hover:bg-earth-50/50 transition-colors">
                  <td className="table-cell font-mono text-xs text-earth-400">#{p.product_id}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-earth-100">
                        {p.image_url
                          ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                          : <div className="w-full h-full product-img-placeholder flex items-center justify-center text-sm">🌾</div>
                        }
                      </div>
                      <span className="font-medium text-sm text-bark max-w-[200px] truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="table-cell text-sm text-earth-500">{p.category_name || '—'}</td>
                  <td className="table-cell font-semibold text-leaf-700">{formatCurrency(p.price)}</td>
                  <td className="table-cell">
                    <span className={`font-medium text-sm ${p.stock_quantity === 0 ? 'text-red-600' : p.stock_quantity < 10 ? 'text-amber-600' : 'text-bark'}`}>
                      {p.stock_quantity}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-earth-100 text-earth-500 hover:text-leaf-700 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(p.product_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-earth-500 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
        <div className="px-4 py-4">
          <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} total={total} limit={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>
 
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editProduct ? t('admin.products.editProduct') : t('admin.products.addProductTitle')} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">{t('admin.products.productName')} *</label>
              <input className={`input-field ${formErrors.name ? 'border-red-400' : ''}`} value={form.name}
                onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Organic Tomato Seeds" />
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('admin.products.priceLabel')} (₹) *</label>
              <input type="number" min="0" step="0.01" className={`input-field ${formErrors.price ? 'border-red-400' : ''}`}
                value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} placeholder="0.00" />
              {formErrors.price && <p className="text-red-500 text-xs mt-1">{formErrors.price}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('admin.products.stockQuantity')} *</label>
              <input type="number" min="0" className={`input-field ${formErrors.stock_quantity ? 'border-red-400' : ''}`}
                value={form.stock_quantity} onChange={e => setForm(p => ({...p, stock_quantity: e.target.value}))} placeholder="0" />
              {formErrors.stock_quantity && <p className="text-red-500 text-xs mt-1">{formErrors.stock_quantity}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('admin.products.category')}</label>
              <select className="input-field" value={form.category_id} onChange={e => setForm(p => ({...p, category_id: e.target.value}))}>
                <option value="">{t('admin.products.noCategory')}</option>
                {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{t('admin.products.imageUrl')}</label>
              <input className="input-field" value={form.image_url}
                onChange={e => setForm(p => ({...p, image_url: e.target.value}))} placeholder="https://…" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">{t('admin.products.description')}</label>
              <textarea className="input-field resize-none" rows={3} value={form.description}
                onChange={e => setForm(p => ({...p, description: e.target.value}))}
                placeholder={t('admin.products.descriptionPlaceholder')} />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">{t('admin.products.cancel')}</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Spinner size="sm" /> : editProduct ? t('admin.products.update') : t('admin.products.addProduct')}
            </button>
          </div>
        </form>
      </Modal>
 
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title={t('admin.products.delete')}
        message={t('admin.products.deleteConfirm')}
        danger
      />
    </div>
  )
}
 