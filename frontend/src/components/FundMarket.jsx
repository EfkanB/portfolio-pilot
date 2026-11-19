import { useState } from 'react'
import { MARKET_CATEGORIES, TONES } from '../data/market'
import { formatPrice, prettyFundName } from '../utils/format'
import { secondaryButtonClass, tableHeadClass, tdClass, thClass } from './dashboard/ui'

function formatChange(value) {
  const number = Number(value) || 0
  const text = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(number))
  return `${number > 0 ? '+' : number < 0 ? '−' : ''}%${text}`
}

function SkeletonRows({ count }) {
  return Array.from({ length: count }, (_, index) => (
    <tr key={index} className="border-b border-line last:border-0">
      <td className={tdClass} colSpan={5}>
        <div className="h-5 animate-pulse rounded bg-sunken" style={{ width: `${70 - (index % 3) * 12}%` }} />
      </td>
    </tr>
  ))
}

export default function FundMarket({ quotes, status, onRetry, onAddFund }) {
  const [activeId, setActiveId] = useState(MARKET_CATEGORIES[0].id)
  const category = MARKET_CATEGORIES.find((c) => c.id === activeId)
  const tone = TONES[category.tone]
  const rows = quotes.filter((q) => category.codes.includes(q.fundCode))

  return (
    <section id="fonlar" aria-labelledby="market-title" className="scroll-mt-20">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 id="market-title" className="text-2xl font-semibold tracking-tight text-ink">Bugün TEFAS'ta</h2>
          <p className="mt-1 text-sm text-muted">Son açıklanan birim fiyatlar ve günlük değişim.</p>
        </div>

        <div role="tablist" aria-label="Fon kategorisi" className="scroll-x -mx-4 flex gap-2 px-4 py-1 sm:mx-0 sm:px-1">
          {MARKET_CATEGORIES.map((cat) => {
            const active = cat.id === activeId
            const t = TONES[cat.tone]
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveId(cat.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active ? `${t.soft} ${t.text} font-medium ring-1 ${t.ring}` : 'text-muted ring-1 ring-line hover:text-ink hover:ring-line-strong'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${t.dot}`} aria-hidden="true" />
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className={`scroll-x mt-6 rounded-2xl border bg-surface/80 px-5 transition-colors sm:px-6 ${tone.border}`}>
        <table className="w-full min-w-[640px] text-sm">
          <thead className={tableHeadClass}>
            <tr>
              <th className={`${thClass} w-24`}>Kod</th>
              <th className={thClass}>Fon</th>
              <th className={`${thClass} text-right`}>Fiyat</th>
              <th className={`${thClass} w-28 text-right`}>Günlük</th>
              <th className={`${thClass} w-36`}><span className="sr-only">İşlem</span></th>
            </tr>
          </thead>
          <tbody>
            {status === 'loading' && <SkeletonRows count={category.codes.length} />}

            {status === 'error' && (
              <tr>
                <td colSpan={5} className="py-10 text-center">
                  <p className="text-sm text-muted">TEFAS verisi şu an alınamadı.</p>
                  <button type="button" onClick={onRetry} className={`${secondaryButtonClass} mt-3`}>Tekrar dene</button>
                </td>
              </tr>
            )}

            {status === 'ready' &&
              rows.map((quote) => {
                const change = Number(quote.dailyReturnPercent) || 0
                return (
                  <tr key={quote.fundCode} className="border-b border-line transition-colors last:border-0 hover:bg-sunken/50">
                    <td className={tdClass}>
                      <span className={`tabular-nums rounded-md px-2 py-1 text-xs font-semibold ${tone.soft} ${tone.text}`}>{quote.fundCode}</span>
                    </td>
                    <td className={`${tdClass} text-ink-soft`}>
                      <span className="line-clamp-1" title={quote.fundName}>{prettyFundName(quote.fundName)}</span>
                    </td>
                    <td className={`${tdClass} tabular-nums text-right text-ink`}>{formatPrice(quote.currentPrice)}</td>
                    <td className={`${tdClass} text-right`}>
                      <span
                        className={`tabular-nums inline-block min-w-[5.5rem] rounded-md px-2 py-1 text-right text-xs font-semibold ${
                          change > 0 ? 'bg-gain-soft text-gain' : change < 0 ? 'bg-loss-soft text-loss' : 'bg-sunken text-muted'
                        }`}
                      >
                        {formatChange(change)}
                      </span>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => onAddFund(quote.fundCode)}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-sunken ${tone.text}`}
                        aria-label={`${quote.fundCode} fonunu portföye ekle`}
                      >
                        + Portföye ekle
                      </button>
                    </td>
                  </tr>
                )
              })}

            {status === 'ready' && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="py-10 text-center text-sm text-muted">Bu kategoride gösterilecek fon yok.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">Veriler TEFAS'tan alınır ve gün içinde gecikmeli olabilir. Yatırım tavsiyesi değildir.</p>
    </section>
  )
}
