/**
 * clmmMetrics.ts
 * Métricas de análise técnica corrigidas e específicas para CLMM.
 * Substitui cálculos genéricos por métricas orientadas a posições de liquidez concentrada.
 */

export interface OHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number
}

export interface BollingerBands {
  upper: number
  middle: number
  lower: number
  percentB: number      // onde o preço está dentro da banda (0 = inferior, 1 = superior)
  bandwidth: number     // largura normalizada pela média
}

export interface MACDResult {
  macd: number
  signal: number
  histogram: number
  crossType: 'golden' | 'death' | 'neutral'  // corrigido: baseado em cruzamento real
}

export interface DivergenceResult {
  type: 'bullish' | 'bearish' | null
  strength: 'strong' | 'weak'
  periods: number  // há quantos períodos a divergência foi detectada
}

export interface ATRResult {
  value: number
  percentOfPrice: number
  confidence: 'high' | 'low'  // low = menos de 14 períodos
  periods: number
}

// ─── Métricas CLMM específicas ────────────────────────────────────────────────

export interface CLMMPositionMetrics {
  inRangeTimePct: number       // % do tempo o preço ficou dentro do range (30d)
  rangeUtilization: number     // (priceRange30d) / (rangeWidth) — > 1 = range estreito demais
  feeCaptureRate: number       // % do volume capturado enquanto in-range
  daysUntilExit: number        // dias estimados até sair do range com base no ATR
  daysUntilExitP10: number     // cenário pessimista (alta volatilidade)
  daysUntilExitP90: number     // cenário otimista (baixa volatilidade)
  priceMin30d: number
  priceMax30d: number
  currentPricePosition: number // 0 = na borda inferior, 1 = na borda superior
}

/**
 * Bollinger Bands com %B e Bandwidth — corrige o bug de NaN.
 * NaN ocorre quando stdDev = 0 (preços idênticos) ou quando há < period candles.
 */
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  multiplier = 2
): BollingerBands | null {
  if (closes.length < period) return null

  const slice = closes.slice(-period)
  const mean = slice.reduce((a, b) => a + b, 0) / period

  const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period
  const stdDev = Math.sqrt(variance)

  // Guard contra divisão por zero (mercado travado ou dados sintéticos)
  if (stdDev === 0 || mean === 0) return null

  const upper = mean + multiplier * stdDev
  const lower = mean - multiplier * stdDev
  const currentPrice = closes[closes.length - 1]

  const bandWidth = upper - lower
  const percentB = bandWidth > 0 ? (currentPrice - lower) / bandWidth : 0.5
  const bandwidth = (bandWidth / mean) * 100

  return {
    upper,
    middle: mean,
    lower,
    percentB: Math.max(0, Math.min(1, percentB)), // clamp [0,1]
    bandwidth,
  }
}

/**
 * RSI com EMA suavizada (Wilder's smoothing), mais preciso que SMA simples.
 */
export function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null

  const changes = closes.slice(1).map((v, i) => v - closes[i])

  let avgGain = 0
  let avgLoss = 0

  // seed inicial
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period

  // Wilder smoothing para o restante
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

function ema(data: number[], period: number): number[] {
  const k = 2 / (period + 1)
  const result: number[] = []
  let prev = data.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(prev)
  for (let i = period; i < data.length; i++) {
    prev = data[i] * k + prev * (1 - k)
    result.push(prev)
  }
  return result
}

/**
 * MACD corrigido: crossType baseado em cruzamento real (MACD vs Signal),
 * não em sinal do valor MACD.
 */
export function calculateMACD(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): MACDResult | null {
  if (closes.length < slow + signal) return null

  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)

  // alinha pelo índice mais curto (emaSlow é menor)
  const offset = emaFast.length - emaSlow.length
  const macdLine = emaSlow.map((v, i) => emaFast[i + offset] - v)

  if (macdLine.length < signal) return null

  const signalLine = ema(macdLine, signal)
  const sigOffset = macdLine.length - signalLine.length

  const currentMACD = macdLine[macdLine.length - 1]
  const currentSignal = signalLine[signalLine.length - 1]
  const prevMACD = macdLine[macdLine.length - 2]
  const prevSignal = signalLine[signalLine.length - 2 - sigOffset] ?? signalLine[0]

  // Golden Cross = MACD cruza acima da linha de sinal
  // Death Cross = MACD cruza abaixo da linha de sinal
  let crossType: 'golden' | 'death' | 'neutral' = 'neutral'
  if (prevMACD <= prevSignal && currentMACD > currentSignal) crossType = 'golden'
  else if (prevMACD >= prevSignal && currentMACD < currentSignal) crossType = 'death'

  return {
    macd: currentMACD,
    signal: currentSignal,
    histogram: currentMACD - currentSignal,
    crossType,
  }
}

/**
 * ATR com validação de mínimo de 14 períodos.
 */
export function calculateATR(candles: OHLCV[], period = 14): ATRResult | null {
  if (candles.length < 2) return null

  const trueRanges: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = candles[i - 1].close
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)))
  }

  const usable = trueRanges.slice(-Math.min(period, trueRanges.length))
  const atr = usable.reduce((a, b) => a + b, 0) / usable.length
  const currentPrice = candles[candles.length - 1].close

  return {
    value: atr,
    percentOfPrice: (atr / currentPrice) * 100,
    confidence: candles.length >= period + 1 ? 'high' : 'low',
    periods: usable.length,
  }
}

/**
 * Detecta divergência entre preço e RSI.
 * Bullish: preço fazendo mínimos mais baixos, RSI fazendo mínimos mais altos.
 * Bearish: preço fazendo máximos mais altos, RSI fazendo máximos mais baixos.
 */
export function detectRSIDivergence(
  candles: OHLCV[],
  lookback = 20
): DivergenceResult {
  if (candles.length < lookback + 14) return { type: null, strength: 'weak', periods: 0 }

  const slice = candles.slice(-lookback)
  const closes = slice.map((c) => c.close)

  // calcula RSI para cada ponto no lookback
  const rsiSeries: number[] = []
  const allCloses = candles.map((c) => c.close)
  for (let i = candles.length - lookback; i < candles.length; i++) {
    const rsi = calculateRSI(allCloses.slice(0, i + 1))
    if (rsi !== null) rsiSeries.push(rsi)
  }

  if (rsiSeries.length < 4) return { type: null, strength: 'weak', periods: 0 }

  const midpoint = Math.floor(slice.length / 2)

  // mínimos (bullish divergence)
  const firstHalfMinPrice = Math.min(...closes.slice(0, midpoint))
  const secondHalfMinPrice = Math.min(...closes.slice(midpoint))
  const firstHalfMinRSI = Math.min(...rsiSeries.slice(0, Math.floor(rsiSeries.length / 2)))
  const secondHalfMinRSI = Math.min(...rsiSeries.slice(Math.floor(rsiSeries.length / 2)))

  if (secondHalfMinPrice < firstHalfMinPrice && secondHalfMinRSI > firstHalfMinRSI + 3) {
    const priceDrop = ((firstHalfMinPrice - secondHalfMinPrice) / firstHalfMinPrice) * 100
    return {
      type: 'bullish',
      strength: priceDrop > 5 && secondHalfMinRSI - firstHalfMinRSI > 8 ? 'strong' : 'weak',
      periods: lookback,
    }
  }

  // máximos (bearish divergence)
  const firstHalfMaxPrice = Math.max(...closes.slice(0, midpoint))
  const secondHalfMaxPrice = Math.max(...closes.slice(midpoint))
  const firstHalfMaxRSI = Math.max(...rsiSeries.slice(0, Math.floor(rsiSeries.length / 2)))
  const secondHalfMaxRSI = Math.max(...rsiSeries.slice(Math.floor(rsiSeries.length / 2)))

  if (secondHalfMaxPrice > firstHalfMaxPrice && secondHalfMaxRSI < firstHalfMaxRSI - 3) {
    const priceRise = ((secondHalfMaxPrice - firstHalfMaxPrice) / firstHalfMaxPrice) * 100
    return {
      type: 'bearish',
      strength: priceRise > 5 && firstHalfMaxRSI - secondHalfMaxRSI > 8 ? 'strong' : 'weak',
      periods: lookback,
    }
  }

  return { type: null, strength: 'weak', periods: 0 }
}

/**
 * Detecta divergência entre preço e MACD histogram.
 */
export function detectMACDDivergence(
  candles: OHLCV[],
  lookback = 20
): DivergenceResult {
  if (candles.length < lookback + 35) return { type: null, strength: 'weak', periods: 0 }

  const allCloses = candles.map((c) => c.close)
  const histSeries: number[] = []

  for (let i = candles.length - lookback; i < candles.length; i++) {
    const macd = calculateMACD(allCloses.slice(0, i + 1))
    if (macd) histSeries.push(macd.histogram)
  }

  if (histSeries.length < 4) return { type: null, strength: 'weak', periods: 0 }

  const closes = candles.slice(-lookback).map((c) => c.close)
  const mid = Math.floor(closes.length / 2)
  const histMid = Math.floor(histSeries.length / 2)

  const minPrice1 = Math.min(...closes.slice(0, mid))
  const minPrice2 = Math.min(...closes.slice(mid))
  const minHist1 = Math.min(...histSeries.slice(0, histMid))
  const minHist2 = Math.min(...histSeries.slice(histMid))

  if (minPrice2 < minPrice1 && minHist2 > minHist1 + 0.001) {
    return { type: 'bullish', strength: minHist2 - minHist1 > 0.005 ? 'strong' : 'weak', periods: lookback }
  }

  const maxPrice1 = Math.max(...closes.slice(0, mid))
  const maxPrice2 = Math.max(...closes.slice(mid))
  const maxHist1 = Math.max(...histSeries.slice(0, histMid))
  const maxHist2 = Math.max(...histSeries.slice(histMid))

  if (maxPrice2 > maxPrice1 && maxHist2 < maxHist1 - 0.001) {
    return { type: 'bearish', strength: maxHist1 - maxHist2 > 0.005 ? 'strong' : 'weak', periods: lookback }
  }

  return { type: null, strength: 'weak', periods: 0 }
}

/**
 * Métricas CLMM específicas calculadas a partir de candles históricos + range da posição.
 */
export function calculateCLMMMetrics(
  candles: OHLCV[],
  rangeLow: number,
  rangeHigh: number,
  currentPrice: number
): CLMMPositionMetrics {
  const slice30d = candles.slice(-30)

  const closes = slice30d.map((c) => c.close)
  const priceMin30d = Math.min(...slice30d.map((c) => c.low))
  const priceMax30d = Math.max(...slice30d.map((c) => c.high))

  // In-Range Time: % de candles onde high >= rangeLow E low <= rangeHigh
  const inRangeCandles = slice30d.filter(
    (c) => c.high >= rangeLow && c.low <= rangeHigh
  ).length
  const inRangeTimePct = slice30d.length > 0 ? (inRangeCandles / slice30d.length) * 100 : 0

  // Volume capturado in-range
  const totalVolume = slice30d.reduce((s, c) => s + c.volume, 0)
  const inRangeVolume = slice30d
    .filter((c) => c.high >= rangeLow && c.low <= rangeHigh)
    .reduce((s, c) => s + c.volume, 0)
  const feeCaptureRate = totalVolume > 0 ? (inRangeVolume / totalVolume) * 100 : 0

  // Range Utilization: quanto do range foi "usado" pelo preço
  const priceRange30d = priceMax30d - priceMin30d
  const rangeWidth = rangeHigh - rangeLow
  const rangeUtilization = rangeWidth > 0 ? priceRange30d / rangeWidth : 0

  // Dias até saída do range baseado em ATR
  const atrResult = calculateATR(slice30d)
  const atrDaily = atrResult ? atrResult.value : (priceMax30d - priceMin30d) / 30

  const distToLower = currentPrice - rangeLow
  const distToUpper = rangeHigh - currentPrice
  const distToEdge = Math.max(0, Math.min(distToLower, distToUpper))

  // Se já está fora do range, dias até saída é zero
  if (currentPrice < rangeLow || currentPrice > rangeHigh) {
    return {
      inRangeTimePct,
      rangeUtilization,
      feeCaptureRate,
      daysUntilExit: 0,
      daysUntilExitP10: 0,
      daysUntilExitP90: 0,
      priceMin30d,
      priceMax30d,
      currentPricePosition: currentPrice < rangeLow ? 0 : 1,
    }
  }

  // P50: distância / ATR diário
  const daysUntilExit = atrDaily > 0 ? distToEdge / atrDaily : 999

  // P10 (pessimista): volatilidade 1.5× maior
  const daysUntilExitP10 = daysUntilExit / 1.5

  // P90 (otimista): volatilidade 0.6× menor
  const daysUntilExitP90 = daysUntilExit / 0.6

  // Posição do preço dentro do range (0 = borda inferior, 1 = borda superior)
  const currentPricePosition = rangeWidth > 0 ? (currentPrice - rangeLow) / rangeWidth : 0.5

  return {
    inRangeTimePct,
    rangeUtilization,
    feeCaptureRate,
    daysUntilExit,
    daysUntilExitP10,
    daysUntilExitP90,
    priceMin30d,
    priceMax30d,
    currentPricePosition: Math.max(0, Math.min(1, currentPricePosition)),
  }
}

/**
 * Avalia saúde da posição CLMM e retorna um diagnóstico.
 */
export function evaluateCLMMHealth(metrics: CLMMPositionMetrics): {
  status: 'excellent' | 'good' | 'warning' | 'critical'
  messages: string[]
} {
  const messages: string[] = []
  let score = 0

  if (metrics.inRangeTimePct >= 80) score += 3
  else if (metrics.inRangeTimePct >= 60) score += 2
  else if (metrics.inRangeTimePct >= 40) { score += 1; messages.push('Tempo in-range baixo — considere ampliar o range') }
  else messages.push('Preço ficou fora do range na maioria do tempo — range inadequado')

  if (metrics.rangeUtilization <= 0.8) score += 2
  else if (metrics.rangeUtilization <= 1.2) { score += 1; messages.push('Range próximo do limite — histórico sugere breakout possível') }
  else messages.push('Range muito estreito para a volatilidade histórica do par')

  if (metrics.feeCaptureRate >= 70) score += 2
  else if (metrics.feeCaptureRate >= 50) score += 1
  else messages.push('Captura de volume baixa — range pode estar desalinhado com liquidez ativa')

  if (metrics.daysUntilExit >= 7) score += 2
  else if (metrics.daysUntilExit >= 3) { score += 1; messages.push(`Preço pode sair do range em ~${metrics.daysUntilExit.toFixed(0)} dias`) }
  else messages.push(`Risco alto: saída do range estimada em menos de ${metrics.daysUntilExit.toFixed(1)} dias`)

  if (score >= 8) return { status: 'excellent', messages }
  if (score >= 5) return { status: 'good', messages }
  if (score >= 3) return { status: 'warning', messages }
  return { status: 'critical', messages }
}
