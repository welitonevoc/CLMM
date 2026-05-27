export function calculateATR(highs: number[], lows: number[], closes: number[], period = 14): number {
  if (closes.length < 2) return 0

  const trs: number[] = []
  for (let i = 1; i < closes.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    )
    trs.push(tr)
  }

  if (trs.length < period) {
    return trs.reduce((a, b) => a + b, 0) / trs.length
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period
  }

  return +atr.toFixed(4)
}

export function calculateSimpleATR(values: number[]): number {
  if (values.length < 2) return 0
  let total = 0
  for (let i = 1; i < values.length; i++) {
    total += Math.abs(values[i] - values[i - 1])
  }
  return total / (values.length - 1)
}

export function historicalVolatility(returns: number[]): number {
  if (returns.length < 2) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (returns.length - 1)
  return Math.sqrt(variance) * Math.sqrt(365)
}
