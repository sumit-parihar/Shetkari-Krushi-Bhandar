import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Leaf, ShieldCheck, Truck, Star, LayoutDashboard, Search } from 'lucide-react'
import { productAPI, categoryAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import ProductCard from '../components/ProductCard'
import { ProductCardSkeleton } from '../components/UI'

export default function HomePage() {
  const { isLoggedIn, isCustomer, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [featured, setFeatured] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    Promise.all([
      productAPI.list({ page: 1, page_size: 8 }),
      categoryAPI.list(),
    ]).then(([pRes, cRes]) => {
      setFeatured(pRes.data.data?.products || [])
      setCategories((cRes.data.data || []).slice(0, 6))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) navigate(`/products?keyword=${encodeURIComponent(q)}`)
    else navigate('/products')
  }

  const features = [
    { icon: Leaf, title: 'Farm Fresh', desc: 'Directly sourced from local farmers' },
    { icon: ShieldCheck, title: 'Quality Assured', desc: 'Verified and graded produce only' },
    { icon: Truck, title: 'Fast Delivery', desc: 'Delivered to your doorstep' },
    { icon: Star, title: 'Best Prices', desc: 'Fair prices for farmers and buyers' },
  ]

  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="hero-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-leaf-100 text-leaf-700 rounded-full px-4 py-1.5 text-xs font-semibold mb-6">
              <Leaf className="w-3.5 h-3.5" />
              Maharashtra's Trusted Agricultural Store
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-bark leading-tight mb-6">
              From Farm to{' '}
              <span className="text-leaf-600 italic">Your Table</span>
            </h1>
            <p className="text-earth-600 text-lg md:text-xl leading-relaxed mb-8 max-w-lg">
              Discover premium seeds, fertilizers, tools, and fresh produce — all in one place. Supporting Shetkari, empowering communities.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              {/* Guest */}
              {!isLoggedIn && (
                <>
                  <Link to="/products" className="btn-primary text-base px-7 py-3.5">
                    Shop Now <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link to="/register" className="btn-secondary text-base px-7 py-3.5">
                    Create Account
                  </Link>
                </>
              )}
              {/* Customer */}
              {isCustomer && (
                <>
                  <Link to="/products" className="btn-primary text-base px-7 py-3.5">
                    Shop Now <ArrowRight className="w-5 h-5" />
                  </Link>
                  <Link to="/dashboard" className="btn-secondary text-base px-7 py-3.5">
                    My Dashboard
                  </Link>
                </>
              )}
              {/* Admin */}
              {isAdmin && (
                <Link to="/admin" className="btn-primary text-base px-7 py-3.5">
                  <LayoutDashboard className="w-5 h-5" /> Go to Admin Panel
                </Link>
              )}
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search seeds, fertilizers, tools…"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-earth-200 bg-white/90 text-sm text-bark placeholder-earth-400 focus:outline-none focus:ring-2 focus:ring-leaf-400 focus:border-leaf-400 shadow-sm"
                />
              </div>
              <button type="submit" className="btn-primary px-5 py-3 text-sm shrink-0">
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Features — visible to all */}
      <section className="bg-white border-b border-earth-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col items-center text-center gap-2 p-4">
                <div className="w-11 h-11 rounded-2xl bg-leaf-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-leaf-600" />
                </div>
                <p className="font-semibold text-bark text-sm">{title}</p>
                <p className="text-earth-500 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories — visible to all */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="section-title">Browse Categories</h2>
            <Link to="/products" className="text-sm text-leaf-600 hover:text-leaf-700 font-medium flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {categories.map(cat => (
              <Link
                key={cat.category_id}
                to={`/products?category_id=${cat.category_id}`}
                className="card-hover p-4 text-center group"
              >
                <div className="w-10 h-10 mx-auto rounded-xl bg-earth-100 flex items-center justify-center mb-2 group-hover:bg-leaf-100 transition-colors">
                  <span className="text-xl">🌿</span>
                </div>
                <p className="text-xs font-medium text-bark leading-snug">{cat.category_name}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products — visible to all */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="section-title">Featured Products</h2>
          <Link to="/products" className="text-sm text-leaf-600 hover:text-leaf-700 font-medium flex items-center gap-1">
            See all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : featured.length === 0 ? (
          <div className="text-center py-12 text-earth-400">No products available yet</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map(p => <ProductCard key={p.product_id} product={p} />)}
          </div>
        )}
        <div className="text-center mt-10">
          <Link to="/products" className="btn-secondary px-8">
            Explore All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* CTA Banner — guests only */}
      {!isLoggedIn && (
        <section className="bg-leaf-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Ready to grow with us?</h2>
            <p className="text-leaf-200 mb-6 max-w-md mx-auto">Join thousands of farmers and buyers who trust Shetkari Krushi Bhandar.</p>
            <Link to="/register" className="inline-flex items-center gap-2 bg-white text-leaf-700 font-semibold px-7 py-3 rounded-lg hover:bg-leaf-50 transition-colors">
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
