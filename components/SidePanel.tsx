'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Gauge, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles } from 'lucide-react'
import { useAppStore } from '@/hooks/useStore'
import { TECH_DATA } from '@/lib/poolData'
import { fmtUSD, fmtPct, fmtPrice, protoLabel } from '@/lib/format'
import { getPoolScoreDetails } from '@/lib/poolScore'
import { getConfidence, confidenceColor } from '@/lib/dataQuality'
import { shouldRebalance } from '@/strategies/rebalance'
import { calculateDynamicRange } from '@/lib/rangeEngine'
import { getPoolLinks } from '@/lib/poolLinks'
import { RangeVisualizer } from './RangeVisualizer'
import { BacktestPanel } from './BacktestPanel'
import { ILPanel } from './ILPanel'
import { PositionManager } from './PositionManager'
import { YieldWaterfall } from './YieldWaterfall'
import { RewardDecayChart } from './RewardDecayChart'
import { StrategySelector } from './StrategySelector'
import { AlertPanel } from './AlertPanel'
import { CorrelationPanel } from './CorrelationPanel'
import { CrossPlatformTable } from './CrossPlatformTable'
import type { PoolCategory, StrategyMode, LpStrategy } from '@/types'
import SidePanelTechnicalSection from './SidePanel.integration'
import { useTechnicalAnalysis } from '@/hooks/useTechnicalAnalysis'

const MODE_LABELS: Record<StrategyMode, { label: string; color: string; multiplier: string }> = {
  conservative: { label: 'Conservador', color: '#10b981', multiplier: '3×' },
  balanced: { label: 'Balanceado', color: '#3b82f6', multiplier: '2×' },
  aggressive: { label: 'Agressivo', color: '#f59e0b', multiplier: '1×' },
  stable: { label: 'Stable', color: '#8b5cf6', multiplier: '0.35×' },
}

const MODE_RANGES: Record<StrategyMode, string> = {
  conservative: '3× ATR — Amplo',
  balanced: '2× ATR — Médio',
  aggressive: '1× ATR — Estreito',
  stable: '0.35× ATR — Micro',
}

export function SidePanel() {
  const { selectedPool: pool, selectedCategory: category, panelOpen, togglePanel, strategyMode, setStrategyMode } = useAppStore()

  const { data: technical, loading: loadingTech, error: techError } = useTechnicalAnalysis(
    pool?.chain || '', pool?.poolId || '', 0, 0, 5 * 60 * 1000,
    pool?.symbol, pool?.apy, category
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') togglePanel(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [togglePanel])

  const ind = technical?.indicators
  const tech = {
    price: ind?.currentPrice ?? (category && category !== 'STABLE' ? TECH_DATA[category]?.price : 0) ?? 0,
    atr: ind?.atr?.value ?? (category && category !== 'STABLE' ? TECH_DATA[category]?.atr : 0) ?? 0,
    atrPct: ind?.atr?.percentOfPrice ?? (category && category !== 'STABLE' ? TECH_DATA[category]?.atrPct : 0) ?? 0,
  }

  const dynamicRange = tech.price > 0 && tech.atr > 0
    ? calculateDynamicRange(tech.price, tech.atr, strategyMode) : null

  const volatility = tech.atrPct || 40
  const feeApr = pool?.apyBase || pool?.apy || 0
  const rewardApr = pool?.apyReward || 0

  const handleStrategySelect = (s: LpStrategy) => {
    const modeMap: Record<string, StrategyMode> = {
      'passive-wide': 'conservative',
      'moderate': 'balanced',
      'active-narrow': 'aggressive',
      'stable-micro': 'stable',
    }
    const mode = modeMap[s.id] || 'balanced'
    setStrategyMode(mode)
  }

  const rebalanceInfo = dynamicRange ? shouldRebalance({
    current: tech.price, low: dynamicRange.low, high: dynamicRange.high, threshold: tech.atr,
  }) : null

  const suspiciousApr = !!pool && (pool.apy > 500 || (pool.apyMean30d ?? 0) > 1000 || (!pool.vol1d && pool.apy > 100))
  const confidence = pool ? getConfidence(pool as any) : 'Low'
  const isPoolIdV4 = !!pool?.poolId && /^0x[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(pool.poolId)

  const poolScore = pool ? getPoolScoreDetails({
    apr: pool.apy ?? 0, tvl: pool.tvl ?? 0, volume24h: pool.vol1d ?? 0,
  }) : null

  return (
    <AnimatePresence>
      {panelOpen && pool && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => togglePanel(false)}
          />

          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-full md:w-[500px] max-w-full h-full bg-surface/90 backdrop-blur-2xl border-l border-white/[0.06] shadow-glass z-50 overflow-y-auto"
          >
            <div className="p-5 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/10 border border-accent/20">
                    <TrendingUp className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">{pool.symbol}</h2>
                    <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                      <span>{protoLabel(pool.project)}</span>
                      <span className="text-zinc-700">·</span>
                      <span>{pool.chain}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => togglePanel(false)} className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/[0.04] text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Links */}
              {(() => {
                const links = getPoolLinks(pool.project, pool.chain, pool.poolId)
                return (
                  <div className="flex flex-wrap gap-2">
                    {links.map((link) => (
                      <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-all ${
                          link.icon === 'dex' ? 'border-accent/30 bg-accent/5 text-accent hover:bg-accent/10' : 'border-white/[0.06] bg-black/30 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <ExternalLink className="w-3 h-3" />
                        {link.label === 'DefiLlama' ? 'DefiLlama' : link.label}
                      </a>
                    ))}
                  </div>
                )
              })()}

              {/* Strategy Mode */}
              <div className="glass-card p-3">
                <div className="flex items-center gap-2 mb-2.5">
                  <Gauge className="w-3.5 h-3.5 text-accent" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">Estratégia</span>
                </div>
                <StrategySelector
                  capital={500}
                  isStable={category === 'STABLE'}
                  volatility={volatility}
                  chain={pool?.chain}
                  onSelect={handleStrategySelect}
                  selectedId={strategyMode === 'conservative' ? 'passive-wide' : strategyMode === 'balanced' ? 'moderate' : strategyMode === 'aggressive' ? 'active-narrow' : 'stable-micro'}
                />
                {dynamicRange && (
                  <div className="mt-2 pt-2 border-t border-white/[0.04] space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-zinc-500">{MODE_RANGES[strategyMode]}</span>
                      <span className="font-bold" style={{ color: MODE_LABELS[strategyMode].color }}>
                        {fmtPrice(dynamicRange.low)}–{fmtPrice(dynamicRange.high)}
                      </span>
                    </div>
                    {dynamicRange.low > 0 && (
                      <div className="flex justify-between text-[9px] font-mono text-zinc-600 bg-black/30 px-2 py-1 rounded">
                        <span className="text-[8px] uppercase tracking-wider opacity-70">Invertido</span>
                        <span>{fmtPrice(1 / dynamicRange.high)}–{fmtPrice(1 / dynamicRange.low)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <MetricBox label="APR" value={fmtPct(pool.apy)} color="text-bull" />
                <MetricBox label="APR 30d" value={fmtPct(pool.apyMean30d)} color="text-zinc-400" />
                <MetricBox label="TVL" value={fmtUSD(pool.tvl)} color="text-accent" />
                <MetricBox label="Vol 24h" value={fmtUSD(pool.vol1d)} color="text-zinc-400" />
                <MetricBox label="Confiança" value={confidence} color={confidenceColor(confidence as any)} />
                <MetricBox label="Tier" value={poolScore?.tier.label ?? '—'} color={poolScore?.tier.color ?? '#64748b'} />
              </div>

              {/* Pool Score Detail */}
              {poolScore && (
                <div className="glass-card p-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">Score Breakdown</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold" style={{ color: poolScore.verdict.color }}>{poolScore.total}</span>
                      <span className="tech-tag font-bold text-[9px]" style={{ backgroundColor: poolScore.verdict.color + '15', color: poolScore.verdict.color, borderColor: poolScore.verdict.color + '25' }}>
                        {poolScore.verdict.label}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <ScoreMini label="APR" earned={poolScore.apr.score} max={poolScore.apr.max} color="#10b981" />
                    <ScoreMini label="TVL" earned={poolScore.tvl.score} max={poolScore.tvl.max} color="#3b82f6" />
                    <ScoreMini label="Volume" earned={poolScore.volume.score} max={poolScore.volume.max} color="#94a3b8" />
                    <ScoreMini label="Sustent." earned={poolScore.sustainability.score} max={poolScore.sustainability.max} color="#f59e0b" />
                    <ScoreMini label="Consist." earned={poolScore.consistency.score} max={poolScore.consistency.max} color="#8b5cf6" />
                    <ScoreMini label="Rewards" earned={poolScore.rewards.score} max={poolScore.rewards.max} color="#f59e0b" />
                  </div>
                  {poolScore.penalties.reasons.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-bear/20 space-y-1">
                      {poolScore.penalties.reasons.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[9px] font-mono text-bear">
                          <AlertTriangle className="w-3 h-3" /> {r}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Reward Decay */}
              {(pool.apyReward || 0) > 0 && (
                <RewardDecayChart
                  currentRewardApr={pool.apyReward || 0}
                  priorRewardApr={pool.apyMean30d ? Math.max(0, pool.apyMean30d - (pool.apyBase || 0)) : null}
                />
              )}

              {/* Yield Waterfall */}
              <YieldWaterfall
                capital={500}
                feeApr={feeApr}
                rewardApr={rewardApr}
                ilPercent={Math.abs(Number(((() => {
                  const price = tech.price || 0
                  const low = dynamicRange?.low || price * 0.9
                  const high = dynamicRange?.high || price * 1.1
                  const rWidth = (high - low) / price
                  const vol = volatility / 100
                  const rf = 1 / (rWidth + 0.01)
                  return -(Math.pow(vol, 2) / 8) * rf
                })()).toFixed(2)))}
                days={30}
                gasCostPerRebalance={0.1}
                rebalances={(() => {
                  if (!dynamicRange) return 2
                  const expectedDaysInRange = (dynamicRange.high - dynamicRange.low) / (tech.atr || 1)
                  return Math.max(1, Math.round(30 / Math.max(1, expectedDaysInRange)))
                })()}
              />

              {/* Correlation Panel */}
              <CorrelationPanel volatility={volatility} />

              {/* Cross-Platform Comparison */}
              {pool && <CrossPlatformTable symbol={pool.symbol} />}

              {/* Warnings */}
              {suspiciousApr && (
                <div className="glass-card p-3 text-xs text-warn border-warn/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-mono text-[11px]">APR suspeito: alto demais para o volume disponível.</span>
                  </div>
                </div>
              )}

              {isPoolIdV4 && (
                <div className="glass-card p-3 text-xs text-warn border-warn/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-mono text-[11px]">Pool Uniswap v4 — dados técnicos limitados.</span>
                  </div>
                </div>
              )}

              {/* Technical Section */}
              {dynamicRange && (
                <SidePanelTechnicalSection
                  pool={{ address: pool.poolId, chain: pool.chain, rangeLow: dynamicRange.low, rangeHigh: dynamicRange.high, symbol: pool.symbol }}
                  injectedData={{ data: technical, loading: loadingTech, error: techError }}
                />
              )}

              {/* Range Visualizer & Rebalance */}
              {dynamicRange && tech.price > 0 && (
                <div className="space-y-3">
                  <RangeVisualizer tech={tech} mode={strategyMode} />
                  {rebalanceInfo && (
                    <div className={`glass-card p-3 text-xs ${
                      rebalanceInfo.urgency === 'high' ? 'border-bear/20 text-bear' :
                      rebalanceInfo.urgency === 'medium' ? 'border-warn/20 text-warn' :
                      'border-white/[0.04] text-zinc-400'
                    }`}>
                      <div className="flex items-center gap-1.5 font-semibold font-mono text-[11px] mb-1">
                        {rebalanceInfo.urgency === 'high' ? <TrendingDown className="w-3.5 h-3.5" /> :
                         rebalanceInfo.urgency === 'medium' ? <Minus className="w-3.5 h-3.5" /> :
                         <TrendingUp className="w-3.5 h-3.5" />}
                        Rebalance ({MODE_LABELS[strategyMode].label})
                      </div>
                      <div className="font-mono text-[10px] opacity-80">{rebalanceInfo.reason}</div>
                    </div>
                  )}
                </div>
              )}

              {/* Alerts */}
              {(() => {
                const pk = `${pool.symbol}-${pool.chain}-${pool.project}`
                return (
                  <AlertPanel
                    pool={pool}
                    poolKey={pk}
                    currentPrice={tech.price}
                    rangeLow={dynamicRange?.low}
                    rangeHigh={dynamicRange?.high}
                  />
                )
              })()}

              {tech.price > 0 && <PositionManager poolAddress={pool.poolId} symbol={pool.symbol} currentPrice={tech.price} apr={pool.apy} />}

              {(() => {
                const capital = 500, days = 7, apr = pool.apy, apyReward = pool.apyReward || 0
                const price = tech.price || 0, low = dynamicRange?.low || price * 0.9, high = dynamicRange?.high || price * 1.1
                const multiplier = price > 0 ? Math.min(1 / (1 - Math.sqrt(low / high)), 25) : 1
                const fees = capital * (apr / 100) * (days / 365) * multiplier
                const rewards = capital * (apyReward / 100) * (days / 365)
                const rWidth = (high - low) / price, vol = (tech.atrPct || 40) / 100, rf = 1 / (rWidth + 0.01)
                const il = -(capital * (Math.pow(vol, 2) / 8) * rf) * (days / 30)
                return <ILPanel fees={fees} il={il} rewards={rewards} capital={capital} isStable={category === 'STABLE'} />
              })()}

              {!isPoolIdV4 && (
                <BacktestPanel apr={pool.apy} volatility={tech?.atrPct || 40} low={dynamicRange?.low || 0}
                  high={dynamicRange?.high || 0} currentPrice={tech?.price || 0} candles={technical?.ohlcvResult?.candles} />
              )}

              <div className="text-[10px] font-mono text-zinc-600 leading-relaxed bg-black/30 border border-white/[0.04] rounded-xl p-3">
                Dados informativos. Ajuste conforme sua tolerância a risco. DYOR.
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass-card p-2.5">
      <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`font-mono text-xs font-bold mt-0.5 ${color}`}>{value || '—'}</div>
    </div>
  )
}

function ScoreMini({ label, earned, max, color }: { label: string; earned: number; max: number; color: string }) {
  const pct = max > 0 ? (earned / max) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-[9px] font-mono mb-1">
        <span className="text-zinc-500">{label}</span>
        <span className="font-bold" style={{ color }}>{earned}/{max}</span>
      </div>
      <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
