import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import AuthLayout from '../components/layout/AuthLayout'
import { inputClass, labelClass, primaryButtonClass } from '../components/dashboard/ui'

const PASSWORD_HINT = 'En az 8 karakter; en az bir büyük harf, bir küçük harf ve bir rakam.'

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await api.post('/api/Auth/register', form)
      navigate('/login', { state: { from, registered: true, email: form.email } })
    } catch (err) {
      const data = err?.response?.data
      // ASP.NET Identity returns an array of { code, description }.
      setError(Array.isArray(data) ? data.map((item) => item.description).filter(Boolean).join(' ') : getErrorMessage(err, 'Kayıt oluşturulamadı.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Hesap oluştur"
      subtitle="Portföyünü kaydetmek ve işlemlerini takip etmek için ücretsiz bir hesap aç."
      footer={
        <>
          Zaten hesabın var mı?{' '}
          <Link to="/login" state={{ from }} className="font-medium text-ink underline underline-offset-4 hover:text-ink-soft">
            Giriş yap
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="firstName">Ad</label>
            <input id="firstName" name="firstName" autoComplete="given-name" value={form.firstName} onChange={handleChange} maxLength={100} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass} htmlFor="lastName">Soyad</label>
            <input id="lastName" name="lastName" autoComplete="family-name" value={form.lastName} onChange={handleChange} maxLength={100} className={inputClass} required />
          </div>
        </div>
        <div>
          <label className={labelClass} htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={handleChange} className={inputClass} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="password">Şifre</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={form.password}
            onChange={handleChange}
            aria-describedby="password-hint"
            className={inputClass}
            required
          />
          <p id="password-hint" className="mt-1.5 text-xs text-muted">{PASSWORD_HINT}</p>
        </div>

        {error && <p role="alert" className="text-sm text-loss">{error}</p>}

        <button type="submit" disabled={loading} className={`${primaryButtonClass} min-h-11 w-full`}>
          {loading ? 'Hesap oluşturuluyor...' : 'Hesap oluştur'}
        </button>
      </form>
    </AuthLayout>
  )
}
