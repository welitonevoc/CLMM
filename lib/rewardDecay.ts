export type DecayStatus = 'stable' | 'decaying' | 'collapsed' | 'growing'

export type RewardDecayResult = {
  currentRewardApr: number
  priorRewardApr: number
  changePct: number
  status: DecayStatus
  penalty: number
  label: string
}

export function analyzeRewardDecay(
  currentRewardApr: number,
  priorRewardApr: number | null
): RewardDecayResult {
  if (!priorRewardApr || priorRewardApr <= 0) {
    return {
      currentRewardApr,
      priorRewardApr: 0,
      changePct: 0,
      status: currentRewardApr > 0 ? 'growing' : 'stable',
      penalty: 0,
      label: currentRewardApr > 0 ? 'Recompensas ativas' : 'Sem recompensas',
    }
  }

  const changePct = ((currentRewardApr - priorRewardApr) / priorRewardApr) * 100
  let status: DecayStatus = 'stable'
  let penalty = 0

  if (changePct < -50) {
    status = 'collapsed'
    penalty = 15
  } else if (changePct < -25) {
    status = 'decaying'
    penalty = 8
  } else if (changePct > 10) {
    status = 'growing'
  }

  const label = status === 'stable' ? 'Recompensas estáveis' :
    status === 'decaying' ? `Decaindo ${Math.abs(changePct).toFixed(0)}%` :
    status === 'collapsed' ? `Colapsou ${Math.abs(changePct).toFixed(0)}%` :
    `Crescendo +${changePct.toFixed(0)}%`

  return { currentRewardApr, priorRewardApr, changePct, status, penalty, label }
}

export function estimatePriorRewardApr(
  currentRewardApr: number,
  apyMean30d: number | null,
  apyBase: number
): number {
  if (apyMean30d && apyMean30d > 0) {
    const estimatedPriorReward = apyMean30d - apyBase
    return Math.max(0, estimatedPriorReward)
  }
  return currentRewardApr * 0.8
}

export function rewardSustainabilityScore(decay: RewardDecayResult): number {
  if (decay.status === 'collapsed') return 0
  if (decay.status === 'decaying') return 4
  if (decay.status === 'stable' && decay.currentRewardApr > 0) return 8
  if (decay.status === 'growing') return 10
  return 6
}

export function generateDecayHistory(currentRewardApr: number, weeks = 8): number[] {
  const history: number[] = []
  let val = currentRewardApr
  for (let i = 0; i < weeks; i++) {
    history.unshift(Math.max(0, val))
    val *= 0.92 + Math.random() * 0.06
  }
  return history
}
