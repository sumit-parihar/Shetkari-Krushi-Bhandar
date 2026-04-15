import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { cartAPI } from '../services/api'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { isLoggedIn, isCustomer } = useAuth()
  const [cart, setCart] = useState({ cart_id: null, items: [] })
  const [loading, setLoading] = useState(false)

  const fetchCart = useCallback(async () => {
    if (!isLoggedIn || !isCustomer) return
    try {
      const res = await cartAPI.get()
      setCart(res.data.data || { cart_id: null, items: [] })
    } catch {}
  }, [isLoggedIn, isCustomer])

  useEffect(() => { fetchCart() }, [fetchCart])

  const addToCart = useCallback(async (productId, quantity = 1) => {
    setLoading(true)
    try {
      await cartAPI.add({ product_id: productId, quantity })
      await fetchCart()
      toast.success('Added to cart!')
      return true
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart')
      return false
    } finally {
      setLoading(false)
    }
  }, [fetchCart])

  const updateQuantity = useCallback(async (itemId, quantity) => {
    try {
      await cartAPI.update(itemId, { quantity })
      setCart(prev => ({
        ...prev,
        items: prev.items.map(i => i.cart_item_id === itemId ? { ...i, quantity } : i)
      }))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quantity')
    }
  }, [])

  const removeFromCart = useCallback(async (itemId) => {
    try {
      await cartAPI.remove(itemId)
      setCart(prev => ({ ...prev, items: prev.items.filter(i => i.cart_item_id !== itemId) }))
      toast.success('Item removed')
    } catch {
      toast.error('Failed to remove item')
    }
  }, [])

  const clearCartState = useCallback(() => {
    setCart({ cart_id: null, items: [] })
  }, [])

  const total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ cart, loading, addToCart, updateQuantity, removeFromCart, fetchCart, clearCartState, total, itemCount }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
