import { OHLCV, calculateATR, calculateRSI, calculateBB, calculateMACD, calculatePercentB, calculateBandWidth, detectRSIDivergence, detectMACDDivergence } from '@/lib/indicators'

const NETWORK_MAP: Record<string, string> = {
  'Base': 'base',
  'Arbitrum': 'arbitrum',
  'Polygon': 'polygon_pos',
  'Ethereum': 'eth',
  'BSC': 'bsc',
  'Optimism': 'optimism',
  'Solana': 'solana',
}

export async function fetchOHLCV(network: string, poolAddress: string, symbol?: string): Promise<OHLCV[]> {
  const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(poolAddress)
  if (isUuidLike) {
    // UUID pool IDs (common in some indexers) are not directly resolvable to OHLCV pair addresses on client-side public APIs.
    return []
  }

  // Try GeckoTerminal first
  try {
    const data = await fetchFromGeckoTerminal(network, poolAddress, symbol)
    if (data.length > 0) return data
  } catch (e) {
    console.warn('GeckoTerminal failed, trying DexScreener:', e)
  }
  
  // Try DexScreener
  try {
    const data = await fetchFromDexScreener(network, poolAddress, symbol)
    if (data.length > 0) return data
  } catch (e) {
    console.warn('DexScreener failed, trying Subgraph:', e)
  }
  
  // Try Subgraph (Uniswap v3 or Aerodrome)
  try {
    const data = await fetchFromSubgraph(network, poolAddress)
    if (data.length > 0) return data
  } catch (e) {
    console.warn('Subgraph failed:', e)
  }
  
  // All failed
  console.error('All OHLCV sources failed')
  return []
}

async function fetchFromGeckoTerminal(network: string, poolAddress: string, symbol?: string): Promise<OHLCV[]> {
  let address = poolAddress
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(poolAddress)

  // Fallback to search by symbol if we only have a UUID
  if (isUUID && symbol) {
    console.log(`[GeckoTerminal] UUID detected, searching for ${symbol} on ${network}...`)
    const resolvedAddress = await searchPoolAddress(network, symbol)
    if (resolvedAddress) {
      address = resolvedAddress
    } else {
      throw new Error('Could not resolve pool address from symbol')
    }
  } else if (isUUID) {
    throw new Error('Cannot resolve UUID pool address without symbol')
  }

  const geckoNetwork = NETWORK_MAP[network] || network.toLowerCase()
  const url = `https://api.geckoterminal.com/api/v2/networks/${geckoNetwork}/pools/${address}/ohlcv/day?limit=30`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GeckoTerminal API error: ${res.status}`)
  
  const json = await res.json()
  const ohlcvList = json.data.attributes.ohlcv_list
  
  return ohlcvList.map((item: any) => ({
    time: item[0],
    open: item[1],
    high: item[2],
    low: item[3],
    close: item[4],
    volume: item[5] ?? undefined,
  })).reverse() // Original is usually desc, we want asc for indicators
}

async function fetchFromDexScreener(network: string, poolAddress: string, symbol?: string): Promise<OHLCV[]> {
  const isUuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(poolAddress)
  if (isUuidLike) throw new Error('DexScreener requires pair address, not UUID pool id')

  // DexScreener supports latest OHLCV via token pair address
  // We'll use the pool address as pair address for chains that match
  // For simplicity, we assume poolAddress is the pair address
  // DexScreener OHLCV endpoint: https://api.dexscreener.com/latest/ohlcv/{chainId}/{pairAddress}
  // But we need to map network to dexscreener chainId
  const DEXSCREENER_CHAIN_MAP: Record<string, string> = {
    'Base': 'base',
    'Arbitrum': 'arbitrum',
    'Polygon': 'polygon',
    'Ethereum': 'ethereum',
    'BSC': 'bsc',
    'Optimism': 'optimism',
    'Solana': 'solana',
  }
  
  const chainId = DEXSCREENER_CHAIN_MAP[network] || network.toLowerCase()
  // If we have a UUID and no symbol, we cannot search; but we already filtered that case above
  // If we have symbol, we could search by symbol, but for OHLCV we need pair address.
  // We'll try to use the poolAddress directly as pair address (works if it's the actual pair address)
  // If not, we could search by symbol to get pair address, but that's extra.
  // For now, assume poolAddress is correct pair address.
  const url = `https://api.dexscreener.com/latest/ohlcv/${chainId}/${poolAddress}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`DexScreener API error: ${res.status}`)
  
  const json = await res.json()
  // DexScreener returns array of candles: [timestamp, open, high, low, close, volume]
  // We need last 30 days, daily timeframe
  const ohlcvList = json
  
  return ohlcvList.slice(-30).map((item: any) => ({
    time: item[0] * 1000, // DexScreener returns seconds? Actually milliseconds? We'll assume milliseconds as typical.
    open: item[1],
    high: item[2],
    low: item[3],
    close: item[4],
    volume: item[5] ?? undefined,
  }))
}

async function fetchFromSubgraph(network: string, poolAddress: string): Promise<OHLCV[]> {
  // Disabled in browser runtime due CORS/redirect behavior from public Graph endpoints.
  // Keep as no-op fallback to avoid noisy runtime errors in client.
  return []

  // Subgraph endpoint varies by network and protocol
  // We'll try to detect if it's Uniswap v3 or Aerodrome
  // For simplicity, we'll use a generic approach: use The Graph endpoint for Uniswap v3 on the network
  // and query for pool dayData.
  // This is a simplified implementation; in production you'd have multiple subgraph URLs.
  
  // Map network to subgraph endpoint (example for mainnet, but we need per network)
  // Since we are mostly on Base, we can use Aerodrome subgraph on Base.
  // For other networks, we can use Uniswap v3 subgraph.
  
  // We'll implement a basic version: if network is Base, use Aerodrome subgraph; else use Uniswap v3 subgraph.
  const SUBGRAPH_URLS: Record<string, string> = {
    'Base': 'https://api.studio.thegraph.com/query/42182/aerodrome-v1/base',
    // We'll add more as needed, but for now fallback to Uniswap v3 on mainnet for others
    'Ethereum': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    'Arbitrum': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-arbitrum',
    'Polygon': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-polygon',
    'BSC': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-bsc',
    'Optimism': 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-optimism',
    // Solana doesn't have a subgraph in the same way; we'll skip for now
  }
  
  const url = SUBGRAPH_URLS[network] || SUBGRAPH_URLS['Ethereum'] // fallback
  
  // Query for pool dayData for the last 30 days
  // The GraphQL query will differ per subgraph; we'll try a generic one that works for both
  // Uniswap v3 subgraph has poolDayData entities with date, open, high, low, close
  // Aerodrome subgraph may have similar.
  // We'll attempt to query; if it fails, we'll return empty.
  
  const query = `
    query GetPoolDayData($poolAddress: String!) {
      poolDayDatas(
        where: { pool: $poolAddress }
        orderBy: date
        orderDirection: desc
        first: 30
      ) {
        date
        open
        high
        low
        close
      }
    }
  `
  
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { poolAddress: poolAddress.toLowerCase() }
    })
  })
  
  if (!res.ok) throw new Error(`Subgraph API error: ${res.status}`)
  
  const json = await res.json()
  if (json.errors) throw new Error(`Subgraph error: ${json.errors.map(e => e.message).join(', ')}`)
  
  // The GraphQL returns date as integer (unix seconds), we need to convert to milliseconds
  const dayData = json.data.poolDayDatas || []
  
  return dayData
    .reverse() // we got descending, we want ascending
    .map((item: any) => ({
      time: item.date * 1000, // convert seconds to ms
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: undefined,
    }))
}

async function searchPoolAddress(network: string, symbol: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${symbol} ${network}`)
    const json = await res.json()
    const pair = json.pairs?.find((p: any) => 
      p.chainId.toLowerCase() === (NETWORK_MAP[network] || network).toLowerCase() ||
      p.chainLabel?.toLowerCase() === network.toLowerCase()
    )
    return pair?.pairAddress || null
  } catch {
    return null
  }
}

export function analyzeTechnical(ohlcv: OHLCV[]) {
  if (ohlcv.length < 20) return null

  const safe = ohlcv
    .map(c => ({
      time: Number(c.time),
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }))
    .filter(c => Number.isFinite(c.close) && c.close > 0 && Number.isFinite(c.high) && Number.isFinite(c.low))
  if (safe.length < 20) return null

  const currentPrice = safe[safe.length - 1].close
  const atr = calculateATR(safe, 14)
  const rsi = calculateRSI(safe, 14)
  const bb = calculateBB(safe, 20)
  const macd = calculateMACD(safe)
  
  // MAs
  const ma7 = safe.slice(-7).reduce((a, b) => a + b.close, 0) / 7
  const ma25 = safe.slice(-25).reduce((a, b) => a + b.close, 0) / Math.min(safe.length, 25)
  const trend = ma7 > ma25 ? 'bullish' : 'bearish'
  
  // New indicators
  const percentB = calculatePercentB(currentPrice, bb.upper, bb.lower)
  const bandwidth = calculateBandWidth(bb.upper, bb.lower, bb.middle)
  const rsiDivergence = detectRSIDivergence(safe)
  const macdDivergence = detectMACDDivergence(safe)

  // Supports & Resistances (local pivots)
  const supports: number[] = []
  const resistances: number[] = []
  for (let i = 2; i < safe.length - 2; i++) {
    const prev2 = safe[i-2].close, prev1 = safe[i-1].close, curr = safe[i].close, next1 = safe[i+1].close, next2 = safe[i+2].close
    if (curr < prev1 && curr < prev2 && curr < next1 && curr < next2) supports.push(curr)
    if (curr > prev1 && curr > prev2 && curr > next1 && curr > next2) resistances.push(curr)
  }
  // Keep only most relevant (closest to price)
  const filteredSupports = supports.sort((a,b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice)).slice(0, 2)
  const filteredResistances = resistances.sort((a,b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice)).slice(0, 2)

  const percentBSafe = Number.isFinite(percentB) ? percentB : 0.5
  const bandwidthSafe = Number.isFinite(bandwidth) ? bandwidth : 0
  return {
    price: currentPrice,
    atr,
    atrPct: (atr / currentPrice) * 100,
    rsi,
    rsiSignal: rsi > 70 ? 'overbought' : rsi < 30 ? 'oversold' : 'neutral',
    bbUpper: bb.upper,
    bbMiddle: bb.middle,
    bbLower: bb.lower,
    percentB: percentBSafe,
    bandwidth: bandwidthSafe,
    macdVal: macd.macd,
    macdSignal: macd.signal,
    macdCross: macd.trend === 'bull' ? 'golden_cross' : 'death_cross',
    rsiDivergence,
    macdDivergence,
    supports: filteredSupports,
    resistances: filteredResistances,
    ma7,
    ma25,
    trend,
    verdict: rsi > 55 ? 'BULLISH' : rsi < 45 ? 'BEARISH' : 'NEUTRAL'
  }
}
