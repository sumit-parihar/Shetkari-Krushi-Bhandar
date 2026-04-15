import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import { RequireCustomer, RequireAdmin, RequireDeliveryBoy, RedirectIfLoggedIn, RequireAuth } from './components/ProtectedRoutes'

// Public pages
import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import ProductDetailPage from './pages/ProductDetailPage'
import { LoginPage, RegisterPage } from './pages/AuthPages'

// Customer pages
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import { CustomerDashboardPage, OrdersPage } from './pages/CustomerPages'
import ProfilePage from './pages/ProfilePage'

// Delivery boy pages
import DeliveryDashboardPage from './pages/DeliveryDashboardPage'

// Admin pages
import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminReportsPage from './pages/admin/AdminReportsPage'

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
      <span className="text-7xl">🌾</span>
      <h1 className="font-display text-4xl font-bold text-bark">404</h1>
      <p className="text-earth-500 text-lg">This page doesn't exist.</p>
      <a href="/" className="btn-primary mt-2">Go Home</a>
    </div>
  )
}

function AppShell({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<AppShell><HomePage /></AppShell>} />
          <Route path="/products" element={<AppShell><ProductsPage /></AppShell>} />
          <Route path="/products/:id" element={<AppShell><ProductDetailPage /></AppShell>} />

          {/* Auth routes */}
          <Route path="/login" element={
            <AppShell>
              <RedirectIfLoggedIn><LoginPage /></RedirectIfLoggedIn>
            </AppShell>
          } />
          <Route path="/register" element={
            <AppShell>
              <RedirectIfLoggedIn><RegisterPage /></RedirectIfLoggedIn>
            </AppShell>
          } />

          {/* Customer routes */}
          <Route path="/cart" element={
            <AppShell>
              <RequireCustomer><CartPage /></RequireCustomer>
            </AppShell>
          } />
          <Route path="/checkout" element={
            <AppShell>
              <RequireCustomer><CheckoutPage /></RequireCustomer>
            </AppShell>
          } />
          <Route path="/dashboard" element={
            <AppShell>
              <RequireCustomer><CustomerDashboardPage /></RequireCustomer>
            </AppShell>
          } />
          <Route path="/orders" element={
            <AppShell>
              <RequireCustomer><OrdersPage /></RequireCustomer>
            </AppShell>
          } />

          {/* Delivery Boy routes */}
          <Route path="/delivery" element={
            <AppShell>
              <RequireDeliveryBoy><DeliveryDashboardPage /></RequireDeliveryBoy>
            </AppShell>
          } />

          {/* Profile — accessible to ALL logged-in users */}
          <Route path="/profile" element={
            <AppShell>
              <RequireAuth><ProfilePage /></RequireAuth>
            </AppShell>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={
            <AppShell>
              <RequireAdmin><AdminLayout /></RequireAdmin>
            </AppShell>
          }>
            <Route index element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
          </Route>

          <Route path="*" element={<AppShell><NotFound /></AppShell>} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  )
}
