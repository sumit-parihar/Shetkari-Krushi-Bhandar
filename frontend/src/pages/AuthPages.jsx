import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff, Mail, Lock, User, Phone, MapPin } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Spinner } from '../components/UI'

// ─── Login Page ────────────────────────────────────────
export function LoginPage() {
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const result = await login(form.email, form.password)
    // Fix 1: Always go to home page after login
    if (result.success) {
      navigate('/')
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Email" icon={Mail} error={errors.email}>
          <input
            type="email"
            className={`input-field pl-10 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          />
        </Field>
        <Field label="Password" icon={Lock} error={errors.password}>
          <input
            type={showPw ? 'text' : 'password'}
            className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Your password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          />
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </Field>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? <Spinner size="sm" /> : 'Sign In'}
        </button>
      </form>
      <p className="text-center text-sm text-earth-500 mt-6">
        Don't have an account?{' '}
        <Link to="/register" className="text-leaf-600 font-semibold hover:text-leaf-700">Create one</Link>
      </p>
    </AuthLayout>
  )
}

// ─── Register Page ─────────────────────────────────────
export function RegisterPage() {
  const { register, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', phone: '', address: '' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = 'Enter valid 10-digit mobile number'
    if (!form.address.trim()) e.address = 'Address is required'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'At least 6 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const result = await register(form.name, form.email, form.password, form.phone, form.address)
    if (result.success) navigate('/login')
  }

  return (
    <AuthLayout title="Create account" subtitle="Join Shetkari Krushi Bhandar today">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Full Name" icon={User} error={errors.name}>
          <input
            type="text"
            className={`input-field pl-10 ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Your full name"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
        </Field>
        <Field label="Email" icon={Mail} error={errors.email}>
          <input
            type="email"
            className={`input-field pl-10 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          />
        </Field>
        <Field label="Phone Number" icon={Phone} error={errors.phone}>
          <input
            type="tel"
            className={`input-field pl-10 ${errors.phone ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            maxLength={10}
          />
        </Field>
        <div>
          <label className="block text-sm font-medium text-bark mb-1.5">Delivery Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-earth-400 pointer-events-none" />
            <textarea
              className={`input-field pl-10 resize-none ${errors.address ? 'border-red-400 focus:ring-red-400' : ''}`}
              rows={2}
              placeholder="Village / Town, Taluka, District, PIN"
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
            />
          </div>
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>
        <Field label="Password" icon={Lock} error={errors.password}>
          <input
            type={showPw ? 'text' : 'password'}
            className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Create a password"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          />
          <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </Field>
        <Field label="Confirm Password" icon={Lock} error={errors.confirm}>
          <input
            type="password"
            className={`input-field pl-10 ${errors.confirm ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="Repeat password"
            value={form.confirm}
            onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
          />
        </Field>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? <Spinner size="sm" /> : 'Create Account'}
        </button>
      </form>
      <p className="text-center text-sm text-earth-500 mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-leaf-600 font-semibold hover:text-leaf-700">Sign in</Link>
      </p>
    </AuthLayout>
  )
}

// ─── Shared Layout ─────────────────────────────────────
function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-leaf-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-leaf">
            <Leaf className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-3xl font-bold text-bark">{title}</h1>
          <p className="text-earth-500 mt-1">{subtitle}</p>
        </div>
        <div className="card p-8">{children}</div>
      </div>
    </div>
  )
}

// ─── Field Helper ──────────────────────────────────────
function Field({ label, icon: Icon, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-bark mb-1.5">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400 pointer-events-none" />
        {children}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}
