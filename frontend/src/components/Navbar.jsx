import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingCart, LogOut, Menu, X, Leaf, ChevronDown, Package, LayoutDashboard, Home, UserCog } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useTranslation } from 'react-i18next'
import i18n from '../i18n'
 
function LanguageSwitcher() {
  const currentLang = i18n.language?.startsWith('mr') ? 'mr' : 'en'
 
  const toggle = () => {
    const next = currentLang === 'en' ? 'mr' : 'en'
    i18n.changeLanguage(next)
  }
 
  return (
    <button
      onClick={toggle}
      title={currentLang === 'en' ? 'मराठीत बदला' : 'Switch to English'}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-earth-200 hover:bg-earth-100 hover:border-earth-300 transition-all duration-200 text-xs font-medium text-earth-600 hover:text-bark"
    >
      <span className={`transition-opacity duration-150 ${currentLang === 'en' ? 'opacity-100' : 'opacity-40'}`}>EN</span>
      <span className="text-earth-300">|</span>
      <span className={`transition-opacity duration-150 ${currentLang === 'mr' ? 'opacity-100' : 'opacity-40'} font-devanagari`}>मर</span>
    </button>
  )
}
 
export default function Navbar() {
  const { t } = useTranslation()
  const { user, isLoggedIn, isAdmin, isCustomer, isDeliveryBoy, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
 
  const handleLogout = () => {
    logout()
    navigate('/')
    setUserMenuOpen(false)
    setMobileOpen(false)
  }
 
  const navLinks = [
    { to: '/', label: t('nav.home'), icon: Home, exact: true, customerOnly: false },
    { to: '/products', label: t('nav.shop'), exact: false, customerOnly: true },
  ]
 
  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to)
 
  return (
    <nav className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-earth-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 bg-leaf-600 rounded-xl flex items-center justify-center shadow-leaf group-hover:bg-leaf-700 transition-colors">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="font-display font-bold text-bark leading-none text-sm">Shetkari Krushi</p>
              <p className="font-display text-earth-500 text-xs leading-none italic">Bhandar</p>
            </div>
          </Link>
 
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.filter(l => !l.customerOnly || isCustomer).map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(l.to, l.exact)
                    ? 'text-leaf-700 bg-leaf-50'
                    : 'text-earth-600 hover:text-bark hover:bg-earth-100'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
 
          {/* Right Section */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <LanguageSwitcher />
 
            {/* Cart - only for customers */}
            {isLoggedIn && isCustomer && (
              <Link
                to="/cart"
                className="relative p-2.5 rounded-xl hover:bg-earth-100 transition-colors group"
                title={t('nav.cart')}
              >
                <ShoppingCart className="w-5 h-5 text-earth-600 group-hover:text-leaf-700 transition-colors" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-leaf-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-scale-in">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            )}
 
            {/* User Menu */}
            {isLoggedIn ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(p => !p)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-earth-100 transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-leaf-100 flex items-center justify-center">
                    <span className="text-leaf-700 font-semibold text-xs">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-bark max-w-[100px] truncate">{user.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-earth-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
 
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 card py-1.5 z-20 animate-scale-in">
                      <div className="px-4 py-2.5 border-b border-earth-100">
                        <p className="text-sm font-semibold text-bark truncate">{user.name}</p>
                        <p className="text-xs text-earth-400 truncate">{user.email}</p>
                        <span className={`mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${isAdmin ? 'bg-soil-100 text-soil-700' : isDeliveryBoy ? 'bg-blue-100 text-blue-700' : 'bg-leaf-100 text-leaf-700'}`}>
                          {isAdmin ? t('nav.admin') : isDeliveryBoy ? t('nav.deliveryBoy') : t('nav.customer')}
                        </span>
                      </div>
                      {isAdmin ? (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-earth-600 hover:bg-earth-50 hover:text-bark transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" /> {t('nav.adminPanel')}
                        </Link>
                      ) : isDeliveryBoy ? (
                        <Link
                          to="/delivery"
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-earth-600 hover:bg-earth-50 hover:text-bark transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LayoutDashboard className="w-4 h-4" /> {t('nav.myDeliveries')}
                        </Link>
                      ) : (
                        <>
                          <Link
                            to="/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-earth-600 hover:bg-earth-50 hover:text-bark transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <LayoutDashboard className="w-4 h-4" /> {t('nav.dashboard')}
                          </Link>
                          <Link
                            to="/orders"
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-earth-600 hover:bg-earth-50 hover:text-bark transition-colors"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <Package className="w-4 h-4" /> {t('nav.myOrders')}
                          </Link>
                        </>
                      )}
                      <Link
                        to="/profile"
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-earth-600 hover:bg-earth-50 hover:text-bark transition-colors"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <UserCog className="w-4 h-4" /> {t('nav.myProfile')}
                      </Link>
                      <div className="border-t border-earth-100 mt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> {t('nav.signOut')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm px-4 py-2">{t('nav.signIn')}</Link>
                <Link to="/register" className="btn-primary text-sm px-4 py-2">{t('nav.getStarted')}</Link>
              </div>
            )}
 
            {/* Mobile Toggle */}
            <button
              className="md:hidden p-2 rounded-xl hover:bg-earth-100 transition-colors"
              onClick={() => setMobileOpen(p => !p)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
 
        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-earth-100 py-3 pb-4 space-y-1 animate-slide-up">
            {navLinks.filter(l => !l.customerOnly || isCustomer).map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(l.to, l.exact)
                    ? 'text-leaf-700 bg-leaf-50'
                    : 'text-earth-600 hover:text-bark hover:bg-earth-100'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {!isLoggedIn && (
              <div className="pt-2 flex flex-col gap-2">
                <Link to="/login" className="btn-secondary justify-center" onClick={() => setMobileOpen(false)}>{t('nav.signIn')}</Link>
                <Link to="/register" className="btn-primary justify-center" onClick={() => setMobileOpen(false)}>{t('nav.getStarted')}</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}