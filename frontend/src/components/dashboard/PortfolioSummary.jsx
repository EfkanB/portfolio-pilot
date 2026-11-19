import { formatCurrency, formatSignedCurrency, profitClass } from '../../utils/format'
import { dangerButtonClass } from './ui'

const WASH = {
  violet: { bg: 'bg-linear-to-b from-violet-soft/80 to-surface', dot: 'bg-violet' },
  cyan: { bg: 'bg-linear-to-b from-cyan-soft/70 to-surface', dot: 'bg-cyan' },
  amber: { bg: 'bg-linear-to-b from-amber-soft/70 to-surface', dot: 'bg-amber' },
  pink: { bg: 'bg-linear-to-b from-pink-soft/70 to-surface', dot: 'bg-pink' },
}

function Stat({ label, children, hint, tone, valueClass = 'text-ink' }) {
  const wash = WASH[tone]
  return (
    <div className={`px-5 py-4 sm:px-6 ${wash.bg}`}>
      <dt className="flex items-center gap-2 text-sm text-muted">
        <span className={`h-2 w-2 rounded-full ${wash.dot}`} aria-hidden="true" />
        {label}
      </dt>
      <dd className={`tabular-nums mt-1 text-lg font-medium ${valueClass}`}>{children}</dd>
      {hint && <dd className="tabular-nums mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  )
}

export default function PortfolioSummary({ portfolio, stats, deleting, onDelete }) {
  const unrealizedPercent = stats.totalCost > 0 ? (stats.unrealized / stats.totalCost) * 100 : 0

  return (
    <section aria-labelledby="portfolio-title" className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 id="portfolio-title" className="text-2xl font-semibold tracking-tight text-ink">{portfolio.name}</h1>
          {portfolio.description && <p className="mt-1 text-sm text-muted">{portfolio.description}</p>}
        </div>
        <button type="button" onClick={onDelete} disabled={deleting} className={dangerButtonClass}>
          {deleting ? 'Siliniyor...' : 'Portföyü sil'}
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        <Stat label="Toplam değer" tone="violet" hint={`${stats.fundCount} fon`} valueClass="text-2xl font-semibold tracking-tight text-ink">
          {formatCurrency(stats.totalValue)}
        </Stat>
        <Stat label="Toplam maliyet" tone="cyan">{formatCurrency(stats.totalCost)}</Stat>
        <Stat
          label="Gerçekleşmemiş K/Z"
          tone="amber"
          valueClass={profitClass(stats.unrealized)}
          hint={stats.totalCost > 0 ? `${unrealizedPercent >= 0 ? '+' : '−'}%${Math.abs(unrealizedPercent).toFixed(2)}` : null}
        >
          {formatSignedCurrency(stats.unrealized)}
        </Stat>
        <Stat label="Gerçekleşen K/Z" tone="pink" valueClass={profitClass(stats.realized)} hint="Satışlardan">
          {formatSignedCurrency(stats.realized)}
        </Stat>
      </dl>
    </section>
  )
}
