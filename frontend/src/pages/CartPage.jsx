import { Link, useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag, ArrowRight, Minus, Plus } from 'lucide-react'
import { useCart } from '../contexts/CartContext'
import { formatCurrency } from '../utils/helpers'
import { EmptyState, Spinner } from '../components/UI'

export default function CartPage() {
  const { cart, loading, updateQuantity, removeFromCart, total } = useCart()
  const navigate = useNavigate()

  if (cart.items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 animate-fade-in">
        <EmptyState
          title="Your cart is empty"
          desc="Browse our products and add items to your cart"
          icon={ShoppingBag}
          action={<Link to="/products" className="btn-primary">Shop Now</Link>}
        />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="page-header mb-6">Shopping Cart</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.items.map(item => (
            <div key={item.cart_item_id} className="card p-4 flex gap-4 items-start">
              {/* Image */}
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-earth-100">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full product-img-placeholder flex items-center justify-center text-2xl">🌾</div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_id}`} className="font-display font-semibold text-bark hover:text-leaf-600 transition-colors line-clamp-2 text-sm">
                  {item.name}
                </Link>
                <p className="text-leaf-700 font-bold mt-1">{formatCurrency(item.price)}</p>
                {item.quantity > item.stock_quantity && (
                  <p className="text-xs text-amber-600 mt-1">⚠ Only {item.stock_quantity} in stock</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => removeFromCart(item.cart_item_id)}
                  className="text-earth-400 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="flex items-center border border-earth-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => {
                      if (item.quantity === 1) removeFromCart(item.cart_item_id)
                      else updateQuantity(item.cart_item_id, item.quantity - 1)
                    }}
                    className="w-7 h-7 flex items-center justify-center hover:bg-earth-100 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                    disabled={item.quantity >= item.stock_quantity}
                    className="w-7 h-7 flex items-center justify-center hover:bg-earth-100 transition-colors disabled:opacity-40"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs font-semibold text-bark">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <div className="card p-6 sticky top-20">
            <h2 className="font-display font-semibold text-lg text-bark mb-5">Order Summary</h2>
            <div className="space-y-3 mb-5">
              {cart.items.map(item => (
                <div key={item.cart_item_id} className="flex justify-between text-sm">
                  <span className="text-earth-600 truncate mr-2">{item.name} × {item.quantity}</span>
                  <span className="text-bark font-medium shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-earth-100 pt-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-bark">Total</span>
                <span className="font-display font-bold text-xl text-leaf-700">{formatCurrency(total)}</span>
              </div>
              <p className="text-xs text-earth-400 mt-1">Cash on Delivery</p>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="btn-primary w-full py-3.5 text-base"
            >
              Proceed to Checkout <ArrowRight className="w-5 h-5" />
            </button>
            <Link to="/products" className="block text-center text-sm text-earth-500 hover:text-leaf-600 mt-3 transition-colors">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
