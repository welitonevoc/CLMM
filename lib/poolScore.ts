import type { PoolMetrics, PoolMetricsFromPool } from '@/types'
import type { Pool, PoolCategory } from '@/types'

export interface PoolScoreDetails {
  total: number
  tier: { label: string; color: string }
  apr: { score: number; max: number; label: string }
  tvl: { score: number; max: number; label: string }
  volume: { score: number; max: number; label: string }
  sustainability: { score: number; max: number; label: string }
  consistency: { score: number; max: number; label: string }
  rewards: { score: number; max: number; label: string }
  penalties: { value: number; reasons: string[] }
  verdict: { label: string; color: string; emoji: string }
}

function logScale(value: number, min: number, max: number, scoreMin: number, scoreMax: number): number {
  const clamped = Math.max(min, Math.min(value, max))
  const normalized = (clamped - min) / (max - min)
  const logVal = Math.log(1 + normalized * 9) / Math.log(10)
  return scoreMin + logVal * (scoreMax - scoreMin)
}

export function poolMetricsFromPool(pool: Pool, categoria: PoolCategory): PoolMetricsFromPool {
  return {
    apr: pool.apy ?? 0,
    tvl: pool.tvl ?? 0,
    volume24h: pool.vol1d ?? 0,
    apyBase: pool.apyBase ?? 0,
    apyReward: pool.apyReward ?? 0,
    apyMean30d: pool.apyMean30d ?? 0,
    hasRewards: (pool.apyReward ?? 0) > 0,
  }
}

export function getPoolScoreDetails(m: PoolMetrics): PoolScoreDetails {
  const apr = Number.isFinite(m.apr) ? Math.max(0, m.apr) : 0
  const tvl = Number.isFinite(m.tvl) ? Math.max(m.tvl, 1) : 1
  const volume24h = Number.isFinite(m.volume24h) ? Math.max(m.volume24h, 0) : 0
  const emissionApr = m.emissionApr ?? 0
  const apyMean30d = m.apyMean30d ?? 0
  const apyBase = m.apyBase ?? 0
  const apyReward = m.apyReward ?? 0
  const hasRewards = apyReward > 0

  const penalties: string[] = []
  let penalty = 0

  // 1. APR Score (24 pts) — log curve with ceiling
  const aprCap = 150
  const aprClamped = Math.min(apr, aprCap)
  const aprScore = Math.round(logScale(aprClamped, 0, aprCap, 0, 24))

  // Penalty: extreme APR
  if (apr > 300) {
    penalty += 15
    penalties.push('APR extremo (>300%)')
  } else if (apr > 150) {
    penalty += 5
    penalties.push('APR muito alto (>150%)')
  }

  // 2. TVL Score (22 pts) — log scale of depth
  const tvlScore = Math.round(logScale(tvl, 1, 50_000_000, 0, 22))

  // 3. Volume/TVL Score (18 pts) — healthy range ~0.9–3.2x
  const volToTvl = tvl > 0 ? volume24h / tvl : 0
  let volumeScore = 0
  if (volToTvl >= 0.9 && volToTvl <= 3.2) {
    volumeScore = 18
  } else if (volToTvl >= 0.5 && volToTvl < 0.9) {
    volumeScore = 12
  } else if (volToTvl > 3.2 && volToTvl <= 5) {
    volumeScore = 10
  } else if (volToTvl > 5) {
    volumeScore = 4
    penalty += 12
    penalties.push('Volume/TVL suspeito (>5x)')
  } else {
    volumeScore = 4
  }

  // 4. Sustentabilidade (14 pts) — fee vs rewards weight
  let sustainabilityScore = 0
  const feeApr = Math.max(0, apr - emissionApr)
  if (emissionApr > 0 && apr > 0) {
    const feeRatio = feeApr / apr
    if (feeRatio >= 0.7) {
      sustainabilityScore = 14
    } else if (feeRatio >= 0.5) {
      sustainabilityScore = 11
    } else if (feeRatio >= 0.3) {
      sustainabilityScore = 7
    } else {
      sustainabilityScore = 3
      if (apr > 50) {
        penalty += 8
        penalties.push('APR quase só emissões')
      }
    }
  } else {
    sustainabilityScore = 11
  }

  // 5. Consistência (14 pts) — current APR vs 30d mean
  let consistencyScore = 0
  if (apyMean30d > 0 && apr > 0) {
    const drift = Math.abs(apr - apyMean30d) / apyMean30d
    if (drift <= 0.15) {
      consistencyScore = 14
    } else if (drift <= 0.3) {
      consistencyScore = 11
    } else if (drift <= 0.5) {
      consistencyScore = 7
    } else {
      consistencyScore = 3
      penalty += 6
      penalties.push('Deriva alta no APR (>50%)')
    }
  } else if (apr > 0) {
    consistencyScore = 7
  }

  // 6. Programa de Rewards (8 pts)
  let rewardsScore = 0
  if (hasRewards && feeApr > 0) {
    rewardsScore = 8
  } else if (hasRewards) {
    rewardsScore = 4
  }

  // Additional penalties
  if (apr > 50 && volume24h <= 0) {
    penalty += 10
    penalties.push('APR alto sem volume')
  }

  // Calculate total
  const baseScore = aprScore + tvlScore + volumeScore + sustainabilityScore + consistencyScore + rewardsScore
  const total = Math.max(0, Math.min(100, baseScore - penalty))

  // Tier (S/A/B/C/D)
  let tier: { label: string; color: string }
  if (total >= 82) tier = { label: 'S', color: '#f59e0b' }
  else if (total >= 68) tier = { label: 'A', color: '#34d399' }
  else if (total >= 52) tier = { label: 'B', color: '#3b9eff' }
  else if (total >= 36) tier = { label: 'C', color: '#a78bfa' }
  else tier = { label: 'D', color: '#ef4444' }

  // Verdict
  let verdict: { label: string; color: string; emoji: string }
  if (total >= 75) verdict = { label: 'Excelente', color: '#34d399', emoji: '🟢' }
  else if (total >= 58) verdict = { label: 'Bom', color: '#3b9eff', emoji: '🔵' }
  else if (total >= 40) verdict = { label: 'Regular', color: '#f59e0b', emoji: '🟡' }
  else verdict = { label: 'Fraco', color: '#ef4444', emoji: '🔴' }

  return {
    total: Math.round(total),
    tier,
    apr: { score: aprScore, max: 24, label: `${apr.toFixed(1)}%` },
    tvl: { score: tvlScore, max: 22, label: `$${(tvl / 1e6).toFixed(1)}M` },
    volume: { score: volumeScore, max: 18, label: `${volToTvl.toFixed(1)}x` },
    sustainability: { score: sustainabilityScore, max: 14, label: emissionApr > 0 ? 'Fee+Emission' : 'Fee only' },
    consistency: { score: consistencyScore, max: 14, label: apyMean30d > 0 ? `${((1 - Math.abs(apr - apyMean30d) / apyMean30d) * 100).toFixed(0)}% match` : 'N/A' },
    rewards: { score: rewardsScore, max: 8, label: hasRewards ? 'Sim' : 'Não' },
    penalties: { value: penalty, reasons: penalties },
    verdict,
  }
}

export function calculatePoolScore(m: PoolMetrics): number {
  return getPoolScoreDetails(m).total
}

export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 82) return { label: 'S', color: '#f59e0b' }
  if (score >= 68) return { label: 'A', color: '#34d399' }
  if (score >= 52) return { label: 'B', color: '#3b9eff' }
  if (score >= 36) return { label: 'C', color: '#a78bfa' }
  return { label: 'D', color: '#ef4444' }
}
