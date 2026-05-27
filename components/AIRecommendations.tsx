'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Info, ChevronDown, ChevronUp, Target } from 'lucide-react'
import { recommendPools, suggestAllocation } from '@/lib/aiRecommender'
import { useAppStore } from '@/hooks/useStore'
import { fmtUSD, fmtPct } from '@/lib/format'
import { POOL_DATA } from '@/lib/poolData'
import type { Pool, UserPreferences } from '@/lib/aiRecommender'
import type { PoolRecommendation } from '@/types'

export function AIRecommendations() {
  const { setSelectedPool } = useAppStore()
  const [expanded, setExpanded] = useState(false)
  const [capital, setCapital] = useState(10000)
  const [showAllocation, setShowAllocation] = useState(false)

  const allPools = useMemo(() => Object.values(POOL_DATA).flat(), [])

  const preferences: UserPreferences = {
    preferHighConfidence: true,
    avoidEmissions: true,
    minTvl: 100000,
  }

  const recommendations = useMemo(() => recommendPools(allPools, preferences, 5), [allPools])

  const allocation = useMemo(() => {
    if (!showAllocation) return []
    return suggestAllocation(recommendations, capital)
  }, [recommendations, capital, showAllocation])

  const scoreColors: Record<string, string> = {
    S: '#f59e0b', A: '#34d399', B: '#3b9eff', C: '#a78bfa', D: '#ef4444',
  }

  return (
    <div className="glass-card overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
            Recomendações Inteligentes
          </span>
          <span className="text-[9px] font-mono text-zinc-600">| {recommendations.length} pools</span>
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-3 space-y-2"
          >
            {recommendations.map((rec, i) => {
              const scoreNum = rec.matchScore
              const tier = scoreNum >= 75 ? 'A' : scoreNum >= 50 ? 'B' : 'C'
              return (
                <div
                  key={`${rec.pool.symbol}-${i}`}
                  onClick={() => setSelectedPool(rec.pool, rec.category)}
                  className="flex items-center gap-3 bg-black/30 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-black/40 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-mono font-bold"
                    style={{ backgroundColor: (scoreColors[tier] || '#64748b') + '15', color: scoreColors[tier] || '#64748b' }}>
                    {rec.matchScore}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-200">{rec.pool.symbol}</span>
                      <span className="text-[9px] font-mono text-zinc-500">{rec.pool.chain}</span>
                    </div>
                    <div className="text-[9px] font-mono text-zinc-600 mt-0.5 truncate">{rec.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-mono font-bold text-bull">{fmtPct(rec.pool.apy)}</div>
                    <div className="text-[8px] font-mono text-zinc-600">{fmtUSD(rec.pool.tvl)}</div>
                  </div>
                </div>
              )
            })}

            {/* Allocation Simulator */}
            <div className="pt-2 border-t border-white/[0.04] space-y-2">
              <button
                onClick={() => setShowAllocation(!showAllocation)}
                className="flex items-center gap-1.5 text-[9px] font-mono text-accent hover:text-accent/70 transition-colors"
              >
                <Target className="w-3 h-3" />
                Simular Alocação de Capital
              </button>
              {showAllocation && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider">Capital ($)</label>
                    <input
                      type="number"
                      value={capital}
                      onChange={(e) => setCapital(+e.target.value)}
                      className="w-full glass-input text-[10px] font-mono py-1.5 mt-1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    {allocation.map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-[10px] font-mono bg-black/20 rounded-lg px-2.5 py-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-zinc-300">{a.pool.symbol}</span>
                          <div className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${a.allocationPct}%` }} />
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-zinc-400">{fmtUSD(a.allocation)}</div>
                          <div className="text-bull text-[8px]">{fmtUSD(a.expectedAnnualReturn)}/ano</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {allocation.length > 0 && (
                    <div className="text-[9px] font-mono text-zinc-600 text-center">
                      Retorno anual estimado: {fmtUSD(allocation.reduce((s, a) => s + a.expectedAnnualReturn, 0))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
