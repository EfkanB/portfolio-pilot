import { useState } from 'react'
import AddFundForm from './AddFundForm'
import SellFundForm from './SellFundForm'
import { panelClass } from './ui'

const MODES = [
  { id: 'buy', label: 'Al', active: 'bg-gain-soft text-gain ring-1 ring-gain/40' },
  { id: 'sell', label: 'Sat', active: 'bg-loss-soft text-loss ring-1 ring-loss/40' },
]

export default function TradePanel({ funds, initialCode, onBuy, onSell }) {
  const [mode, setMode] = useState('buy')

  return (
    <section className={panelClass} aria-label="İşlem">
      <div role="tablist" aria-label="İşlem türü" className="grid grid-cols-2 gap-1 rounded-lg bg-sunken p-1">
        {MODES.map((m) => {
          const active = m.id === mode
          return (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setMode(m.id)}
              className={`rounded-md py-1.5 text-sm transition-colors ${active ? `font-semibold ${m.active}` : 'text-muted hover:text-ink'}`}
            >
              {m.label}
            </button>
          )
        })}
      </div>

      <div className="mt-5">
        {mode === 'buy' ? <AddFundForm initialCode={initialCode} onSubmit={onBuy} /> : <SellFundForm funds={funds} onSubmit={onSell} />}
      </div>
    </section>
  )
}
