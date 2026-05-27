'use client'

import { useEffect, useState, useRef } from 'react'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'
import { PriceSocket } from '@/websocket/priceSocket'

interface PriceData {
  symbol: string
  price: number
  change24h: number
  timestamp: number
}

const MOCK_PRICES: PriceData[] = [
  { symbol: 'ETH', price: 2178.42, change24h: 1.2, timestamp: Date.now() },
  { symbol: 'BTC', price: 78005.33, change24h: -0.4, timestamp: Date.now() },
  { symbol: 'SOL', price: 86.12, change24h: 2.8, timestamp: Date.now() },
]

export function LivePriceTicker() {
  const [prices, setPrices] = useState<PriceData[]>(MOCK_PRICES)
  const [connected, setConnected] = useState(false)
  const wsRef = useRef<PriceSocket | null>(null)

  useEffect(() => {
    try {
      const ws = new PriceSocket('wss://ws-api.binance.com/ws')
      ws.connect()
      wsRef.current = ws

      ws.onPrice((data) => {
        if (data.symbol && data.price) {
          setPrices((prev) => {
            const existing = prev.find((p) => p.symbol === data.symbol)
            if (existing) {
              return prev.map((p) =>
                p.symbol === data.symbol
                  ? { ...p, price: data.price, timestamp: data.timestamp }
                  : p
              )
            }
            return [...prev, { ...data, change24h: 0 }]
          })
        }
      })

      setConnected(true)

      // Fallback mock updates
      const interval = setInterval(() => {
        setPrices((prev) =>
          prev.map((p) => ({
            ...p,
            price: p.price * (1 + (Math.random() - 0.5) * 0.002),
            timestamp: Date.now(),
          }))
        )
      }, 5000)

      return () => {
        ws.disconnect()
        clearInterval(interval)
      }
    } catch {
      setConnected(false)
    }
  }, [])

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Activity className="w-3 h-3 text-zinc-500" />
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-bull' : 'bg-zinc-600'}`} />
      </div>
      {prices.map((p) => (
        <div key={p.symbol} className="flex items-center gap-1.5 text-[11px] font-mono">
          <span className="text-zinc-500">{p.symbol}</span>
          <span className="font-semibold tabular-nums text-zinc-200">
            ${p.price.toFixed(p.price > 100 ? 2 : p.price > 1 ? 4 : 6)}
          </span>
          {p.change24h !== 0 && (
            <span className={`flex items-center gap-0.5 text-[10px] font-medium ${
              p.change24h > 0 ? 'text-bull' : 'text-bear'
            }`}>
              {p.change24h > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
              {Math.abs(p.change24h).toFixed(1)}%
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
