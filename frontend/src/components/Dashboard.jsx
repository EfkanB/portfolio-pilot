import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api, { getErrorMessage } from '../services/api'
import usePortfolioHub from '../hooks/usePortfolioHub'
import SiteHeader from './layout/SiteHeader'
import PortfolioTabs from './dashboard/PortfolioTabs'
import CreatePortfolioModal, { CreatePortfolioForm } from './dashboard/CreatePortfolioModal'
import PortfolioSummary from './dashboard/PortfolioSummary'
import AllocationChart from './dashboard/AllocationChart'
import TradePanel from './dashboard/TradePanel'
import FundTable from './dashboard/FundTable'
import TransactionHistory from './dashboard/TransactionHistory'

const HUB_LABELS = {
  Connecting: 'Bağlanıyor',
  Connected: 'Fiyatlar canlı',
  Reconnecting: 'Yeniden bağlanıyor',
  Disconnected: 'Canlı bağlantı yok',
}

function HubStatus({ status }) {
  const tone = status === 'Connected' ? 'bg-gain' : status === 'Disconnected' ? 'bg-loss' : 'bg-warn'
  return (
    <span role="status" className="mr-2 hidden items-center gap-2 text-xs text-muted md:inline-flex">
      <span className={`h-1.5 w-1.5 rounded-full ${tone}`} aria-hidden="true" />
      {HUB_LABELS[status] ?? status}
    </span>
  )
}

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()

  const [portfolios, setPortfolios] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [transactionsLoading, setTransactionsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(Boolean(location.state?.createPortfolio))
  const [pendingFundCode, setPendingFundCode] = useState(location.state?.addFund ?? '')
  const [creatingPortfolio, setCreatingPortfolio] = useState(false)
  const [deletingPortfolio, setDeletingPortfolio] = useState(false)
  const [deletingFundId, setDeletingFundId] = useState(null)

  // Intent from the home page (create / add fund) is consumed once; clear it so a refresh doesn't replay it.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  const selectedPortfolio = useMemo(() => portfolios.find((p) => p.id === selectedId) ?? null, [portfolios, selectedId])
  const funds = useMemo(() => selectedPortfolio?.funds ?? [], [selectedPortfolio])

  const stats = useMemo(() => {
    const totalValue = funds.reduce((sum, f) => sum + f.quantity * f.currentPrice, 0)
    const totalCost = funds.reduce((sum, f) => sum + f.quantity * f.averageCost, 0)
    const realized = transactions.reduce((sum, t) => sum + (t.realizedProfitLoss ?? 0), 0)
    return { totalValue, totalCost, unrealized: totalValue - totalCost, realized, fundCount: funds.length }
  }, [funds, transactions])

  const replacePortfolio = (updated) => setPortfolios((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))

  // ─── Data loading ─────────────────────────────────────────────────────
  const loadPortfolios = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const { data } = await api.get('/api/Portfolio')
      const list = Array.isArray(data) ? data : []
      setPortfolios(list)
      setSelectedId((prev) => (list.some((p) => p.id === prev) ? prev : (list[0]?.id ?? null)))
    } catch (err) {
      setError(getErrorMessage(err, 'Portföyler yüklenemedi.'))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTransactions = useCallback(async (portfolioId) => {
    if (!portfolioId) {
      setTransactions([])
      return
    }
    try {
      setTransactionsLoading(true)
      const { data } = await api.get(`/api/Portfolio/${portfolioId}/transactions`)
      setTransactions(Array.isArray(data) ? data : [])
    } catch {
      setTransactions([])
    } finally {
      setTransactionsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPortfolios()
  }, [loadPortfolios])

  useEffect(() => {
    setTransactions([])
    loadTransactions(selectedId)
  }, [selectedId, loadTransactions])

  // ─── Live prices ──────────────────────────────────────────────────────
  const handlePriceUpdate = useCallback((fundCode, price) => {
    setPortfolios((prev) =>
      prev.map((portfolio) =>
        portfolio.funds.some((f) => f.fundCode === fundCode)
          ? { ...portfolio, funds: portfolio.funds.map((f) => (f.fundCode === fundCode ? { ...f, currentPrice: price } : f)) }
          : portfolio,
      ),
    )
  }, [])

  const hubStatus = usePortfolioHub(handlePriceUpdate)

  // ─── Actions ──────────────────────────────────────────────────────────
  const handleCreatePortfolio = async (values) => {
    try {
      setCreatingPortfolio(true)
      setError('')
      const { data } = await api.post('/api/Portfolio', values)
      setPortfolios((prev) => [...prev, data])
      setSelectedId(data.id)
      return true
    } catch (err) {
      setError(getErrorMessage(err, 'Portföy oluşturulamadı.'))
      return false
    } finally {
      setCreatingPortfolio(false)
    }
  }

  const handleDeletePortfolio = async () => {
    if (!selectedPortfolio) return
    const confirmed = window.confirm(
      `"${selectedPortfolio.name}" silinsin mi?\nPortföydeki tüm fonlar ve işlem geçmişi kalıcı olarak silinir.`,
    )
    if (!confirmed) return

    try {
      setDeletingPortfolio(true)
      setError('')
      await api.delete(`/api/Portfolio/${selectedPortfolio.id}`)
      const remaining = portfolios.filter((p) => p.id !== selectedPortfolio.id)
      setPortfolios(remaining)
      setSelectedId(remaining[0]?.id ?? null)
    } catch (err) {
      setError(getErrorMessage(err, 'Portföy silinemedi.'))
    } finally {
      setDeletingPortfolio(false)
    }
  }

  const handleBuy = async (payload) => {
    try {
      setError('')
      const { data } = await api.post(`/api/Portfolio/${selectedId}/funds`, payload)
      replacePortfolio(data)
      setPendingFundCode('')
      loadTransactions(selectedId)
      return true
    } catch (err) {
      setError(getErrorMessage(err, 'Alış kaydedilemedi.'))
      return false
    }
  }

  const handleSell = async (payload) => {
    try {
      setError('')
      const { data } = await api.post(`/api/Portfolio/${selectedId}/funds/sell`, payload)
      replacePortfolio(data)
      loadTransactions(selectedId)
      return true
    } catch (err) {
      setError(getErrorMessage(err, 'Satış kaydedilemedi.'))
      return false
    }
  }

  const handleDeleteFund = async (fund) => {
    const confirmed = window.confirm(
      `${fund.fundCode} kaydı silinsin mi?\nBu bir satış değildir; işlem geçmişine yazılmaz ve geri alınamaz.`,
    )
    if (!confirmed) return

    try {
      setDeletingFundId(fund.id)
      setError('')
      const { data } = await api.delete(`/api/Portfolio/${selectedId}/funds/${fund.id}`)
      replacePortfolio(data)
    } catch (err) {
      setError(getErrorMessage(err, 'Fon silinemedi.'))
    } finally {
      setDeletingFundId(null)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh">
      <SiteHeader>
        <HubStatus status={hubStatus} />
      </SiteHeader>

      <main className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        {error && (
          <div role="alert" className="animate-enter flex items-start justify-between gap-4 rounded-lg border border-loss/30 bg-loss-soft px-4 py-3 text-sm text-loss">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')} className="shrink-0 rounded font-medium underline underline-offset-2">
              Kapat
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4" aria-label="Yükleniyor">
            <div className="h-8 w-48 animate-pulse rounded bg-sunken" />
            <div className="h-24 animate-pulse rounded-xl bg-sunken" />
            <div className="h-64 animate-pulse rounded-xl bg-sunken" />
          </div>
        ) : portfolios.length === 0 ? (
          <section className="animate-enter mx-auto max-w-md py-10">
            <h1 className="text-2xl font-semibold tracking-tight text-ink">İlk portföyünü oluştur</h1>
            <p className="mt-2 text-sm text-muted">
              {pendingFundCode
                ? `${pendingFundCode} fonunu eklemek için önce bir portföy oluştur.`
                : 'Fonlarını bir portföyde toplayarak alış, satış ve kâr/zararını takip edebilirsin.'}
            </p>
            <div className="mt-6 rounded-xl border border-line bg-surface p-6">
              <CreatePortfolioForm onSubmit={handleCreatePortfolio} submitting={creatingPortfolio} />
            </div>
          </section>
        ) : (
          <>
            <PortfolioTabs portfolios={portfolios} selectedId={selectedId} onSelect={setSelectedId} onCreateClick={() => setShowCreateModal(true)} />

            {selectedPortfolio && (
              <div key={selectedId} className="animate-enter space-y-8">
                <PortfolioSummary portfolio={selectedPortfolio} stats={stats} deleting={deletingPortfolio} onDelete={handleDeletePortfolio} />

                <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
                  <FundTable funds={funds} deletingFundId={deletingFundId} onDelete={handleDeleteFund} />
                  <TradePanel key={pendingFundCode} funds={funds} initialCode={pendingFundCode} onBuy={handleBuy} onSell={handleSell} />
                </div>

                <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                  <AllocationChart funds={funds} />
                  <TransactionHistory transactions={transactions} loading={transactionsLoading} />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <CreatePortfolioModal
        open={showCreateModal && portfolios.length > 0}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePortfolio}
        submitting={creatingPortfolio}
      />
    </div>
  )
}
