export function shouldRebalance({
  current,
  low,
  high,
  threshold,
}: {
  current: number
  low: number
  high: number
  threshold: number
}): { rebalance: boolean; reason: string; urgency: 'low' | 'medium' | 'high' } {
  const range = high - low
  const distanceLow = current - low
  const distanceHigh = high - current
  const pctFromLow = (distanceLow / range) * 100
  const pctFromHigh = (distanceHigh / range) * 100

  if (current <= low || current >= high) {
    return { rebalance: true, reason: 'Preco fora do range', urgency: 'high' }
  }

  if (distanceLow < threshold || distanceHigh < threshold) {
    const edge = distanceLow < distanceHigh ? 'inferior' : 'superior'
    return {
      rebalance: true,
      reason: `Proximo da borda ${edge} (${Math.min(pctFromLow, pctFromHigh).toFixed(1)}%)`,
      urgency: 'medium',
    }
  }

  if (pctFromLow < 15 || pctFromHigh < 15) {
    return {
      rebalance: false,
      reason: 'Monitorar — se aproximando da borda',
      urgency: 'low',
    }
  }

  return { rebalance: false, reason: 'Em range seguro', urgency: 'low' }
}
