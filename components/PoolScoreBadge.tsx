'use client'

import { getPoolScoreDetails } from '@/lib/poolScore'
import type { PoolMetrics } from '@/types'

interface Props {
  metrics: PoolMetrics
  size?: number
}

export function PoolScoreBadge({ metrics, size = 44 }: Props) {
  const details = getPoolScoreDetails(metrics)
  const { total, tier, verdict } = details
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const p = total / 100
  const o = c * (1 - p)

  return (
    <div className="inline-flex items-center gap-2.5" title={`Score ${total}/100 · Tier ${tier.label} · ${verdict.label}`}>
      <svg width={size} height={size} className="shrink-0">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={verdict.color} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={o}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 4px ${verdict.color}44)`, transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x={size / 2} y={size / 2 - 1} textAnchor="middle" dominantBaseline="central"
          fill={verdict.color} fontSize={size * 0.26} fontWeight={700} fontFamily="'JetBrains Mono', monospace">
          {total}
        </text>
      </svg>
      <div className="flex flex-col">
        <span className="text-[9px] font-mono font-bold leading-none uppercase tracking-wider" style={{ color: tier.color }}>
          Tier {tier.label}
        </span>
        <span className="text-[8px] font-mono leading-none mt-0.5" style={{ color: verdict.color }}>
          {verdict.label}
        </span>
      </div>
    </div>
  )
}
