import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { MapPin, CreditCard, CheckCircle, ShoppingBag } from 'lucide-react'
import { orderAPI } from '../services/api'
import { useCart } from '../contexts/CartContext'
import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../utils/helpers'
import { Spinner } from '../components/UI'
import toast from 'react-hot-toast'

export default function CheckoutPage() {
  const { cart, total, clearCartState } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [address, setAddress] = useState(user?.address || '')
  const [placing, setPlacing] = useState(false)
  const [done, setDone] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [confirmedAddress, setConfirmedAddress] = useState('')

  if (cart.items.length === 0 && !done) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-12 h-12 text-earth-300 mx-auto mb-3" />
        <p className="font-display text-lg font-semibold">Your cart is empty</p>
        <Link to="/products" className="btn-primary mt-4">Shop Now</Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center animate-scale-in">
        <div className="card p-8">
          <div className="w-16 h-16 bg-leaf-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-9 h-9 text-leaf-600" />
          </div>
          <h1 className="font-display text-2xl font-bold text-bark mb-2">Order Placed!</h1>
          <p className="text-earth-500 mb-1">
            Your order <strong className="text-bark">#{orderId}</strong> has been placed successfully.
          </p>
          <p className="text-earth-400 text-sm mb-1">Payment: Cash on Delivery</p>
          {confirmedAddress && (
            <div className="flex items-start gap-2 mt-3 mb-5 p-3 bg-earth-50 rounded-lg text-left border border-earth-100">
              <MapPin className="w-4 h-4 text-earth-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-earth-500 uppercase tracking-wide mb-0.5">Delivering to</p>
                <p className="text-sm text-earth-700">{confirmedAddress}</p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 mt-4">
            <Link to="/orders" className="btn-primary justify-center">View My Orders</Link>
            <Link to="/products" className="btn-secondary justify-center">Continue Shopping</Link>
          </div>
        </div>
      </div>
    )
  }

  const handlePlace = async () => {
    setPlacing(true)
    try {
      const res = await orderAPI.place({ delivery_address: address })
      const oid = res.data.data?.order_id || null
      setOrderId(oid)
      setConfirmedAddress(address || user?.address || '')
      clearCartState()
      setDone(true)
      toast.success('Order placed successfully!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <h1 className="page-header mb-6">Checkout</h1>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Delivery */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-leaf-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-leaf-700" />
            </div>
            <h2 className="font-display font-semibold text-bark">Delivery Address</h2>
          </div>
          <textarea
            className="input-field resize-none"
            rows={4}
            placeholder="Enter full delivery address…"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
          <p className="text-xs text-earth-400 mt-2">Optional — leave blank to use your registered address</p>

          <div className="flex items-center gap-2 mt-5 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <CreditCard className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Cash on Delivery</p>
              <p className="text-xs text-amber-600">Pay when your order arrives</p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="card p-6">
          <h2 className="font-display font-semibold text-bark mb-4">Order Summary</h2>
          <div className="space-y-3 max-h-56 overflow-y-auto mb-4">
            {cart.items.map(item => (
              <div key={item.cart_item_id} className="flex justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-earth-100">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-earth-100 flex items-center justify-center text-sm">🌾</div>
                    }
                  </div>
                  <span className="text-earth-700 truncate">{item.name} × {item.quantity}</span>
                </div>
                <span className="font-medium shrink-0 ml-2">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-earth-100 pt-4 mb-5">
            <div className="flex justify-between">
              <span className="font-semibold text-bark">Total</span>
              <span className="font-display font-bold text-xl text-leaf-700">{formatCurrency(total)}</span>
            </div>
          </div>
          <button
            onClick={handlePlace}
            disabled={placing}
            className="btn-primary w-full py-3.5 text-base"
          >
            {placing ? <Spinner size="sm" /> : 'Place Order'}
          </button>
          <Link to="/cart" className="block text-center text-sm text-earth-400 hover:text-leaf-600 mt-3 transition-colors">
            ← Back to Cart
          </Link>
        </div>
      </div>
    </div>
  )
}
