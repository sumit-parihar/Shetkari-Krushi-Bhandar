import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Eye, AlertTriangle } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency, truncate } from '../utils/helpers'
import { Spinner } from './UI'

export default function ProductCard({ product }) {
  const { addToCart, loading } = useCart()
  const { isLoggedIn, isCustomer } = useAuth()
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!isLoggedIn || !isCustomer) return
    setAdding(true)
    await addToCart(product.product_id, 1)
    setAdding(false)
  }

  const isOutOfStock = product.stock_quantity === 0
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity < 10

  return (
    <Link to={`/products/${product.product_id}`} className="card-hover block group">
      {/* Image */}
      <div className="relative overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
            onError={e => { e.target.onerror = null; e.target.src = '' }}
          />
        ) : (
          <div className="h-48 product-img-placeholder flex items-center justify-center">
            <span className="text-5xl opacity-30">🌾</span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-bark/50 flex items-center justify-center">
            <span className="bg-white text-bark text-xs font-semibold px-3 py-1 rounded-full">Out of Stock</span>
          </div>
        )}
        {product.category_name && (
          <span className="absolute top-2 left-2 badge bg-white/90 text-earth-700 text-[10px] shadow-sm">
            {product.category_name}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-display font-semibold text-bark text-sm leading-snug mb-1 group-hover:text-leaf-700 transition-colors">
          {truncate(product.name, 50)}
        </h3>

        {isLowStock && (
          <div className="flex items-center gap-1 text-amber-600 mb-2">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px] font-medium">Only {product.stock_quantity} left</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="font-display font-bold text-leaf-700 text-lg">
            {formatCurrency(product.price)}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="hidden group-hover:flex items-center gap-1 text-[10px] text-earth-500 border border-earth-200 rounded-lg px-2 py-1 transition-all">
              <Eye className="w-3 h-3" /> View
            </span>
            {isCustomer && (
              <button
                onClick={handleAdd}
                disabled={adding || isOutOfStock}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isOutOfStock
                    ? 'bg-earth-100 text-earth-300 cursor-not-allowed'
                    : 'bg-leaf-600 text-white hover:bg-leaf-700 active:scale-95 shadow-leaf'
                }`}
                title="Add to cart"
              >
                {adding ? <Spinner size="sm" /> : <ShoppingCart className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
