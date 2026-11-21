import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff, Mail, Lock, User, Phone, MapPin, ShieldCheck, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { Spinner } from '../components/UI'
import toast from 'react-hot-toast'
import i18n from '../i18n'
import { getErrorMessage } from '../utils/helpers'

// ─── Login Page ────────────────────────────────────────
export function LoginPage() {
  const { t } = useTranslation()
  const { login, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [showPw, setShowPw] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = t('auth.validation.emailRequired')
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('auth.validation.emailInvalid')
    if (!form.password) e.password = t('auth.validation.passwordRequired')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const result = await login(form.email, form.password)
    if (result.success) navigate('/')
  }

  return (
    <AuthLayout title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label={t('auth.login.email')} icon={Mail} error={errors.email}>
          <input
            type="email"
            className={`input-field pl-10 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
          />
        </Field>
        <Field label={t('auth.login.password')} icon={Lock} error={errors.password}>
          <input
            type={showPw ? 'text' : 'password'}
            className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder={t('auth.login.passwordPlaceholder')}
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          />
          <button type="button" onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </Field>
        <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
          {loading ? <Spinner size="sm" /> : t('auth.login.signIn')}
        </button>
      </form>
      <p className="text-center text-sm text-earth-500 mt-6">
        {t('auth.login.noAccount')}{' '}
        <Link to="/register" className="text-leaf-600 font-semibold hover:text-leaf-700">
          {t('auth.login.createOne')}
        </Link>
      </p>
    </AuthLayout>
  )
}

// ─── Register Page ─────────────────────────────────────
export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // step: 'form' | 'otp'
  const [step, setStep]         = useState('form')
  const [pendingEmail, setPendingEmail] = useState('')
  const [form, setForm]         = useState({ name: '', email: '', password: '', confirm: '', phone: '', address: '' })
  const [showPw, setShowPw]     = useState(false)
  const [errors, setErrors]     = useState({})
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.name.trim())  e.name    = t('auth.validation.nameRequired')
    if (!form.email.trim()) e.email   = t('auth.validation.emailRequired')
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = t('auth.validation.emailInvalid')
    if (!form.phone.trim()) e.phone   = t('auth.validation.phoneRequired')
    else if (!/^[6-9]\d{9}$/.test(form.phone.trim())) e.phone = t('auth.validation.phoneInvalid')
    if (!form.address.trim()) e.address = t('auth.validation.addressRequired')
    if (!form.password)     e.password  = t('auth.validation.passwordRequired')
    else if (form.password.length < 6) e.password = t('auth.validation.passwordMinLength')
    if (form.password !== form.confirm) e.confirm  = t('auth.validation.passwordMismatch')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      await authAPI.register({
        name: form.name, email: form.email, password: form.password,
        phone: form.phone, address: form.address,
      })
      toast.success(i18n.t('toast.otpSent'))
      setPendingEmail(form.email)
      setStep('otp')
    } catch (err) {
      const msg = getErrorMessage(err, i18n.t('toast.registrationFailed'))
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'otp') {
    return (
      <OTPVerificationPage
        email={pendingEmail}
        onVerified={() => navigate('/login')}
        onBack={() => setStep('form')}
      />
    )
  }

  return (
    <AuthLayout title={t('auth.register.title')} subtitle={t('auth.register.subtitle')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label={t('auth.register.fullName')} icon={User} error={errors.name}>
          <input type="text"
            className={`input-field pl-10 ${errors.name ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder={t('auth.register.namePlaceholder')}
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </Field>
        <Field label={t('auth.register.email')} icon={Mail} error={errors.email}>
          <input type="email"
            className={`input-field pl-10 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        </Field>
        <Field label={t('auth.register.phone')} icon={Phone} error={errors.phone}>
          <input type="tel"
            className={`input-field pl-10 ${errors.phone ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder="10-digit mobile number"
            value={form.phone}
            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
            maxLength={10} />
        </Field>
        <div>
          <label className="block text-sm font-medium text-bark mb-1.5">{t('auth.register.address')}</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-earth-400 pointer-events-none" />
            <textarea
              className={`input-field pl-10 resize-none ${errors.address ? 'border-red-400 focus:ring-red-400' : ''}`}
              rows={2}
              placeholder={t('auth.register.addressPlaceholder')}
              value={form.address}
              onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
        </div>
        <Field label={t('auth.register.password')} icon={Lock} error={errors.password}>
          <input
            type={showPw ? 'text' : 'password'}
            className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder={t('auth.register.createPasswordPlaceholder')}
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
          <button type="button" onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400 hover:text-earth-600">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </Field>
        <Field label={t('auth.register.confirmPassword')} icon={Lock} error={errors.confirm}>
          <input type="password"
            className={`input-field pl-10 ${errors.confirm ? 'border-red-400 focus:ring-red-400' : ''}`}
            placeholder={t('auth.register.repeatPasswordPlaceholder')}
            value={form.confirm}
            onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))} />
        </Field>
        <button type="submit" disabled={submitting} className="btn-primary w-full py-3 text-base">
          {submitting ? <Spinner size="sm" /> : t('auth.register.createAccount')}
        </button>
      </form>
      <p className="text-center text-sm text-earth-500 mt-6">
        {t('auth.register.hasAccount')}{' '}
        <Link to="/login" className="text-leaf-600 font-semibold hover:text-leaf-700">
          {t('auth.register.signIn')}
        </Link>
      </p>
    </AuthLayout>
  )
}

// ─── OTP Verification Screen ───────────────────────────
function OTPVerificationPage({ email, onVerified, onBack }) {
  const { t } = useTranslation()
  const [otp, setOtp]           = useState('')
  const [error, setError]       = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const timerRef                = useRef(null)

  // Countdown timer for resend button
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  const handleVerify = async (e) => {
    e.preventDefault()
    if (otp.length !== 6) { setError('Please enter the 6-digit code'); return }
    setError('')
    setVerifying(true)
    try {
      await authAPI.verifyOtp({ email, otp })
      toast.success(i18n.t('toast.otpVerified'))
      onVerified()
    } catch (err) {
      const msg = getErrorMessage(err, i18n.t('toast.otpInvalid'))
      setError(msg)
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    try {
      await authAPI.resendOtp({ email })
      toast.success(i18n.t('toast.otpResent'))
      setCountdown(60)
      clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(timerRef.current); return 0 }
          return c - 1
        })
      }, 1000)
    } catch (err) {
      toast.error(getErrorMessage(err, i18n.t('toast.otpResendFailed')))
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout title={t('auth.otp.title')} subtitle={t('auth.otp.subtitle', { email })}>
      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-bark mb-1.5">{t('auth.otp.label')}</label>
          <div className="relative">
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              className={`input-field pl-10 text-center text-2xl font-bold tracking-[0.5em] ${error ? 'border-red-400' : ''}`}
              placeholder="——————"
              value={otp}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                setOtp(v)
                setError('')
              }}
            />
          </div>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        <button type="submit" disabled={verifying || otp.length !== 6} className="btn-primary w-full py-3 text-base">
          {verifying ? <><Spinner size="sm" /> {t('auth.otp.verifying')}</> : t('auth.otp.verify')}
        </button>
      </form>

      {/* Resend */}
      <div className="text-center mt-5 space-y-2">
        <p className="text-sm text-earth-500">{t('auth.otp.didntReceive')}</p>
        {countdown > 0 ? (
          <p className="text-sm text-earth-400">
            {t('auth.otp.resendIn', { seconds: countdown })}
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm text-leaf-600 font-semibold hover:text-leaf-700 flex items-center gap-1 mx-auto"
          >
            {resending
              ? <><Spinner size="sm" /> {t('auth.otp.sending')}</>
              : <><RefreshCw className="w-3.5 h-3.5" /> {t('auth.otp.resend')}</>
            }
          </button>
        )}
        <button onClick={onBack} className="text-xs text-earth-400 hover:text-earth-600 mt-1 block mx-auto">
          {t('auth.otp.backToRegister')}
        </button>
      </div>
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
