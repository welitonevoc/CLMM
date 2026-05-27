'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Info, RotateCcw, Zap, Clock, Shield, TrendingUp, Target, Cpu } from 'lucide-react'
import { LP_STRATEGIES, suggestStrategy, getVolatilityTier, VOLATILITY_LABELS, estimateTimeInRange, adjustedGasCost, suggestFeeTier } from '@/lib/strategies'
import type { LpStrategy } from '@/types'

interface Props {
  capital: number
  isStable: boolean
  volatility: number
  chain?: string
  onSelect: (strategy: LpStrategy) => void
  selectedId?: string
}

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
const managementLabels: Record<string, string> = {
  manual: 'Manual',
  'semi-auto': 'Semi-auto',
  automated: 'Automático',
}

function RangeBar({ pct }: { pct: number }) {
  const width = Math.max(2, Math.min(100, pct * 3))
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className="h-full rounded-full bg-accent/60" style={{ width: `${100 - Math.min(width, 95)}%`, marginLeft: `${Math.min(width / 2, 47.5)}%` }} />
      </div>
      <span className="text-[8px] font-mono text-zinc-500 w-8 text-right">{pct}%</span>
    </div>
  )
}

function ApyBar({ low, high, currentApy }: { low: number; high: number; currentApy: number }) {
  const pct = Math.min(100, ((currentApy - low) / (high - low)) * 100)
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-mono text-zinc-500 w-10">{low}%</span>
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-bull to-accent transition-all"
          style={{ width: `${Math.max(5, Math.min(100, pct))}%` }}
        />
      </div>
      <span className="text-[9px] font-mono text-zinc-500 w-10 text-right">{high}%</span>
    </div>
  )
}

export function StrategySelector({ capital, isStable, volatility, chain, onSelect, selectedId }: Props) {
  const [open, setOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const suggested = suggestStrategy(capital, isStable, volatility, chain)
  const selected = LP_STRATEGIES.find(s => s.id === selectedId) || suggested
  const volTier = getVolatilityTier(volatility)

  const enriched = useMemo(() => LP_STRATEGIES.map(s => ({
    ...s,
    gasEstimate: chain ? adjustedGasCost(s, chain) : s.gasCostPerRebalance,
    timeInRange: s.rangePct > 0 ? estimateTimeInRange(s.rangePct, volatility) : 0.85,
  })), [volatility, chain])

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
          Estratégia Recomendada
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
            {VOLATILITY_LABELS[volTier]}
          </span>
          {suggested.id !== selected.id && (
            <button
              onClick={() => onSelect(suggested)}
              className="flex items-center gap-1 text-[9px] font-mono text-accent hover:text-accent/70 transition-colors"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Reverter
            </button>
          )}
        </div>
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="w-full glass-card p-3 flex items-center justify-between text-left hover:bg-white/[0.04] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-zinc-200">{selected.name}</span>
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold"
              style={{ backgroundColor: riskColors[selected.riskLevel] + '15', color: riskColors[selected.riskLevel] }}
            >
              {selected.riskLevel}
            </span>
            <span className="text-[8px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
              {managementLabels[selected.managementType]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[9px] font-mono text-accent font-semibold">
              {selected.expectedApyRange[0]}–{selected.expectedApyRange[1]}% APY
            </span>
            <RangeBar pct={selected.rangePct} />
          </div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-10 w-full mt-1 glass-panel p-2 space-y-1 max-h-96 overflow-y-auto"
          >
            {enriched.map((strategy) => {
              const isSelected = selected.id === strategy.id
              const isSuggested = suggested.id === strategy.id
              const Icon = managementIcons[strategy.managementType] || Target
              return (
                <div key={strategy.id}>
                  <button
                    onClick={() => { onSelect(strategy as LpStrategy); setOpen(false) }}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                      isSelected ? 'bg-accent/10 border border-accent/20' : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-zinc-200">{strategy.name}</span>
                        {isSuggested && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-accent/10 text-accent border border-accent/20">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">
                        {strategy.description}
                      </div>

                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-2.5 h-2.5 text-bull" />
                          <span className="text-[9px] font-mono text-zinc-400">
                            {strategy.expectedApyRange[0]}–{strategy.expectedApyRange[1]}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Shield className="w-2.5 h-2.5 text-zinc-500" />
                          <span className="text-[9px] font-mono text-zinc-500">
                            {(strategy.timeInRange * 100).toFixed(0)}% time-in-range
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-zinc-500" />
                          <span className="text-[9px] font-mono text-zinc-500">{strategy.rebalanceFrequency}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
                          Range: ±{strategy.rangePct}%
                        </span>
                        {chain && (
                          <span className="text-[8px] font-mono text-zinc-600 bg-white/[0.04] px-1.5 py-0.5 rounded">
                            Gas: ~${strategy.gasEstimate.toFixed(2)}
                          </span>
                        )}
                        <span
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono"
                          style={{ backgroundColor: riskColors[strategy.riskLevel] + '15', color: riskColors[strategy.riskLevel] }}
                        >
                          IL: {(strategy.ilRisk * 100).toFixed(0)}%
                        </span>
                        <Icon className="w-2.5 h-2.5 text-zinc-600" />
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDetailId(detailId === strategy.id ? null : strategy.id) }}
                        className="p-1 text-zinc-600 hover:text-zinc-400"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    </div>
                  </button>
                  {detailId === strategy.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mx-3 mb-2 px-3 py-2.5 bg-black/30 rounded-lg space-y-2"
                    >
                      <div className="text-[9px] font-mono text-zinc-400">{strategy.description}</div>
                      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                        <div>
                          <span className="text-zinc-600 block">Range</span>
                          <RangeBar pct={strategy.rangePct} />
                        </div>
                        <div>
                          <span className="text-zinc-600 block">APY Esperado</span>
                          <ApyBar low={strategy.expectedApyRange[0]} high={strategy.expectedApyRange[1]} currentApy={strategy.expectedApyRange[0]} />
                        </div>
                        <div>
                          <span className="text-zinc-600 block">IL Estimado</span>
                          <span className="text-zinc-400">{(strategy.ilRisk * 100).toFixed(0)}% do capital</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block">Tempo em Range</span>
                          <span className="text-zinc-400">{(strategy.timeInRange * 100).toFixed(0)}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block">Frequência</span>
                          <span className="text-zinc-400">{strategy.rebalanceFrequency}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block">Gestão</span>
                          <span className="text-zinc-400">{managementLabels[strategy.managementType]}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block">Fee Tiers</span>
                          <span className="text-zinc-400">{strategy.feeTiers.join(', ')}</span>
                        </div>
                        <div>
                          <span className="text-zinc-600 block">Gás (rebalance)</span>
                          <span className="text-zinc-400">~${strategy.gasEstimate?.toFixed(2) || '0'}</span>
                        </div>
                      </div>
                      <div className="text-[8px] font-mono text-zinc-600">
                        <strong className="text-zinc-500">Ideal:</strong> {strategy.bestFor}
                      </div>
                    </motion.div>
                  )}
                </div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
