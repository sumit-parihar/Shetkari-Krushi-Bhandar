import { Link } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'

const linkClass = 'block text-sm text-earth-400 hover:text-cream transition-colors'

export default function Footer() {
  const { t } = useTranslation()
  const { isLoggedIn, isAdmin, isDeliveryBoy } = useAuth()

  // Account links depend on who is logged in, so no role is sent to a page it can't open
  let accountLinks
  if (!isLoggedIn) {
    accountLinks = [
      ['/login', t('nav.signIn')],
      ['/register', t('footer.register')],
    ]
  } else if (isAdmin) {
    accountLinks = [['/admin', t('nav.adminPanel')], ['/profile', t('nav.myProfile')]]
  } else if (isDeliveryBoy) {
    accountLinks = [['/delivery', t('nav.myDeliveries')], ['/profile', t('nav.myProfile')]]
  } else {
    accountLinks = [['/orders', t('nav.myOrders')], ['/profile', t('nav.myProfile')]]
  }

  return (
    <footer className="bg-bark text-earth-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-leaf-600 rounded-xl flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-display font-bold text-cream text-sm leading-none">Shetkari Krushi</p>
                <p className="font-display text-earth-400 text-xs italic">Bhandar</p>
              </div>
            </div>
            <p className="text-sm text-earth-400 leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          <div>
            <p className="font-semibold text-cream text-sm mb-3">{t('footer.quickLinks')}</p>
            <div className="space-y-2">
              <Link to="/" className={linkClass}>{t('nav.home')}</Link>
              <Link to="/products" className={linkClass}>{t('nav.shop')}</Link>
            </div>
          </div>

          <div>
            <p className="font-semibold text-cream text-sm mb-3">{t('footer.account')}</p>
            <div className="space-y-2">
              {accountLinks.map(([to, label]) => (
                <Link key={to} to={to} className={linkClass}>{label}</Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-bark/50 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-earth-500">© {new Date().getFullYear()} Shetkari Krushi Bhandar. {t('footer.allRightsReserved')}</p>
          <p className="text-xs text-earth-500 flex items-center gap-1">
            {t('footer.madeWith')}
          </p>
        </div>
      </div>
    </footer>
  )
}
