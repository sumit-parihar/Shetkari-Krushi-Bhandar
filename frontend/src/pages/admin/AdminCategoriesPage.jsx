import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { categoryAPI } from '../../services/api'
import { Modal, ConfirmDialog, EmptyState, Spinner } from '../../components/UI'
import toast from 'react-hot-toast'

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [form, setForm] = useState({ category_name: '', description: '' })
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState(null)

  const fetch = () => {
    setLoading(true)
    categoryAPI.list().then(r => setCategories(r.data.data || [])).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(fetch, [])

  const openAdd = () => { setEditCat(null); setForm({ category_name: '', description: '' }); setFormError(''); setModalOpen(true) }
  const openEdit = (c) => { setEditCat(c); setForm({ category_name: c.category_name, description: c.description || '' }); setFormError(''); setModalOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.category_name.trim()) { setFormError('Category name is required'); return }
    setSubmitting(true)
    try {
      if (editCat) {
        await categoryAPI.update(editCat.category_id, form)
        toast.success('Category updated')
      } else {
        await categoryAPI.add(form)
        toast.success('Category added')
      }
      setModalOpen(false)
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await categoryAPI.delete(id)
      toast.success('Category deleted')
      fetch()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete category')
    }
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Categories</h1>
          <p className="text-earth-500 text-sm mt-0.5">{categories.length} categories</p>
        </div>
        <button onClick={openAdd} className="btn-primary"><Plus className="w-4 h-4" /> Add Category</button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-24 skeleton" />)}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState title="No categories" desc="Add your first category" icon={Tag} />
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map(c => (
            <div key={c.category_id} className="card p-4 group hover:shadow-warm-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-leaf-100 rounded-xl flex items-center justify-center shrink-0">
                    <Tag className="w-4 h-4 text-leaf-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-display font-semibold text-bark text-sm">{c.category_name}</p>
                    {c.description && <p className="text-xs text-earth-500 mt-0.5 truncate">{c.description}</p>}
                    <p className="text-xs text-earth-400 mt-0.5 font-mono">ID #{c.category_id}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-earth-100 text-earth-400 hover:text-leaf-700 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(c.category_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-earth-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editCat ? 'Edit Category' : 'Add Category'} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Category Name *</label>
            <input
              className={`input-field ${formError ? 'border-red-400' : ''}`}
              value={form.category_name}
              onChange={e => { setForm(p => ({ ...p, category_name: e.target.value })); setFormError('') }}
              placeholder="e.g. Seeds & Fertilizers"
            />
            {formError && <p className="text-red-500 text-xs mt-1">{formError}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Optional description…"
            />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Spinner size="sm" /> : editCat ? 'Update' : 'Add Category'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Delete Category"
        message="Delete this category? Products in this category will lose their category association."
        danger
      />
    </div>
  )
}
