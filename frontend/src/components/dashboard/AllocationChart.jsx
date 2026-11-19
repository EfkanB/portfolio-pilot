import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '../../utils/format'
import { CHART_COLORS, panelClass, panelHintClass, panelTitleClass } from './ui'

export default function AllocationChart({ funds }) {
  const data = useMemo(
    () =>
      funds
        .map((fund) => ({ code: fund.fundCode, name: fund.fundName, value: Math.max(fund.quantity * fund.currentPrice, 0) }))
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value),
    [funds],
  )

  const total = data.reduce((sum, entry) => sum + entry.value, 0)

  return (
    <section className={panelClass} aria-labelledby="allocation-title">
      <h2 id="allocation-title" className={panelTitleClass}>
        <span className="h-2.5 w-2.5 rounded-sm bg-cyan" aria-hidden="true" />
        Dağılım
      </h2>
      <p className={panelHintClass}>Fonların güncel değere göre payı.</p>

      {data.length > 0 ? (
        <>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="code" innerRadius="62%" outerRadius="100%" paddingAngle={1.5} stroke="none" isAnimationActive={false}>
                  {data.map((entry, index) => (
                    <Cell key={entry.code} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-line)',
                    borderRadius: 8,
                    fontSize: 13,
                    color: 'var(--color-ink)',
                  }}
                  itemStyle={{ color: 'var(--color-ink)' }}
                  formatter={(value, code) => [formatCurrency(value), code]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <ul className="mt-4 divide-y divide-line text-sm">
            {data.map((entry, index) => (
              <li key={entry.code} className="flex items-center gap-3 py-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} aria-hidden="true" />
                <span className="tabular-nums w-12 shrink-0 font-medium text-ink">{entry.code}</span>
                <span className="tabular-nums ml-auto text-ink-soft">{formatCurrency(entry.value)}</span>
                <span className="tabular-nums w-14 text-right text-muted">%{((entry.value / total) * 100).toFixed(1)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-6 rounded-lg bg-sunken px-4 py-8 text-center text-sm text-muted">Fon eklediğinde dağılım burada görünür.</p>
      )}
    </section>
  )
}
