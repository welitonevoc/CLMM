'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Info, ChevronDown, ChevronUp, Target, TrendingUp, Shield, Zap, Clock, Cpu, AlertTriangle, BarChart3 } from 'lucide-react'
import { recommendPools, suggestAllocation } from '@/lib/aiRecommender'
import { useAppStore } from '@/hooks/useStore'
import { fmtUSD, fmtPct } from '@/lib/format'
import { POOL_DATA } from '@/lib/poolData'
import type { PoolRecommendation } from '@/types'

const SCORE_TIERS: { min: number; label: string; color: string }[] = [
  { min: 80, label: 'Excelente', color: '#34d399' },
  { min: 60, label: 'Bom', color: '#3b9eff' },
  { min: 40, label: 'Regular', color: '#f59e0b' },
  { min: 0, label: 'Risco', color: '#ef4444' },
]

function getScoreInfo(score: number) {
  return SCORE_TIERS.find(t => score >= t.min) || SCORE_TIERS[SCORE_TIERS.length - 1]
}

function SustainabilityBar({ value }: { value: number }) {
  const colors = ['#ef4444', '#f59e0b', '#3b9eff', '#34d399']
  const color = colors[Math.min(Math.floor(value * 4), 3)]
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value * 100}%`, backgroundColor: color }} />
      </div>
      <span className="text-[8px] font-mono w-8 text-right" style={{ color }}>{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

function FeeBreakdown({ base, reward }: { base: number; reward: number }) {
  const total = base + reward || 1
  const basePct = (base / total) * 100
  const rewardPct = (reward / total) * 100
  return (
    <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden flex">
      <div className="h-full bg-bull transition-all" style={{ width: `${basePct}%` }}
        title={`Fee: ${fmtPct(base)}`} />
      <div className="h-full bg-accent/50 transition-all" style={{ width: `${rewardPct}%` }}
        title={`Rewards: ${fmtPct(reward)}`} />
    </div>
  )
}

export function AIRecommendations() {
  const { setSelectedPool } = useAppStore()
  const [expanded, setExpanded] = useState(false)
  const [capital, setCapital] = useState(10000)
  const [showAllocation, setShowAllocation] = useState(false)
  const [showDetails, setShowDetails] = useState<Set<number>>(new Set())

  const allPools = useMemo(() => Object.values(POOL_DATA).flat(), [])

  const recommendations = useMemo(() => {
    const prefs = { preferHighConfidence: true, avoidEmissions: true, minTvl: 100000 }
    return recommendPools(allPools, prefs, 5)
  }, [allPools])

  const allocation = useMemo(() => {
    if (!showAllocation) return []
    return suggestAllocation(recommendations, capital)
  }, [recommendations, capital, showAllocation])

  const riskColors: Record<string, string> = {
    baixo: '#10b981',
    médio: '#f59e0b',
    alto: '#ef4444',
  }

  const managementIcons: Record<string, typeof Cpu> = {
    manual: Target,
    'semi-auto': Clock,
    automated: Cpu,
  }

  function toggleDetail(i: number) {
    setShowDetails(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
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
              const info = getScoreInfo(rec.matchScore)
              const showDetail = showDetails.has(i)
              return (
                <div key={`${rec.pool.symbol}-${i}`}>
                  <div
                    onClick={() => setSelectedPool(rec.pool, rec.category)}
                    className="flex items-center gap-3 bg-black/30 rounded-lg px-3 py-2.5 cursor-pointer hover:bg-black/40 transition-colors"
                  >
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-mono font-bold shrink-0"
                      style={{ backgroundColor: info.color + '15', color: info.color }}
                    >
                      {rec.matchScore}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-200">{rec.pool.symbol}</span>
                        <span className="text-[9px] font-mono text-zinc-500">{rec.pool.chain}</span>
                        <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ backgroundColor: info.color + '15', color: info.color }}>
                          {info.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-2.5 h-2.5 text-bull" />
                          <span className="text-[10px] font-mono font-bold text-bull">{fmtPct(rec.pool.apy)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5 text-zinc-500" />
                          <span className="text-[8px] font-mono text-zinc-500">{fmtUSD(rec.pool.tvl)}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleDetail(i) }}
                          className="ml-auto p-0.5 text-zinc-600 hover:text-zinc-400"
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {showDetail && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mx-2 mb-1 px-3 py-2 bg-black/40 rounded-lg space-y-2"
                    >
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[9px] font-mono">
                        <div>
                          <span className="text-zinc-600">Sustentabilidade Fee</span>
                          <SustainabilityBar value={rec.feeSustainability} />
                        </div>
                        <div>
                          <span className="text-zinc-600">Fee vs Rewards</span>
                          <FeeBreakdown base={rec.pool.apyBase} reward={rec.pool.apyReward} />
                        </div>
                        <div>
                          <span className="text-zinc-600">Volatilidade</span>
                          <span className="text-zinc-400">{rec.volatilityScore > 7 ? 'Alta' : rec.volatilityScore > 4 ? 'Média' : 'Baixa'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600">Time-in-Range</span>
                          <span className="text-zinc-400">{(rec.timeInRange * 100).toFixed(0)}%</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-zinc-600 block mb-0.5">Estratégia sugerida:</span>
                          <div className="flex items-center gap-1.5">
                            {rec.suggestedStrategy && (() => {
                              const stratLabels: Record<string, { label: string; icon: typeof Cpu }> = {
                                'passive-wide': { label: 'Passivo Amplo', icon: Target },
                                'moderate': { label: 'Moderado', icon: Clock },
                                'active-narrow': { label: 'Ativo Estreito', icon: Target },
                                'stable-micro': { label: 'Stable Micro', icon: Shield },
                                'automated-vault': { label: 'Vault Automatizado', icon: Cpu },
                                'ladder': { label: 'Escada', icon: BarChart3 },
                                'one-sided': { label: 'One-Sided', icon: AlertTriangle },
                              }
                              const s = stratLabels[rec.suggestedStrategy] || { label: rec.suggestedStrategy, icon: Target }
                              const Icon = s.icon
                              return (
                                <span className="flex items-center gap-1 text-accent">
                                  <Icon className="w-2.5 h-2.5" />
                                  {s.label}
                                </span>
                              )
                            })()}
                          </div>
                        </div>
                      </div>
                      <div className="text-[8px] font-mono text-zinc-600 leading-relaxed">
                        {rec.reason}
                      </div>
                    </motion.div>
                  )}
                </div>
              )
            })}

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
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-300">{a.pool.symbol}</span>
                            <div className="flex items-center gap-1">
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: a.riskScore > 6 ? '#ef4444' : a.riskScore > 4 ? '#f59e0b' : '#10b981' }}
                              />
                              <span className="text-[8px] text-zinc-600">Risco {a.riskScore}/10</span>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent to-bull transition-all"
                              style={{ width: `${a.allocationPct}%` }} />
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-zinc-400">{fmtUSD(a.allocation)}</div>
                          <div className="text-bull text-[8px]">{fmtUSD(a.expectedAnnualReturn)}/ano</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {allocation.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-mono text-zinc-600">
                        <span>Capital total</span>
                        <span>{fmtUSD(allocation.reduce((s, a) => s + a.allocation, 0))}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-zinc-600">
                        <span>Retorno anual estimado</span>
                        <span className="text-bull">{fmtUSD(allocation.reduce((s, a) => s + a.expectedAnnualReturn, 0))}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono text-zinc-600">
                        <span>APY ponderado</span>
                        {(() => {
                          const totalAlloc = allocation.reduce((s, a) => s + a.allocation, 0)
                          const weightedApy = totalAlloc > 0
                            ? allocation.reduce((s, a) => s + a.expectedAnnualReturn, 0) / totalAlloc * 100
                            : 0
                          return <span className="text-bull">{weightedApy.toFixed(1)}%</span>
                        })()}
                      </div>
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
