import { Outlet } from 'react-router-dom'
import AdminSidebar, { AdminMobileNav } from '../../components/AdminSidebar'

export default function AdminLayout() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminMobileNav />
        <main className="flex-1 bg-cream">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
