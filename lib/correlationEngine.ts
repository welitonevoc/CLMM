import type { CorrelationResult } from '@/types'

export function calculatePearsonCorrelation(
  pricesA: number[],
  pricesB: number[]
): CorrelationResult {
  const n = Math.min(pricesA.length, pricesB.length)
  if (n < 5) return { pearson: 0, label: 'Dados insuficientes', strength: 'fraca', direction: 'mesma_direcao', samples: 0 }

  const a = pricesA.slice(-n)
  const b = pricesB.slice(-n)

  const meanA = a.reduce((s, v) => s + v, 0) / n
  const meanB = b.reduce((s, v) => s + v, 0) / n

  let cov = 0, varA = 0, varB = 0
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA
    const db = b[i] - meanB
    cov += da * db
    varA += da * da
    varB += db * db
  }

  const denom = Math.sqrt(varA * varB)
  const pearson = denom > 0 ? cov / denom : 0
  const clampedPearson = Math.max(-1, Math.min(1, pearson))

  let strength: CorrelationResult['strength'] = 'fraca'
  let direction: CorrelationResult['direction'] = 'mesma_direcao'
  let label = ''

  if (Math.abs(clampedPearson) >= 0.8) strength = 'forte'
  else if (Math.abs(clampedPearson) >= 0.5) strength = 'moderada'
  else strength = 'fraca'

  if (clampedPearson < 0) direction = 'oposta'

  if (direction === 'oposta') {
    label = `${strength} correlação inversa (${clampedPearson.toFixed(2)})`
  } else {
    label = `${strength} correlação direta (${clampedPearson.toFixed(2)})`
  }

  return { pearson: clampedPearson, label, strength, direction, samples: n }
}

export function estimateVolatility(prices: number[]): number {
  if (prices.length < 5) return 0
  const returns: number[] = []
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1])
  }
  const mean = returns.reduce((s, v) => s + v, 0) / returns.length
  const variance = returns.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / returns.length
  const dailyStd = Math.sqrt(variance)
  return dailyStd * Math.sqrt(365) * 100
}

export function volatilityLabel(volPct: number): string {
  if (volPct < 20) return 'Muito Baixa'
  if (volPct < 40) return 'Baixa'
  if (volPct < 60) return 'Moderada'
  if (volPct < 80) return 'Alta'
  if (volPct < 120) return 'Muito Alta'
  return 'Extrema'
}

export function suggestRangeWidth(volatilityPct: number, holdingDays: number): number {
  const dailyVol = volatilityPct / Math.sqrt(365)
  const expectedMove = dailyVol * Math.sqrt(holdingDays)
  return Math.max(5, Math.round(expectedMove * 1.5))
}
