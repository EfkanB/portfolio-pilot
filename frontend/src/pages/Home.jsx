import SiteHeader from '../components/layout/SiteHeader'
import FundMarket from '../components/FundMarket'
import MarketPulse from '../components/MarketPulse'
import useAuthGate from '../hooks/useAuthGate'
import useMarketQuotes from '../hooks/useMarketQuotes'
import { TONES } from '../data/market'
import { primaryButtonClass, secondaryButtonClass } from '../components/dashboard/ui'

const FEATURES = [
  {
    tone: 'violet',
    tag: 'Kayıt',
    title: 'Her alış ve satış saklanır',
    body: 'Tarih, fiyat ve adetle. Aynı fonu farklı fiyatlardan aldığında ortalama maliyet kendiliğinden güncellenir.',
  },
  {
    tone: 'cyan',
    tag: 'Kâr / zarar',
    title: 'Gerçekleşen ve kâğıt üstü ayrı',
    body: 'Sattıklarında ne kazandığını, elinde tuttuklarında güncel fiyata göre durumunu ayrı ayrı görürsün.',
  },
  {
    tone: 'amber',
    tag: 'Canlı',
    title: 'Fiyatlar kendiliğinden yenilenir',
    body: 'Portföyündeki fonların fiyatları arka planda güncellenir; sayfayı yenilemene gerek kalmaz.',
  },
]

export default function Home() {
  const goTo = useAuthGate()
  const market = useMarketQuotes()
  const addFund = (code) => goTo('/dashboard', { addFund: code })

  return (
    <div className="min-h-dvh">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        <section className="animate-enter grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-violet-soft px-3 py-1 text-xs font-medium text-violet ring-1 ring-violet/30">
              <span className="h-1.5 w-1.5 rounded-full bg-gain" aria-hidden="true" />
              TEFAS verisiyle, her gün güncel
            </p>
            <h1 className="mt-5 max-w-[16ch] text-4xl font-semibold leading-[1.08] tracking-[-0.025em] text-ink sm:text-[3.4rem]">
              Fonlarını <span className="text-violet">tek ekranda</span> takip et.
            </h1>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-ink-soft">
              Portföyüne fon ekle, alış ve satışlarını kaydet. Ne kadar kazandığını ya da kaybettiğini güncel fiyatlarla anında gör.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={() => goTo('/dashboard', { createPortfolio: true })} className={`${primaryButtonClass} min-h-11 px-5`}>
                Portföy oluştur
              </button>
              <a href="#fonlar" className={`${secondaryButtonClass} min-h-11 px-5`}>Fonlara göz at</a>
            </div>
          </div>

          <MarketPulse quotes={market.quotes} status={market.status} onSelect={addFund} />
        </section>

        <section aria-label="Özellikler" className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {FEATURES.map((feature) => {
            const tone = TONES[feature.tone]
            return (
              <div key={feature.title} className="bg-surface p-6">
                <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${tone.soft} ${tone.text}`}>{feature.tag}</span>
                <h3 className="mt-3 font-semibold text-ink">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.body}</p>
              </div>
            )
          })}
        </section>

        <div className="mt-16">
          <FundMarket quotes={market.quotes} status={market.status} onRetry={market.reload} onAddFund={addFund} />
        </div>
      </main>

      <footer className="mt-20 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted sm:flex-row sm:justify-between sm:px-6">
          <span className="font-medium text-ink-soft">Portfolio<span className="text-violet">Pilot</span></span>
          <span>Fiyat verileri: Türkiye Elektronik Fon Alım Satım Platformu (TEFAS)</span>
        </div>
      </footer>
    </div>
  )
}
