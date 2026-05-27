import type { BacktestInput, BacktestResult } from '@/types'
import { concentratedIL } from '@/lib/impermanentLoss'

export function runBacktest(
  input: BacktestInput & { volatility: number; low: number; high: number; currentPrice: number }
): BacktestResult & { p10: number[]; p50: number[]; p90: number[]; winRate: number } {
  const { capital, apr, days, volatility, low, high, currentPrice } = input
  const dailyRate = apr / 100 / 365
  const dt = 1 / 365
  const sigma = volatility / 100
  const simulations = 100
  const safeDays = Math.max(1, Math.floor(days))

  const allSims: number[][] = []
  const finalFees: number[] = []

  for (let s = 0; s < simulations; s++) {
    const dailyPnL: number[] = [0]
    let price = currentPrice
    let totalFees = 0

    for (let d = 1; d <= safeDays; d++) {
      const shock = sigma * Math.sqrt(dt) * normalRandom()
      price = price * Math.exp(-0.5 * sigma * sigma * dt + shock)

      if (price >= low && price <= high) {
        totalFees += capital * dailyRate
      }

      const il = concentratedIL(price, low, high, currentPrice)
      const ilLoss = capital * (Number.isFinite(il) ? il : 0)
      dailyPnL.push(totalFees + ilLoss)
    }

    finalFees.push(totalFees)
    allSims.push(dailyPnL)
  }

  const p10: number[] = []
  const p50: number[] = []
  const p90: number[] = []

  for (let d = 0; d <= safeDays; d++) {
    const dayOutcomes = allSims.map((s) => s[d]).sort((a, b) => a - b)
    p10.push(+dayOutcomes[Math.floor(simulations * 0.1)].toFixed(2))
    p50.push(+dayOutcomes[Math.floor(simulations * 0.5)].toFixed(2))
    p90.push(+dayOutcomes[Math.floor(simulations * 0.9)].toFixed(2))
  }

  const avgFees = finalFees.reduce((a, b) => a + b, 0) / simulations
  const finalP50 = p50[safeDays]
  const ilLossUsd = finalP50 - avgFees

  const winRate = (allSims.filter((s) => s[safeDays] > 0).length / simulations) * 100

  return {
    feeReturn: +avgFees.toFixed(2),
    ilLoss: +ilLossUsd.toFixed(2),
    net: +finalP50.toFixed(2),
    roi: +((finalP50 / capital) * 100).toFixed(2),
    dailyYield: p50,
    p10,
    p50,
    p90,
    winRate,
  }
}

function normalRandom() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
}

export function breakEvenDays(capital: number, apr: number, il: number): number {
  if (apr <= 0) return Infinity
  const dailyFee = capital * (apr / 100 / 365)
  const loss = Math.abs(capital * (il / 100))
  return Math.ceil(loss / dailyFee)
}

export interface HistoricalBacktestResult {
  feeReturn: number
  ilLoss: number
  net: number
  roi: number
  chartData: { day: number; net: number; fee: number; il: number }[]
  daysCount: number
}

export function runHistoricalBacktest(
  candles: { open: number; high: number; low: number; close: number; volume: number; timestamp: number }[],
  capital: number,
  apr: number,
  low: number,
  high: number,
  currentPrice: number
): HistoricalBacktestResult {
  const dailyRate = apr / 100 / 365
  let totalFees = 0
  const chartData: HistoricalBacktestResult['chartData'] = []

  const entryPrice = candles[0]?.close || currentPrice
  chartData.push({ day: 0, net: 0, fee: 0, il: 0 })

  for (let i = 1; i < candles.length; i++) {
    const candle = candles[i]
    const price = candle.close

    if (price >= low && price <= high) {
      totalFees += capital * dailyRate
    }

    const il = concentratedIL(price, low, high, entryPrice)
    const ilLoss = capital * (Number.isFinite(il) ? il : 0)
    const net = totalFees + ilLoss

    chartData.push({
      day: i,
      net: +net.toFixed(2),
      fee: +totalFees.toFixed(2),
      il: +ilLoss.toFixed(2),
    })
  }

  const finalState = chartData[chartData.length - 1] || { net: 0, fee: 0, il: 0 }

  return {
    feeReturn: +finalState.fee.toFixed(2),
    ilLoss: +finalState.il.toFixed(2),
    net: +finalState.net.toFixed(2),
    roi: +((finalState.net / capital) * 100).toFixed(2),
    chartData,
    daysCount: candles.length - 1,
  }
}
