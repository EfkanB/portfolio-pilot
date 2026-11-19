import { formatCurrency, formatPrice, formatQuantity, formatSignedCurrency, prettyFundName, profitClass } from '../../utils/format'
import { categoryOf, TONES } from '../../data/market'
import { panelClass, panelHintClass, panelTitleClass, tableHeadClass, tdClass, thClass } from './ui'

export default function FundTable({ funds, deletingFundId, onDelete }) {
  return (
    <section className={panelClass} aria-labelledby="holdings-title">
      <h2 id="holdings-title" className={panelTitleClass}>
        <span className="h-2.5 w-2.5 rounded-sm bg-violet" aria-hidden="true" />
        Fonlarım
      </h2>
      <p className={panelHintClass}>K/Z, güncel fiyat ile ortalama maliyetin farkı üzerinden hesaplanır.</p>

      {funds.length === 0 ? (
        <p className="mt-5 rounded-lg bg-sunken px-4 py-10 text-center text-sm text-muted">
          Bu portföyde henüz fon yok. Sağdaki panelden ilk alışını kaydet.
        </p>
      ) : (
        <div className="scroll-x mt-4">
          <table className="w-full min-w-[620px] text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>Fon</th>
                <th className={`${thClass} text-right`}>Adet</th>
                <th className={`${thClass} text-right`}>Maliyet</th>
                <th className={`${thClass} text-right`}>Fiyat</th>
                <th className={`${thClass} text-right`}>Değer</th>
                <th className={`${thClass} text-right`}>K/Z</th>
                <th className={`${thClass} w-12`}><span className="sr-only">İşlem</span></th>
              </tr>
            </thead>
            <tbody>
              {funds.map((fund) => {
                const cost = fund.averageCost * fund.quantity
                const value = fund.currentPrice * fund.quantity
                const profitLoss = value - cost
                const percent = cost > 0 ? (profitLoss / cost) * 100 : 0

                return (
                  <tr key={fund.id} className="border-b border-line last:border-0">
                    <td className={tdClass}>
                      <span className={`tabular-nums rounded-md px-1.5 py-0.5 text-xs font-semibold ${TONES[categoryOf(fund.fundCode)?.tone ?? 'violet'].soft} ${TONES[categoryOf(fund.fundCode)?.tone ?? 'violet'].text}`}>{fund.fundCode}</span>
                      {fund.fundName !== fund.fundCode && (
                        <div className="mt-1 line-clamp-1 max-w-[18rem] text-xs text-muted" title={fund.fundName}>{prettyFundName(fund.fundName)}</div>
                      )}
                    </td>
                    <td className={`${tdClass} tabular-nums text-right text-ink-soft`}>{formatQuantity(fund.quantity)}</td>
                    <td className={`${tdClass} tabular-nums text-right text-ink-soft`}>{formatPrice(fund.averageCost)}</td>
                    <td className={`${tdClass} tabular-nums text-right text-ink-soft`}>{formatPrice(fund.currentPrice)}</td>
                    <td className={`${tdClass} tabular-nums text-right text-ink`}>{formatCurrency(value)}</td>
                    <td className={`${tdClass} tabular-nums text-right ${profitClass(profitLoss)}`}>
                      <div className="font-medium">{formatSignedCurrency(profitLoss)}</div>
                      <div className="text-xs opacity-80">{percent >= 0 ? '+' : '−'}%{Math.abs(percent).toFixed(2)}</div>
                    </td>
                    <td className={`${tdClass} text-right`}>
                      <button
                        type="button"
                        onClick={() => onDelete(fund)}
                        disabled={deletingFundId === fund.id}
                        title="Kaydı sil (satış olarak kaydedilmez)"
                        aria-label={`${fund.fundCode} kaydını sil`}
                        className="rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-loss-soft hover:text-loss disabled:opacity-50"
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
