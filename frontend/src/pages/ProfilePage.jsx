import { useState, useEffect } from 'react'
import { User, Mail, Phone, MapPin, Lock, Save, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../contexts/AuthContext'
import { authAPI } from '../services/api'
import { Spinner } from '../components/UI'
import i18n from '../i18n'
import toast from 'react-hot-toast'
 
export default function ProfilePage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [profileForm, setProfileForm] = useState({ name: '', email: '', phone: '', address: '' })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [profileErrors, setProfileErrors] = useState({})
  const [pwErrors, setPwErrors] = useState({})
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
 
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
      })
    }
  }, [user])
 
  const validateProfile = () => {
    const e = {}
    if (!profileForm.name.trim()) e.name = t('auth.validation.nameFieldRequired')
    if (!profileForm.email.trim()) e.email = t('auth.validation.emailRequired')
    else if (!/\S+@\S+\.\S+/.test(profileForm.email)) e.email = t('auth.validation.emailInvalid')
    if (profileForm.phone && !/^[6-9]\d{9}$/.test(profileForm.phone.trim()))
      e.phone = t('auth.validation.phoneInvalid')
    setProfileErrors(e)
    return Object.keys(e).length === 0
  }
 
  const handleProfileSave = async (e) => {
    e.preventDefault()
    if (!validateProfile()) return
    setSavingProfile(true)
    try {
      await authAPI.updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim() || null,
        address: profileForm.address.trim() || null,
      })
      toast.success(i18n.t('toast.profileUpdated'))
    } catch (err) {
      toast.error(err.response?.data?.message || i18n.t('errors.somethingWrong'))
    } finally {
      setSavingProfile(false)
    }
  }
 
  const validatePw = () => {
    const e = {}
    if (!pwForm.current_password) e.current_password = t('auth.validation.currentPasswordRequired')
    if (!pwForm.new_password) e.new_password = t('auth.validation.passwordRequired')
    else if (pwForm.new_password.length < 6) e.new_password = t('auth.validation.newPasswordMinLength')
    if (pwForm.new_password !== pwForm.confirm_password) e.confirm_password = t('auth.validation.passwordMismatch')
    setPwErrors(e)
    return Object.keys(e).length === 0
  }
 
  const handlePasswordSave = async (e) => {
    e.preventDefault()
    if (!validatePw()) return
    setSavingPw(true)
    try {
      await authAPI.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      toast.success(i18n.t('toast.passwordChanged'))
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || i18n.t('errors.somethingWrong'))
    } finally {
      setSavingPw(false)
    }
  }
 
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in space-y-6">
      <div>
        <h1 className="page-header">{t('profile.title')}</h1>
        <p className="text-earth-500 text-sm mt-1">{t('profile.subtitle')}</p>
      </div>
 
      {/* Profile Info */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-earth-100">
          <div className="w-10 h-10 rounded-xl bg-leaf-100 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-leaf-700" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-bark">{t('profile.personalInfo')}</h2>
            <p className="text-xs text-earth-400">{t('profile.personalInfoDesc')}</p>
          </div>
        </div>
 
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bark mb-1.5">{t('profile.fullName')}</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
              <input
                type="text"
                className={`input-field pl-10 ${profileErrors.name ? 'border-red-400' : ''}`}
                value={profileForm.name}
                onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                placeholder={t('profile.fullNamePlaceholder')}
              />
            </div>
            {profileErrors.name && <p className="text-red-500 text-xs mt-1">{profileErrors.name}</p>}
          </div>
 
          <div>
            <label className="block text-sm font-medium text-bark mb-1.5">{t('profile.email')}</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
              <input
                type="email"
                className={`input-field pl-10 ${profileErrors.email ? 'border-red-400' : ''}`}
                value={profileForm.email}
                onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                placeholder={t('profile.emailPlaceholder')}
              />
            </div>
            {profileErrors.email && <p className="text-red-500 text-xs mt-1">{profileErrors.email}</p>}
          </div>
 
          <div>
            <label className="block text-sm font-medium text-bark mb-1.5">{t('profile.phone')}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
              <input
                type="tel"
                className={`input-field pl-10 ${profileErrors.phone ? 'border-red-400' : ''}`}
                value={profileForm.phone}
                onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="10-digit mobile number"
                maxLength={10}
              />
            </div>
            {profileErrors.phone && <p className="text-red-500 text-xs mt-1">{profileErrors.phone}</p>}
          </div>
 
          <div>
            <label className="block text-sm font-medium text-bark mb-1.5">{t('profile.address')}</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-earth-400" />
              <textarea
                className="input-field pl-10 resize-none"
                rows={3}
                value={profileForm.address}
                onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))}
                placeholder={t('profile.addressPlaceholder')}
              />
            </div>
          </div>
 
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={savingProfile} className="btn-primary">
              {savingProfile ? <Spinner size="sm" /> : <><Save className="w-4 h-4" /> {t('profile.saveChanges')}</>}
            </button>
          </div>
        </form>
      </div>
 
      {/* Change Password */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-earth-100">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-bark">{t('profile.changePassword')}</h2>
            <p className="text-xs text-earth-400">{t('profile.changePasswordDesc')}</p>
          </div>
        </div>
 
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-bark mb-1.5">{t('profile.currentPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
              <input
                type={showCurrent ? 'text' : 'password'}
                className={`input-field pl-10 pr-10 ${pwErrors.current_password ? 'border-red-400' : ''}`}
                value={pwForm.current_password}
                onChange={e => setPwForm(p => ({ ...p, current_password: e.target.value }))}
                placeholder={t('profile.currentPasswordPlaceholder')}
              />
              <button type="button" onClick={() => setShowCurrent(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400">
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwErrors.current_password && <p className="text-red-500 text-xs mt-1">{pwErrors.current_password}</p>}
          </div>
 
          <div>
            <label className="block text-sm font-medium text-bark mb-1.5">{t('profile.newPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
              <input
                type={showNew ? 'text' : 'password'}
                className={`input-field pl-10 pr-10 ${pwErrors.new_password ? 'border-red-400' : ''}`}
                value={pwForm.new_password}
                onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))}
                placeholder={t('profile.newPasswordPlaceholder')}
              />
              <button type="button" onClick={() => setShowNew(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-earth-400">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwErrors.new_password && <p className="text-red-500 text-xs mt-1">{pwErrors.new_password}</p>}
          </div>
 
          <div>
            <label className="block text-sm font-medium text-bark mb-1.5">{t('profile.confirmNewPassword')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-earth-400" />
              <input
                type="password"
                className={`input-field pl-10 ${pwErrors.confirm_password ? 'border-red-400' : ''}`}
                value={pwForm.confirm_password}
                onChange={e => setPwForm(p => ({ ...p, confirm_password: e.target.value }))}
                placeholder={t('profile.repeatNewPasswordPlaceholder')}
              />
            </div>
            {pwErrors.confirm_password && <p className="text-red-500 text-xs mt-1">{pwErrors.confirm_password}</p>}
          </div>
 
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={savingPw} className="btn-primary">
              {savingPw ? <Spinner size="sm" /> : <><ShieldCheck className="w-4 h-4" /> {t('profile.updatePassword')}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
 