import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, Users, Tag, Leaf, ChevronRight, BarChart2 } from 'lucide-react'

const links = [
  { to: '/admin',          label: 'Dashboard',  icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products',   icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/orders',   label: 'Orders',     icon: ShoppingBag },
  { to: '/admin/users',    label: 'Users',      icon: Users },
  { to: '/admin/reports',  label: 'Reports',    icon: BarChart2 },
]

export default function AdminSidebar() {
  return (
    <aside className="w-60 shrink-0 hidden lg:flex flex-col bg-white border-r border-earth-100 min-h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 border-b border-earth-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-soil-100 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-soil-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-bark">Admin Panel</p>
            <p className="text-[10px] text-earth-400">Management Console</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? 'nav-link-active group' : 'nav-link group'
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`w-4 h-4 ${isActive ? 'text-leaf-700' : 'text-earth-400 group-hover:text-leaf-600'}`} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-leaf-500" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

// Mobile admin nav
export function AdminMobileNav() {
  return (
    <div className="lg:hidden flex overflow-x-auto gap-1 px-4 py-2 border-b border-earth-100 bg-white">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              isActive ? 'bg-leaf-50 text-leaf-700' : 'text-earth-600 hover:bg-earth-50'
            }`
          }
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </NavLink>
      ))}
    </div>
  )
}
