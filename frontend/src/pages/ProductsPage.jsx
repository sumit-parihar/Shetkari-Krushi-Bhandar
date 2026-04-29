import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { productAPI, categoryAPI } from '../services/api'
import ProductCard from '../components/ProductCard'
import { ProductCardSkeleton, Pagination, EmptyState } from '../components/UI'
 
export default function ProductsPage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
 
  const page = parseInt(searchParams.get('page') || '1')
  const keyword = searchParams.get('keyword') || ''
  const category_id = searchParams.get('category_id') || ''
  const sort = searchParams.get('sort') || ''
  const min_price = searchParams.get('min_price') || ''
  const max_price = searchParams.get('max_price') || ''
  const page_size = 12
 
  const [inputKeyword, setInputKeyword] = useState(keyword)
  const [localMin, setLocalMin] = useState(min_price)
  const [localMax, setLocalMax] = useState(max_price)
 
  const debounceTimer = useRef(null)
 
  const handleKeywordChange = (val) => {
    setInputKeyword(val)
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setSearchParams(p => {
        const n = new URLSearchParams(p)
        if (val.trim()) n.set('keyword', val.trim())
        else n.delete('keyword')
        n.set('page', '1')
        return n
      })
    }, 400)
  }
 
  const clearKeyword = () => {
    setInputKeyword('')
    clearTimeout(debounceTimer.current)
    setSearchParams(p => {
      const n = new URLSearchParams(p)
      n.delete('keyword')
      n.set('page', '1')
      return n
    })
  }
 
  useEffect(() => {
    categoryAPI.list().then(r => setCategories(r.data.data || [])).catch(() => {})
  }, [])
 
  useEffect(() => {
    setLoading(true)
    const params = { page, page_size }
    if (keyword) params.keyword = keyword
    if (category_id) params.category_id = category_id
    if (sort) params.sort = sort
    if (min_price) params.min_price = min_price
    if (max_price) params.max_price = max_price
 
    productAPI.search(params)
      .then(r => {
        setProducts(r.data.data?.products || [])
        setTotal(r.data.data?.total || 0)
        setTotalPages(Math.ceil((r.data.data?.total || 0) / page_size))
      })
      .catch(() => { setProducts([]); setTotal(0) })
      .finally(() => setLoading(false))
  }, [page, keyword, category_id, sort, min_price, max_price])
 
  const setParam = (key, val) => setSearchParams(p => {
    const n = new URLSearchParams(p)
    if (val) n.set(key, val); else n.delete(key)
    n.set('page', '1')
    return n
  })
 
  const applyPriceFilter = () => {
    setSearchParams(p => {
      const n = new URLSearchParams(p)
      if (localMin) n.set('min_price', localMin); else n.delete('min_price')
      if (localMax) n.set('max_price', localMax); else n.delete('max_price')
      n.set('page', '1')
      return n
    })
  }
 
  const clearAll = () => {
    setInputKeyword('')
    setLocalMin('')
    setLocalMax('')
    clearTimeout(debounceTimer.current)
    setSearchParams({})
  }
 
  const hasFilters = keyword || category_id || sort || min_price || max_price
 
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="page-header">{t('products.title')}</h1>
        <p className="text-earth-500 mt-1">{t('products.subtitle')}</p>
      </div>
 
      {/* Search + Filter Bar */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder={t('products.searchPlaceholder')}
            value={inputKeyword}
            onChange={e => handleKeywordChange(e.target.value)}
          />
          {inputKeyword && (
            <button
              onClick={clearKeyword}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-bark"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFiltersOpen(p => !p)}
          className={`btn-secondary gap-2 ${filtersOpen || hasFilters ? 'border-leaf-400 text-leaf-700 bg-leaf-50' : ''}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">{t('products.filters')}</span>
          {hasFilters && <span className="w-2 h-2 rounded-full bg-leaf-500" />}
        </button>
      </div>
 
      {/* Filter Panel */}
      {filtersOpen && (
        <div className="card p-5 mb-6 animate-slide-up">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-earth-600 mb-2 uppercase tracking-wide">
                {t('products.category')}
              </label>
              <div className="relative">
                <select
                  className="input-field appearance-none pr-8 cursor-pointer"
                  value={category_id}
                  onChange={e => setParam('category_id', e.target.value)}
                >
                  <option value="">{t('products.allCategories')}</option>
                  {categories.map(c => (
                    <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400 pointer-events-none" />
              </div>
            </div>
 
            {/* Price Range */}
            <div>
              <label className="block text-xs font-semibold text-earth-600 mb-2 uppercase tracking-wide">
                {t('products.priceRange')}
              </label>
              <div className="flex gap-2 items-center">
                <input
                  type="number"
                  className="input-field text-sm"
                  placeholder={t('products.min')}
                  value={localMin}
                  onChange={e => setLocalMin(e.target.value)}
                  min="0"
                />
                <span className="text-earth-400">—</span>
                <input
                  type="number"
                  className="input-field text-sm"
                  placeholder={t('products.max')}
                  value={localMax}
                  onChange={e => setLocalMax(e.target.value)}
                  min="0"
                />
                <button onClick={applyPriceFilter} className="btn-primary px-3 py-2.5 text-sm whitespace-nowrap">
                  {t('products.apply')}
                </button>
              </div>
            </div>
 
            {/* Sort */}
            <div>
              <label className="block text-xs font-semibold text-earth-600 mb-2 uppercase tracking-wide">
                {t('products.sortByPrice')}
              </label>
              <div className="flex gap-2">
                {[
                  ['', t('products.default')],
                  ['asc', t('products.lowToHigh')],
                  ['desc', t('products.highToLow')],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setParam('sort', val)}
                    className={`flex-1 py-2 px-2 text-xs font-medium rounded-lg border transition-colors ${
                      sort === val ? 'bg-leaf-600 text-white border-leaf-600' : 'border-earth-200 text-earth-600 hover:border-leaf-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
 
          {hasFilters && (
            <div className="mt-4 pt-4 border-t border-earth-100 flex justify-end">
              <button onClick={clearAll} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> {t('products.clearAll')}
              </button>
            </div>
          )}
        </div>
      )}
 
      {/* Results count */}
      {!loading && (
        <p className="text-sm text-earth-500 mb-4">
          {total > 0
            ? keyword
              ? t('products.productsFoundKeyword', { count: total, keyword })
              : t('products.productsFound', { count: total })
            : hasFilters ? t('products.noMatch') : ''
          }
        </p>
      )}
 
      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          title={t('products.noProducts')}
          desc={hasFilters ? t('products.tryAdjusting') : t('products.noProductsAvailable')}
          action={hasFilters ? <button onClick={clearAll} className="btn-secondary text-sm">{t('products.clearFilters')}</button> : null}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map(p => <ProductCard key={p.product_id} product={p} />)}
        </div>
      )}
 
      {/* Pagination */}
      <div className="mt-8">
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={page_size}
          onPage={p => setSearchParams(prev => {
            const n = new URLSearchParams(prev)
            n.set('page', String(p))
            return n
          })}
        />
      </div>
    </div>
  )
}
 