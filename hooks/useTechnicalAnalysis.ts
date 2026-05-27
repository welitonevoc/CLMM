/**
 * useTechnicalAnalysis.ts
 * Hook React que integra:
 * - ohlcvPipeline (dados com fallback em cascata)
 * - clmmMetrics (cálculos locais sobre os candles)
 *
 * Uso no SidePanel:
 *   const { data, loading, error } = useTechnicalAnalysis(pool, rangeLow, rangeHigh)
 */

import { useState, useEffect, useRef } from 'react'
import { fetchOHLCV, getDataSufficiency, generateSyntheticOHLCV, type OHLCVResult } from '../lib/ohlcvPipeline'
import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  detectRSIDivergence,
  detectMACDDivergence,
  calculateCLMMMetrics,
  evaluateCLMMHealth,
  type CLMMPositionMetrics,
  type BollingerBands,
  type MACDResult,
  type ATRResult,
  type DivergenceResult,
} from '../lib/Clmmmetrics'

// ─── Tipos de saída ───────────────────────────────────────────────────────────

export interface TechnicalIndicators {
  rsi: number | null
  macd: MACDResult | null
  bollingerBands: BollingerBands | null
  atr: ATRResult | null
  ma7: number | null
  ma25: number | null
  ma99: number | null
  rsiDivergence: DivergenceResult
  macdDivergence: DivergenceResult
  currentPrice: number | null
  trend: 'bullish' | 'bearish' | 'mixed' | null
}

export interface TechnicalAnalysisResult {
  indicators: TechnicalIndicators
  clmmMetrics: CLMMPositionMetrics | null
  clmmHealth: ReturnType<typeof evaluateCLMMHealth> | null
  sufficiency: ReturnType<typeof getDataSufficiency>
  ohlcvResult: OHLCVResult | null
  lastUpdated: number | null
}

export interface UseTechnicalAnalysisState {
  data: TechnicalAnalysisResult | null
  loading: boolean
  error: string | null
  refetch: () => void
}

// ─── Helpers de MA ────────────────────────────────────────────────────────────

function sma(closes: number[], period: number): number | null {
  if (closes.length < period) return null
  const slice = closes.slice(-period)
  return slice.reduce((a, b) => a + b, 0) / period
}

function determineTrend(
  ma7: number | null,
  ma25: number | null,
  rsi: number | null,
  macd: MACDResult | null
): 'bullish' | 'bearish' | 'mixed' | null {
  if (!ma7 || !ma25) return null

  let bullSignals = 0
  let bearSignals = 0

  if (ma7 > ma25) bullSignals++
  else bearSignals++

  if (rsi !== null) {
    if (rsi > 55) bullSignals++
    else if (rsi < 45) bearSignals++
  }

  if (macd) {
    if (macd.crossType === 'golden') bullSignals++
    else if (macd.crossType === 'death') bearSignals++
    if (macd.histogram > 0) bullSignals++
    else bearSignals++
  }

  if (bullSignals > bearSignals + 1) return 'bullish'
  if (bearSignals > bullSignals + 1) return 'bearish'
  return 'mixed'
}

// ─── Estimativa de preço por categoria ────────────────────────────────────────

const CATEGORY_PRICE: Record<string, number> = {
  ETH: 2178.20,
  BTC: 78000.58,
  SOL: 86.26,
  STABLE: 1.00,
}

const CATEGORY_VOLATILITY: Record<string, number> = {
  ETH: 3.5,
  BTC: 2.5,
  SOL: 4.0,
  STABLE: 0.5,
}

function estimatePrice(category?: string, symbol?: string): number | null {
  if (category && CATEGORY_PRICE[category]) return CATEGORY_PRICE[category]
  if (symbol) {
    const upper = symbol.toUpperCase()
    if (upper.startsWith('ETH')) return CATEGORY_PRICE.ETH
    if (upper.startsWith('BTC') || upper.startsWith('WBTC')) return CATEGORY_PRICE.BTC
    if (upper.startsWith('SOL')) return CATEGORY_PRICE.SOL
    if (upper.startsWith('USDC') || upper.startsWith('USDT') || upper.startsWith('DAI')) return 1
  }
  return null
}

function estimateVolatility(apr: number, category?: string): number {
  const base = category ? CATEGORY_VOLATILITY[category] ?? 3 : 3
  const aprFactor = Math.min(apr / 100, 5)
  return base + aprFactor * 0.5
}

// ─── Função de cálculo principal ──────────────────────────────────────────────

function computeAll(
  ohlcvResult: OHLCVResult,
  rangeLow: number,
  rangeHigh: number
): TechnicalAnalysisResult {
  const sufficiency = getDataSufficiency(ohlcvResult)
  const candles = ohlcvResult.candles
  const closes = candles.map((c) => c.close)
  const currentPrice = closes.at(-1) ?? null

  const rsi = sufficiency.rsi ? calculateRSI(closes) : null
  const macd = sufficiency.macd ? calculateMACD(closes) : null
  const bollingerBands = sufficiency.bollingerBands ? calculateBollingerBands(closes) : null
  const atr = sufficiency.atr ? calculateATR(candles) : null

  const ma7 = sma(closes, 7)
  const ma25 = sma(closes, 25)
  const ma99 = sma(closes, 99)

  const rsiDivergence = sufficiency.divergence
    ? detectRSIDivergence(candles)
    : { type: null as null, strength: 'weak' as const, periods: 0 }

  const macdDivergence = sufficiency.divergence
    ? detectMACDDivergence(candles)
    : { type: null as null, strength: 'weak' as const, periods: 0 }

  const trend = determineTrend(ma7, ma25, rsi, macd)

  const clmmMetrics =
    sufficiency.clmmMetrics && currentPrice && rangeLow > 0 && rangeHigh > rangeLow
      ? calculateCLMMMetrics(candles, rangeLow, rangeHigh, currentPrice)
      : null

  const clmmHealth = clmmMetrics ? evaluateCLMMHealth(clmmMetrics) : null

  return {
    indicators: { rsi, macd, bollingerBands, atr, ma7, ma25, ma99, rsiDivergence, macdDivergence, currentPrice, trend },
    clmmMetrics,
    clmmHealth,
    sufficiency,
    ohlcvResult,
    lastUpdated: Date.now(),
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param network  - ex: 'base', 'ethereum', 'arbitrum'
 * @param pool     - endereço da pool (0x...)
 * @param rangeLow  - preço inferior do range de liquidez
 * @param rangeHigh - preço superior do range de liquidez
 * @param refreshIntervalMs - intervalo de auto-refresh (padrão: 5 minutos)
 * @param symbol   - símbolo da pool (ex: ETH-USDC)
 * @param apr      - APR atual da pool (para estimar volatilidade)
 * @param category - categoria da pool (ETH/BTC/SOL/STABLE)
 */
export function useTechnicalAnalysis(
  network: string,
  pool: string,
  rangeLow: number,
  rangeHigh: number,
  refreshIntervalMs = 5 * 60 * 1000,
  symbol?: string,
  apr?: number,
  category?: string
): UseTechnicalAnalysisState {
  const [state, setState] = useState<{
    data: TechnicalAnalysisResult | null
    loading: boolean
    error: string | null
  }>({ data: null, loading: true, error: null })

  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const poolRef = useRef(pool)
  poolRef.current = pool

  const fetch = async (forceRefresh = false) => {
    if (!pool || !network) return

    abortRef.current?.abort()
    abortRef.current = new AbortController()

    setState((s) => ({ ...s, loading: true, error: null }))

    try {
      let result = await fetchOHLCV(network, pool, 'hour', 168, forceRefresh, symbol)

      if (abortRef.current.signal.aborted) return

      // Se dados reais insuficientes, gerar sintéticos como fallback
      if (!result.candles.length || result.source === 'unavailable') {
        const estPrice = estimatePrice(category, symbol)
        if (estPrice) {
          const volEst = estimateVolatility(apr ?? 0, category)
          const synthetic = generateSyntheticOHLCV(estPrice, volEst, 168)
          result = {
            candles: synthetic,
            source: 'synthetic',
            network,
            poolAddress: pool,
            fetchedAt: Date.now(),
            warning: 'Dados estimados com base no perfil da pool — valores reais indisponíveis.',
          }
        }
      }

      const computed = computeAll(result, rangeLow, rangeHigh)

      setState({ data: computed, loading: false, error: null })
    } catch (e) {
      if (abortRef.current?.signal.aborted) return
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Erro ao buscar dados',
      }))
    }
  }

  useEffect(() => {
    fetch()

    timerRef.current = setInterval(() => fetch(), refreshIntervalMs)

    return () => {
      abortRef.current?.abort()
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network, pool, rangeLow, rangeHigh, symbol, apr, category])

  return {
    ...state,
    refetch: () => fetch(true),
  }
}
