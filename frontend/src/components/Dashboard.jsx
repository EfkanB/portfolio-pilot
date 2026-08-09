import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import api from '../services/api'
import TrendFonlar from './TrendFonlar'

const COLORS = [
  '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981',
  '#ef4444', '#ec4899', '#3b82f6', '#14b8a6',
  '#f97316', '#84cc16', '#6366f1', '#d946ef',
]

function formatCurrency(value) {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatQuantity(value) {
  return Number.isFinite(value) ? Math.trunc(value).toString() : '0'
}

function extractFunds(portfolio) {
  return portfolio?.funds ?? portfolio?.Funds ?? portfolio?.investmentFunds ?? portfolio?.InvestmentFunds ?? []
}

function extractId(entity) {
  return entity?.id ?? entity?.Id
}

function extractName(entity) {
  return entity?.name ?? entity?.Name
}

function extractDescription(entity) {
  return entity?.description ?? entity?.Description
}

export default function Dashboard() { 
  const navigate = useNavigate()
  const [portfolios, setPortfolios] = useState([])
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null)
  const [funds, setFunds] = useState([])
  const [connectionStatus, setConnectionStatus] = useState('Connecting')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  // Portfolio creation modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creatingPortfolio, setCreatingPortfolio] = useState(false)
  const [portfolioForm, setPortfolioForm] = useState({ name: '', description: '' })

  // Fund add form
  const [fundForm, setFundForm] = useState({ fundCode: '', quantity: '', currentPrice: '' })
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [addingFund, setAddingFund] = useState(false)

  // Delete fund
  const [deletingFundId, setDeletingFundId] = useState(null)
  const [deletingPortfolioId, setDeletingPortfolioId] = useState(null)

  // Sell fund
  const [sellForm, setSellForm] = useState({ fundCode: '', quantity: '' })
  const [sellingFund, setSellingFund] = useState(false)

  const hubUrl = useMemo(() => 'http://localhost:5000/portfolioHub', [])

  // ─── Derived current portfolio ───────────────────────────────────────
  const selectedPortfolio = useMemo(
    () => portfolios.find((p) => extractId(p) === selectedPortfolioId) ?? null,
    [portfolios, selectedPortfolioId],
  )

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const loadPortfolios = useCallback(async () => {
    try {
      setError('')
      setLoading(true)

      const response = await api.get('/api/Portfolio')
      const data = Array.isArray(response.data) ? response.data : []

      setPortfolios(data)

      if (data.length > 0) {
        const firstId = extractId(data[0])
        setSelectedPortfolioId((prev) => {
          // Keep existing selection if still valid
          if (prev && data.some((p) => extractId(p) === prev)) return prev
          return firstId
        })
      } else {
        setSelectedPortfolioId(null)
        setFunds([])
      }
    } catch {
      setError('Portföy verisi alınamadı.')
    } finally {
      setLoading(false)
    }
  }, [])

  // Sync funds whenever selected portfolio changes
  useEffect(() => {
    if (selectedPortfolio) {
      setFunds(extractFunds(selectedPortfolio))
    } else {
      setFunds([])
    }
  }, [selectedPortfolio])

  // ─── Portfolio CRUD ──────────────────────────────────────────────────
  const handlePortfolioFormChange = (e) => {
    const { name, value } = e.target
    setPortfolioForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreatePortfolio = async (e) => {
    e.preventDefault()
    try {
      setCreatingPortfolio(true)
      setError('')

      const response = await api.post('/api/Portfolio', {
        name: portfolioForm.name,
        description: portfolioForm.description,
      })

      const newPortfolio = response.data
      setPortfolios((prev) => [...prev, newPortfolio])
      setSelectedPortfolioId(extractId(newPortfolio))
      setPortfolioForm({ name: '', description: '' })
      setShowCreateModal(false)
    } catch {
      setError('Portföy oluşturulamadı.')
    } finally {
      setCreatingPortfolio(false)
    }
  }

  const handleDeletePortfolio = async (portfolioId) => {
    if (!portfolioId) return

    const targetPortfolio = portfolios.find((p) => extractId(p) === portfolioId)
    const portfolioName = extractName(targetPortfolio) || 'bu portföy'

    const confirmed = window.confirm(
      `${portfolioName} silinsin mi? Bu işlem portföydeki tüm fonları da kalıcı olarak siler.`,
    )

    if (!confirmed) return

    try {
      setDeletingPortfolioId(portfolioId)
      setError('')

      await api.delete(`/api/Portfolio/${portfolioId}`)

      setPortfolios((prev) => prev.filter((p) => extractId(p) !== portfolioId))
      setSelectedPortfolioId((current) => {
        if (current !== portfolioId) return current
        const remaining = portfolios.filter((p) => extractId(p) !== portfolioId)
        return remaining.length > 0 ? extractId(remaining[0]) : null
      })
      setFunds([])
    } catch {
      setError('Portföy silinemedi.')
    } finally {
      setDeletingPortfolioId(null)
    }
  }

  // ─── Fund Price Fetch (auto) ──────────────────────────────────────────
  const fetchFundPrice = useCallback(async (fundCode, signal) => {
    const code = fundCode.trim().toUpperCase()
    if (!code) return

    setFetchingPrice(true)

    try {
      const tefasResponse = await api.get(`/api/Tefas/quote/${encodeURIComponent(code)}`, { signal })
      const tefasPrice = tefasResponse.data?.currentPrice ?? tefasResponse.data?.CurrentPrice

      if (tefasPrice !== undefined && tefasPrice !== null) {
        setFundForm((prev) => ({ ...prev, currentPrice: String(tefasPrice) }))
        return
      }
    } catch (error) {
      if (signal?.aborted) return
    }

    try {
      const fallbackResponse = await api.get(`/api/Portfolio/current-price/${encodeURIComponent(code)}`, { signal })
      const fallbackPrice = fallbackResponse.data?.currentPrice ?? fallbackResponse.data?.CurrentPrice

      if (fallbackPrice !== undefined && fallbackPrice !== null) {
        setFundForm((prev) => ({ ...prev, currentPrice: String(fallbackPrice) }))
      }
    } catch (error) {
      if (signal?.aborted) return
    } finally {
      if (!signal?.aborted) {
        setFetchingPrice(false)
      }
    }
  }, [])

  useEffect(() => {
    const code = fundForm.fundCode.trim()
    if (!code) {
      setFundForm((prev) => (prev.currentPrice ? { ...prev, currentPrice: '' } : prev))
      setFetchingPrice(false)
      return undefined
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      fetchFundPrice(code, controller.signal)
    }, 450)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [fetchFundPrice, fundForm.fundCode])

  // ─── Add Fund ─────────────────────────────────────────────────────────
  const handleFundFormChange = (e) => {
    const { name, value } = e.target
    setFundForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddFund = async (e) => {
    e.preventDefault()
    if (!selectedPortfolio) {
      setError('Önce bir portföy seçmelisin.')
      return
    }

    try {
      setAddingFund(true)
      setError('')

      const portfolioId = extractId(selectedPortfolio)
      const currentPrice = Number(fundForm.currentPrice)

      const response = await api.post(`/api/Portfolio/${portfolioId}/funds`, {
        fundCode: fundForm.fundCode,
        quantity: Number(fundForm.quantity),
        currentPrice,
        averageCost: currentPrice, // initial cost equals purchase price
      })

      const updatedPortfolio = response.data

      // Update portfolios list with the updated one
      setPortfolios((prev) =>
        prev.map((p) => (extractId(p) === extractId(updatedPortfolio) ? updatedPortfolio : p)),
      )

      setFundForm({ fundCode: '', quantity: '', currentPrice: '' })
    } catch {
      setError('Fon eklenemedi.')
    } finally {
      setAddingFund(false)
    }
  }

  // ─── Delete Fund ──────────────────────────────────────────────────────
  const handleDeleteFund = async (fundId) => {
    if (!selectedPortfolio || !fundId) return

    const targetFund = funds.find((fund) => (fund.id ?? fund.Id) === fundId)
    const fundLabel = `${targetFund?.fundCode ?? targetFund?.FundCode ?? 'Fon'}${targetFund?.fundName || targetFund?.FundName ? ` - ${targetFund.fundName ?? targetFund.FundName}` : ''}`
    const confirmed = window.confirm(`${fundLabel} silinsin mi? Bu işlem geri alınamaz.`)

    if (!confirmed) return

    try {
      setDeletingFundId(fundId)
      setError('')

      const portfolioId = extractId(selectedPortfolio)
      const response = await api.delete(`/api/Portfolio/${portfolioId}/funds/${fundId}`)

      const updatedPortfolio = response.data

      // Update portfolios list with the updated one
      setPortfolios((prev) =>
        prev.map((p) => (extractId(p) === extractId(updatedPortfolio) ? updatedPortfolio : p)),
      )
    } catch {
      setError('Fon silinemedi.')
    } finally {
      setDeletingFundId(null)
    }
  }

  // ─── Sell Fund ────────────────────────────────────────────────────────
  const handleSellFormChange = (e) => {
    const { name, value } = e.target
    setSellForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSellFund = async (e) => {
    e.preventDefault()
    if (!selectedPortfolio) {
      setError('Önce bir portföy seçmelisin.')
      return
    }

    const selectedFundCode = sellForm.fundCode
    if (!selectedFundCode) {
      setError('Lütfen bir fon seçin.')
      return
    }

    try {
      setSellingFund(true)
      setError('')

      const portfolioId = extractId(selectedPortfolio)

      const response = await api.post(`/api/Portfolio/${portfolioId}/funds/sell`, {
        fundCode: selectedFundCode,
        quantity: Number(sellForm.quantity),
      })

      const updatedPortfolio = response.data

      // Update portfolios list with the updated one
      setPortfolios((prev) =>
        prev.map((p) => (extractId(p) === extractId(updatedPortfolio) ? updatedPortfolio : p)),
      )

      setSellForm({ fundCode: '', quantity: '' })
    } catch {
      setError('Fon satışı gerçekleştirilemedi.')
    } finally {
      setSellingFund(false)
    }
  }

  // ─── SignalR ──────────────────────────────────────────────────────────
  useEffect(() => {
    let connection

    const connectHub = async () => {
      connection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .build()

      connection.on('ReceivePriceUpdate', (fundCode, newPrice) => {
        setFunds((currentFunds) =>
          currentFunds.map((fund) => {
            const code = fund.fundCode ?? fund.FundCode
            if (code !== fundCode) return fund
            return { ...fund, currentPrice: newPrice, CurrentPrice: newPrice }
          }),
        )

        // Also update the portfolio in the master list so switching tabs keeps fresh data
        setPortfolios((prev) =>
          prev.map((p) => {
            const pfFunds = extractFunds(p)
            const hasMatch = pfFunds.some((f) => {
              const code = f.fundCode ?? f.FundCode
              return code === fundCode
            })
            if (!hasMatch) return p

            const updatedFunds = pfFunds.map((f) => {
              const code = f.fundCode ?? f.FundCode
              if (code !== fundCode) return f
              return { ...f, currentPrice: newPrice, CurrentPrice: newPrice }
            })

            return { ...p, funds: updatedFunds, Funds: updatedFunds }
          }),
        )
      })

      connection.onreconnecting(() => setConnectionStatus('Reconnecting'))
      connection.onreconnected(() => setConnectionStatus('Connected'))
      connection.onclose(() => setConnectionStatus('Disconnected'))

      try {
        await connection.start()
        setConnectionStatus('Connected')
      } catch {
        setConnectionStatus('Disconnected')
      }
    }

    loadPortfolios()
    connectHub()

    return () => {
      if (connection) connection.stop()
    }
  }, [hubUrl, loadPortfolios])

  // ─── Pie Chart Data ──────────────────────────────────────────────────
  const pieData = useMemo(() => {
    return funds
      .map((fund) => {
        const name = fund.fundName ?? fund.FundName ?? fund.fundCode ?? fund.FundCode ?? 'Bilinmeyen'
        const code = fund.fundCode ?? fund.FundCode ?? ''
        const quantity = Number(fund.quantity ?? fund.Quantity ?? 0)
        const price = Number(fund.currentPrice ?? fund.CurrentPrice ?? 0)
        const value = quantity * price
        return { name: `${code} - ${name}`, value: Math.max(value, 0) }
      })
      .filter((d) => d.value > 0)
  }, [funds])

  const totalValue = useMemo(() => pieData.reduce((sum, d) => sum + d.value, 0), [pieData])

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 py-6 text-gray-100">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="rounded-[1.75rem] border border-cyan-400/10 bg-slate-950/75 p-5 shadow-[0_25px_80px_rgba(2,8,23,0.55)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">PortfolioPilot</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white md:text-4xl">Finans Kontrol Merkezi</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Portföyünü yönet, TEFAS fonlarını izle ve anlık fiyatları tek ekranda takip et.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-right shadow-lg shadow-black/10">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Hub</div>
                <div className="mt-0.5 text-xs font-medium text-gray-200">{connectionStatus}</div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 shadow-lg shadow-rose-950/20">
            {error}
          </div>
        )}

        <TrendFonlar />

        {/* ── Portfolio Tabs ─────────────────────────────────────────── */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-3 shadow-[0_18px_60px_rgba(2,8,23,0.35)] backdrop-blur-xl">
            {portfolios.map((p) => {
              const pid = extractId(p)
              const isActive = pid === selectedPortfolioId
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setSelectedPortfolioId(pid)}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-cyan-300/15 text-cyan-200 ring-1 ring-cyan-300/25 shadow-lg shadow-cyan-950/20'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-100'
                  }`}
                >
                  {extractName(p)}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="ml-auto rounded-2xl bg-gradient-to-r from-cyan-300 to-teal-300 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:brightness-110"
            >
              + Yeni Portföy
            </button>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────── */}
        {!loading && portfolios.length === 0 && (
          <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-slate-950/55 p-10 text-center shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
            <h2 className="text-xl font-semibold text-white">İlk Portföyünü Oluştur</h2>
            <p className="mt-2 text-sm text-gray-400">
              Henüz portföy bulunmuyor. Aşağıdaki formu doldurarak başlayabilirsin.
            </p>
            <form className="mx-auto mt-6 flex max-w-lg flex-col gap-3 sm:flex-row" onSubmit={handleCreatePortfolio}>
              <input
                name="name"
                value={portfolioForm.name}
                onChange={handlePortfolioFormChange}
                placeholder="Portföy Adı"
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                required
              />
              <input
                name="description"
                value={portfolioForm.description}
                onChange={handlePortfolioFormChange}
                placeholder="Açıklama (isteğe bağlı)"
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
              />
              <button
                type="submit"
                disabled={creatingPortfolio}
                className="rounded-2xl bg-gradient-to-r from-cyan-300 to-teal-300 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingPortfolio ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </form>
          </div>
        )}

        {/* ── Loading State ──────────────────────────────────────────── */}
        {loading && (
          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-10 text-center shadow-[0_18px_60px_rgba(2,8,23,0.28)]">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-300 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">Portföyler yükleniyor...</p>
          </div>
        )}

        {/* ── Main Content (Portfolio Selected) ──────────────────────── */}
        {!loading && selectedPortfolio && (
          <>
            <div className="flex flex-col gap-4 rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-slate-950/90 via-slate-900/80 to-slate-950/75 p-5 shadow-[0_24px_80px_rgba(2,8,23,0.42)] backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Seçili Portföy</p>
                <h2 className="mt-1 text-2xl font-semibold text-white">{extractName(selectedPortfolio)}</h2>
                <p className="mt-1 text-sm text-slate-400">{extractDescription(selectedPortfolio) || 'Açıklama yok'}</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-slate-500">Toplam Değer</div>
                  <div className="mt-1 text-lg font-semibold text-cyan-200">₺{formatCurrency(totalValue)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeletePortfolio(selectedPortfolioId)}
                  disabled={deletingPortfolioId === selectedPortfolioId}
                  className="rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingPortfolioId === selectedPortfolioId ? 'Siliniyor...' : 'Portföyü Sil'}
                </button>
              </div>
            </div>

            {/* Portfolio Info Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/10">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Portföy Adı</div>
                <div className="mt-1.5 text-base font-semibold text-white">{extractName(selectedPortfolio)}</div>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/10">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Açıklama</div>
                <div className="mt-1.5 text-sm text-gray-300">{extractDescription(selectedPortfolio) || '-'}</div>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/10">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Fon Sayısı</div>
                <div className="mt-1.5 text-base font-semibold text-cyan-300">{funds.length}</div>
              </div>
            </div>

            {/* ── Pie Chart + Fund Form Row ────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              {/* Pie Chart */}
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(2,8,23,0.32)] backdrop-blur-xl">
                <h2 className="text-base font-semibold text-white">Fon Dağılımı</h2>
                <p className="mt-0.5 text-xs text-gray-400">Toplam değere göre dağılım (quantity × currentPrice)</p>

                {pieData.length > 0 ? (
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={110}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#08111f',
                            border: '1px solid rgba(148, 163, 184, 0.18)',
                            borderRadius: '0.75rem',
                            color: '#f3f4f6',
                            fontSize: '0.875rem',
                          }}
                          formatter={(value, name) => [`₺${formatCurrency(value)}`, name]}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: '0.75rem', color: '#9ca3af' }}
                          formatter={(value) => (
                            <span className="text-gray-400">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Quick summary list */}
                    <div className="mt-4 grid gap-1.5 text-sm">
                      {pieData.map((entry, i) => (
                          <div key={i} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            <span className="text-gray-300">{entry.name}</span>
                          </div>
                          <span className="font-medium tabular-nums text-gray-100">
                            ₺{formatCurrency(entry.value)}
                            <span className="ml-1.5 text-xs text-gray-500">
                              ({totalValue > 0 ? ((entry.value / totalValue) * 100).toFixed(1) : 0}%)
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-8 flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-gray-500">
                    Fon eklediğinizde grafik burada görünecek.
                  </div>
                )}
              </div>

              {/* Right Column: Add Fund + Sell Fund */}
              <div className="flex flex-col gap-6">
                {/* Add Fund Form */}
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(2,8,23,0.32)] backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Fon Ekle</h2>
                    <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-gray-400">
                      {extractName(selectedPortfolio)}
                    </span>
                  </div>

                  <form className="mt-4 space-y-3" onSubmit={handleAddFund}>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Fund Code */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-400">Fon Kodu</label>
                        <input
                          name="fundCode"
                          value={fundForm.fundCode}
                          onChange={handleFundFormChange}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                          required
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-400">Adet</label>
                        <input
                          name="quantity"
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={fundForm.quantity}
                          onChange={handleFundFormChange}
                          className="w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                          required
                        />
                      </div>

                      {/* Current Price */}
                      <div>
                        <label className="mb-1 flex items-center gap-1 text-xs font-medium text-gray-400">
                          Güncel Fiyat
                          {fetchingPrice && (
                            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
                          )}
                        </label>
                      <input
                        name="currentPrice"
                        type="number"
                        step="any"
                        min="0"
                        value={fundForm.currentPrice}
                        onChange={(e) => {
                          const { name, value } = e.target
                          const sanitized = value.replace(',', '.')
                          setFundForm((prev) => ({ ...prev, [name]: sanitized }))
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                        required
                      />
                    </div>
                  </div>

                    <button
                      type="submit"
                      disabled={addingFund}
                      className="mt-2 w-full rounded-2xl bg-gradient-to-r from-cyan-300 to-teal-300 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingFund ? 'Ekleniyor...' : 'Fon Ekle'}
                    </button>
                  </form>

                </div>

                {/* Sell Fund Form */}
                {funds.length > 0 && (
                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(2,8,23,0.32)] backdrop-blur-xl">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-white">Fon Çıkart</h2>
                      <span className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-gray-400">
                        {extractName(selectedPortfolio)}
                      </span>
                    </div>

                    <form className="mt-4 space-y-3" onSubmit={handleSellFund}>
                      <div className="grid grid-cols-2 gap-3">
                        {/* Fund Select */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-400">Fon Seçin</label>
                          <select
                            name="fundCode"
                            value={sellForm.fundCode}
                            onChange={handleSellFormChange}
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-300 outline-none transition focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                            required
                          >
                            <option value="" disabled>-- Fon Seçin --</option>
                            {funds.map((fund) => {
                              const code = fund.fundCode ?? fund.FundCode ?? ''
                              const name = fund.fundName ?? fund.FundName ?? ''
                              const qty = Number(fund.quantity ?? fund.Quantity ?? 0)
                              return (
                                <option key={code} value={code}>
                                  {code} - {name} (Mevcut: {formatQuantity(qty)})
                                </option>
                              )
                            })}
                          </select>
                        </div>

                        {/* Sell Quantity */}
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-400">Satılacak Adet</label>
                          <input
                            name="quantity"
                            type="number"
                            step="0.0001"
                            min="0.0001"
                            value={sellForm.quantity}
                            onChange={handleSellFormChange}
                            placeholder="0.00"
                            className="w-full rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={sellingFund}
                        className="mt-2 w-full rounded-2xl bg-gradient-to-r from-amber-300 to-orange-300 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sellingFund ? 'Satılıyor...' : 'Fon Çıkart'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* ── Fund Table ──────────────────────────────────────────── */}
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5 shadow-[0_20px_60px_rgba(2,8,23,0.32)] backdrop-blur-xl">
              <h2 className="text-base font-semibold text-white">Fon Listesi</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Kar / Zarar = (Güncel Fiyat − Ortalama Maliyet) × Adet
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] uppercase tracking-wider text-gray-400">
                      <th className="px-3 py-3 font-medium">Kod</th>
                      <th className="px-3 py-3 font-medium">Ad</th>
                      <th className="px-3 py-3 font-medium text-right">Adet</th>
                      <th className="px-3 py-3 font-medium text-right">Ort. Maliyet</th>
                      <th className="px-3 py-3 font-medium text-right">Güncel Fiyat</th>
                      <th className="px-3 py-3 font-medium text-right">Kar / Zarar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {funds.length > 0 ? (
                      funds.map((fund) => {
                        const id = fund.id ?? fund.Id
                        const fundCode = fund.fundCode ?? fund.FundCode ?? ''
                        const fundName = fund.fundName ?? fund.FundName ?? ''
                        const quantity = Number(fund.quantity ?? fund.Quantity ?? 0)
                        const currentPrice = Number(fund.currentPrice ?? fund.CurrentPrice ?? 0)
                        const averageCost = Number(fund.averageCost ?? fund.AverageCost ?? 0)
                        const profitLoss = (currentPrice - averageCost) * quantity
                        const isPositive = profitLoss >= 0

                        return (
                          <tr key={id ?? fundCode} className="transition hover:bg-white/5">
                            <td className="px-3 py-3 font-medium text-slate-400">{fundCode}</td>
                            <td className="px-3 py-3 text-gray-300">{fundName}</td>
                            <td className="px-3 py-3 text-right tabular-nums text-gray-200">
                              {formatQuantity(quantity)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-gray-200">
                              ₺{formatCurrency(averageCost)}
                            </td>
                            <td className="px-3 py-3 text-right tabular-nums text-gray-200">
                              ₺{formatCurrency(currentPrice)}
                            </td>
                            <td
                              className={`px-3 py-3 text-right tabular-nums font-medium ${
                                isPositive ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isPositive ? '+' : ''}₺{formatCurrency(profitLoss)}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">
                          Henüz fon bulunmuyor. Yukarıdaki formu kullanarak fon ekleyebilirsiniz.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Create Portfolio Modal ──────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-[1.75rem] border border-white/10 bg-slate-950 p-6 shadow-[0_24px_90px_rgba(2,8,23,0.65)]">
            <h2 className="text-lg font-semibold text-white">Yeni Portföy Oluştur</h2>
            <p className="mt-1 text-sm text-gray-400">Portföy adı ve açıklama girerek yeni bir portföy oluşturun.</p>

            <form className="mt-5 space-y-4" onSubmit={handleCreatePortfolio}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300" htmlFor="modal-name">
                  Portföy Adı
                </label>
                <input
                  id="modal-name"
                  name="name"
                  value={portfolioForm.name}
                  onChange={handlePortfolioFormChange}
                  placeholder="Örn: BES Portföyüm"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300" htmlFor="modal-desc">
                  Açıklama
                </label>
                <input
                  id="modal-desc"
                  name="description"
                  value={portfolioForm.description}
                  onChange={handlePortfolioFormChange}
                  placeholder="Kısa bir açıklama..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-300/40 focus:ring-1 focus:ring-cyan-300/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setPortfolioForm({ name: '', description: '' })
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creatingPortfolio}
                  className="rounded-2xl bg-gradient-to-r from-cyan-300 to-teal-300 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingPortfolio ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}

