'use client'

import { useMemo, useState } from 'react'
import { Header } from '@/components/Header'
import { PoolTable } from '@/components/PoolTable'
import { SidePanel } from '@/components/SidePanel'
import { PoolCharts } from '@/components/PoolCharts'
import { PoolCompare } from '@/components/PoolCompare'
import { ExportButton } from '@/components/ExportButton'
import { LivePriceTicker } from '@/components/LivePriceTicker'
import { useLivePools } from '@/hooks/usePools'
import { POOL_DATA, CATEGORY_META } from '@/lib/poolData'
import { useAppStore } from '@/hooks/useStore'
import type { PoolCategory } from '@/types'
import { AIRecommendations } from '@/components/AIRecommendations'
import { RefreshCw, Wifi, WifiOff, TrendingUp, BarChart3, Layers, Star, Eye, Sparkles } from 'lucide-react'

const CATEGORIES: PoolCategory[] = ['ETH', 'BTC', 'SOL', 'STABLE']
const CATEGORY_ICONS: Record<PoolCategory, typeof TrendingUp> = { ETH: TrendingUp, BTC: TrendingUp, SOL: TrendingUp, STABLE: BarChart3 }

export default function HomePage() {
  const { data: livePools, isLoading, isError, error, refetch, dataUpdatedAt } = useLivePools()
  const { topOnly, setTopOnly, watchlist, comparePools } = useAppStore()
  const [protocolFilter, setProtocolFilter] = useState('all')
  const [chainFilter, setChainFilter] = useState('all')
  const [poolFilter, setPoolFilter] = useState('')
  const [minApr, setMinApr] = useState('')
  const [maxApr, setMaxApr] = useState('')
  const [strictMode, setStrictMode] = useState(true)
  const [showCharts, setShowCharts] = useState(false)
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false)

  const poolData = livePools ?? POOL_DATA
  const isLive = !!livePools
  const allPools = useMemo(() => Object.values(poolData).flat(), [poolData])
  const protocolOptions = useMemo(() => Array.from(new Set(allPools.map(p => p.project))).sort(), [allPools])
  const chainOptions = useMemo(() => Array.from(new Set(allPools.map(p => p.chain))).sort(), [allPools])

  const watchlistKeys = useMemo(() => new Set(watchlist), [watchlist])

  const filteredPoolData = useMemo(() => {
    const q = poolFilter.trim().toLowerCase()
    const minAprVal = minApr.trim() === '' ? null : Number(minApr)
    const maxAprVal = maxApr.trim() === '' ? null : Number(maxApr)
    const out = {} as typeof poolData
    for (const cat of CATEGORIES) {
      let filtered = (poolData[cat] ?? []).filter((p) => {
        if (protocolFilter !== 'all' && p.project !== protocolFilter) return false
        if (chainFilter !== 'all' && p.chain !== chainFilter) return false
        if (q && !p.symbol.toLowerCase().includes(q)) return false
        const apr = p.apy ?? 0
        if (minAprVal != null && Number.isFinite(minAprVal) && apr < minAprVal) return false
        if (maxAprVal != null && Number.isFinite(maxAprVal) && apr > maxAprVal) return false
        if (strictMode) {
          const apy = p.apy || 0, apy30 = p.apyMean30d || 0, vol = p.vol1d || 0, tvl = p.tvl || 0
          const volToTvl = tvl > 0 ? vol / tvl : 0
          if (apy > 800 || apy30 > 1200) return false
          if (apy > 250 && vol <= 0) return false
          if (volToTvl > 5) return false
        }
        if (showWatchlistOnly) {
          const key = `${p.symbol}-${p.chain}-${p.project}`
          if (!watchlistKeys.has(key)) return false
        }
        return true
      })
      out[cat] = filtered.sort((a, b) => (b.apy ?? 0) - (a.apy ?? 0))
    }
    return out
  }, [poolData, protocolFilter, chainFilter, poolFilter, minApr, maxApr, strictMode, showWatchlistOnly, watchlistKeys])

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null

  const totalPools = Object.values(filteredPoolData).flat().length
  const totalWatchlist = watchlist.length

  return (
    <main className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <Header isLive={isLive} isLoading={isLoading} lastUpdated={lastUpdated} onRefetch={refetch} />

        {/* Live Price Ticker */}
        <div className="glass-panel p-2.5 mb-4">
          <LivePriceTicker />
        </div>

        {/* Status Banners */}
        <div className="space-y-3 mb-5">
          {isError && (
            <div className="flex items-center gap-3 bg-bear/5 border border-bear/20 text-bear rounded-xl px-4 py-3 text-xs font-mono">
              <WifiOff className="w-4 h-4 shrink-0" />
              <strong>ERRO:</strong> Falha ao conectar com DefiLlama — exibindo dados estáticos.
              <button onClick={() => refetch()} className="ml-auto flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Retentar
              </button>
            </div>
          )}
          {isLoading && (
            <div className="flex items-center gap-3 bg-accent/5 border border-accent/20 text-accent rounded-xl px-4 py-3 text-xs font-mono">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              Buscando dados em tempo real da DefiLlama API...
            </div>
          )}
          {isLive && (
            <div className="flex items-center gap-3 bg-bull/5 border border-bull/20 text-bull rounded-xl px-4 py-3 text-xs font-mono">
              <Wifi className="w-4 h-4 shrink-0" />
              <strong>LIVE</strong> — DefiLlama API conectada.{lastUpdated && <> Última atualização: <span className="font-mono">{lastUpdated}</span></>}
              <button onClick={() => refetch()} className="ml-auto flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Atualizar
              </button>
            </div>
          )}
        </div>

        {/* Summary + Compare */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {CATEGORIES.map((cat) => {
            const pools = filteredPoolData[cat] ?? []
            const totalTvl = pools.reduce((s, p) => s + p.tvl, 0)
            const bestApr = pools[0]?.apy || 0
            const meta = CATEGORY_META[cat]
            const Icon = CATEGORY_ICONS[cat]

            return (
              <div key={cat} className="glass-panel p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider" style={{ color: meta.color }}>{cat}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">{pools.length} pools</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-[10px] text-zinc-500 mb-0.5 font-mono">Melhor APR</div>
                    <div className="font-mono text-lg font-bold" style={{ color: meta.color }}>
                      {bestApr.toFixed(1)}<span className="text-sm">%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-zinc-500 mb-0.5 font-mono">TVL</div>
                    <div className="font-mono text-xs font-semibold text-zinc-300">${(totalTvl / 1e6).toFixed(1)}M</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pool Compare */}
        <PoolCompare />

        {/* Filters */}
        <div className="glass-panel p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">Filtros</span>
              <span className="text-[10px] font-mono text-zinc-600">| {totalPools} pools</span>
            </div>
            <div className="flex items-center gap-2">
              {totalWatchlist > 0 && (
                <button
                  onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold border transition-all ${
                    showWatchlistOnly ? 'bg-accent/10 border-accent/30 text-accent' : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Star className={`w-3 h-3 ${showWatchlistOnly ? 'fill-accent' : ''}`} />
                  Favoritos ({totalWatchlist})
                </button>
              )}
              <button
                onClick={() => setShowCharts(!showCharts)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-semibold border transition-all ${
                  showCharts ? 'bg-accent/10 border-accent/30 text-accent' : 'border-white/[0.06] text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                Gráficos
              </button>
              <ExportButton pools={allPools} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
            <select value={protocolFilter} onChange={(e) => setProtocolFilter(e.target.value)} className="glass-select">
              <option value="all">Protocolo: Todos</option>
              {protocolOptions.map((p) => (<option key={p} value={p}>{p}</option>))}
            </select>
            <select value={chainFilter} onChange={(e) => setChainFilter(e.target.value)} className="glass-select">
              <option value="all">Rede: Todas</option>
              {chainOptions.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
            <input type="text" value={poolFilter} onChange={(e) => setPoolFilter(e.target.value)}
              placeholder="Pool (ex: USDC-CBBTC)" className="glass-input font-mono" />
            <input type="number" min={0} step={0.1} value={minApr} onChange={(e) => setMinApr(e.target.value)}
              placeholder="APR mín." className="glass-input font-mono" />
            <input type="number" min={0} step={0.1} value={maxApr} onChange={(e) => setMaxApr(e.target.value)}
              placeholder="APR máx." className="glass-input font-mono" />
            <button onClick={() => setStrictMode(v => !v)}
              className={`glass-select text-left font-mono font-semibold text-xs ${strictMode ? 'text-accent border-accent/30' : 'text-zinc-400'}`}>
              {strictMode ? 'Restrito ✓' : 'Completo'}
            </button>
          </div>
        </div>

        {/* Charts */}
        {showCharts && CATEGORIES.map((cat) => (
          <div key={`chart-${cat}`} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full" style={{ backgroundColor: CATEGORY_META[cat].color }} />
              <span className="text-[11px] font-mono font-semibold" style={{ color: CATEGORY_META[cat].color }}>{CATEGORY_META[cat].label}</span>
            </div>
            <PoolCharts pools={filteredPoolData[cat] ?? []} category={cat} />
          </div>
        ))}

        {/* AI Recommendations */}
        <div className="mb-4">
          <AIRecommendations />
        </div>

        {/* Pool Tables */}
        {CATEGORIES.map((cat) => (
          <PoolTable key={cat} category={cat} pools={filteredPoolData[cat] ?? []} />
        ))}

        <SidePanel />

        {/* Footer */}
        <footer className="text-center py-10 border-t border-white/[0.04] mt-12 text-[11px] text-zinc-600 leading-relaxed font-mono">
          Dados: <a href="https://defillama.com" target="_blank" rel="noopener noreferrer" className="text-accent/80 hover:text-accent transition-colors">DefiLlama</a>
          {' + '}
          <a href="https://www.binance.com" target="_blank" rel="noopener noreferrer" className="text-accent/80 hover:text-accent transition-colors">Binance</a>
          {' | '} {isLive ? <span className="text-bull/80">API ao vivo</span> : <span className="text-zinc-500">Snapshot</span>}
          <br />
          <span className="text-zinc-600">Este painel é informativo. Não constitui recomendação de investimento. DYOR.</span>
        </footer>
      </div>
    </main>
  )
}
