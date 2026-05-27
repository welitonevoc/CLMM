'use client'

import { fmtPrice } from '@/lib/format'
import type { TechAnalysis, StrategyMode } from '@/types'
import { calculateDynamicRange } from '@/lib/rangeEngine'

interface Props {
  tech: TechAnalysis
  mode: StrategyMode
}

export function RangeVisualizer({ tech, mode }: Props) {
  const range = calculateDynamicRange(tech.price, tech.atr, mode)
  const supports = tech.supports || []
  const resistances = tech.resistances || []
  const allPrices = [...supports, ...resistances, tech.price, range.low, range.high]
  const barMin = Math.min(...allPrices) * 0.97
  const barMax = Math.max(...allPrices) * 1.03
  const pctPos = (v: number) => ((v - barMin) / (barMax - barMin) * 100).toFixed(1)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <h4 className="text-xs font-semibold text-zinc-300">Range Sugerido</h4>
        <span className="text-[10px] text-zinc-500 capitalize">{mode}</span>
      </div>

      <div className="relative h-10 bg-bg border border-border rounded-lg">
        {/* Range fill */}
        <div
          className="absolute top-1 bottom-1 rounded border border-accent/40"
          style={{
            left: `${pctPos(range.low)}%`,
            right: `${100 - parseFloat(pctPos(range.high))}%`,
            backgroundColor: 'rgba(59, 158, 255, 0.12)',
          }}
        />

        {/* Support pins */}
        {supports.map((s, i) => (
          <div
            key={`s-${i}`}
            className="absolute top-[-6px] w-[2px] h-[52px] bg-warn"
            style={{ left: `${pctPos(s)}%` }}
          >
            <span className="absolute top-[-16px] left-1/2 -translate-x-1/2 text-[9px] font-mono text-warn whitespace-nowrap">
              {fmtPrice(s)}
            </span>
          </div>
        ))}

        {/* Resistance pins */}
        {resistances.map((r, i) => (
          <div
            key={`r-${i}`}
            className="absolute top-[-6px] w-[2px] h-[52px] bg-bear"
            style={{ left: `${pctPos(r)}%` }}
          >
            <span className="absolute top-[-16px] left-1/2 -translate-x-1/2 text-[9px] font-mono text-bear whitespace-nowrap">
              {fmtPrice(r)}
            </span>
          </div>
        ))}

        {/* Current price */}
        <div
          className="absolute top-[-6px] w-[3px] h-[52px] bg-bull"
          style={{ left: `${pctPos(tech.price)}%` }}
        >
          <span className="absolute top-[-16px] left-1/2 -translate-x-1/2 text-[9px] font-mono text-bull font-semibold whitespace-nowrap">
            {fmtPrice(tech.price)}
          </span>
        </div>
      </div>

      {/* Range bounds */}
      <div className="flex justify-between text-[10px] font-mono text-zinc-500">
        <span>{fmtPrice(range.low)}</span>
        <span>{fmtPrice(range.high)}</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-[10px] text-zinc-500 mt-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-bull" /> Preco
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-warn" /> Suporte
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-bear" /> Resistencia
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm border border-accent bg-accent/10" /> Range
        </span>
      </div>
    </div>
  )
}
