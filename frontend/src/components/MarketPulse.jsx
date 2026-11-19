import { categoryOf, TONES } from '../data/market'

const SCALE = 3 // a ±3% daily move gets full colour intensity

function tileStyle(change) {
  const strength = Math.min(Math.abs(change) / SCALE, 1)
  if (change === 0) return { backgroundColor: 'var(--color-sunken)' }
  const hue = change > 0 ? 150 : 22
  return {
    backgroundColor: `oklch(${0.3 + strength * 0.22} ${0.06 + strength * 0.11} ${hue} / ${0.55 + strength * 0.4})`,
  }
}

function formatChange(value) {
  const text = Math.abs(value).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${value > 0 ? '+' : value < 0 ? '−' : ''}%${text}`
}

export default function MarketPulse({ quotes, status, onSelect }) {
  const sorted = [...quotes].sort((a, b) => (b.dailyReturnPercent ?? 0) - (a.dailyReturnPercent ?? 0))
  const up = quotes.filter((q) => q.dailyReturnPercent > 0).length
  const down = quotes.filter((q) => q.dailyReturnPercent < 0).length

  return (
    <section aria-labelledby="pulse-title" className="rounded-2xl border border-line bg-surface/80 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="pulse-title" className="font-semibold text-ink">Piyasa nabzı</h2>
        {status === 'ready' && (
          <p className="tabular-nums text-xs">
            <span className="text-gain">{up} yükselen</span>
            <span className="mx-2 text-line-strong">/</span>
            <span className="text-loss">{down} düşen</span>
          </p>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Takip edilen fonların günlük değişimi. Bir fona tıklayıp portföyüne ekleyebilirsin.</p>

      <div className="mt-5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {status === 'loading' &&
          Array.from({ length: 12 }, (_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-sunken" />)}

        {status === 'error' && (
          <p className="col-span-full rounded-lg bg-sunken px-4 py-8 text-center text-sm text-muted">Piyasa verisi şu an alınamadı.</p>
        )}

        {status === 'ready' &&
          sorted.map((quote) => {
            const change = Number(quote.dailyReturnPercent) || 0
            const tone = TONES[categoryOf(quote.fundCode)?.tone ?? 'violet']
            return (
              <button
                key={quote.fundCode}
                type="button"
                onClick={() => onSelect(quote.fundCode)}
                style={tileStyle(change)}
                className="group flex h-16 flex-col justify-between rounded-lg p-2.5 text-left transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.97]"
                aria-label={`${quote.fundCode}, günlük ${formatChange(change)}. Portföye ekle`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                  <span className="tabular-nums text-xs font-semibold text-ink">{quote.fundCode}</span>
                </span>
                <span className="tabular-nums text-sm font-medium text-ink">{formatChange(change)}</span>
              </button>
            )
          })}
      </div>

      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted" aria-hidden="true">
        <span className="tabular-nums">−%3</span>
        <span className="h-1.5 flex-1 rounded-full bg-[linear-gradient(90deg,oklch(0.52_0.17_22),oklch(0.3_0.06_22/0.6),var(--color-sunken),oklch(0.3_0.06_150/0.6),oklch(0.52_0.17_150))]" />
        <span className="tabular-nums">+%3</span>
      </div>
    </section>
  )
}
