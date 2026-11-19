import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api, { getErrorMessage, setToken } from '../services/api'
import AuthLayout from '../components/layout/AuthLayout'
import { inputClass, labelClass, primaryButtonClass } from '../components/dashboard/ui'

function reasonFor(from) {
  if (from?.state?.addFund) return `${from.state.addFund} fonunu portföyüne eklemek için giriş yap.`
  if (from?.state?.createPortfolio) return 'Portföy oluşturmak için giriş yap.'
  if (from) return 'Bu sayfayı görmek için giriş yap.'
  return null
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from
  const justRegistered = location.state?.registered

  const [form, setForm] = useState({ email: location.state?.email ?? '', password: '' })
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
      const { data } = await api.post('/api/Auth/login', form)
      if (!data?.token) throw new Error('Token alınamadı.')
      setToken(data.token)
      navigate(from?.pathname ?? '/dashboard', { replace: true, state: from?.state })
    } catch (err) {
      setError(err?.response?.status === 401 ? 'E-posta ya da şifre hatalı.' : getErrorMessage(err, 'Giriş yapılamadı. Lütfen tekrar deneyin.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Giriş yap"
      subtitle="Portföyüne ve işlem geçmişine erişmek için oturum aç."
      notice={justRegistered ? 'Hesabın oluşturuldu. Şimdi giriş yapabilirsin.' : reasonFor(from)}
      footer={
        <>
          Hesabın yok mu?{' '}
          <Link to="/register" state={{ from }} className="font-medium text-ink underline underline-offset-4 hover:text-ink-soft">
            Kayıt ol
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate={false}>
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
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? 'login-error' : undefined}
            className={inputClass}
            required
          />
        </div>

        {error && <p id="login-error" role="alert" className="text-sm text-loss">{error}</p>}

        <button type="submit" disabled={loading} className={`${primaryButtonClass} min-h-11 w-full`}>
          {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>
    </AuthLayout>
  )
}
