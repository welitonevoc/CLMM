'use client'

import { useMemo } from 'react'
import { calculateWaterfall, waterfallSummary } from '@/lib/yieldWaterfall'
import { fmtUSD, fmtPct } from '@/lib/format'

interface Props {
  capital: number
  feeApr: number
  rewardApr: number
  ilPercent: number
  days?: number
  gasCostPerRebalance?: number
  rebalances?: number
}

export function YieldWaterfall({
  capital, feeApr, rewardApr, ilPercent,
  days = 30, gasCostPerRebalance = 0.1, rebalances = 2,
}: Props) {
  const result = useMemo(() => calculateWaterfall({
    capital, feeApr, rewardApr, ilPercent, days, gasCostPerRebalance, rebalances,
  }), [capital, feeApr, rewardApr, ilPercent, days, gasCostPerRebalance, rebalances])

  const summaries = useMemo(() => waterfallSummary({
    capital, feeApr, rewardApr, ilPercent, days, gasCostPerRebalance, rebalances,
  }), [capital, feeApr, rewardApr, ilPercent, days, gasCostPerRebalance, rebalances])

  const maxValue = Math.max(...result.items.filter(i => i.type !== 'total').map(i => Math.abs(i.value)))

  return (
    <div className="glass-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
          Yield Waterfall
        </h4>
        <span className="font-mono text-xs font-bold" style={{ color: result.netReturn >= 0 ? '#10b981' : '#ef4444' }}>
          {result.netReturn >= 0 ? '+' : ''}{fmtUSD(result.netReturn)}
        </span>
      </div>

      <div className="space-y-2">
        {result.items.map((item) => {
          const pct = maxValue > 0 ? (Math.abs(item.value) / maxValue) * 100 : 0
          const isPositive = item.value > 0
          const isTotal = item.type === 'total'

          return (
            <div key={item.label} className="space-y-0.5">
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className={isTotal ? 'text-zinc-300 font-bold' : 'text-zinc-500'}>
                  {item.label}
                </span>
                <span className="font-semibold" style={{ color: item.color }}>
                  {isPositive && !isTotal ? '+' : ''}{fmtUSD(item.value)}
                  {isTotal && (
                    <span className="text-[9px] ml-1 opacity-70">({result.netReturnPct >= 0 ? '+' : ''}{result.netReturnPct.toFixed(1)}%)</span>
                  )}
                </span>
              </div>
              {!isTotal && (
                <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      backgroundColor: item.color,
                      marginLeft: isPositive ? 0 : 'auto',
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="text-[10px] font-mono text-zinc-500">
        APR bruto: <span className="text-zinc-400">{fmtPct(feeApr + rewardApr)}</span>
        {' · '}APR líquido: <span className={result.netApr >= 0 ? 'text-bull' : 'text-bear'}>{fmtPct(result.netApr)}</span>
      </div>

      {summaries.length > 0 && (
        <div className="pt-2 border-t border-white/[0.04] space-y-1">
          {summaries.map((s, i) => (
            <div key={i} className="text-[9px] font-mono text-zinc-600 flex items-start gap-1.5">
              <span className="text-zinc-700 mt-0.5">·</span> {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
