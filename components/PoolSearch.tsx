'use client'

import { useState } from 'react'
import { Search, Loader2, X, AlertCircle } from 'lucide-react'
import { useAppStore } from '@/hooks/useStore'
import { useLivePools } from '@/hooks/usePools'
import { POOL_DATA } from '@/lib/poolData'
import type { Pool, PoolCategory } from '@/types'
import { fetchPools } from '@/services/defillama'
import { calculatePoolScore } from '@/lib/poolScore'

function extractPoolIdentifier(input: string): string {
  const raw = input.trim()
  if (!raw.startsWith('http')) return raw.toLowerCase()
  try {
    const url = new URL(raw)
    const parts = url.pathname.split('/').filter(Boolean)
    if (url.hostname.includes('uniswap.org')) {
      const i = parts.indexOf('pools')
      if (i >= 0 && parts[i + 2]) return parts[i + 2].toLowerCase()
    }
    if (url.hostname.includes('aerodrome.finance')) {
      const i = parts.indexOf('liquidity')
      if (i >= 0 && parts[i + 1]) return parts[i + 1].toLowerCase()
    }
  } catch { /* ignore */ }
  return raw.toLowerCase()
}

function parseUniswapLink(input: string): { chain: string; poolId: string } | null {
  const raw = input.trim()
  if (!raw.startsWith('http')) return null
  try {
    const url = new URL(raw)
    if (!url.hostname.includes('uniswap.org')) return null
    const parts = url.pathname.split('/').filter(Boolean)
    const i = parts.indexOf('pools')
    const chain = parts[i + 1]
    const poolId = parts[i + 2]
    if (!chain || !/^0x[0-9a-fA-F]{64}$/.test(poolId || '')) return null
    return { chain: chain.toLowerCase(), poolId: poolId.toLowerCase() }
  } catch { return null }
}

async function resolveViaGecko(chain: string, poolId: string) {
  const networkMap: Record<string, string> = {
    ethereum: 'eth', base: 'base', arbitrum: 'arbitrum',
    polygon: 'polygon_pos', optimism: 'optimism', bsc: 'bsc',
  }
  const geckoNetwork = networkMap[chain] || chain
  try {
    const url = `https://api.geckoterminal.com/api/v2/networks/${geckoNetwork}/pools/${poolId}`
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const json = await res.json()
    const attr = json?.data?.attributes
    if (!attr) return null
    const symbol = attr?.name || (attr?.base_token_symbol && attr?.quote_token_symbol
      ? `${attr.base_token_symbol}-${attr.quote_token_symbol}` : 'TOKEN0-TOKEN1')
    return {
      symbol, project: 'uniswap-v4', chain: chain.charAt(0).toUpperCase() + chain.slice(1),
      apy: 0, apyBase: 0, apyReward: 0, tvlUsd: Number(attr?.reserve_in_usd || 0),
      volumeUsd1d: Number.isFinite(Number(attr?.volume_usd?.h24)) ? Number(attr?.volume_usd?.h24) : null,
      apyMean30d: null, pool: poolId,
    }
  } catch { return null }
}

export function PoolSearch() {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [insight, setInsight] = useState<string | null>(null)
  const { setSelectedPool } = useAppStore()
  const { data: livePools } = useLivePools()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setIsSearching(true); setError(null); setInsight(null)

    try {
      const normalizedQuery = extractPoolIdentifier(query)
      const dataSource = livePools || POOL_DATA
      let foundPool: Pool | null = null
      let foundCategory: PoolCategory | null = null

      for (const [cat, pools] of Object.entries(dataSource)) {
        const pool = pools.find(p =>
          p.poolId?.toLowerCase() === normalizedQuery || p.symbol.toLowerCase().includes(normalizedQuery))
        if (pool) { foundPool = pool; foundCategory = cat as PoolCategory; break }
      }

      if (foundPool) {
        const topPool = Object.values(dataSource).flat().slice(0, 1)[0]
        if (topPool) {
          const selectedScore = calculatePoolScore({ tvl: foundPool.tvl, volume24h: foundPool.vol1d || 0, apr: foundPool.apy, volatility: foundCategory === 'STABLE' ? 0.05 : 0.4, ilRisk: foundCategory === 'STABLE' ? 0.02 : 0.3, inRangeProbability: 0.75 })
          const topScore = calculatePoolScore({ tvl: topPool.tvl, volume24h: topPool.vol1d || 0, apr: topPool.apy, volatility: 0.4, ilRisk: 0.3, inRangeProbability: 0.75 })
          setInsight(selectedScore >= topScore
            ? `Pool MELHOR que a referência: score ${selectedScore.toFixed(0)} vs ${topScore.toFixed(0)}`
            : `Pool PIOR que a referência: score ${selectedScore.toFixed(0)} vs ${topScore.toFixed(0)}`)
        }
        setSelectedPool(foundPool, foundCategory)
        setQuery(''); setIsSearching(false); return
      }

      const rawPools = await fetchPools()
      const rawMatch = rawPools.find(p => p.pool.toLowerCase() === normalizedQuery)
      if (rawMatch) {
        const tempPool: Pool = { symbol: rawMatch.symbol, project: rawMatch.project, chain: rawMatch.chain, apy: rawMatch.apy, apyBase: rawMatch.apyBase || 0, apyReward: rawMatch.apyReward || 0, tvl: rawMatch.tvlUsd, vol1d: rawMatch.volumeUsd1d, apyMean30d: rawMatch.apyMean30d, category: 'ETH', poolId: rawMatch.pool }
        const refPool = Object.values(dataSource).flat().slice(0, 1)[0]
        if (refPool) {
          const s1 = calculatePoolScore({ tvl: tempPool.tvl, volume24h: tempPool.vol1d || 0, apr: tempPool.apy, volatility: 0.4, ilRisk: 0.3, inRangeProbability: 0.75 })
          const s2 = calculatePoolScore({ tvl: refPool.tvl, volume24h: refPool.vol1d || 0, apr: refPool.apy, volatility: 0.4, ilRisk: 0.3, inRangeProbability: 0.75 })
          setInsight(s1 >= s2 ? `Pool MELHOR que a referência: ${s1.toFixed(0)} vs ${s2.toFixed(0)}` : `Pool PIOR que a referência: ${s1.toFixed(0)} vs ${s2.toFixed(0)}`)
        }
        setSelectedPool(tempPool, 'ETH'); setQuery('')
      } else {
        const uni = parseUniswapLink(query)
        if (uni) {
          const resolved = await resolveViaGecko(uni.chain, uni.poolId)
          if (resolved) {
            setSelectedPool({ symbol: resolved.symbol, project: resolved.project, chain: resolved.chain, apy: resolved.apy || 0, apyBase: resolved.apyBase || 0, apyReward: resolved.apyReward || 0, tvl: resolved.tvlUsd || 0, vol1d: resolved.volumeUsd1d, apyMean30d: resolved.apyMean30d, category: 'ETH', poolId: resolved.pool } as Pool, 'ETH')
            setInsight('Pool resolvida via GeckoTerminal.')
            setQuery(''); setIsSearching(false); return
          }
          setError('Pool Uniswap v4 sem cobertura pública.')
          setInsight('Tente novamente mais tarde.')
          setIsSearching(false); return
        }
        setError('Pool não encontrada nas fontes disponíveis.')
      }
    } catch (err) {
      console.error(err); setError('Erro ao buscar pool.')
    } finally { setIsSearching(false) }
  }

  return (
    <div className="relative w-full">
      <form onSubmit={handleSearch} className="relative">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar pool por nome, endereço ou link..."
          className="w-full glass-input pl-10 pr-10 text-xs font-mono"
        />
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
        {query && (
          <button type="button" onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {isSearching && (
        <div className="absolute top-full mt-2 left-0 right-0 glass-panel p-3 shadow-glass z-50 flex items-center gap-2 text-[11px] font-mono text-zinc-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
          Identificando pool...
        </div>
      )}

      {error && (
        <div className="absolute top-full mt-2 left-0 right-0 glass-panel p-3 shadow-glass z-50 flex items-center gap-2 text-[11px] font-mono text-bear border-bear/20">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {insight && !error && (
        <div className="absolute top-full mt-2 left-0 right-0 glass-panel p-3 shadow-glass z-50 text-[11px] font-mono text-accent border-accent/20">
          {insight}
        </div>
      )}
    </div>
  )
}
