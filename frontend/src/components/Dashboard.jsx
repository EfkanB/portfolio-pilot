import { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import * as signalR from '@microsoft/signalr'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import api from '../services/api'

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

  // ─── Fund Price Fetch (onBlur) ────────────────────────────────────────
  const handleFundCodeBlur = async () => {
    const code = fundForm.fundCode.trim()
    if (!code) return

    try {
      setFetchingPrice(true)
      const response = await api.get(`/api/Portfolio/current-price/${encodeURIComponent(code)}`)
      const price = response.data?.currentPrice ?? response.data?.CurrentPrice
      if (price !== undefined && price !== null) {
        setFundForm((prev) => ({ ...prev, currentPrice: String(price) }))
      }
    } catch {
      // Silently fail — price field stays as-is
    } finally {
      setFetchingPrice(false)
    }
  }

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
    <main className="min-h-screen bg-gray-950 px-4 py-6 text-gray-100">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 shadow-xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-400/80">PortfolioPilot</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-4xl">Dashboard</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-gray-700/50 bg-gray-800/60 px-3 py-2 text-right">
                <div className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Hub</div>
                <div className="mt-0.5 text-xs font-medium text-gray-200">{connectionStatus}</div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-gray-700/50 bg-gray-800/60 px-4 py-2 text-sm font-medium text-gray-200 transition hover:bg-gray-700/60 hover:text-white"
              >
                Çıkış Yap
              </button>
            </div>
          </div>
        </header>

        {/* ── Error ──────────────────────────────────────────────────── */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* ── Portfolio Tabs ─────────────────────────────────────────── */}
        {!loading && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-gray-800 bg-gray-900/60 p-3 backdrop-blur">
            {portfolios.map((p) => {
              const pid = extractId(p)
              const isActive = pid === selectedPortfolioId
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setSelectedPortfolioId(pid)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                  }`}
                >
                  {extractName(p)}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="ml-auto rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-gray-950 transition hover:bg-cyan-400"
            >
              + Yeni Portföy
            </button>
          </div>
        )}

        {/* ── Empty State ────────────────────────────────────────────── */}
        {!loading && portfolios.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 p-10 text-center">
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
                className="flex-1 rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                required
              />
              <input
                name="description"
                value={portfolioForm.description}
                onChange={handlePortfolioFormChange}
                placeholder="Açıklama (isteğe bağlı)"
                className="flex-1 rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
              />
              <button
                type="submit"
                disabled={creatingPortfolio}
                className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-medium text-gray-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingPortfolio ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </form>
          </div>
        )}

        {/* ── Loading State ──────────────────────────────────────────── */}
        {loading && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-10 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-400">Portföyler yükleniyor...</p>
          </div>
        )}

        {/* ── Main Content (Portfolio Selected) ──────────────────────── */}
        {!loading && selectedPortfolio && (
          <>
            {/* Portfolio Info Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Portföy Adı</div>
                <div className="mt-1.5 text-base font-semibold text-white">{extractName(selectedPortfolio)}</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Açıklama</div>
                <div className="mt-1.5 text-sm text-gray-300">{extractDescription(selectedPortfolio) || '-'}</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
                <div className="text-[10px] uppercase tracking-[0.25em] text-gray-400">Toplam Değer</div>
                <div className="mt-1.5 text-base font-semibold text-cyan-300">
                  ₺{formatCurrency(totalValue)}
                </div>
              </div>
            </div>

            {/* ── Pie Chart + Fund Form Row ────────────────────────────── */}
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              {/* Pie Chart */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur">
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
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
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
                        <div key={i} className="flex items-center justify-between rounded-lg bg-gray-800/40 px-3 py-1.5">
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
                  <div className="mt-8 flex items-center justify-center rounded-xl border border-dashed border-gray-700 bg-gray-800/30 p-8 text-sm text-gray-500">
                    Fon eklediğinizde grafik burada görünecek.
                  </div>
                )}
              </div>

              {/* Right Column: Add Fund + Sell Fund */}
              <div className="flex flex-col gap-6">
                {/* Add Fund Form */}
                <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white">Fon Ekle</h2>
                    <span className="rounded-lg bg-gray-800 px-2.5 py-1 text-[10px] uppercase tracking-wider text-gray-400">
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
                          onBlur={handleFundCodeBlur}
                          placeholder="Örn: AEG"
                          className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
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
                          placeholder="0.00"
                          className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
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
                        placeholder="0.00"
                        className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                        required
                      />
                    </div>
                  </div>

                    <button
                      type="submit"
                      disabled={addingFund}
                      className="mt-2 w-full rounded-xl bg-cyan-500 py-2.5 text-sm font-medium text-gray-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addingFund ? 'Ekleniyor...' : 'Fon Ekle'}
                    </button>
                  </form>

                  <div className="mt-3 rounded-xl border border-gray-700/50 bg-gray-800/40 p-3 text-[11px] leading-relaxed text-gray-400">
                    💡 <span className="text-gray-300">Fon Kodu</span> alanına kodu yazıp çıktığınızda fiyat otomatik çekilir.
                  </div>
                </div>

                {/* Sell Fund Form */}
                {funds.length > 0 && (
                  <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-semibold text-white">Fon Çıkart</h2>
                      <span className="rounded-lg bg-gray-800 px-2.5 py-1 text-[10px] uppercase tracking-wider text-gray-400">
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
                            className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                            required
                          >
                            <option value="" disabled>-- Fon Seçin --</option>
                            {funds.map((fund) => {
                              const code = fund.fundCode ?? fund.FundCode ?? ''
                              const name = fund.fundName ?? fund.FundName ?? ''
                              const qty = Number(fund.quantity ?? fund.Quantity ?? 0)
                              return (
                                <option key={code} value={code}>
                                  {code} - {name} (Mevcut: {qty.toFixed(4)})
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
                            className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-3.5 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                            required
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={sellingFund}
                        className="mt-2 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-gray-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sellingFund ? 'Satılıyor...' : 'Fon Çıkart'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>

            {/* ── Fund Table ──────────────────────────────────────────── */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur">
              <h2 className="text-base font-semibold text-white">Fon Listesi</h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Kar / Zarar = (Güncel Fiyat − Ortalama Maliyet) × Adet
              </p>

              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-[11px] uppercase tracking-wider text-gray-400">
                      <th className="px-3 py-3 font-medium">Kod</th>
                      <th className="px-3 py-3 font-medium">Ad</th>
                      <th className="px-3 py-3 font-medium text-right">Adet</th>
                      <th className="px-3 py-3 font-medium text-right">Ort. Maliyet</th>
                      <th className="px-3 py-3 font-medium text-right">Güncel Fiyat</th>
                      <th className="px-3 py-3 font-medium text-right">Kar / Zarar</th>
                      <th className="px-3 py-3 font-medium text-center">İşlem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
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
                          <tr key={id ?? fundCode} className="transition hover:bg-gray-800/30">
                            <td className="px-3 py-3 font-medium text-cyan-300">{fundCode}</td>
                            <td className="px-3 py-3 text-gray-300">{fundName}</td>
                            <td className="px-3 py-3 text-right tabular-nums text-gray-200">
                              {quantity.toFixed(4)}
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
                            <td className="px-3 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteFund(id)}
                                disabled={deletingFundId === id}
                                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingFundId === id ? 'Siliniyor...' : 'Sil'}
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
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
          <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-2xl">
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
                  className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
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
                  className="w-full rounded-xl border border-gray-700 bg-gray-800/80 px-4 py-2.5 text-sm text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setPortfolioForm({ name: '', description: '' })
                  }}
                  className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:bg-gray-700"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={creatingPortfolio}
                  className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-medium text-gray-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
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

