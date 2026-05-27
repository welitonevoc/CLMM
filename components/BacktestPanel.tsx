'use client'

import { useState, useEffect } from 'react'
import { runBacktest, breakEvenDays, runHistoricalBacktest } from '@/backtesting/backtest'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  apr: number
  defaultCapital?: number
  volatility: number
  low: number
  high: number
  currentPrice: number
  candles?: { open: number; high: number; low: number; close: number; volume: number; timestamp: number }[]
}

export function BacktestPanel({ apr, defaultCapital = 500, volatility, low, high, currentPrice, candles }: Props) {
  const [capital, setCapital] = useState(defaultCapital)
  const [days, setDays] = useState(7)
  const [mode, setMode] = useState<'montecarlo' | 'historical'>('montecarlo')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const safeVol = Number.isFinite(volatility) && volatility > 0 ? volatility : 40
  const safePrice = Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : 1
  const safeLow = Number.isFinite(low) && low > 0 ? low : safePrice * 0.9
  const safeHigh = Number.isFinite(high) && high > safeLow ? high : safePrice * 1.1

  const hasCandles = Array.isArray(candles) && candles.length > 5

  // Automatically switch mode if historical data isn't available
  useEffect(() => {
    if (!hasCandles && mode === 'historical') {
      setMode('montecarlo')
    }
  }, [hasCandles, mode])

  // 1. Monte Carlo simulation
  const mcResult = runBacktest({ 
    capital, 
    apr, 
    days, 
    volatility: safeVol, 
    low: safeLow, 
    high: safeHigh, 
    currentPrice: safePrice,
  } as any)

  // 2. Real historical simulation
  const histResult = hasCandles 
    ? runHistoricalBacktest(candles.slice(-Math.min(candles.length, days + 1)), capital, apr, safeLow, safeHigh, safePrice)
    : null

  // Chart data formatting
  const chartData = mode === 'historical' && histResult
    ? histResult.chartData.map((d) => ({
        day: d.day,
        net: d.net,
        fee: d.fee,
        il: d.il
      }))
    : mcResult.p50.map((v, i) => ({ 
        day: i, 
        p10: mcResult.p10[i],
        p50: mcResult.p50[i],
        p90: mcResult.p90[i]
      }))

  const activeResult = mode === 'historical' && histResult ? histResult : mcResult

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          Análise de Backtest
        </h4>
        {hasCandles && (
          <div className="flex bg-bg p-0.5 rounded-lg border border-border/60">
            <button
              onClick={() => setMode('montecarlo')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${mode === 'montecarlo' ? 'bg-card text-zinc-200 border border-border/40 shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}
            >
              Simulado (MC)
            </button>
            <button
              onClick={() => setMode('historical')}
              className={`px-2 py-0.5 text-[10px] font-medium rounded transition-all ${mode === 'historical' ? 'bg-card text-zinc-200 border border-border/40 shadow-sm' : 'text-zinc-500 hover:text-zinc-400'}`}
            >
              Histórico Real
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">Capital de LP ($)</label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(+e.target.value)}
            className="w-full bg-bg border border-border rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-[10px] text-zinc-500 block mb-1">
            {mode === 'historical' ? `Dias (Máx: ${candles?.length ? candles.length - 1 : 30})` : 'Dias de Simulação'}
          </label>
          <input
            type="number"
            value={days}
            onChange={(e) => {
              const val = +e.target.value
              setDays(mode === 'historical' && candles?.length ? Math.min(val, candles.length - 1) : val)
            }}
            className="w-full bg-bg border border-border rounded px-2 py-1 text-xs font-mono text-zinc-300 focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Chart */}
      <div className="h-28">
        {mounted && (
          <ResponsiveContainer width="100%" height={112} minWidth={0} debounce={50}>
            <LineChart data={chartData}>
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: '#12151c', border: '1px solid #1e2330', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#94a3b8' }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, 'PnL']}
              />
              {mode === 'historical' ? (
                <>
                  <Line type="monotone" dataKey="net" stroke="#3b9eff" strokeWidth={2} dot={false} name="PnL Líquido" />
                  <Line type="monotone" dataKey="fee" stroke="#34d399" strokeWidth={1} strokeDasharray="2 2" dot={false} name="Taxas Ganhas" />
                  <Line type="monotone" dataKey="il" stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" dot={false} name="Impermanent Loss" />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="p90" stroke="#34d399" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                  <Line type="monotone" dataKey="p50" stroke="#3b9eff" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="p10" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" dot={false} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Results */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-bg border border-border rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500">Taxas Acumuladas</div>
          <div className="font-mono text-bull font-semibold mt-0.5">+${activeResult.feeReturn.toFixed(2)}</div>
        </div>
        <div className="bg-bg border border-border rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500">
            {mode === 'historical' ? 'Perda Imp. Real' : 'IL Estimada'}
          </div>
          <div className="font-mono text-bear font-semibold mt-0.5">
            ${activeResult.ilLoss.toFixed(2)}
          </div>
        </div>
        <div className="bg-bg border border-border rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500">Retorno Líquido</div>
          <div className={`font-mono font-semibold mt-0.5 ${activeResult.net >= 0 ? 'text-bull' : 'text-bear'}`}>
            {activeResult.net >= 0 ? '+' : ''}${activeResult.net.toFixed(2)}
          </div>
        </div>
        <div className="bg-bg border border-border rounded-lg p-2.5">
          <div className="text-[10px] text-zinc-500">ROI</div>
          <div className={`font-mono font-semibold mt-0.5 ${activeResult.roi >= 0 ? 'text-bull' : 'text-bear'}`}>
            {activeResult.roi >= 0 ? '+' : ''}{activeResult.roi.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  )
}
