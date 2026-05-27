/**
 * Technical Analysis Indicators for CLMM Terminal
 * Calculates metrics locally from OHLCV data to avoid static fallbacks.
 */

export interface OHLCV {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

/**
 * Calculates Average True Range (ATR)
 * Requires at least 14 periods for accuracy.
 */
export function calculateATR(data: OHLCV[], period: number = 14): number {
  if (data.length < period + 1) return 0

  const trueRanges: number[] = []
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high
    const low = data[i].low
    const prevClose = data[i - 1].close
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trueRanges.push(tr)
  }

  // Simple Moving Average of True Ranges for initial value
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period

  // Wilder's Smoothing Method
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period
  }

  return atr
}

/**
 * Calculates Relative Strength Index (RSI)
 */
export function calculateRSI(data: OHLCV[], period: number = 14): number {
  if (data.length < period + 1) return 50

  let gains = 0
  let losses = 0

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close
    if (diff >= 0) gains += diff
    else losses -= diff
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close
    const gain = diff >= 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }

  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

/**
 * Calculates Bollinger Bands (BB)
 */
export function calculateBB(data: OHLCV[], period: number = 20, stdDev: number = 2) {
  if (data.length < period) return { middle: 0, upper: 0, lower: 0 }

  const slice = data.slice(-period)
  const prices = slice.map(d => d.close)
  const middle = prices.reduce((a, b) => a + b, 0) / period
  
  const variance = prices.reduce((a, b) => a + Math.pow(b - middle, 2), 0) / period
  const dev = Math.sqrt(variance)
  
  return {
    middle,
    upper: middle + stdDev * dev,
    lower: middle - stdDev * dev
  }
}

/**
 * Calculates MACD
 */
export function calculateMACD(data: OHLCV[]) {
  const macdSeries = calculateMACDSeries(data)
  const macdLine = macdSeries[macdSeries.length - 1] ?? 0
  const signalSeries = calculateEMAFromSeries(macdSeries, 9)
  const signal = signalSeries[signalSeries.length - 1] ?? 0
  return {
    macd: macdLine,
    signal,
    trend: macdLine >= signal ? 'bull' : 'bear'
  }
}

function calculateEMA(data: OHLCV[], period: number): number {
  const k = 2 / (period + 1)
  let ema = data[0].close
  for (let i = 1; i < data.length; i++) {
    ema = data[i].close * k + ema * (1 - k)
  }
  return ema
}

function calculateEMAFromSeries(values: number[], period: number): number[] {
  if (!values.length) return []
  const k = 2 / (period + 1)
  const out: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i - 1] * (1 - k))
  return out
}

function calculateMACDSeries(data: OHLCV[]): number[] {
  const periodFast = 12
  const periodSlow = 26
  const ema12: number[] = []
  const ema26: number[] = []
  const k12 = 2 / (periodFast + 1)
  const k26 = 2 / (periodSlow + 1)
  ema12.push(data[0].close)
  ema26.push(data[0].close)
  for (let i = 1; i < data.length; i++) {
    ema12.push(data[i].close * k12 + ema12[i - 1] * (1 - k12))
    ema26.push(data[i].close * k26 + ema26[i - 1] * (1 - k26))
  }
  return ema12.map((v, i) => v - ema26[i])
}

/**
 * Calculates the %B indicator for Bollinger Bands
 * %B = (close - lowerBand) / (upperBand - lowerBand)
 * Returns a value between 0 and 1 (can go outside in extreme cases)
 */
export function calculatePercentB(close: number, upperBand: number, lowerBand: number): number {
  if (upperBand === lowerBand) return 0.5 // Avoid division by zero
  return (close - lowerBand) / (upperBand - lowerBand)
}

/**
 * Calculates the Bandwidth indicator for Bollinger Bands
 * Bandwidth = (upperBand - lowerBand) / middleBand
 * Represents the width of the bands relative to the middle band
 */
export function calculateBandWidth(upperBand: number, lowerBand: number, middleBand: number): number {
  if (middleBand === 0) return 0
  return (upperBand - lowerBand) / middleBand
}

/**
 * Detects RSI divergence (bullish or bearish)
 * Looks for price making higher highs/lows while RSI makes lower highs/higher lows
 * @param ohlcv Array of OHLCV data (must be same length as rsiValues)
 * @param rsiValues Array of RSI values (we'll compute internally for simplicity, but in analyzeTechnical we already have current RSI)
 * Actually, we'll compute RSI series and then compare with price.
 * For simplicity, we'll assume we have the RSI series (we can compute it again or pass it).
 * In analyzeTechnical, we have the current RSI but not the series. We'll compute the series inside this function.
 * However, to avoid duplicate calculation, we might want to pass the RSI series. But for now, let's compute it.
 * We'll compute RSI for the given period (14) and then look for divergences in the last 5 periods.
 */
export function detectRSIDivergence(ohlcv: OHLCV[]): { type: 'bullish' | 'bearish' | null; strength: 'strong' | 'weak' } | null {
  if (ohlcv.length < 20) return null // Need enough data to compute RSI and look back

  // Compute RSI series (period 14)
  const rsiValues: number[] = []
  const period = 14
  if (ohlcv.length < period + 1) return null

  let gains = 0
  let losses = 0
  for (let i = 1; i <= period; i++) {
    const diff = ohlcv[i].close - ohlcv[i - 1].close
    if (diff >= 0) gains += diff
    else losses -= diff
  }
  let avgGain = gains / period
  let avgLoss = losses / period

  // First RSI value (at index period)
  let rsi: number
  if (avgLoss === 0) rsi = 100
  else {
    const rs = avgGain / avgLoss
    rsi = 100 - 100 / (1 + rs)
  }
  rsiValues.push(rsi)

  for (let i = period + 1; i < ohlcv.length; i++) {
    const diff = ohlcv[i].close - ohlcv[i - 1].close
    const gain = diff >= 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
    if (avgLoss === 0) rsi = 100
    else {
      const rs = avgGain / avgLoss
      rsi = 100 - 100 / (1 + rs)
    }
    rsiValues.push(rsi)
  }

  // Now we have rsiValues aligned with ohlcv from index period to end
  // We'll look at the last 5 periods for divergence
  const lookback = 5
  const startIdx = ohlcv.length - lookback - 1 // we need to compare from startIdx to end
  if (startIdx < period) return null // Not enough data

  // Get the sliced arrays for the lookback period (including the point before startIdx for change calculation?)
  // We'll look at the trend in price and RSI from startIdx to end (inclusive of startIdx?).
  // We'll define:
  //   price trend: compare first and last close in the lookback window
  //   RSI trend: compare first and last RSI in the lookback window
  const priceStart = ohlcv[startIdx].close
  const priceEnd = ohlcv[ohlcv.length - 1].close
  const rsiStart = rsiValues[startIdx - period] // because rsiValues starts at index period of ohlcv
  const rsiEnd = rsiValues[rsiValues.length - 1]

  const priceChange = priceEnd - priceStart
  const rsiChange = rsiEnd - rsiStart

  // Bullish divergence: price makes lower low (priceChange < 0) but RSI makes higher low (rsiChange > 0)
  // Bearish divergence: price makes higher high (priceChange > 0) but RSI makes lower high (rsiChange < 0)
  if (priceChange < 0 && rsiChange > 0) {
    // Bullish divergence
    const strength = Math.abs(rsiChange) > 10 ? 'strong' : 'weak' // arbitrary threshold
    return { type: 'bullish', strength }
  }
  if (priceChange > 0 && rsiChange < 0) {
    // Bearish divergence
    const strength = Math.abs(rsiChange) > 10 ? 'strong' : 'weak'
    return { type: 'bearish', strength }
  }
  return null
}

/**
 * Detects MACD divergence (bullish or bearish)
 * Similar to RSI divergence but using MACD line
 * We'll compute MACD series (fast, slow, signal) and then look at the MACD line (fast - slow)
 */
export function detectMACDDivergence(ohlcv: OHLCV[]): { type: 'bullish' | 'bearish' | null; strength: 'strong' | 'weak' } | null {
  if (ohlcv.length < 30) return null // Need enough data for MACD

  // We'll compute EMA12 and EMA26 series to get MACD line
  const periodFast = 12
  const periodSlow = 26
  if (ohlcv.length < periodSlow + 1) return null

  // Function to compute EMA series
  function calculateEMAseries(data: OHLCV[], period: number): number[] {
    const k = 2 / (period + 1)
    const ema: number[] = []
    ema.push(data[0].close)
    for (let i = 1; i < data.length; i++) {
      ema.push(data[i].close * k + ema[i - 1] * (1 - k))
    }
    return ema
  }

  const ema12 = calculateEMAseries(ohlcv, periodFast)
  const ema26 = calculateEMAseries(ohlcv, periodSlow)
  // MACD line = EMA12 - EMA26 (aligned by index)
  const macdLine: number[] = []
  for (let i = 0; i < ema12.length; i++) {
    // ema12 and ema26 start at index 0, so we can subtract directly
    macdLine.push(ema12[i] - ema26[i])
  }

  // Now we have macdLine aligned with ohlcv (same length)
  // Lookback for divergence
  const lookback = 5
  const startIdx = ohlcv.length - lookback - 1
  if (startIdx < 0) return null

  const priceStart = ohlcv[startIdx].close
  const priceEnd = ohlcv[ohlcv.length - 1].close
  const macdStart = macdLine[startIdx]
  const macdEnd = macdLine[macdLine.length - 1]

  const priceChange = priceEnd - priceStart
  const macdChange = macdEnd - macdStart

  if (priceChange < 0 && macdChange > 0) {
    const strength = Math.abs(macdChange) > 0.1 ? 'strong' : 'weak' // MACD values are small, adjust threshold
    return { type: 'bullish', strength }
  }
  if (priceChange > 0 && macdChange < 0) {
    const strength = Math.abs(macdChange) > 0.1 ? 'strong' : 'weak'
    return { type: 'bearish', strength }
  }
  return null
}
