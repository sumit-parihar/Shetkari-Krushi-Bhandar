import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Tag, Package, AlertTriangle, CheckCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productAPI } from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../utils/helpers'
import { PageLoader, Spinner, ErrorBanner } from '../components/UI'
import i18n from '../i18n'
import toast from 'react-hot-toast'
 
export default function ProductDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const { isCustomer, isLoggedIn } = useAuth()
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
 
  useEffect(() => {
    productAPI.get(id)
      .then(r => setProduct(r.data.data || r.data))
      .catch(() => setError(t('productDetail.notFound')))
      .finally(() => setLoading(false))
  }, [id])
 
  const handleAdd = async () => {
    if (!isLoggedIn) { navigate('/login'); return }
    if (!isCustomer) { toast.error(i18n.t('toast.customersOnly')); return }
    setAdding(true)
    await addToCart(product.product_id, qty)
    setAdding(false)
  }
 
  if (loading) return <PageLoader />
  if (error) return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <ErrorBanner message={error} />
      <Link to="/products" className="btn-secondary mt-4 inline-flex">
        {t('productDetail.backToProducts')}
      </Link>
    </div>
  )
 
  const isOutOfStock = product.stock_quantity === 0
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity < 10
 
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-earth-500 mb-6">
        <Link to="/products" className="hover:text-leaf-600 transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> {t('nav.shop')}
        </Link>
        <span>/</span>
        <span className="text-bark font-medium truncate">{product.name}</span>
      </div>
 
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="card overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-72 md:h-96 object-cover"
              onError={e => { e.target.onerror = null; e.target.src = '' }}
            />
          ) : (
            <div className="h-72 md:h-96 product-img-placeholder flex items-center justify-center">
              <span className="text-8xl opacity-20">🌾</span>
            </div>
          )}
        </div>
 
        {/* Info */}
        <div className="space-y-5">
          {product.category_name && (
            <div className="flex items-center gap-1.5 text-earth-500 text-sm">
              <Tag className="w-3.5 h-3.5" />
              <span>{product.category_name}</span>
            </div>
          )}
 
          <h1 className="font-display text-3xl font-bold text-bark leading-snug">{product.name}</h1>
 
          <span className="font-display text-4xl font-bold text-leaf-700">
            {formatCurrency(product.price)}
          </span>
 
          {/* Stock Status */}
          <div className="flex items-center gap-2">
            {isOutOfStock ? (
              <span className="flex items-center gap-1.5 text-red-600 text-sm font-medium">
                <Package className="w-4 h-4" /> {t('productDetail.outOfStock')}
              </span>
            ) : isLowStock ? (
              <span className="flex items-center gap-1.5 text-amber-600 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" /> {t('productDetail.onlyLeft', { count: product.stock_quantity })}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-leaf-600 text-sm font-medium">
                <CheckCircle className="w-4 h-4" /> {t('productDetail.inStock', { count: product.stock_quantity })}
              </span>
            )}
          </div>
 
          {/* Description */}
          {product.description && (
            <div className="bg-earth-50 rounded-xl p-4">
              <p className="text-earth-600 leading-relaxed text-sm">{product.description}</p>
            </div>
          )}
 
          {/* Quantity + Add to Cart */}
          {!isOutOfStock && isCustomer && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-bark">{t('productDetail.quantity')}</label>
                <div className="flex items-center border border-earth-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-9 h-9 flex items-center justify-center hover:bg-earth-100 transition-colors font-bold text-bark"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-semibold text-sm">{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(product.stock_quantity, q + 1))}
                    className="w-9 h-9 flex items-center justify-center hover:bg-earth-100 transition-colors font-bold text-bark"
                  >
                    +
                  </button>
                </div>
              </div>
              <button onClick={handleAdd} disabled={adding} className="btn-primary w-full py-3.5 text-base">
                {adding ? <Spinner size="sm" /> : <><ShoppingCart className="w-5 h-5" /> {t('productDetail.addToCart')}</>}
              </button>
            </div>
          )}
 
          {!isLoggedIn && (
            <Link to="/login" className="btn-primary block text-center py-3.5 text-base">
              {t('productDetail.signInToPurchase')}
            </Link>
          )}
 
          {product.category_name && (
            <div className="pt-4 border-t border-earth-100">
              <div className="bg-earth-50 rounded-lg p-3 inline-flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-earth-400" />
                <p className="text-xs text-earth-500">
                  {t('productDetail.category')} <span className="font-semibold text-bark">{product.category_name}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
 