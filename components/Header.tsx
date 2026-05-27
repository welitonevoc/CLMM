import { useAppStore } from '@/hooks/useStore'
import { Activity, ChevronDown, Wifi, WifiOff, Loader2, BarChart3, Gauge } from 'lucide-react'
import type { StrategyMode } from '@/types'
import { PoolSearch } from './PoolSearch'
import Link from 'next/link'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const STRATEGY_OPTIONS: { value: StrategyMode; label: string; description: string; color: string }[] = [
  { value: 'conservative', label: 'Conservador', description: 'Range 3× ATR — mínimo rebalanceamento', color: '#10b981' },
  { value: 'balanced', label: 'Balanceado', description: 'Range 2× ATR — equilíbrio risco/retorno', color: '#3b82f6' },
  { value: 'aggressive', label: 'Agressivo', description: 'Range 1× ATR — máxima captura de fees', color: '#f59e0b' },
  { value: 'stable', label: 'Stable', description: 'Range 0.35× ATR — ideal para stables', color: '#8b5cf6' },
]

interface Props {
  isLive?: boolean
  isLoading?: boolean
  lastUpdated?: string | null
  onRefetch?: () => void
}

export function Header({ isLive, isLoading, lastUpdated, onRefetch }: Props) {
  const { topOnly, setTopOnly, strategyMode, setStrategyMode } = useAppStore()
  const currentStrategy = STRATEGY_OPTIONS.find(s => s.value === strategyMode)!

  return (
    <header className="mb-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 glow-accent">
            <Activity className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-r from-accent via-blue-300 to-violet-400 bg-clip-text text-transparent">
                CLMM Terminal
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-widest bg-accent/10 text-accent border border-accent/20">
                v1.0
              </span>
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-zinc-500">
              <span>Concentrated Liquidity Analytics</span>
              <span className="text-zinc-700">·</span>
              {isLoading ? (
                <span className="text-accent animate-pulse flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Sincronizando
                </span>
              ) : lastUpdated ? (
                <span className="text-zinc-500 font-mono text-[10px]">atualizado {lastUpdated}</span>
              ) : (
                <span className="text-zinc-600 font-mono text-[10px]">snapshot 16/05/2026</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/analyzer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 glass-panel hover:border-accent/30 transition-all"
          >
            <BarChart3 className="w-3.5 h-3.5 text-accent" />
            Analyzer
          </Link>

          <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />

          <button
            onClick={onRefetch}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all ${
              isLoading
                ? 'bg-accent/5 border-accent/20 text-accent'
                : isLive
                  ? 'bg-bull/5 border-bull/20 text-bull'
                  : 'bg-zinc-800/30 border-white/[0.06] text-zinc-500 hover:text-zinc-300'
            }`}
            title="Atualizar dados"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isLive ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isLoading ? 'Sincronizando' : isLive ? 'Live' : 'Offline'}</span>
          </button>
        </div>
      </div>

      <div className="glass-panel p-3">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-[280px]">
            <PoolSearch />
          </div>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="relative">
                <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
                <select
                  value={strategyMode}
                  onChange={(e) => setStrategyMode(e.target.value as StrategyMode)}
                  className="glass-select pl-9 pr-8 font-semibold text-xs"
                  style={{ color: currentStrategy.color, borderColor: currentStrategy.color + '33' }}
                >
                  {STRATEGY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
              </div>

              <div className="absolute top-full right-0 mt-2 z-50 hidden group-hover:block w-64 glass-panel p-4 shadow-glass">
                <div className="text-[10px] font-bold font-mono uppercase tracking-widest mb-3" style={{ color: currentStrategy.color }}>
                  {currentStrategy.label} Engine
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed mb-3">{currentStrategy.description}</p>
                <div className="space-y-1">
                  {STRATEGY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setStrategyMode(opt.value)}
                      className={`w-full text-left text-[11px] px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all ${
                        strategyMode === opt.value
                          ? 'bg-accent/10 border border-accent/20 font-semibold'
                          : 'hover:bg-white/[0.03] text-zinc-500 border border-transparent'
                      }`}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
                      <span style={{ color: strategyMode === opt.value ? opt.color : undefined }}>{opt.label}</span>
                      <span className="text-zinc-600 font-mono text-[9px] ml-auto">
                        {opt.value === 'conservative' ? '3×' : opt.value === 'balanced' ? '2×' : opt.value === 'aggressive' ? '1×' : '0.35×'} ATR
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="h-5 w-px bg-white/[0.06]" />

            <button
              onClick={() => setTopOnly(!topOnly)}
              className={`flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border transition-all ${
                topOnly
                  ? 'bg-accent/10 border-accent/30 text-accent'
                  : 'glass-select border-white/[0.06] text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {topOnly ? 'Top 10' : 'Todas'}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
