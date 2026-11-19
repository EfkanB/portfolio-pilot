import { useEffect, useState } from 'react'
import api from '../../services/api'
import { formatCurrency, prettyFundName } from '../../utils/format'
import { buyButtonClass, inputClass, labelClass } from './ui'

/** TEFAS first, then the generic finance endpoint (Yahoo etc.). Returns null when neither knows the code. */
async function lookupPrice(code, signal) {
  const sources = [`/api/Tefas/quote/${encodeURIComponent(code)}`, `/api/Portfolio/current-price/${encodeURIComponent(code)}`]
  for (const url of sources) {
    try {
      const { data } = await api.get(url, { signal })
      if (data?.currentPrice != null) return data
    } catch (error) {
      if (signal.aborted) throw error
    }
  }
  return null
}

export default function AddFundForm({ initialCode = '', onSubmit }) {
  const [form, setForm] = useState({ fundCode: initialCode, quantity: '', currentPrice: '' })
  const [fundName, setFundName] = useState('')
  const [lookup, setLookup] = useState('idle') // idle | loading | found | missing
  const [submitting, setSubmitting] = useState(false)

  // Debounced price lookup whenever the fund code changes.
  useEffect(() => {
    const code = form.fundCode.trim().toUpperCase()
    setFundName('')
    if (!code) {
      setLookup('idle')
      return undefined
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      setLookup('loading')
      try {
        const quote = await lookupPrice(code, controller.signal)
        if (quote) {
          setForm((prev) => ({ ...prev, currentPrice: String(quote.currentPrice) }))
          setFundName(quote.fundName ?? '')
          setLookup('found')
        } else {
          setLookup('missing')
        }
      } catch {
        // aborted: a newer lookup is in flight
      }
    }, 400)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [form.fundCode])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: name === 'currentPrice' ? value.replace(',', '.') : value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    const ok = await onSubmit({
      fundCode: form.fundCode.trim().toUpperCase(),
      fundName: fundName || undefined,
      quantity: Number(form.quantity),
      currentPrice: Number(form.currentPrice),
    })
    setSubmitting(false)
    if (ok) {
      setForm({ fundCode: '', quantity: '', currentPrice: '' })
      setFundName('')
    }
  }

  const total = Number(form.quantity) * Number(form.currentPrice)

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className={labelClass} htmlFor="add-fund-code">Fon kodu</label>
        <input
          id="add-fund-code"
          name="fundCode"
          value={form.fundCode}
          onChange={handleChange}
          placeholder="Örn. AFT"
          maxLength={50}
          autoComplete="off"
          aria-describedby="add-fund-lookup"
          className={`${inputClass} tabular-nums uppercase`}
          required
        />
        <p id="add-fund-lookup" className="mt-1.5 min-h-5 text-xs" aria-live="polite">
          {lookup === 'loading' && <span className="text-muted">Fiyat aranıyor...</span>}
          {lookup === 'found' && <span className="line-clamp-1 text-ink-soft">{prettyFundName(fundName) || 'Fiyat bulundu'}</span>}
          {lookup === 'missing' && <span className="text-warn">Bu kod için fiyat bulunamadı; fiyatı elle girebilirsin.</span>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} htmlFor="add-fund-qty">Adet</label>
          <input id="add-fund-qty" name="quantity" type="number" inputMode="decimal" step="0.0001" min="0.0001" value={form.quantity} onChange={handleChange} className={`${inputClass} tabular-nums`} required />
        </div>
        <div>
          <label className={labelClass} htmlFor="add-fund-price">Alış fiyatı</label>
          <input id="add-fund-price" name="currentPrice" type="number" inputMode="decimal" step="any" min="0.000001" value={form.currentPrice} onChange={handleChange} className={`${inputClass} tabular-nums`} required />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
        <span className="text-muted">Tutar</span>
        <span className="tabular-nums font-medium text-ink">{Number.isFinite(total) && total > 0 ? formatCurrency(total) : '-'}</span>
      </div>

      <button type="submit" disabled={submitting} className={`${buyButtonClass} w-full`}>
        {submitting ? 'Ekleniyor...' : 'Alışı kaydet'}
      </button>
    </form>
  )
}
