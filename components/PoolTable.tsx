'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Info, Star, BarChart3 } from 'lucide-react'
import type { Pool, PoolCategory } from '@/types'
import { useAppStore } from '@/hooks/useStore'
import { fmtUSD, fmtPct, protoLabel, chainColor } from '@/lib/format'
import { getPoolScoreDetails } from '@/lib/poolScore'
import { CATEGORY_META } from '@/lib/poolData'
import { getPoolLinks } from '@/lib/poolLinks'
import { getConfidence, confidenceColor } from '@/lib/dataQuality'

interface Props {
  category: PoolCategory
  pools: Pool[]
}

function VolBar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio / 5, 1) * 100
  const color = ratio >= 0.5 && ratio <= 3.2 ? '#10b981' : ratio > 5 ? '#ef4444' : '#f59e0b'
  return (
    <div className="w-12 h-1 bg-white/[0.06] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function ConfBar({ value }: { value: number }) {
  const pct = Math.min(value / 100, 1) * 100
  const color = value >= 70 ? '#10b981' : value >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <div className="w-10 h-1 bg-white/[0.06] rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}

function poolKey(p: Pool) {
  return `${p.symbol}-${p.chain}-${p.project}`
}

export function PoolTable({ category, pools }: Props) {
  const { topOnly, selectedPool, setSelectedPool, watchlist, toggleWatchlist, addComparePool, comparePools, removeComparePool } = useAppStore()
  const meta = CATEGORY_META[category]
  const visiblePools = topOnly ? pools.slice(0, 10) : pools
  const watchlistSet = new Set(watchlist)
  const compareSet = new Set(comparePools.map(poolKey))

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-1 h-5 rounded-full" style={{ backgroundColor: meta.color }} />
        <h2 className="text-sm font-semibold" style={{ color: meta.color }}>{meta.label}</h2>
        <span className="text-[11px] font-mono text-zinc-600">{pools.length} pools</span>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="w-10 px-2 py-3" />
                  <th className="w-8 px-1 py-3" />
                  <th className="text-left px-3 py-3 text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Pool</th>
                  <th className="text-left px-3 py-3 text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Protocolo</th>
                  <th className="text-left px-3 py-3 text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-500">Rede</th>
                  <th className="text-right px-3 py-3 text-[9px] font-mono font-bold tracking-widest text-zinc-500">APR</th>
                  <th className="text-right px-3 py-3 text-[9px] font-mono font-bold tracking-widest text-zinc-500">APR 30d</th>
                  <th className="text-right px-3 py-3 text-[9px] font-mono font-bold tracking-widest text-zinc-500">TVL</th>
                  <th className="text-right px-3 py-3 text-[9px] font-mono font-bold tracking-widest text-zinc-500">Vol 24h</th>
                  <th className="text-right px-3 py-3 text-[9px] font-mono font-bold tracking-widest text-zinc-500">V/TVL</th>
                  <th className="text-right px-3 py-3 text-[9px] font-mono font-bold tracking-widest text-zinc-500">Score</th>
                  <th className="text-right px-3 py-3 text-[9px] font-mono font-bold tracking-widest text-zinc-500">Conf.</th>
                  <th className="px-3 py-3 text-center text-[9px] font-mono font-bold tracking-widest text-zinc-500 w-16">Link</th>
                </tr>
              </thead>
              <tbody>
                {visiblePools.map((pool, idx) => {
                  const pk = poolKey(pool)
                  const scoreDetails = getPoolScoreDetails({
                    apr: pool.apy ?? 0, tvl: pool.tvl ?? 0, volume24h: pool.vol1d ?? 0,
                  })
                  const isActive = selectedPool?.symbol === pool.symbol && selectedPool?.chain === pool.chain && selectedPool?.apy === pool.apy
                  const isBest = idx === 0
                  const links = getPoolLinks(pool.project, pool.chain, pool.poolId)
                  const primaryLink = links[0]
                  const conf = getConfidence(pool as any)
                  const confNum = conf === 'High' ? 85 : conf === 'Medium' ? 50 : 20
                  const vol = pool.vol1d || 0; const tvl = pool.tvl || 0; const volRatio = tvl > 0 ? vol / tvl : 0
                  const isWatched = watchlistSet.has(pk)
                  const isCompared = compareSet.has(pk)

                  return (
                    <tr key={`${pk}-${idx}`}
                      onClick={() => setSelectedPool({ ...pool, score: scoreDetails.total }, category)}
                      className={`cursor-pointer border-t border-white/[0.03] transition-all duration-150 ${
                        isActive ? 'bg-accent/[0.04] border-l-2 border-l-accent' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      {/* Compare checkbox */}
                      <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => isCompared ? removeComparePool(pk) : addComparePool(pool)}
                          className={`p-1 rounded transition-colors ${
                            isCompared ? 'text-accent bg-accent/10' : 'text-zinc-700 hover:text-zinc-400'
                          }`}
                          title={isCompared ? 'Remover da comparação' : 'Adicionar à comparação'}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                      {/* Favorite star */}
                      <td className="px-1 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleWatchlist(pk)}
                          className={`p-1 rounded transition-colors ${
                            isWatched ? 'text-warn hover:text-warn/70' : 'text-zinc-700 hover:text-zinc-400'
                          }`}
                          title={isWatched ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                        >
                          <Star className={`w-3.5 h-3.5 ${isWatched ? 'fill-warn' : ''}`} />
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-sans font-semibold text-[13px] text-zinc-100">{pool.symbol}</span>
                          {isBest && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-bull/10 text-bull border border-bull/20">#1</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-zinc-500">{protoLabel(pool.project)}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold"
                          style={{ backgroundColor: chainColor(pool.chain) + '15', color: chainColor(pool.chain), border: `1px solid ${chainColor(pool.chain) + '25'}` }}>
                          {pool.chain}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold text-bull text-sm">{fmtPct(pool.apy)}</td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-500">{fmtPct(pool.apyMean30d)}</td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-400">{fmtUSD(pool.tvl)}</td>
                      <td className="px-3 py-3 text-right font-mono text-zinc-500">{fmtUSD(pool.vol1d)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`font-mono text-[11px] ${volRatio >= 0.5 && volRatio <= 3.2 ? 'text-bull' : volRatio > 5 ? 'text-bear' : 'text-warn'}`}>
                            {volRatio.toFixed(2)}×
                          </span>
                          <VolBar ratio={volRatio} />
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right relative group cursor-help">
                        <span className="font-mono font-bold" style={{ color: scoreDetails.verdict.color }}>{scoreDetails.total}</span>
                        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden group-hover:flex flex-col items-center z-[100] pointer-events-none">
                          <div className="w-72 glass-panel p-3 shadow-glass text-[10px] pointer-events-auto">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-zinc-300 font-mono">Score: {scoreDetails.total}/100</span>
                              <span className="font-bold text-[11px]" style={{ color: scoreDetails.verdict.color }}>{scoreDetails.verdict.label}</span>
                            </div>
                            <div className="space-y-1 text-zinc-400 font-mono">
                              <div className="flex justify-between"><span>APR ({scoreDetails.apr.label})</span><span className="text-zinc-300">{scoreDetails.apr.score}/{scoreDetails.apr.max}</span></div>
                              <div className="flex justify-between"><span>TVL ({scoreDetails.tvl.label})</span><span className="text-zinc-300">{scoreDetails.tvl.score}/{scoreDetails.tvl.max}</span></div>
                              <div className="flex justify-between"><span>Volume ({scoreDetails.volume.label})</span><span className="text-zinc-300">{scoreDetails.volume.score}/{scoreDetails.volume.max}</span></div>
                              <div className="flex justify-between"><span>Sustent.</span><span className="text-zinc-300">{scoreDetails.sustainability.score}/{scoreDetails.sustainability.max}</span></div>
                              <div className="flex justify-between"><span>Consist.</span><span className="text-zinc-300">{scoreDetails.consistency.score}/{scoreDetails.consistency.max}</span></div>
                              <div className="flex justify-between"><span>Rewards</span><span className="text-zinc-300">{scoreDetails.rewards.score}/{scoreDetails.rewards.max}</span></div>
                            </div>
                            {scoreDetails.penalties.reasons.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-bear/20 text-bear text-[9px] font-mono space-y-0.5">
                                {scoreDetails.penalties.reasons.map((r, i) => (<div key={i}>⚠ {r}</div>))}
                              </div>
                            )}
                            <div className="mt-2 pt-2 border-t border-white/[0.04] text-[9px] text-zinc-600 font-mono">
                              <span className="text-bull">≥75</span> Excelente · <span className="text-accent">≥58</span> Bom · <span className="text-warn">≥40</span> Regular · <span className="text-bear">&lt;40</span> Fraco
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <ConfBar value={confNum} />
                          <span className={`font-mono text-[10px] font-semibold ${confidenceColor(conf)}`}>{conf}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <a href={primaryLink.url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-zinc-600 hover:text-accent transition-colors border border-white/[0.06] hover:border-accent/30 rounded-lg px-2 py-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span className="hidden sm:inline">{primaryLink.label}</span>
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="block md:hidden space-y-3">
        {visiblePools.map((pool, idx) => {
          const pk = poolKey(pool)
          const scoreDetails = getPoolScoreDetails({
            apr: pool.apy ?? 0, tvl: pool.tvl ?? 0, volume24h: pool.vol1d ?? 0,
          })
          const isActive = selectedPool?.symbol === pool.symbol && selectedPool?.chain === pool.chain && selectedPool?.apy === pool.apy
          const isBest = idx === 0
          const conf = getConfidence(pool as any)
          const links = getPoolLinks(pool.project, pool.chain, pool.poolId)
          const primaryLink = links[0]
          const isWatched = watchlistSet.has(pk)
          const isCompared = compareSet.has(pk)

          return (
            <div key={`${pk}-${idx}`}
              onClick={() => setSelectedPool({ ...pool, score: scoreDetails.total }, category)}
              className={`glass-panel p-4 space-y-3 transition-all cursor-pointer select-none active:scale-[0.99] ${isActive ? 'border-accent/40' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-zinc-100">{pool.symbol}</span>
                  {isBest && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-bull/10 text-bull border border-bull/20">#1</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); toggleWatchlist(pk) }}
                    className={`p-1.5 rounded-lg ${isWatched ? 'text-warn' : 'text-zinc-600'}`}>
                    <Star className={`w-3.5 h-3.5 ${isWatched ? 'fill-warn' : ''}`} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); isCompared ? removeComparePool(pk) : addComparePool(pool) }}
                    className={`p-1.5 rounded-lg ${isCompared ? 'text-accent bg-accent/10' : 'text-zinc-600'}`}>
                    <BarChart3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                <span>{protoLabel(pool.project)}</span>
                <span className="text-zinc-700">·</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold"
                  style={{ backgroundColor: chainColor(pool.chain) + '15', color: chainColor(pool.chain), border: `1px solid ${chainColor(pool.chain) + '25'}` }}>
                  {pool.chain}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-black/30 rounded-xl p-3 text-[11px] font-mono">
                <div>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">APR Atual</div>
                  <div className="text-bull font-bold text-sm">{fmtPct(pool.apy)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">APR 30d</div>
                  <div className="text-zinc-400 text-sm">{fmtPct(pool.apyMean30d)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">TVL</div>
                  <div className="text-zinc-300">{fmtUSD(pool.tvl)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-zinc-600 uppercase tracking-wider mb-0.5">Volume 24h</div>
                  <div className="text-zinc-400">{fmtUSD(pool.vol1d)}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-600 font-mono">Conf:</span>
                  <span className={`text-[10px] font-mono font-bold ${confidenceColor(conf)}`}>{conf}</span>
                </div>
                <a href={primaryLink.url} target="_blank" rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-accent border border-white/[0.06] rounded-lg px-2.5 py-1 transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  <span className="font-mono">{primaryLink.label}</span>
                </a>
              </div>
            </div>
          )
        })}
      </div>
    </motion.section>
  )
}
