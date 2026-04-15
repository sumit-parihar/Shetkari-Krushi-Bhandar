import { useState, useEffect, useCallback } from 'react'
import { Search, Pencil, Trash2, Users } from 'lucide-react'
import { authAPI } from '../../services/api'
import { Modal, ConfirmDialog, Pagination, EmptyState, TableRowSkeleton, Spinner } from '../../components/UI'
import { formatDate, debounce } from '../../utils/helpers'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [liveSearch, setLiveSearch] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'customer', phone: '', address: '' })
  const [submitting, setSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const PAGE_SIZE = 15

  const debouncedSearch = useCallback(debounce(v => { setSearch(v); setPage(1) }, 400), [])
  useEffect(() => { debouncedSearch(liveSearch) }, [liveSearch])

  const fetchUsers = useCallback(() => {
    setLoading(true)
    const params = { page, page_size: PAGE_SIZE }
    if (search) params.search = search
    authAPI.getUsers(params)
      .then(r => {
        setUsers(r.data.data?.users || [])
        setTotal(r.data.data?.total || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const openEdit = (u) => {
    setEditUser(u)
    setForm({ name: u.name, email: u.email, role: u.role, phone: u.phone || '', address: u.address || '' })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await authAPI.updateUser(editUser.user_id, form)
      toast.success('User updated')
      setEditUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await authAPI.deleteUser(id)
      toast.success('User deleted')
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete user')
    }
  }

  return (
    <div className="p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Users</h1>
          <p className="text-earth-500 text-sm mt-0.5">{total} registered users</p>
        </div>
      </div>

      <div className="relative mb-5 max-w-xs">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
        <input className="input-field pl-10" placeholder="Search by name or email…" value={liveSearch} onChange={e => setLiveSearch(e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              {['ID', 'Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                <th key={h} className="table-header text-left">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 10 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
              : users.length === 0
              ? <tr><td colSpan={6}><EmptyState title="No users found" icon={Users} /></td></tr>
              : users.map(u => (
                <tr key={u.user_id} className="hover:bg-earth-50/50 transition-colors">
                  <td className="table-cell font-mono text-xs text-earth-400">#{u.user_id}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-leaf-100 flex items-center justify-center shrink-0">
                        <span className="text-leaf-700 font-semibold text-xs">{u.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-sm text-bark">{u.name}</span>
                      {u.user_id === currentUser?.user_id && (
                        <span className="text-[10px] bg-earth-100 text-earth-600 px-1.5 py-0.5 rounded font-medium">You</span>
                      )}
                    </div>
                  </td>
                  <td className="table-cell text-sm text-earth-600">{u.email}</td>
                  <td className="table-cell">
                    <span className={`badge text-xs ${u.role === 'admin' ? 'bg-soil-100 text-soil-700' : u.role === 'delivery_boy' ? 'bg-blue-100 text-blue-700' : 'bg-leaf-100 text-leaf-700'}`}>
                      {u.role === 'delivery_boy' ? 'Delivery Boy' : u.role}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-earth-500">{formatDate(u.created_at)}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-earth-100 text-earth-400 hover:text-leaf-700 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {u.user_id !== currentUser?.user_id && (
                        <button onClick={() => setDeleteId(u.user_id)} className="p-1.5 rounded-lg hover:bg-red-50 text-earth-400 hover:text-red-600 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
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

      {/* Edit Modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="md">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input className="input-field" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <input type="email" className="input-field" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Role</label>
              <select className="input-field" value={form.role} onChange={e => setForm(p => ({...p, role: e.target.value}))}>
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
                <option value="delivery_boy">Delivery Boy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input className="input-field" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="Optional" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Address</label>
              <textarea className="input-field resize-none" rows={2} value={form.address} onChange={e => setForm(p => ({...p, address: e.target.value}))} placeholder="Optional" />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={() => setEditUser(null)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? <Spinner size="sm" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Delete User"
        message="Are you sure? This will permanently delete this user and may fail if they have associated orders."
        danger
      />
    </div>
  )
}
