/**
 * ohlcvPipeline.ts
 * Pipeline de dados OHLCV com fallback em cascata.
 * Garante que análise técnica nunca use dados silenciosamente errados.
 *
 * Ordem de prioridade:
 * 1. GeckoTerminal (mais granular, pools específicas)
 * 2. DexScreener (fallback gratuito, sem auth)
 * 3. Subgraph Aerodrome/Uniswap on-chain (fonte primária, mais lento)
 * 4. null → UI marca indicadores como "indisponíveis" explicitamente
 */

export interface OHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
  timestamp: number // unix seconds
}

export type DataSource = 'geckoterminal' | 'dexscreener' | 'subgraph' | 'unavailable' | 'synthetic'

export interface OHLCVResult {
  candles: OHLCV[]
  source: DataSource
  network: string
  poolAddress: string
  fetchedAt: number
  warning?: string // presente quando fonte secundária ou dados incompletos
}

// ─── Cache em memória (TTL: 5 minutos para dados de mercado) ──────────────────
const CACHE = new Map<string, { data: OHLCVResult; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

function cacheKey(network: string, pool: string, timeframe: string) {
  return `${network}:${pool}:${timeframe}`
}

const GECKO_NETWORK_MAP: Record<string, string> = {
  base: 'base',
  ethereum: 'eth',
  arbitrum: 'arbitrum',
  polygon: 'polygon_pos',
  bsc: 'bsc',
  optimism: 'optimism',
  solana: 'solana',
  avalanche: 'avalanche',
}

/**
 * Resolve UUIDs to contract addresses via DexScreener search
 */
async function resolvePoolAddress(network: string, address: string, symbol?: string): Promise<string | null> {
  // UUID Regex (handles 4 or 5 groups)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-([0-9a-f]{4}-)?[0-9a-f]{12}$/i.test(address) || 
                 address.startsWith('0x') && address.length > 40 && address.includes('-');

  if (!isUuid) {
    return address // Not a UUID, return as is
  }

  try {
    const cleanAddr = address.startsWith('0x') ? address.slice(2) : address
    
    // 1. Try to search by the UUID first
    let url = `https://api.dexscreener.com/latest/dex/search?q=${cleanAddr}`
    let res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      let json = await res.json()
      let pair = json.pairs?.find((p: any) => 
        p.chainId.toLowerCase() === network.toLowerCase() || 
        p.chainLabel?.toLowerCase() === network.toLowerCase()
      )
      if (pair?.pairAddress) return pair.pairAddress
    }

    // 2. Fallback to search by symbol + network if UUID resolution failed
    if (symbol) {
      // Clean symbol (ETH-USDC -> ETH USDC)
      const cleanSymbol = symbol.replace(/[-/]/g, ' ')
      url = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(cleanSymbol)} ${encodeURIComponent(network)}`
      res = await fetch(url, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        let json = await res.json()
        const netLower = network.toLowerCase()
        
        // Find pair with matching chain and symbol
        let pair = json.pairs?.find((p: any) => {
          const pChain = p.chainId.toLowerCase()
          const pLabel = p.chainLabel?.toLowerCase() || ''
          const matchesChain = pChain === netLower || pLabel === netLower || 
                               (netLower === 'ethereum' && pChain === 'eth') ||
                               (netLower === 'eth' && pChain === 'ethereum')
          
          if (!matchesChain) return false
          
          const baseSym = p.baseToken?.symbol?.toLowerCase() || ''
          const quoteSym = p.quoteToken?.symbol?.toLowerCase() || ''
          const searchSyms = cleanSymbol.toLowerCase().split(' ')
          
          return searchSyms.every(s => baseSym.includes(s) || quoteSym.includes(s))
        })
        if (pair?.pairAddress) return pair.pairAddress
      }
    }
    
    return null
  } catch {
    return null
  }
}

// ─── 1. GeckoTerminal ─────────────────────────────────────────────────────────
async function fetchGeckoTerminal(
  network: string,
  pool: string,
  timeframe: 'hour' | 'day' = 'hour',
  limit = 168
): Promise<OHLCV[] | null> {
  try {
    const geckoNet = GECKO_NETWORK_MAP[network.toLowerCase()] ?? network.toLowerCase()
    const aggregate = timeframe === 'hour' ? '1' : '1'
    const url = `https://api.geckoterminal.com/api/v2/networks/${geckoNet}/pools/${pool}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd`

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const json = await res.json()
    const raw: [number, string, string, string, string, string][] =
      json?.data?.attributes?.ohlcv_list ?? []

    if (raw.length < 2) return null

    return raw
      .map(([ts, o, h, l, c, v]) => ({
        timestamp: ts,
        open: parseFloat(o),
        high: parseFloat(h),
        low: parseFloat(l),
        close: parseFloat(c),
        volume: parseFloat(v),
      }))
      .filter((c) => !isNaN(c.close) && c.close > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  } catch {
    return null
  }
}

// ─── 2. DexScreener (fallback) ────────────────────────────────────────────────
async function fetchDexScreener(
  network: string,
  pool: string
): Promise<OHLCV[] | null> {
  try {
    // DexScreener usa chainId diferente — mapeamento necessário
    const chainMap: Record<string, string> = {
      base: 'base',
      ethereum: 'ethereum',
      arbitrum: 'arbitrum',
      polygon: 'polygon',
      solana: 'solana',
    }
    const chain = chainMap[network.toLowerCase()] ?? network

    const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pool}`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const json = await res.json()
    const pair = json?.pair

    if (!pair) return null

    // DexScreener não retorna candles históricos completos via API pública.
    // Mas retorna price24h, priceChange, volume — usamos para construir
    // um "pseudo-candle" do dia atual como ponto de ancoragem.
    // Isso é insuficiente para RSI/MACD mas útil para preço atual.
    const currentPrice = parseFloat(pair.priceUsd ?? '0')
    const priceChange24h = parseFloat(pair.priceChange?.h24 ?? '0')
    const open24h = currentPrice / (1 + priceChange24h / 100)
    const vol24h = parseFloat(pair.volume?.h24 ?? '0')

    if (currentPrice === 0) return null

    // Retorna apenas 1 candle — insuficiente para indicadores.
    // Sinalizado via warning na OHLCVResult.
    return [
      {
        timestamp: Math.floor(Date.now() / 1000),
        open: open24h,
        high: Math.max(open24h, currentPrice) * 1.002,
        low: Math.min(open24h, currentPrice) * 0.998,
        close: currentPrice,
        volume: vol24h,
      },
    ]
  } catch {
    return null
  }
}

// ─── 3. Subgraph Aerodrome (Base) via API pública ─────────────────────────────
const AERODROME_SUBGRAPH =
  'https://api.studio.thegraph.com/query/44952/aerodrome-slipstream/version/latest'

async function fetchAerodromeSubgraph(
  pool: string,
  days = 30
): Promise<OHLCV[] | null> {
  try {
    const since = Math.floor(Date.now() / 1000) - days * 86400

    const query = `{
      poolDayDatas(
        where: { pool: "${pool.toLowerCase()}", date_gte: ${Math.floor(since / 86400) * 86400} }
        orderBy: date
        orderDirection: asc
        first: ${days}
      ) {
        date
        open
        high
        low
        close
        volumeUSD
      }
    }`

    const res = await fetch(AERODROME_SUBGRAPH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) return null

    const json = await res.json()
    const data: { date: number; open: string; high: string; low: string; close: string; volumeUSD: string }[] =
      json?.data?.poolDayDatas ?? []

    if (data.length < 2) return null

    return data
      .map((d) => ({
        timestamp: d.date,
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close),
        volume: parseFloat(d.volumeUSD),
      }))
      .filter((c) => !isNaN(c.close) && c.close > 0)
  } catch {
    return null
  }
}

// Tenta subgraph Uniswap v3 como fallback extra para pools na Base
const UNISWAP_BASE_SUBGRAPH =
  'https://api.thegraph.com/subgraphs/name/messari/uniswap-v3-base'

async function fetchUniswapSubgraph(
  pool: string,
  days = 30
): Promise<OHLCV[] | null> {
  try {
    const since = Math.floor(Date.now() / 1000) - days * 86400

    const query = `{
      poolDayDatas(
        where: { pool: "${pool.toLowerCase()}", date_gte: ${Math.floor(since / 86400)} }
        orderBy: date
        orderDirection: asc
        first: ${days}
      ) {
        date
        open
        high
        low
        close
        volumeUSD
      }
    }`

    const res = await fetch(UNISWAP_BASE_SUBGRAPH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) return null
    const json = await res.json()
    const data = json?.data?.poolDayDatas ?? []
    if (data.length < 2) return null

    return data
      .map((d: { date: number; open: string; high: string; low: string; close: string; volumeUSD: string }) => ({
        timestamp: d.date * 86400,
        open: parseFloat(d.open),
        high: parseFloat(d.high),
        low: parseFloat(d.low),
        close: parseFloat(d.close),
        volume: parseFloat(d.volumeUSD),
      }))
      .filter((c: OHLCV) => !isNaN(c.close) && c.close > 0)
  } catch {
    return null
  }
}

// ─── Pipeline principal ───────────────────────────────────────────────────────

export async function fetchOHLCV(
  network: string,
  pool: string,
  timeframe: 'hour' | 'day' = 'hour',
  limit = 168,
  forceRefresh = false,
  symbol?: string
): Promise<OHLCVResult> {
  const key = cacheKey(network, pool, timeframe)
  const cached = CACHE.get(key)

  if (!forceRefresh && cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data
  }

  // Resolve address if it's a UUID
  const realAddress = await resolvePoolAddress(network, pool, symbol)
  if (!realAddress) {
    return {
      candles: [],
      source: 'unavailable',
      network,
      poolAddress: pool,
      fetchedAt: Date.now(),
      warning: 'Não foi possível resolver o endereço do contrato para este pool.',
    }
  }

  // ── Tentativa 1: GeckoTerminal ──────────────────────────────────────────────
  const gecko = await fetchGeckoTerminal(network, realAddress, timeframe, limit)
  if (gecko && gecko.length >= 14) {
    const result: OHLCVResult = {
      candles: gecko,
      source: 'geckoterminal',
      network,
      poolAddress: pool,
      fetchedAt: Date.now(),
    }
    CACHE.set(key, { data: result, ts: Date.now() })
    return result
  }

  // ── Tentativa 2: DexScreener (sem CORS) ─────────────────────────────────────
  const dexData = await fetchDexScreener(network, realAddress)
  if (dexData && dexData.length >= 14) {
    const result: OHLCVResult = {
      candles: dexData,
      source: 'dexscreener',
      network,
      poolAddress: pool,
      fetchedAt: Date.now(),
    }
    CACHE.set(key, { data: result, ts: Date.now() })
    return result
  }

  // NOTA: Subgraphs foram removidos pois bloqueiam CORS no browser
  // Os dados vem apenas de GeckoTerminal e DexScreener (sem CORS)

  // ── Tentativa 4: DexScreener (dados mínimos — apenas preço atual) ─────────────
  const dex = await fetchDexScreener(network, realAddress)
  if (dex && dex.length > 0) {
    const result: OHLCVResult = {
      candles: dex,
      source: 'dexscreener',
      network,
      poolAddress: pool,
      fetchedAt: Date.now(),
      warning:
        'Dados insuficientes para indicadores técnicos. Apenas preço atual disponível. RSI/MACD/BB indisponíveis.',
    }
    CACHE.set(key, { data: result, ts: Date.now() })
    return result
  }

  // ── Falha total ──────────────────────────────────────────────────────────────
  return {
    candles: [],
    source: 'unavailable',
    network,
    poolAddress: pool,
    fetchedAt: Date.now(),
    warning: 'Nenhuma fonte de dados disponível. Verifique conexão ou tente novamente.',
  }
}

/**
 * Generate synthetic OHLCV candles from a base price and estimated volatility.
 * Used as final fallback when no real data source is available.
 */
export function generateSyntheticOHLCV(
  price: number,
  volatilityPct: number,
  count = 168
): OHLCV[] {
  const now = Math.floor(Date.now() / 1000)
  const interval = 3600 // 1h
  const candles: OHLCV[] = []
  let currentPrice = price

  for (let i = 0; i < count; i++) {
    const drift = (Math.random() - 0.5) * 0.002
    const shock = (Math.random() - 0.5) * 2 * (volatilityPct / 100)
    const change = currentPrice * (drift + shock)
    const open = currentPrice
    const close = currentPrice + change
    const high = Math.max(open, close) * (1 + Math.random() * (volatilityPct / 200))
    const low = Math.min(open, close) * (1 - Math.random() * (volatilityPct / 200))
    const volume = currentPrice * (10000 + Math.random() * 90000)

    candles.push({
      timestamp: now - (count - i) * interval,
      open,
      high,
      low,
      close,
      volume,
    })

    currentPrice = close > 0 ? close : currentPrice
  }

  return candles
}

/**
 * Valida se o resultado tem dados suficientes para cada tipo de indicador.
 * Usado pelo SidePanel para decidir o que exibir vs. o que marcar como indisponível.
 */
export function getDataSufficiency(result: OHLCVResult) {
  const n = result.candles.length
  return {
    hasData: n > 0,
    rsi: n >= 15,          // precisa de period+1 (14+1)
    macd: n >= 35,         // slow(26) + signal(9)
    bollingerBands: n >= 20,
    atr: n >= 14,
    atrHighConfidence: n >= 15,
    clmmMetrics: n >= 14,
    divergence: n >= 40,
    source: result.source,
    warning: result.warning,
  }
}
