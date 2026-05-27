import type { Pool, PoolCategory, PoolRecommendation } from '@/types'

export type UserPreferences = {
  maxApr?: number
  minTvl?: number
  chains?: string[]
  categories?: PoolCategory[]
  preferStable?: boolean
  preferHighConfidence?: boolean
  avoidEmissions?: boolean
}

export function recommendPools(
  pools: Pool[],
  preferences: UserPreferences,
  topN = 5
): PoolRecommendation[] {
  let filtered = [...pools]

  if (preferences.maxApr) filtered = filtered.filter(p => (p.apy || 0) <= preferences.maxApr!)
  if (preferences.minTvl) filtered = filtered.filter(p => (p.tvl || 0) >= preferences.minTvl!)
  if (preferences.chains?.length) filtered = filtered.filter(p => preferences.chains!.includes(p.chain))
  if (preferences.categories?.length) filtered = filtered.filter(p => preferences.categories!.includes(p.category))
  if (preferences.avoidEmissions) filtered = filtered.filter(p => (p.apyReward || 0) < (p.apy || 0) * 0.5)
  if (preferences.preferHighConfidence) {
    filtered = filtered.filter(p => {
      const vol = p.vol1d || 0
      const tvl = p.tvl || 0
      const volToTvl = tvl > 0 ? vol / tvl : 0
      return !((p.apy || 0) > 800 || (p.apyMean30d || 0) > 1200 || volToTvl > 5)
    })
  }

  const scored = filtered.map(pool => {
    let score = 0
    const reasons: string[] = []

    const feeRatio = pool.apy > 0 ? (pool.apyBase / pool.apy) : 0
    if (feeRatio > 0.7) { score += 30; reasons.push('APY sustentável (base fee)') }
    else if (feeRatio > 0.4) { score += 15; reasons.push('APY misto (fee + emissão)') }
    else { score += 5; reasons.push('APY dominado por emissões') }

    if (pool.tvl && pool.tvl > 1_000_000) { score += 20; reasons.push('TVL alto (>$1M)') }
    else if (pool.tvl && pool.tvl > 100_000) { score += 10; reasons.push('TVL moderado') }

    const vol = pool.vol1d || 0
    const volToTvl = pool.tvl && pool.tvl > 0 ? vol / pool.tvl : 0
    if (volToTvl >= 0.5 && volToTvl <= 3.2) { score += 25; reasons.push('V/TVL saudável') }
    else if (volToTvl > 3.2) { score += 10; reasons.push('Volume alto — verifique consistência') }

    if (pool.apyMean30d && pool.apy) {
      const drift = Math.abs(pool.apy - pool.apyMean30d) / pool.apyMean30d
      if (drift <= 0.2) { score += 15; reasons.push('APY consistente nos últimos 30d') }
    } else { score += 5 }

    if (preferences.preferStable && pool.category === 'STABLE') {
      score += 10
    }

    return { pool, score: Math.round(score), reasons }
  })

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topN).map(s => {
    const catMap: Record<string, PoolCategory> = {}
    return {
      pool: s.pool,
      reason: s.reasons.slice(0, 2).join('. '),
      matchScore: s.score,
      category: s.pool.category,
    }
  })
}

export function suggestAllocation(recommendations: PoolRecommendation[], totalCapital: number): {
  pool: Pool
  allocation: number
  allocationPct: number
  expectedAnnualReturn: number
}[] {
  const totalScore = recommendations.reduce((s, r) => s + r.matchScore, 0)
  if (totalScore === 0) return []

  return recommendations.map(r => {
    const pct = r.matchScore / totalScore
    const alloc = totalCapital * pct
    return {
      pool: r.pool,
      allocation: Math.round(alloc),
      allocationPct: Math.round(pct * 100),
      expectedAnnualReturn: alloc * (r.pool.apy || 0) / 100,
    }
  })
}
