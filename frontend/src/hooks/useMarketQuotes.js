import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { ALL_MARKET_CODES } from '../data/market'

/** Fetches every tracked TEFAS fund in one request. status: loading | ready | error */
export default function useMarketQuotes() {
  const [quotes, setQuotes] = useState([])
  const [status, setStatus] = useState('loading')

  const load = useCallback(async (signal) => {
    setStatus('loading')
    try {
      const { data } = await api.get('/api/Tefas/funds', { params: { codes: ALL_MARKET_CODES.join(',') }, signal })
      setQuotes((Array.isArray(data) ? data : []).filter((q) => q.currentPrice != null))
      setStatus('ready')
    } catch {
      if (!signal?.aborted) setStatus('error')
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  return { quotes, status, reload: () => load() }
}
