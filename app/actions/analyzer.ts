'use server'

export type PoolAnalysisResult = {
  poolAddress: string
  gaugeAddress: string
  analyzedAt: number
  onChain: {
    token0: { symbol: string; address: string }
    token1: { symbol: string; address: string }
    fee: number
    tickSpacing: number
    liquidity: string
    sqrtPrice: string
    tick: number
  }
  gauge: {
    totalSupply: string
    stakingRewards: string
    rewardRate: string
    periodFinish: number
  }
  metrics: {
    tvl: number
    volume24h: number
    feeApr: number
    rewardApr: number
    totalApr: number
    inRange: boolean
  }
}

export async function analyzePoolAction(poolAddress: string, gaugeAddress?: string): Promise<PoolAnalysisResult> {
  const now = Math.floor(Date.now() / 1000)

  return {
    poolAddress,
    gaugeAddress: gaugeAddress || '',
    analyzedAt: now,
    onChain: {
      token0: { symbol: 'TOKEN0', address: '0x0000000000000000000000000000000000000000' },
      token1: { symbol: 'TOKEN1', address: '0x0000000000000000000000000000000000000001' },
      fee: 3000,
      tickSpacing: 60,
      liquidity: '0',
      sqrtPrice: '0',
      tick: 0,
    },
    gauge: {
      totalSupply: '0',
      stakingRewards: '0',
      rewardRate: '0',
      periodFinish: now,
    },
    metrics: {
      tvl: 0,
      volume24h: 0,
      feeApr: 0,
      rewardApr: 0,
      totalApr: 0,
      inRange: false,
    },
  }
}
