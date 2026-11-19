import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import { HUB_URL, getToken } from '../services/api'

/**
 * Connects to the authenticated SignalR hub and calls `onPriceUpdate(fundCode, price)`
 * for every price pushed by the server. Returns the connection status string.
 */
export default function usePortfolioHub(onPriceUpdate) {
  const [status, setStatus] = useState('Connecting')
  const handlerRef = useRef(onPriceUpdate)

  useEffect(() => {
    handlerRef.current = onPriceUpdate
  }, [onPriceUpdate])

  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, { accessTokenFactory: () => getToken() ?? '' })
      .withAutomaticReconnect()
      .build()

    connection.on('ReceivePriceUpdate', (fundCode, price) => handlerRef.current?.(fundCode, price))
    connection.onreconnecting(() => setStatus('Reconnecting'))
    connection.onreconnected(() => setStatus('Connected'))
    connection.onclose(() => setStatus('Disconnected'))

    let cancelled = false
    connection
      .start()
      .then(() => !cancelled && setStatus('Connected'))
      .catch(() => !cancelled && setStatus('Disconnected'))

    return () => {
      cancelled = true
      connection.stop()
    }
  }, [])

  return status
}
