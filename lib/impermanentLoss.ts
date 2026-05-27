export function calculateIL(priceRatio: number): number {
  if (!Number.isFinite(priceRatio) || priceRatio <= 0) return 0
  return (2 * Math.sqrt(priceRatio)) / (1 + priceRatio) - 1
}

export function calculateNetPnL({
  fees,
  il,
  rewards,
}: {
  fees: number
  il: number
  rewards: number
}): number {
  return fees + rewards + il
}

export function ilForPriceChange(changePct: number): number {
  const ratio = 1 + changePct / 100
  return calculateIL(ratio) * 100
}

/** Uniswap v3-style concentrated position value ratio vs HODL (returns decimal, e.g. -0.05 = -5%). */
export function concentratedIL(
  price: number,
  rangeLow: number,
  rangeHigh: number,
  entryPrice: number
): number {
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(rangeLow) ||
    !Number.isFinite(rangeHigh) ||
    !Number.isFinite(entryPrice) ||
    price <= 0 ||
    rangeLow <= 0 ||
    rangeHigh <= 0 ||
    entryPrice <= 0 ||
    rangeLow >= rangeHigh
  ) {
    return 0
  }

  const pa = rangeLow
  const pb = rangeHigh
  const p0 = Math.max(pa, Math.min(pb, entryPrice))
  const p = price

  const sqrtP = Math.sqrt(p)
  const sqrtP0 = Math.sqrt(p0)
  const sqrtA = Math.sqrt(pa)
  const sqrtB = Math.sqrt(pb)

  const denom0 = 1 / sqrtP0 - 1 / sqrtB
  const denom1 = sqrtP0 - sqrtA
  if (Math.abs(denom0) < 1e-12 || Math.abs(denom1) < 1e-12) return 0

  const L = 1 / (2 * denom0 + 2 * p0 * denom1)

  const amount0At = (sqrtP: number) => L * (1 / sqrtP - 1 / sqrtB)
  const amount1At = (sqrtP: number) => L * (sqrtP - sqrtA)

  const positionValueAt = (sqrtPrice: number, spot: number) => {
    if (spot <= pa) return amount0At(sqrtA) * pa
    if (spot >= pb) return amount1At(sqrtB) * pb
    return amount0At(sqrtPrice) * spot + amount1At(sqrtPrice)
  }

  const entryValue = positionValueAt(sqrtP0, p0)
  const currentValue = positionValueAt(sqrtP, p)
  const holdValue = amount0At(sqrtP0) * p + amount1At(sqrtP0)

  if (entryValue <= 0 || holdValue <= 0) return 0

  return currentValue / holdValue - 1
}

/** IL for a concentrated range given a % price move from entry. */
export function concentratedILForPriceChange(
  changePct: number,
  rangeLow: number,
  rangeHigh: number,
  entryPrice: number
): number {
  const newPrice = entryPrice * (1 + changePct / 100)
  return concentratedIL(newPrice, rangeLow, rangeHigh, entryPrice) * 100
}

/** Default symmetric CLMM range (~±10%) for quick IL estimates when range is unknown. */
export function defaultConcentratedRange(entryPrice: number, bandwidthPct = 20): {
  rangeLow: number
  rangeHigh: number
} {
  const half = bandwidthPct / 200
  return {
    rangeLow: entryPrice * (1 - half),
    rangeHigh: entryPrice * (1 + half),
  }
}
