'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, BarChart3, TrendingUp, DollarSign, Activity, Shield } from 'lucide-react'
import { useAppStore } from '@/hooks/useStore'
import { getPoolScoreDetails } from '@/lib/poolScore'
import { fmtUSD, fmtPct, protoLabel } from '@/lib/format'
import { chainColor } from '@/lib/format'
import type { Pool } from '@/types'

const METRICS = [
  { key: 'APR', icon: TrendingUp, fmt: (v: number) => fmtPct(v), color: '#10b981' },
  { key: 'APR 30d', icon: Activity, fmt: (v: number, p?: Pool) => fmtPct(p?.apyMean30d ?? 0), color: '#94a3b8' },
  { key: 'TVL', icon: DollarSign, fmt: (v: number) => fmtUSD(v), color: '#3b82f6' },
  { key: 'Volume 24h', icon: BarChart3, fmt: (v: number, p?: Pool) => fmtUSD(p?.vol1d ?? 0), color: '#94a3b8' },
  { key: 'Score', icon: Shield, fmt: (v: number, p?: Pool) => {
    const s = getPoolScoreDetails({ apr: p?.apy ?? 0, tvl: p?.tvl ?? 0, volume24h: p?.vol1d ?? 0 })
    return `${s.total} · ${s.tier.label}`
  }, color: '#f59e0b' },
]

export function PoolCompare() {
  const { comparePools, removeComparePool, clearComparePools } = useAppStore()

  if (comparePools.length < 2) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="glass-panel p-5 mb-6 relative"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-300">
              Comparação ({comparePools.length} pools)
            </span>
          </div>
          <button onClick={clearComparePools} className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors">
            Limpar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Métrica</th>
                {comparePools.map((pool) => (
                  <th key={`${pool.symbol}-${pool.chain}`} className="px-3 py-2 text-center relative group">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-200">{pool.symbol}</span>
                      <button
                        onClick={() => removeComparePool(`${pool.symbol}-${pool.chain}-${pool.project}`)}
                        className="text-zinc-600 hover:text-bear transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">{protoLabel(pool.project)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((metric) => {
                const Icon = metric.icon
                return (
                  <tr key={metric.key} className="border-t border-white/[0.04]">
                    <td className="px-3 py-2.5 text-zinc-400 flex items-center gap-1.5">
                      <Icon className="w-3 h-3" style={{ color: metric.color }} />
                      {metric.key}
                    </td>
                    {comparePools.map((pool) => {
                      const val = metric.fmt(0, pool)
                      const isScore = metric.key === 'Score'
                      return (
                        <td key={`${pool.symbol}-${metric.key}`} className="px-3 py-2.5 text-center font-semibold">
                          {isScore ? (
                            <span style={{ color: getPoolScoreDetails({ apr: pool.apy, tvl: pool.tvl, volume24h: pool.vol1d ?? 0 }).verdict.color }}>
                              {val}
                            </span>
                          ) : (
                            <span className="text-zinc-200">{val}</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              <tr className="border-t border-white/[0.04]">
                <td className="px-3 py-2.5 text-zinc-400 flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-sol" />
                  Rede
                </td>
                {comparePools.map((pool) => (
                  <td key={`${pool.symbol}-chain`} className="px-3 py-2.5 text-center">
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[9px] font-semibold font-mono"
                      style={{ backgroundColor: chainColor(pool.chain) + '15', color: chainColor(pool.chain) }}
                    >
                      {pool.chain}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
