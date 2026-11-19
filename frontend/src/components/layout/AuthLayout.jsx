import { Link } from 'react-router-dom'
import { Wordmark } from './SiteHeader'

export default function AuthLayout({ title, subtitle, notice, children, footer }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <Link to="/" className="rounded-md text-sm text-muted hover:text-ink">Fonlara dön</Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:py-20">
        <section className="animate-enter w-full max-w-[400px]">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          {notice && (
            <p role="status" className="mt-5 rounded-lg border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-soft">
              {notice}
            </p>
          )}
          <div className="mt-6">{children}</div>
          {footer && <p className="mt-6 text-sm text-muted">{footer}</p>}
        </section>
      </main>
    </div>
  )
}
