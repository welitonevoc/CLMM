'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown, Info } from 'lucide-react'
import { LP_STRATEGIES, suggestStrategy } from '@/lib/strategies'
import type { LpStrategy } from '@/types'

interface Props {
  capital: number
  isStable: boolean
  volatility: number
  onSelect: (strategy: LpStrategy) => void
  selectedId?: string
}

export function StrategySelector({ capital, isStable, volatility, onSelect, selectedId }: Props) {
  const [open, setOpen] = useState(false)
  const [showDetail, setShowDetail] = useState<string | null>(null)
  const suggested = suggestStrategy(capital, isStable, volatility)
  const selected = LP_STRATEGIES.find(s => s.id === selectedId) || suggested

  const riskColors: Record<string, string> = {
    baixo: '#10b981',
    médio: '#f59e0b',
    alto: '#ef4444',
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
          Estratégia Recomendada
        </span>
        {suggested.id !== selected.id && (
          <button
            onClick={() => onSelect(suggested)}
            className="text-[9px] font-mono text-accent hover:text-accent/70 transition-colors"
          >
            Reverter p/ recomendado
          </button>
        )}
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="w-full glass-card p-3 flex items-center justify-between text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs text-zinc-200">{selected.name}</span>
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-mono font-bold"
              style={{ backgroundColor: riskColors[selected.riskLevel] + '15', color: riskColors[selected.riskLevel] }}
            >
              {selected.riskLevel}
            </span>
          </div>
          <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{selected.description.slice(0, 60)}...</div>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute z-10 w-full mt-1 glass-panel p-2 space-y-1 max-h-72 overflow-y-auto"
          >
            {LP_STRATEGIES.map((strategy) => {
              const isSelected = selected.id === strategy.id
              const isSuggested = suggested.id === strategy.id
              return (
                <div key={strategy.id}>
                  <button
                    onClick={() => { onSelect(strategy); setOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-[11px] ${
                      isSelected ? 'bg-accent/10 border border-accent/20' : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">{strategy.name}</span>
                        {isSuggested && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-accent/10 text-accent border border-accent/20">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono text-zinc-500 mt-0.5">{strategy.description}</div>
                      <div className="flex items-center gap-3 mt-1 text-[8px] font-mono text-zinc-600">
                        <span>{strategy.rebalanceFrequency}</span>
                        <span>{strategy.feeTier}</span>
                        <span style={{ color: riskColors[strategy.riskLevel] }}>{strategy.riskLevel}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 text-accent" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDetail(showDetail === strategy.id ? null : strategy.id) }}
                      className="p-1 text-zinc-600 hover:text-zinc-400"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  </button>
                  {showDetail === strategy.id && (
                    <div className="mx-3 mb-2 px-3 py-2 bg-black/30 rounded-lg text-[9px] font-mono text-zinc-500 leading-relaxed">
                      <strong className="text-zinc-400">Ideal para:</strong> {strategy.bestFor}
                    </div>
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
