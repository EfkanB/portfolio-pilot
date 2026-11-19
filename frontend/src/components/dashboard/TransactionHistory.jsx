import { formatCurrency, formatDate, formatPrice, formatQuantity, formatSignedCurrency, profitClass } from '../../utils/format'
import { panelClass, panelHintClass, panelTitleClass, tableHeadClass, tdClass, thClass } from './ui'

export default function TransactionHistory({ transactions, loading }) {
  return (
    <section className={panelClass} aria-labelledby="history-title">
      <h2 id="history-title" className={panelTitleClass}>
        <span className="h-2.5 w-2.5 rounded-sm bg-amber" aria-hidden="true" />
        İşlem geçmişi
      </h2>
      <p className={panelHintClass}>Satışlarda gerçekleşen K/Z, satış fiyatı ile o anki ortalama maliyetin farkıdır.</p>

      {loading && transactions.length === 0 ? (
        <div className="mt-5 space-y-3" aria-label="Yükleniyor">
          {[72, 58, 64].map((width) => (
            <div key={width} className="h-5 animate-pulse rounded bg-sunken" style={{ width: `${width}%` }} />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <p className="mt-5 rounded-lg bg-sunken px-4 py-10 text-center text-sm text-muted">Henüz işlem yok.</p>
      ) : (
        <div className="scroll-x mt-4">
          <table className="w-full min-w-[620px] text-sm">
            <thead className={tableHeadClass}>
              <tr>
                <th className={thClass}>Tarih</th>
                <th className={thClass}>İşlem</th>
                <th className={thClass}>Fon</th>
                <th className={`${thClass} text-right`}>Adet</th>
                <th className={`${thClass} text-right`}>Fiyat</th>
                <th className={`${thClass} text-right`}>Tutar</th>
                <th className={`${thClass} text-right`}>Gerçekleşen K/Z</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const isSell = tx.type === 'Sell'
                return (
                  <tr key={tx.id} className="border-b border-line last:border-0">
                    <td className={`${tdClass} tabular-nums whitespace-nowrap text-muted`}>{formatDate(tx.createdAt)}</td>
                    <td className={tdClass}>
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${isSell ? 'bg-loss-soft text-loss' : 'bg-gain-soft text-gain'}`}>
                        {isSell ? 'Satış' : 'Alış'}
                      </span>
                    </td>
                    <td className={`${tdClass} tabular-nums font-medium text-ink`}>{tx.fundCode}</td>
                    <td className={`${tdClass} tabular-nums text-right text-ink-soft`}>{formatQuantity(tx.quantity)}</td>
                    <td className={`${tdClass} tabular-nums text-right text-ink-soft`}>{formatPrice(tx.price)}</td>
                    <td className={`${tdClass} tabular-nums text-right text-ink`}>{formatCurrency(tx.price * tx.quantity)}</td>
                    <td className={`${tdClass} tabular-nums text-right ${isSell ? `font-medium ${profitClass(tx.realizedProfitLoss)}` : 'text-muted'}`}>
                      {isSell ? formatSignedCurrency(tx.realizedProfitLoss) : '-'}
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
