'use client'

import { useMemo } from 'react'
import { ArrowRight, ExternalLink } from 'lucide-react'
import { fmtUSD, fmtPct, protoLabel, chainColor } from '@/lib/format'
import { POOL_DATA } from '@/lib/poolData'
import { useAppStore } from '@/hooks/useStore'
import type { Pool, PoolCategory } from '@/types'

interface Props {
  symbol: string
}

export function CrossPlatformTable({ symbol }: Props) {
  const { setSelectedPool } = useAppStore()

  const baseSymbol = symbol.split('-')[0]

  const matches = useMemo(() => {
    const all: (Pool & { category: PoolCategory })[] = []
    for (const cat of Object.keys(POOL_DATA) as PoolCategory[]) {
      for (const pool of POOL_DATA[cat]) {
        if (pool.symbol.startsWith(baseSymbol) || pool.symbol.endsWith(baseSymbol)) {
          all.push({ ...pool, category: cat })
        }
      }
    }
    return all
  }, [baseSymbol])

  if (matches.length < 2) return null

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-3 border-b border-white/[0.04]">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
          {baseSymbol} — Comparação entre DEXs
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-white/[0.04]">
              <th className="text-left px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-zinc-500">DEX</th>
              <th className="text-left px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-zinc-500">Rede</th>
              <th className="text-right px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-zinc-500">APR</th>
              <th className="text-right px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-zinc-500">TVL</th>
              <th className="text-right px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-zinc-500">Vol 24h</th>
              <th className="text-right px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-zinc-500">V/TVL</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {matches.map((pool, i) => {
              const vol = pool.vol1d || 0
              const tvl = pool.tvl || 0
              const volRatio = tvl > 0 ? vol / tvl : 0
              return (
                <tr
                  key={`${pool.project}-${pool.chain}`}
                  onClick={() => setSelectedPool(pool, pool.category)}
                  className="border-t border-white/[0.03] cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-3 py-2">
                    <span className="text-zinc-300 font-semibold">{protoLabel(pool.project)}</span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold"
                      style={{ backgroundColor: chainColor(pool.chain) + '15', color: chainColor(pool.chain) }}>
                      {pool.chain}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-bull">{fmtPct(pool.apy)}</td>
                  <td className="px-3 py-2 text-right text-zinc-400">{fmtUSD(pool.tvl)}</td>
                  <td className="px-3 py-2 text-right text-zinc-500">{fmtUSD(pool.vol1d)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className={volRatio >= 0.5 && volRatio <= 3.2 ? 'text-bull' : 'text-warn'}>
                      {volRatio.toFixed(2)}×
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <ArrowRight className="w-3 h-3 text-zinc-600" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
