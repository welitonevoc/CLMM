import type { Pool, PoolCategory, PoolRecommendation } from '@/types'
import { getVolatilityTier } from './strategies'

export type UserPreferences = {
  maxApr?: number
  minTvl?: number
  chains?: string[]
  categories?: PoolCategory[]
  preferStable?: boolean
  preferHighConfidence?: boolean
  avoidEmissions?: boolean
  riskTolerance?: 'low' | 'medium' | 'high'
  targetApy?: number
}

type ScoredPool = {
  pool: Pool
  totalScore: number
  feeSustainability: number
  volatilityScore: number
  timeInRange: number
  reasons: { text: string; weight: number }[]
  suggestedStrategy: string
}

const CHAIN_GAS = ['Solana', 'Arbitrum', 'Base', 'Optimism', 'Polygon']

function isLowGasChain(chain: string): boolean {
  return CHAIN_GAS.some(c => chain.toLowerCase().includes(c.toLowerCase()))
}

function estimatePoolVolatility(pool: Pool): number {
  const catVol: Record<string, number> = {
    STABLE: 3,
    ETH: 35,
    BTC: 30,
    SOL: 45,
  }
  const base = catVol[pool.category] || 30
  if (pool.apyBase && pool.apyBase > 0) {
    const apyAdjust = Math.min(pool.apyBase * 0.3, 40)
    return base + apyAdjust
  }
  return base + (pool.apy || 0) * 0.1
}

function estimateTimeInRange(volatility: number, rangePct: number): number {
  if (rangePct <= 0 || volatility <= 0) return 0.5
  const ratio = rangePct / (volatility * 1.5)
  return Math.min(0.99, ratio * 0.5 + 0.5)
}

function calculateFeeSustainability(pool: Pool): number {
  if (pool.apy <= 0) return 0
  const feeRatio = pool.apyBase / pool.apy
  if (feeRatio >= 0.7) return 0.9
  if (feeRatio >= 0.4) return 0.6
  if (feeRatio >= 0.1) return 0.3
  return 0.1
}

function suggestStrategyForPool(pool: Pool, volatility: number, capital: number): string {
  if (pool.category === 'STABLE') return 'stable-micro'
  if (capital >= 10000 && isLowGasChain(pool.chain)) return 'automated-vault'
  if (capital < 1000) return 'passive-wide'
  if (capital < 10000) return 'moderate'
  if (volatility > 80) return 'passive-wide'
  if (volatility < 30) return 'active-narrow'
  return 'moderate'
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

  const scored: ScoredPool[] = filtered.map(pool => {
    const volatility = estimatePoolVolatility(pool)
    const volTier = getVolatilityTier(volatility)
    let totalScore = 0
    const reasons: { text: string; weight: number }[] = []

    const feeRatio = pool.apy > 0 ? pool.apyBase / pool.apy : 0
    if (feeRatio > 0.7) { totalScore += 30; reasons.push({ text: 'APY sustentável (base fee)', weight: 30 }) }
    else if (feeRatio > 0.4) { totalScore += 15; reasons.push({ text: 'APY misto (fee + emissão)', weight: 15 }) }
    else { totalScore += 5; reasons.push({ text: 'APY dominado por emissões', weight: 5 }) }

    if (pool.tvl && pool.tvl > 10_000_000) { totalScore += 25; reasons.push({ text: 'TVL alto (>$10M)', weight: 25 }) }
    else if (pool.tvl && pool.tvl > 1_000_000) { totalScore += 20; reasons.push({ text: 'TVL alto (>$1M)', weight: 20 }) }
    else if (pool.tvl && pool.tvl > 100_000) { totalScore += 10; reasons.push({ text: 'TVL moderado', weight: 10 }) }

    const vol = pool.vol1d || 0
    const volToTvl = pool.tvl && pool.tvl > 0 ? vol / pool.tvl : 0
    if (volToTvl >= 0.5 && volToTvl <= 3.2) { totalScore += 25; reasons.push({ text: 'V/TVL saudável (0.5-3.2x)', weight: 25 }) }
    else if (volToTvl > 0 && volToTvl < 0.5) { totalScore += 10; reasons.push({ text: 'V/TVL baixo — pode ter liquidez ociosa', weight: 10 }) }
    else if (volToTvl > 3.2) { totalScore += 5; reasons.push({ text: 'Volume alto — verifique consistência', weight: 5 }) }

    if (pool.apyMean30d && pool.apy) {
      const drift = Math.abs(pool.apy - pool.apyMean30d) / pool.apyMean30d
      if (drift <= 0.15) { totalScore += 20; reasons.push({ text: 'APY consistente nos últimos 30d', weight: 20 }) }
      else if (drift <= 0.3) { totalScore += 10; reasons.push({ text: 'APY moderadamente estável', weight: 10 }) }
    } else { totalScore += 5 }

    const volScore = (() => {
      if (volTier === 'ultra_low') return 10
      if (volTier === 'low') return 8
      if (volTier === 'medium') return 7
      if (volTier === 'high') return 5
      return 3
    })()
    totalScore += volScore
    reasons.push({ text: `Volatilidade ${volTier === 'extreme' ? 'extrema — risco alto' : VOL_TIER_LABELS[volTier]}`, weight: volScore })

    const rangeWidth = pool.category === 'STABLE' ? 1.5 : volTier === 'ultra_low' ? 5 : volTier === 'low' ? 10 : volTier === 'medium' ? 15 : 25
    const timeInRange = estimateTimeInRange(volatility, pool.category === 'STABLE' ? 100 : rangeWidth)
    if (timeInRange > 0.85) { totalScore += 10; reasons.push({ text: 'Alta probabilidade de permanência em range', weight: 10 }) }

    if (preferences.preferStable && pool.category === 'STABLE') {
      totalScore += 10
      reasons.push({ text: 'Preferência por stablecoins', weight: 10 })
    }

    const gasEfficient = isLowGasChain(pool.chain)
    if (gasEfficient) { totalScore += 5; reasons.push({ text: 'Rede com gás baixo (rebalanceamento viável)', weight: 5 }) }

    if (preferences.riskTolerance === 'low' && volatility > 50) totalScore -= 10
    if (preferences.riskTolerance === 'high' && volatility > 80) totalScore += 5
    if (preferences.targetApy && pool.apy >= preferences.targetApy) totalScore += 10

    const suggestedStrategy = suggestStrategyForPool(pool, volatility, 5000)
    const feeSustainability = calculateFeeSustainability(pool)

    return {
      pool,
      totalScore: Math.round(totalScore),
      feeSustainability,
      volatilityScore: volScore,
      timeInRange,
      reasons,
      suggestedStrategy,
    }
  })

  scored.sort((a, b) => b.totalScore - a.totalScore)

  return scored.slice(0, topN).map(s => ({
    pool: s.pool,
    reason: s.reasons.slice(0, 2).map(r => r.text).join('. '),
    matchScore: s.totalScore,
    category: s.pool.category,
    feeSustainability: s.feeSustainability,
    volatilityScore: s.volatilityScore,
    timeInRange: s.timeInRange,
    suggestedStrategy: s.suggestedStrategy,
  }))
}

const VOL_TIER_LABELS: Record<string, string> = {
  ultra_low: 'baixa — seguro',
  low: 'baixa',
  medium: 'média',
  high: 'alta',
  extreme: 'extrema',
}

export function suggestAllocation(recommendations: PoolRecommendation[], totalCapital: number): {
  pool: Pool
  allocation: number
  allocationPct: number
  expectedAnnualReturn: number
  riskScore: number
}[] {
  const totalScore = recommendations.reduce((s, r) => s + r.matchScore, 0)
  if (totalScore === 0) return []

  const riskAdjusted = recommendations.map(r => {
    const vol = r.volatilityScore > 5 ? 0.9 : 1.1
    const sustain = r.feeSustainability > 0.5 ? 1.2 : 0.8
    return {
      ...r,
      adjustedScore: r.matchScore * vol * sustain,
    }
  })

  const adjTotal = riskAdjusted.reduce((s, r) => s + r.adjustedScore, 0)

  return riskAdjusted.map(r => {
    const pct = r.adjustedScore / adjTotal
    const alloc = totalCapital * pct
    const riskScore = r.volatilityScore < 5 ? 3 : r.volatilityScore < 7 ? 5 : 8
    return {
      pool: r.pool,
      allocation: Math.round(alloc),
      allocationPct: Math.round(pct * 100),
      expectedAnnualReturn: alloc * ((r.pool.apy || 0) * r.feeSustainability) / 100,
      riskScore,
    }
  })
}
