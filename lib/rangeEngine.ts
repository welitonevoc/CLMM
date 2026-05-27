import type { RangeResult, StrategyMode } from '@/types'

const MULTIPLIERS: Record<StrategyMode, number> = {
  conservative: 3,
  balanced: 2,
  aggressive: 1,
  stable: 0.35,
}

export function calculateDynamicRange(
  price: number,
  atr: number,
  mode: StrategyMode
): RangeResult {
  const width = atr * MULTIPLIERS[mode]

  return {
    low: +(price - width).toFixed(2),
    high: +(price + width).toFixed(2),
    width: +width.toFixed(2),
    mode,
  }
}

export function rangeWidthPct(low: number, high: number, price: number): number {
  return +((high - low) / price * 100).toFixed(1)
}

export function priceInRange(price: number, low: number, high: number): boolean {
  return price >= low && price <= high
}

export function distanceToEdge(
  price: number,
  low: number,
  high: number
): { toLow: number; toHigh: number; closestEdge: 'low' | 'high' } {
  const toLow = +((price - low) / price * 100).toFixed(2)
  const toHigh = +((high - price) / price * 100).toFixed(2)
  return {
    toLow,
    toHigh,
    closestEdge: toLow < toHigh ? 'low' : 'high',
  }
}
