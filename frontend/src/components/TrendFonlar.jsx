import { useState } from 'react'

// ─── Mock veri (şimdilik sahte; gerçek API verisiyle değiştirilecek) ─────────
const CATEGORY_TABS = [
  {
    id: 'current',
    label: 'Güncel Fonlar',
    funds: [
      { fundCode: 'AFT', fundName: 'Aktif Fon Teknolojileri', currentPrice: 128.45, dailyReturnPercent: 2.34, asOfDate: 'Bugün' },
      { fundCode: 'PBR', fundName: 'Pilot Büyüme Roğan Fonu', currentPrice: 96.12, dailyReturnPercent: -1.08, asOfDate: 'Bugün' },
      { fundCode: 'OJK', fundName: 'Ortak Yatırım Katılım Fonu', currentPrice: 74.8, dailyReturnPercent: 0.56, asOfDate: 'Bugün' },
      { fundCode: 'DBH', fundName: 'Dengeli Borsa Hisse Fonu', currentPrice: 210.3, dailyReturnPercent: 3.12, asOfDate: 'Bugün' },
      { fundCode: 'KRY', fundName: 'Kira Sertifikası Katılım Fonu', currentPrice: 45.67, dailyReturnPercent: 0.12, asOfDate: 'Bugün' },
      { fundCode: 'TMT', fundName: 'Teknoloji Medya Telekom Fonu', currentPrice: 152.9, dailyReturnPercent: -0.45, asOfDate: 'Bugün' },
    ],
  },
  {
    id: 'popular',
    label: 'En Çok İşlem Gören Fonlar',
    funds: [
      { fundCode: 'TMP', fundName: 'Temettü Hisse Senedi Fonu', currentPrice: 312.55, dailyReturnPercent: 1.87, asOfDate: 'Bugün' },
      { fundCode: 'ALT', fundName: 'Altın Fonu', currentPrice: 2450.2, dailyReturnPercent: 0.93, asOfDate: 'Bugün' },
      { fundCode: 'EST', fundName: 'Enerji Sektörü Fonu', currentPrice: 88.4, dailyReturnPercent: 2.71, asOfDate: 'Bugün' },
      { fundCode: 'GLB', fundName: 'Global Esnek Fon', currentPrice: 176.05, dailyReturnPercent: 1.12, asOfDate: 'Bugün' },
      { fundCode: 'SAG', fundName: 'Sağlık Sektörü Fonu', currentPrice: 134.6, dailyReturnPercent: -0.67, asOfDate: 'Bugün' },
      { fundCode: 'BKY', fundName: 'Bankacılık Katılım Fonu', currentPrice: 92.3, dailyReturnPercent: 0.34, asOfDate: 'Bugün' },
    ],
  },
  {
    id: 'global',
    label: 'Global Fonlar',
    funds: [
      { fundCode: 'USQ', fundName: 'ABD Dev Teknoloji Fonu', currentPrice: 589.75, dailyReturnPercent: 1.45, asOfDate: 'Bugün' },
      { fundCode: 'EUR', fundName: 'Avrupa Hisse Senedi Fonu', currentPrice: 402.18, dailyReturnPercent: 0.78, asOfDate: 'Bugün' },
      { fundCode: 'ASX', fundName: 'Asya Pasifik Fonu', currentPrice: 318.9, dailyReturnPercent: -1.22, asOfDate: 'Bugün' },
      { fundCode: 'EMG', fundName: 'Gelişen Piyasalar Fonu', currentPrice: 267.4, dailyReturnPercent: 2.05, asOfDate: 'Bugün' },
      { fundCode: 'GEL', fundName: 'Global Emtia Fonu', currentPrice: 124.85, dailyReturnPercent: 0.41, asOfDate: 'Bugün' },
      { fundCode: 'TEC', fundName: 'Global Teknoloji Fonu', currentPrice: 654.3, dailyReturnPercent: 3.24, asOfDate: 'Bugün' },
    ],
  },
]

function formatCurrency(value) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value) {
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

  return `${Number(value) >= 0 ? '+' : ''}${formatted}%`
}

export default function TrendFonlar() {
  const [activeTab, setActiveTab] = useState(CATEGORY_TABS[0].id)

  const activeCategory = CATEGORY_TABS.find((tab) => tab.id === activeTab) ?? CATEGORY_TABS[0]
  const quotes = activeCategory.funds

  return (
    <section className="rounded-[1.5rem] border border-cyan-300/10 bg-slate-950/75 p-4 shadow-[0_18px_60px_rgba(2,8,23,0.32)] backdrop-blur-xl">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300/70">Trend Fonlar</p>
          <h2 className="mt-1 text-lg font-semibold text-white">En çok izlenen fonlar</h2>
        </div>
        <p className="text-xs text-slate-400">Güncel fiyat ve günlük getiri tek satırda</p>
      </div>

{/* ── Kategori Sekmeleri ─────────────────────────────────────────── */}
      <div className="mt-4 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
        {CATEGORY_TABS.map((tab) => {
          const isActive = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-300/30 shadow-lg shadow-cyan-950/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-100'
              }`}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-4 -bottom-[1px] h-0.5 rounded-full bg-cyan-300/80" />
              )}
            </button>
          )
        })}
      </div>

{/* ── Yatay Kaydırılabilir Kartlar ───────────────────────────────── */}
      <div className="trend-scrollbar mt-4 flex gap-3 overflow-x-auto">
        {quotes.map((quote) => {
          const code = quote.fundCode ?? quote.FundCode ?? ''
          const name = quote.fundName ?? quote.FundName ?? code
          const price = Number(quote.currentPrice ?? quote.CurrentPrice ?? 0)
          const dailyReturn = Number(quote.dailyReturnPercent ?? quote.DailyReturnPercent ?? 0)
          const asOfDate = quote.asOfDate ?? quote.AsOfDate ?? ''
          const isPositive = dailyReturn >= 0

          return (
            <article
              key={code}
              className="min-w-[220px] flex-1 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-cyan-200">{code}</div>
                  <div className="mt-1 text-sm text-slate-300 line-clamp-2">{name}</div>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    isPositive ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'
                  }`}
                >
                  {formatPercent(dailyReturn)}
                </span>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500">Güncel Fiyat</div>
                  <div className="mt-1 text-2xl font-semibold text-white">₺{formatCurrency(price)}</div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div>{asOfDate || 'Bugün'}</div>
                  <div className="mt-1">TEFAS</div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
