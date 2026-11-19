import { Link, NavLink, useNavigate } from 'react-router-dom'
import { clearToken, hasValidToken } from '../../services/api'
import { ghostButtonClass, primaryButtonClass, secondaryButtonClass } from '../dashboard/ui'

const navLinkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'font-medium text-ink' : 'text-muted hover:text-ink'}`

export function Wordmark() {
  return (
    <Link to="/" className="rounded-md text-[17px] font-semibold tracking-tight text-ink">
      Portfolio<span className="text-violet">Pilot</span>
    </Link>
  )
}

export default function SiteHeader({ children }) {
  const navigate = useNavigate()
  const signedIn = hasValidToken()

  const handleLogout = () => {
    clearToken()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Wordmark />

        <nav className="hidden items-center gap-1 sm:flex" aria-label="Ana menü">
          <NavLink to="/" end className={navLinkClass}>Fonlar</NavLink>
          {signedIn && <NavLink to="/dashboard" className={navLinkClass}>Portföyüm</NavLink>}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {children}
          {signedIn ? (
            <>
              <Link to="/dashboard" className={`${secondaryButtonClass} sm:hidden`}>Portföyüm</Link>
              <button type="button" onClick={handleLogout} className={ghostButtonClass}>Çıkış yap</button>
            </>
          ) : (
            <>
              <Link to="/register" className={`${ghostButtonClass} hidden sm:inline-flex`}>Kayıt ol</Link>
              <Link to="/login" className={primaryButtonClass}>Giriş yap</Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
