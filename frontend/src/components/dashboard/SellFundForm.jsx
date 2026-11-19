import { useState } from 'react'
import { formatQuantity, formatSignedCurrency, profitClass } from '../../utils/format'
import { inputClass, labelClass, sellButtonClass } from './ui'

const EMPTY_FORM = { fundCode: '', quantity: '', price: '' }

export default function SellFundForm({ funds, onSubmit }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)

  const selectedFund = funds.find((fund) => fund.fundCode === form.fundCode)
  const quantity = Number(form.quantity)
  const price = Number(form.price)
  const tooMany = Boolean(selectedFund) && quantity > selectedFund.quantity
  const estimatedPl = selectedFund && quantity > 0 && price > 0 ? (price - selectedFund.averageCost) * quantity : null

  if (funds.length === 0) {
    return <p className="rounded-lg bg-sunken px-4 py-8 text-center text-sm text-muted">Satabileceğin bir fon yok. Önce alış kaydet.</p>
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    if (name === 'fundCode') {
      const fund = funds.find((f) => f.fundCode === value)
      setForm({ fundCode: value, quantity: '', price: fund ? String(fund.currentPrice) : '' })
      return
    }
    setForm((prev) => ({ ...prev, [name]: name === 'price' ? value.replace(',', '.') : value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (tooMany) return
    setSubmitting(true)
    const ok = await onSubmit({ fundCode: form.fundCode, quantity, price: price > 0 ? price : undefined })
    setSubmitting(false)
    if (ok) setForm(EMPTY_FORM)
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className={labelClass} htmlFor="sell-fund-code">Fon</label>
        <select id="sell-fund-code" name="fundCode" value={form.fundCode} onChange={handleChange} className={inputClass} required>
          <option value="" disabled>Fon seç</option>
          {funds.map((fund) => (
            <option key={fund.id} value={fund.fundCode}>
              {fund.fundCode} ({formatQuantity(fund.quantity)} adet)
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <label className="text-sm font-medium text-ink-soft" htmlFor="sell-fund-qty">Adet</label>
            {selectedFund && (
              <button
                type="button"
                className="rounded text-xs font-medium text-ink underline underline-offset-2 hover:text-ink-soft"
                onClick={() => setForm((prev) => ({ ...prev, quantity: String(selectedFund.quantity) }))}
              >
                Tümü
              </button>
            )}
          </div>
          <input
            id="sell-fund-qty"
            name="quantity"
            type="number"
            inputMode="decimal"
            step="0.0001"
            min="0.0001"
            max={selectedFund?.quantity}
            value={form.quantity}
            onChange={handleChange}
            aria-invalid={tooMany || undefined}
            aria-describedby={tooMany ? 'sell-qty-error' : undefined}
            className={`${inputClass} tabular-nums`}
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="sell-fund-price">Satış fiyatı</label>
          <input id="sell-fund-price" name="price" type="number" inputMode="decimal" step="any" min="0.000001" value={form.price} onChange={handleChange} className={`${inputClass} tabular-nums`} required />
        </div>
      </div>

      {tooMany && (
        <p id="sell-qty-error" className="text-xs text-loss">Elinde {formatQuantity(selectedFund.quantity)} adet var; daha fazlası satılamaz.</p>
      )}

      <div className="flex items-center justify-between border-t border-line pt-4 text-sm">
        <span className="text-muted">Tahmini K/Z</span>
        <span className={`tabular-nums font-medium ${estimatedPl === null || tooMany ? 'text-muted' : profitClass(estimatedPl)}`}>
          {estimatedPl === null || tooMany ? '-' : formatSignedCurrency(estimatedPl)}
        </span>
      </div>

      <button type="submit" disabled={submitting || tooMany} className={`${sellButtonClass} w-full`}>
        {submitting ? 'Kaydediliyor...' : 'Satışı kaydet'}
      </button>
    </form>
  )
}
