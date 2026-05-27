'use client'

import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { analyzeRewardDecay, generateDecayHistory, rewardSustainabilityScore } from '@/lib/rewardDecay'
import { fmtPct } from '@/lib/format'

interface Props {
  currentRewardApr: number
  priorRewardApr: number | null
}

export function RewardDecayChart({ currentRewardApr, priorRewardApr }: Props) {
  const decay = useMemo(() => analyzeRewardDecay(currentRewardApr, priorRewardApr), [currentRewardApr, priorRewardApr])
  const history = useMemo(() => generateDecayHistory(currentRewardApr), [currentRewardApr])
  const sustainabilityScore = useMemo(() => rewardSustainabilityScore(decay), [decay])

  const chartData = history.map((v, i) => ({
    semana: `S${i + 1}`,
    rewardApr: +v.toFixed(2),
  }))

  const statusColors: Record<string, string> = {
    stable: '#10b981',
    decaying: '#f59e0b',
    collapsed: '#ef4444',
    growing: '#3b82f6',
  }

  return (
    <div className="glass-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
          Decaimento de Recompensas
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-zinc-600">Score:</span>
          <span className={`text-[10px] font-mono font-bold ${sustainabilityScore >= 8 ? 'text-bull' : sustainabilityScore >= 4 ? 'text-warn' : 'text-bear'}`}>
            {sustainabilityScore}/10
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-zinc-500">Atual:</span>
          <span className="font-semibold text-zinc-300">{fmtPct(decay.currentRewardApr)}</span>
        </div>
        <span className="text-zinc-700">→</span>
        <div className="flex items-center gap-1.5 text-[10px] font-mono">
          <span className="text-zinc-500">Anterior:</span>
          <span className="font-semibold text-zinc-300">{fmtPct(decay.priorRewardApr)}</span>
        </div>
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
          style={{ backgroundColor: statusColors[decay.status] + '15', color: statusColors[decay.status] }}
        >
          {decay.changePct >= 0 ? '+' : ''}{decay.changePct.toFixed(0)}%
        </span>
      </div>

      <div className="h-20">
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={chartData}>
            <XAxis dataKey="semana" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip
              contentStyle={{ background: '#12151c', border: '1px solid #1e2330', borderRadius: 8, fontSize: 10 }}
              formatter={(v: number) => [`${v.toFixed(1)}%`, 'Reward APR']}
            />
            <Line type="monotone" dataKey="rewardApr" stroke={statusColors[decay.status]} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-3 text-[9px] font-mono">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColors[decay.status] }} />
          {decay.label}
        </span>
        {decay.penalty > 0 && (
          <span className="text-bear">Penalidade: -{decay.penalty}pts</span>
        )}
      </div>
    </div>
  )
}
