export type Confidence = 'High' | 'Medium' | 'Low'

export function getConfidence(pool: { apy: number; apyMean30d?: number | null; vol1d?: number | null; tvl: number }): Confidence {
  const apy = Number(pool.apy || 0)
  const apy30 = Number(pool.apyMean30d || 0)
  const vol = Number(pool.vol1d || 0)
  const tvl = Number(pool.tvl || 0)
  const volToTvl = tvl > 0 ? vol / tvl : 0

  if (apy > 800 || apy30 > 1200) return 'Low'
  if (apy > 250 && vol <= 0) return 'Low'
  if (volToTvl > 5) return 'Low'
  if (apy > 200 || vol <= 0) return 'Medium'
  return 'High'
}

export function confidenceColor(c: Confidence): string {
  if (c === 'High') return 'text-bull'
  if (c === 'Medium') return 'text-warn'
  return 'text-bear'
}

