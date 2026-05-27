'use client'

import { useQuery } from '@tanstack/react-query'
import { fetchPools, filterPools, classifyPool } from '@/services/defillama'
import type { Pool, PoolCategory } from '@/types'

export function useLivePools() {
  return useQuery({
    queryKey: ['pools-live'],
    queryFn: async () => {
      const raw = await fetchPools()
      const filtered = filterPools(raw)

      const grouped: Record<PoolCategory, Pool[]> = { ETH: [], BTC: [], SOL: [], STABLE: [] }

      for (const p of filtered) {
        const cat = classifyPool(p.symbol) as PoolCategory | null
        if (!cat) continue
        grouped[cat].push({
          symbol: p.symbol,
          project: p.project,
          chain: p.chain,
          apy: +(p.apy || 0).toFixed(2),
          apyBase: +(p.apyBase || 0).toFixed(2),
          apyReward: +(p.apyReward || 0).toFixed(2),
          tvl: Math.round(p.tvlUsd || 0),
          vol1d: p.volumeUsd1d ? Math.round(p.volumeUsd1d) : null,
          apyBase7d: p.apyBase7d,
          apyMean30d: p.apyMean30d ? +p.apyMean30d.toFixed(2) : null,
          category: cat,
          poolId: p.pool,
        })
      }

      for (const cat of Object.keys(grouped) as PoolCategory[]) {
        grouped[cat].sort((a, b) => b.apy - a.apy)
      }

      return grouped
    },
    refetchInterval: 6 * 60 * 60 * 1000, // 6 hours
    staleTime: 30 * 60 * 1000, // 30 min
  })
}
