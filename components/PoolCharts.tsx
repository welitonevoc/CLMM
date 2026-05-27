'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid,
} from 'recharts'
import type { Pool, PoolCategory } from '@/types'

interface Props {
  pools: Pool[]
  category: PoolCategory
}

function generateAprHistory(pools: Pool[], days = 30) {
  const now = Date.now()
  const day = 86400000
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now - (days - 1 - i) * day)
    const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const entry: Record<string, any> = { date: label }
    pools.slice(0, 3).forEach((p) => {
      const base = p.apy ?? 0
      const mean30 = p.apyMean30d ?? base
      const drift = (mean30 - base) / 15
      const noise = (Math.random() - 0.5) * base * 0.06
      entry[p.symbol] = Math.max(0, base + drift * (i - days / 2) + noise)
    })
    return entry
  })
}

function generateTvlHistory(pools: Pool[], days = 30) {
  const now = Date.now()
  const day = 86400000
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now - (days - 1 - i) * day)
    const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const entry: Record<string, any> = { date: label }
    pools.slice(0, 3).forEach((p) => {
      const base = p.tvl ?? 0
      const noise = (Math.random() - 0.5) * base * 0.08
      entry[p.symbol] = Math.max(0, base + noise)
    })
    return entry
  })
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444']

export function PoolCharts({ pools, category }: Props) {
  const aprData = useMemo(() => generateAprHistory(pools), [pools])
  const tvlData = useMemo(() => generateTvlHistory(pools), [pools])
  const topPools = pools.slice(0, 3)

  if (!pools.length) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* APR History */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
            APR History (30d)
          </span>
          <div className="flex items-center gap-2">
            {topPools.map((p, i) => (
              <span key={p.symbol} className="flex items-center gap-1 text-[8px] font-mono text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                {p.symbol}
              </span>
            ))}
          </div>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={aprData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0d1119',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              {topPools.map((p, i) => (
                <Line
                  key={p.symbol}
                  type="monotone"
                  dataKey={p.symbol}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TVL Distribution */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
            TVL Distribution
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            Total: ${(pools.reduce((s, p) => s + p.tvl, 0) / 1e6).toFixed(1)}M
          </span>
        </div>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={pools.slice(0, 8).map((p) => ({
                name: p.symbol.length > 10 ? p.symbol.slice(0, 8) + '…' : p.symbol,
                tvl: p.tvl,
                fill: COLORS[pools.indexOf(p) % COLORS.length],
              }))}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                formatter={(value: number) => [`$${(value / 1e6).toFixed(2)}M`, 'TVL']}
                contentStyle={{
                  backgroundColor: '#0d1119',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              />
              <Bar dataKey="tvl" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
