import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.post('/api/Auth/login', form)
      const token = response.data.token ?? response.data.Token

      if (!token) {
        throw new Error('Token alınamadı.')
      }

      localStorage.setItem('token', token)
      navigate('/dashboard')
    } catch {
      setError('Giriş başarısız. E-posta ve şifreyi kontrol edin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-sky-950/20 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.35em] text-cyan-300/80">PortfolioPilot</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Giriş Yap</h1>
        <p className="mt-2 text-sm text-slate-300">JWT ile korunmuş dashboard'a erişmek için oturum açın.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="email">
              E-posta
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
              placeholder="ornek@portfolio.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="password">
              Şifre
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20"
              placeholder="••••••••"
              required
            />
          </div>

          {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</div> : null}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Hesabınız yok mu?{' '}
          <Link to="/register" className="font-medium text-cyan-300 hover:text-cyan-200">
            Kayıt olun
          </Link>
        </p>
      </section>
    </main>
  )
}