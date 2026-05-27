import { createPublicClient, http, fallback, parseAbi, formatUnits, isAddress, type Address } from 'viem'
import { base } from 'viem/chains'

// ─── Subgraph endpoints ───────────────────────────────────────────────────────────
const AERODROME_SUBGRAPH = 'https://api.studio.thegraph.com/query/75530/aerodrome-v3/version/latest'

interface SubgraphPosition {
  id: string
  liquidity: string
  depositedToken0: string
  depositedToken1: string
  depositedToken0USD: string
  depositedToken1USD: string
  stakedToken0: string
  stakedToken1: string
  stakedToken0USD: string
  stakedToken1USD: string
  unclaimedFee0: string
  unclaimedFee1: string
  pool: { id: string }
  gauge: { id: string } | null
}

interface SubgraphUser {
  id: string
  positions: SubgraphPosition[]
}

// Fetch from Aerodrome subgraph
async function fetchUserPositionsFromSubgraph(userAddress: string): Promise<SubgraphUser | null> {
  const query = `
    query GetUserPositions($user: String!) {
      user(id: $user) {
        id
        positions(first: 50) {
          id
          liquidity
          depositedToken0
          depositedToken1
          depositedToken0USD
          depositedToken1USD
          stakedToken0
          stakedToken1
          stakedToken0USD
          stakedToken1USD
          unclaimedFee0
          unclaimedFee1
          pool { id }
          gauge { id }
        }
      }
    }
  `
  
  try {
    const response = await fetch(AERODROME_SUBGRAPH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { user: userAddress.toLowerCase() }
      })
    })
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const data = await response.json()
    return data.data?.user || null
  } catch (e) {
    console.warn('Subgraph fetch failed:', e)
    return null
  }
}

// ─── DRPC API Key ───────────────────────────────────────────────────────────
const DRPC_API_KEY = 'AligtlpObkivpssVHD1co2nTYP9QUXER8a04tiKh6MJI'

// ─── RPC Fallback com fallback nativo do viem ────────────────────────────────
const baseTransport = fallback([
  http('https://base-rpc.publicnode.com', { timeout: 20_000 }),
  http('https://mainnet.base.org', { timeout: 20_000 }),
  http('https://base.llamarpc.com', { timeout: 20_000 }),
  http('https://base.blockpi.network/v1/rpc/public', { timeout: 20_000 }),
  http(`https://base.drpc.org?api_key=${DRPC_API_KEY}`, { timeout: 20_000 }),
])

const client = createPublicClient({
  chain: base,
  transport: baseTransport,
})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const opTimeout = <T>(p: Promise<T>, ms: number) =>
  Promise.race<T>([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`op_timeout_${ms}`)), ms)),
  ])

// Helper que usa o fallback transport nativo do viem
async function withRetry<T>(fn: (c: typeof client) => Promise<T>): Promise<T> {
  try {
    return await opTimeout(fn(client), 15000)
  } catch (e: any) {
    const msg = String(e?.message || e || '')
    if (msg.includes('429') || msg.toLowerCase().includes('rate limit')) {
      throw new Error('RPC da Base em rate limit (429). Tente novamente em alguns segundos.')
    }
    if (msg.includes('op_timeout_')) {
      throw new Error('Timeout na leitura RPC. Verifique sua conexão e tente novamente.')
    }
    throw e
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout ao consultar ${label} (${ms}ms)`)), ms)
  })
  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// ─── ABIs ───────────────────────────────────────────────────────────────────
const CL_POOL_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)',
  'function tickSpacing() view returns (int24)',
])

const V2_POOL_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function totalSupply() view returns (uint256)',
])

// CL gauge (takes token address as arg)
const CL_GAUGE_ABI = parseAbi([
  'function rewardToken() view returns (address)',
  'function rewardRate() view returns (uint256)',
  'function rewardRate(address token) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function periodFinish() view returns (uint256)',
  'function periodFinish(address token) view returns (uint256)',
])

// V2 / basic gauge (no args)
const V2_GAUGE_ABI = parseAbi([
  'function rewardToken() view returns (address)',
  'function rewardRate() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function periodFinish() view returns (uint256)',
])

// Aerodrome V3 CL Gauge ABI - mais completa
const AERODROME_V3_GAUGE_ABI = parseAbi([
  'function rewardToken() view returns (address)',
  'function rewardRate() view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function periodFinish() view returns (uint256)',
  'function earned(uint256 tokenId) view returns (uint256)',
  'function earned(address user, address token) view returns (uint256)',
  'function deposited(uint256 tokenId) view returns (bool)',
  'function stakedContains(address depositor, uint256 tokenId) view returns (bool)',
  'function claimable0(address user) view returns (uint256)',
  'function claimable1(address user) view returns (uint256)',
  'function gaugeRewards(address user) view returns (uint256)',
  'function stakingToken() view returns (address)',
  'function deposit(uint256 tokenId)',
  'function withdraw(uint256 tokenId)',
  'function rewardRate(address token) view returns (uint256)',
  'function left(address token) view returns (uint256)',
  'function tokenIds(address user, uint256 index) view returns (uint256)',
  // Novas funções para buscar tokenIds staked diretamente do gauge
  'function stakedBalance(address user) view returns (uint256)',
  'function stakedTokenIds(address user, uint256 index) view returns (uint256)',
])

const ERC20_ABI = parseAbi([
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function name() view returns (string)',
])

const VOTER_ABI = parseAbi([
  'function gauges(address pool) view returns (address)',
])

const VOTER_ADDRESS = '0x16613524e02ad97eDfeF371bC883F2F5d6C480A5' as Address

// ─── User Position ABIs ────────────────────────────────────────────────────────
const CL_GAUGE_ABI_EXTENDED = parseAbi([
  'function rewardToken() view returns (address)',
  'function rewardRate() view returns (uint256)',
  'function rewardRate(address token) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function periodFinish() view returns (uint256)',
  'function periodFinish(address token) view returns (uint256)',
  'function earned(address token, uint256 tokenId) view returns (uint256)',
  'function stakedValues(address account) view returns (uint256[])',
  'function deposits(address account) view returns (uint256)',
  'function tokenIds(address account, uint256 index) view returns (uint256)',
  'function fees0() view returns (uint256)',
  'function fees1() view returns (uint256)',
])

const POSITION_MANAGER_ABI = parseAbi([
  'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
])

const POOL_ABI_CLMM = parseAbi([
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)',
  'function token0() view returns (address)',
  'function token1() view returns (address)',
])

// Contract addresses
const POSITION_MANAGER_ADDRESS = '0x827922686190790b37229fd06084350e74485b72' as Address

// ─── Types ───────────────────────────────────────────────────────────────────
export type PoolType = 'clmm' | 'v2' | 'unknown'

export interface TokenInfo {
  address: string
  symbol: string
  decimals: number
  name: string
}

export interface GaugeInfo {
  rewardToken: TokenInfo
  rewardRatePerSecond: number   // in reward tokens/s
  totalStakedRaw: bigint
  periodFinish: number           // unix timestamp
  isActive: boolean
  annualRewardTokens: number    // raw reward tokens per year
}

export interface PoolOnChainData {
  address: string
  type: PoolType
  token0: TokenInfo
  token1: TokenInfo
  feeTier: number               // e.g. 500 = 0.05%
  currentTick?: number
  tickSpacing?: number
  liquidity?: bigint
}

export interface DefiLlamaMatch {
  pool: string
  project: string
  chain: string
  symbol: string
  tvlUsd: number
  apy: number
  apyBase: number
  apyReward: number
  apyMean30d: number
  vol1d: number | null
}
type UniswapLinkInput = { chain: string; poolId: string }

export interface PoolAnalysisResult {
  poolAddress: string
  gaugeAddress: string
  onChain: PoolOnChainData
  gauge: GaugeInfo
  defiLlama: DefiLlamaMatch | null
  // Calculated
  tvlUsd: number
  feeApr: number                // % from trading fees
  emissionApr: number           // % from gauge emissions
  totalApr: number              // %
  aeroPrice: number
  score: number                 // 0-100
  verdict: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
  verdictColor: string
  verdictEmoji: string
  reasons: string[]
  warnings: string[]
  alternatives: DefiLlamaMatch[]
  fetchedAt: number
  capitalEfficiency: number      // volume24h / tvlUsd
  rebalanceCostUsd: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const COMMON_TOKENS: Record<string, TokenInfo> = {
  '0x4200000000000000000000000000000000000006': { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18, name: 'Wrapped Ether' },
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6, name: 'USD Coin' },
  '0x940181a94A35A4569E4529A3CDfB74e38FD98631': { address: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', symbol: 'AERO', decimals: 18, name: 'Aerodrome' },
  '0x50c5716b70d655f0a747317665d1b956245995ee': { address: '0x50c5716b70d655f0a747317665d1b956245995ee', symbol: 'cbBTC', decimals: 8, name: 'Coinbase Wrapped BTC' },
}

async function getTokenInfo(address: Address): Promise<TokenInfo> {
  const checksummed = address.toLowerCase()
  for (const [addr, info] of Object.entries(COMMON_TOKENS)) {
    if (addr.toLowerCase() === checksummed) return info
  }

  return withRetry(async (c) => {
    try {
      const [symbol, decimals, name] = await Promise.all([
        c.readContract({ address, abi: ERC20_ABI, functionName: 'symbol' }),
        c.readContract({ address, abi: ERC20_ABI, functionName: 'decimals' }),
        c.readContract({ address, abi: ERC20_ABI, functionName: 'name' }),
      ])
      return { address, symbol, decimals, name }
    } catch {
      return { address, symbol: address.slice(0, 6) + '…', decimals: 18, name: 'Unknown' }
    }
  })
}

async function detectPoolType(address: Address): Promise<PoolType> {
  return withRetry(async (c) => {
    try {
      await c.readContract({ address, abi: CL_POOL_ABI, functionName: 'tickSpacing' })
      return 'clmm'
    } catch {
      try {
        await c.readContract({ address, abi: V2_POOL_ABI, functionName: 'getReserves' })
        return 'v2'
      } catch {
        return 'unknown'
      }
    }
  })
}

async function getAeroPrice(): Promise<number> {
  // AERO token on Base
  const AERO = '0x940181a94A35A4569E4529A3CDfB74e38FD98631'
  try {
    const res = await fetch(`https://coins.llama.fi/prices/current/base:${AERO}`)
    const json = await res.json()
    return json?.coins?.[`base:${AERO}`]?.price ?? 0
  } catch (e) {
    console.error('Error fetching AERO price:', e)
    return 0
  }
}

let cachedPools: any[] | null = null
let lastFetch = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 mins - dados atualizados a cada 5 min

async function fetchDefiLlamaPools(): Promise<any[]> {
  const now = Date.now()
  if (cachedPools && now - lastFetch < CACHE_TTL) {
    return cachedPools
  }

  try {
    console.log('[Server] Fetching fresh DefiLlama pools...')
    const res = await fetch('https://yields.llama.fi/pools', { cache: 'no-store' })
    const json = await res.json()
    cachedPools = json?.data ?? []
    lastFetch = now
    return cachedPools!
  } catch (e) {
    console.error('Error fetching DefiLlama pools:', e)
    return cachedPools ?? []
  }
}

function searchDefiLlama(pools: any[], poolAddress: string, t0Sym: string, t1Sym: string): DefiLlamaMatch | null {
  const lower = poolAddress.toLowerCase()
  const s0 = t0Sym.toUpperCase()
  const s1 = t1Sym.toUpperCase()
  
  // 1. Try to find by meta (pool address in poolMeta)
  let found = pools.find(
    (p) => p.poolMeta?.toLowerCase()?.includes(lower)
  )

  // 2. Try to find by symbols in any chain
  if (!found) {
    found = pools.find(
      (p) => 
        p.symbol.toUpperCase().includes(s0) && p.symbol.toUpperCase().includes(s1)
    )
  }
  
  if (found) {
    return {
      pool: found.pool,
      symbol: found.symbol,
      project: found.project,
      apy: found.apy ?? 0,
      apyBase: found.apyBase ?? 0,
      apyReward: found.apyReward ?? 0,
      apyMean30d: found.apyMean30d ?? 0,
      tvlUsd: found.tvlUsd ?? 0,
      chain: found.chain,
      vol1d: found.volumeUsd1d ?? null,
    }
  }
  return null
}

function parseUniswapPoolLink(input: string): UniswapLinkInput | null {
  try {
    if (!input.startsWith('http')) return null
    const url = new URL(input)
    if (!url.hostname.includes('uniswap.org')) return null
    const parts = url.pathname.split('/').filter(Boolean)
    const poolsIdx = parts.indexOf('pools')
    if (poolsIdx < 0) return null
    const chain = parts[poolsIdx + 1]
    const poolId = parts[poolsIdx + 2]
    if (!chain || !/^0x[0-9a-fA-F]{64}$/.test(poolId || '')) return null
    return { chain, poolId: poolId.toLowerCase() }
  } catch {
    return null
  }
}

function getAlternatives(
  pools: any[],
  t0Sym: string,
  t1Sym: string,
  currentApr: number
): DefiLlamaMatch[] {
  const s0 = t0Sym.toUpperCase()
  const s1 = t1Sym.toUpperCase()
  
  // Protocolos de DEX (excluir yield farms como yearn, aave, etc)
  const DEX_PROJECTS = ['aerodrome', 'aerodrome-slipstream', 'uniswap', 'sushiswap', 'curve']
  
  return pools
    .filter((p) => {
      if (p.chain !== 'Base') return false
      if (p.outlier) return false
      if (p.tvlUsd < 100_000) return false
      if (p.poolMeta === 'V1') return false // Excluir V1
      
      const sym = (p.symbol ?? '').toUpperCase()
      const hasMainToken = sym.includes(s0) || sym.includes(s1)
      
      // Priorizar pools DEX, mas incluir se APR for muito maior (>2x)
      const isDex = DEX_PROJECTS.some(proj => p.project?.toLowerCase().includes(proj))
      const isVeryHighApr = p.apy > currentApr * 2
      
      return hasMainToken && p.apy > currentApr && (isDex || isVeryHighApr)
    })
    .sort((a, b) => b.apy - a.apy)
    .slice(0, 5)
    .map((p) => ({
      pool: p.pool,
      project: p.project,
      chain: p.chain,
      symbol: p.symbol,
      tvlUsd: p.tvlUsd ?? 0,
      apy: p.apy ?? 0,
      apyBase: p.apyBase ?? 0,
      apyReward: p.apyReward ?? 0,
      apyMean30d: p.apyMean30d ?? 0,
      vol1d: p.volumeUsd1d ?? null,
    }))
}

function calcScore(
  totalApr: number,
  tvlUsd: number,
  isActive: boolean,
  feeApr: number,
  emissionApr: number,
  daysUntilFinish?: number
): number {
  if (totalApr === 0 && tvlUsd === 0) return 0 // Data missing

  let score = 0
  
  // Adjusted Emission APR based on time left (Penalize unsustainable yield)
  let adjustedEmissionApr = emissionApr
  if (daysUntilFinish !== undefined && isActive) {
    if (daysUntilFinish < 3) adjustedEmissionApr *= 0.2 // Heavy penalty
    else if (daysUntilFinish < 7) adjustedEmissionApr *= 0.5
    else if (daysUntilFinish < 14) adjustedEmissionApr *= 0.8
  } else if (!isActive) {
    adjustedEmissionApr = 0
  }

  const adjustedTotalApr = feeApr + adjustedEmissionApr

  // APR component (0-40 pts)
  score += Math.min(40, adjustedTotalApr * 1.5)
  // TVL component (0-25 pts)
  if (tvlUsd > 10_000_000) score += 25
  else if (tvlUsd > 2_000_000) score += 20
  else if (tvlUsd > 500_000) score += 13
  else if (tvlUsd > 100_000) score += 6
  // Gauge active (0-20 pts)
  score += isActive ? 20 : 0
  
  // Sustainability: fee APR vs emission APR (0-15 pts)
  // Higher weight if fees make up most of the APR
  if (feeApr > 0 && adjustedEmissionApr >= 0) {
    const ratio = feeApr / (feeApr + adjustedEmissionApr || 1)
    score += ratio * 15
  } else if (feeApr > 0) {
    score += 10
  }
  
  // Additional penalty if gauge is ending very soon
  if (daysUntilFinish !== undefined && daysUntilFinish < 3) score -= 15

  return Math.min(100, Math.max(0, Math.round(score)))
}

function getVerdict(score: number, hasData: boolean): {
  verdict: PoolAnalysisResult['verdict']
  color: string
  emoji: string
} {
  if (!hasData) return { verdict: 'FAIR', color: '#94a3b8', emoji: '⚪' }
  if (score >= 75) return { verdict: 'EXCELLENT', color: '#34d399', emoji: '🟢' }
  if (score >= 55) return { verdict: 'GOOD', color: '#3b9eff', emoji: '🔵' }
  if (score >= 35) return { verdict: 'FAIR', color: '#f59e0b', emoji: '🟡' }
  return { verdict: 'POOR', color: '#ef4444', emoji: '🔴' }
}

// ─── Main Analysis Function ───────────────────────────────────────────────────
export async function analyzePool(
  poolAddress: string,
  gaugeAddressInput?: string
): Promise<PoolAnalysisResult> {
  const rawPool = poolAddress.trim()
  const rawGauge = (gaugeAddressInput?.trim() || '')
  const uniswapLink = parseUniswapPoolLink(rawPool)

  if (uniswapLink) {
    const dlPools = await fetchDefiLlamaPools()
    const chainName = uniswapLink.chain === 'ethereum' ? 'Ethereum' : uniswapLink.chain[0].toUpperCase() + uniswapLink.chain.slice(1)
    const found = dlPools.find((p) =>
      String(p?.pool || '').toLowerCase() === uniswapLink.poolId &&
      String(p?.project || '').toLowerCase().includes('uniswap') &&
      String(p?.chain || '') === chainName
    )
    if (!found) throw new Error(`Pool Uniswap não encontrada no DefiLlama para ${chainName}.`)

    const tokens = String(found.symbol || 'TOKEN0-TOKEN1').split(/[-/]/)
    const t0 = tokens[0]?.trim() || 'TOKEN0'
    const t1 = tokens[1]?.trim() || 'TOKEN1'
    const tvlUsd = found.tvlUsd ?? 0
    const feeApr = found.apyBase ?? 0
    const emissionApr = found.apyReward ?? 0
    const totalApr = found.apy ?? (feeApr + emissionApr)
    const score = calcScore(totalApr, tvlUsd, false, feeApr, emissionApr, 0)
    const { verdict, color: verdictColor, emoji: verdictEmoji } = getVerdict(score, tvlUsd > 0)
    const alternatives = getAlternatives(dlPools, t0, t1, totalApr)

    return {
      poolAddress: uniswapLink.poolId,
      gaugeAddress: '',
      onChain: {
        address: uniswapLink.poolId,
        type: 'unknown',
        token0: { address: '0x0000000000000000000000000000000000000000', symbol: t0, decimals: 18, name: t0 },
        token1: { address: '0x0000000000000000000000000000000000000000', symbol: t1, decimals: 18, name: t1 },
        feeTier: 0,
        liquidity: '0',
      },
      gauge: {
        rewardToken: { address: '0x0000000000000000000000000000000000000000', symbol: 'N/A', decimals: 18, name: 'N/A' },
        rewardRatePerSecond: 0,
        totalStakedRaw: '0',
        periodFinish: 0,
        isActive: false,
        annualRewardTokens: 0,
      },
      defiLlama: {
        pool: found.pool,
        project: found.project,
        chain: found.chain,
        symbol: found.symbol,
        tvlUsd: found.tvlUsd ?? 0,
        apy: found.apy ?? 0,
        apyBase: found.apyBase ?? 0,
        apyReward: found.apyReward ?? 0,
        apyMean30d: found.apyMean30d ?? 0,
        vol1d: found.volumeUsd1d ?? null,
      },
      tvlUsd,
      feeApr,
      emissionApr,
      totalApr,
      aeroPrice: 0,
      score,
      verdict,
      verdictColor,
      verdictEmoji,
      reasons: feeApr > 0 ? [`Taxa de pool: ${feeApr.toFixed(2)}% APR em fees de trading`] : [],
      warnings: ['Análise Uniswap via DefiLlama (sem dados de gauge).'],
      alternatives,
      fetchedAt: Date.now(),
      capitalEfficiency: tvlUsd > 0 ? (found.volumeUsd1d ?? 0) / tvlUsd : 0,
      rebalanceCostUsd: 0,
    }
  }

  if (/^0x[0-9a-fA-F]{64}$/.test(rawPool)) {
    throw new Error('Pool ID da Uniswap detectado (32 bytes). Use o endereço da pool (0x + 40 hex).')
  }
  if (!isAddress(rawPool)) {
    throw new Error('Endereço da pool inválido. Use um endereço Ethereum (0x + 40 hex).')
  }
  if (rawGauge && !isAddress(rawGauge)) {
    throw new Error('Endereço do gauge inválido. Use um endereço Ethereum (0x + 40 hex).')
  }

  const poolAddr = rawPool.toLowerCase() as Address
  let gaugeAddr = (gaugeAddressInput?.trim() || '') as Address

  // 1. Detect pool type
  const poolType = await withTimeout(detectPoolType(poolAddr), 20000, 'tipo da pool')
  if (poolType === 'unknown') throw new Error('Pool não identificada na rede Base. Se for outra rede, use a busca/compare da página inicial.')

  // 2. Resolve Gauge automatically if not provided
  if (!gaugeAddr || gaugeAddr === '0x') {
    try {
      gaugeAddr = await withRetry(c => c.readContract({
        address: VOTER_ADDRESS,
        abi: VOTER_ABI,
        functionName: 'gauges',
        args: [poolAddr],
      }))
    } catch (e) {
      console.warn('Failed to auto-detect gauge', e)
    }
  }

  // 3. Fetch pool on-chain data
  let token0Addr: Address, token1Addr: Address
  let feeTier = 0
  let currentTick: number | undefined
  let tickSpacing: number | undefined
  let liquidity: bigint | undefined

  if (poolType === 'clmm') {
    const [t0, t1, fee, slot0, ts, liq] = await withTimeout(withRetry(c => Promise.all([
      c.readContract({ address: poolAddr, abi: CL_POOL_ABI, functionName: 'token0' }),
      c.readContract({ address: poolAddr, abi: CL_POOL_ABI, functionName: 'token1' }),
      c.readContract({ address: poolAddr, abi: CL_POOL_ABI, functionName: 'fee' }),
      c.readContract({ address: poolAddr, abi: CL_POOL_ABI, functionName: 'slot0' }),
      c.readContract({ address: poolAddr, abi: CL_POOL_ABI, functionName: 'tickSpacing' }),
      c.readContract({ address: poolAddr, abi: CL_POOL_ABI, functionName: 'liquidity' }),
    ])), 25000, 'dados on-chain da CLMM')
    token0Addr = t0
    token1Addr = t1
    feeTier = Number(fee)
    currentTick = slot0[1]
    tickSpacing = Number(ts)
    liquidity = liq
  } else {
    // V2 style
    const [t0, t1] = await withTimeout(withRetry(c => Promise.all([
      c.readContract({ address: poolAddr, abi: V2_POOL_ABI, functionName: 'token0' }),
      c.readContract({ address: poolAddr, abi: V2_POOL_ABI, functionName: 'token1' }),
    ])), 20000, 'dados on-chain da V2')
    token0Addr = t0
    token1Addr = t1
    feeTier = 3000 // default V2 = 0.3%
  }

  // 3. Fetch token info
  const [token0, token1] = await Promise.all([
    getTokenInfo(token0Addr),
    getTokenInfo(token1Addr),
  ])

  // 4. Fetch gauge data (try CL first, then V2)
  let rewardTokenAddr: Address
  let rewardRateRaw: bigint
  let totalStakedRaw: bigint
  let periodFinishRaw: bigint

  try {
    const code = await withRetry(c => c.getCode({ address: gaugeAddr }))
    if (!code || code === '0x' || code === '0x0') {
      console.warn(`[Gauge] Endereço ${gaugeAddr} não é um contrato. Ignorando.`)
      throw new Error('Gauge not deployed')
    }

    // Attempt to get reward rate and period finish
    rewardTokenAddr = await withRetry(c => c.readContract({
      address: gaugeAddr,
      abi: CL_GAUGE_ABI,
      functionName: 'rewardToken',
    }))

    rewardRateRaw = 0n
    totalStakedRaw = 0n
    periodFinishRaw = 0n

    // 1. Reward Rate
    try {
      rewardRateRaw = await withRetry(c => c.readContract({
        address: gaugeAddr,
        abi: CL_GAUGE_ABI,
        functionName: 'rewardRate',
        args: [rewardTokenAddr],
      }).catch(() => c.readContract({ address: gaugeAddr, abi: CL_GAUGE_ABI, functionName: 'rewardRate' })))
    } catch {
      try {
        rewardRateRaw = await withRetry(c => c.readContract({ address: gaugeAddr, abi: V2_GAUGE_ABI, functionName: 'rewardRate' }))
      } catch (e) { console.warn(`[Gauge] rewardRate falhou para ${gaugeAddr}`) }
    }

    // 2. Total Supply
    try {
      totalStakedRaw = await withRetry(c => c.readContract({ address: gaugeAddr, abi: CL_GAUGE_ABI, functionName: 'totalSupply' }))
    } catch {
      try {
        totalStakedRaw = await withRetry(c => c.readContract({ address: gaugeAddr, abi: V2_GAUGE_ABI, functionName: 'totalSupply' }))
      } catch (e) { console.warn(`[Gauge] totalSupply falhou (comportamento esperado em alguns CL Gauges).`) }
    }

    // 3. Period Finish
    try {
      periodFinishRaw = await withRetry(c => c.readContract({
        address: gaugeAddr,
        abi: CL_GAUGE_ABI,
        functionName: 'periodFinish',
        args: [rewardTokenAddr],
      }).catch(() => c.readContract({ address: gaugeAddr, abi: CL_GAUGE_ABI, functionName: 'periodFinish' })))
    } catch {
      try {
        periodFinishRaw = await withRetry(c => c.readContract({ address: gaugeAddr, abi: V2_GAUGE_ABI, functionName: 'periodFinish' }))
      } catch (e) { console.warn(`[Gauge] periodFinish falhou para ${gaugeAddr}`) }
    }
  } catch (e) {
    console.warn(`⚠️ Erro fatal no Gauge ${gaugeAddr}. Usando valores zerados.`, e)
    rewardTokenAddr = '0x940181a94A35A4569E4529A3CDfB74e38FD98631' as Address
    rewardRateRaw = 0n
    totalStakedRaw = 0n
    periodFinishRaw = 0n
  }

  const rewardTokenInfo = await getTokenInfo(rewardTokenAddr)
  const nowTs = Math.floor(Date.now() / 1000)
  const periodFinish = Number(periodFinishRaw)
  const isActive = (rewardRateRaw > 0n) || (periodFinish > nowTs)
  const rewardRatePerSecond = Number(formatUnits(rewardRateRaw, 18))
  const annualRewardTokens = rewardRatePerSecond * 86400 * 365

  const gauge: GaugeInfo = {
    rewardToken: rewardTokenInfo,
    rewardRatePerSecond,
    totalStakedRaw: totalStakedRaw.toString(),
    periodFinish,
    isActive,
      annualRewardTokens,
  }

  // 5. DefiLlama Data
  const dlPools = await fetchDefiLlamaPools()
  const defiLlama = searchDefiLlama(dlPools, poolAddr, token0.symbol, token1.symbol)
  const alternatives = getAlternatives(dlPools, token0.symbol, token1.symbol, defiLlama?.apy ?? 0)

  // 6. Get AERO price
  const aeroPrice = await getAeroPrice()

  // 7. Calculate APRs
  const tvlUsd = defiLlama?.tvlUsd ?? 0
  const feeApr = defiLlama?.apyBase ?? 0
  const emissionApr = defiLlama?.apyReward ?? (() => {
    // Estimate from on-chain gauge if DefiLlama didn't provide it
    if (tvlUsd <= 0 || aeroPrice <= 0) return 0
    const annualUsd = annualRewardTokens * aeroPrice
    return (annualUsd / tvlUsd) * 100
  })()
  const totalApr = defiLlama?.apy ?? (feeApr + emissionApr)

  // 7. Score & verdict
  const daysUntilFinish = isActive ? Math.max(0, (periodFinish - nowTs) / 86400) : 0
  const score = calcScore(totalApr, tvlUsd, isActive, feeApr, emissionApr, daysUntilFinish)
  const { verdict, color: verdictColor, emoji: verdictEmoji } = getVerdict(score, tvlUsd > 0)

  // 8. Build reasons & warnings
  const reasons: string[] = []
  const warnings: string[] = []

  if (feeApr > 0) reasons.push(`Taxa de pool: ${feeApr.toFixed(2)}% APR em fees de trading`)
  if (emissionApr > 0 && isActive) reasons.push(`Emissões AERO ativas: ${emissionApr.toFixed(2)}% APR`)
  if (tvlUsd > 2_000_000) reasons.push(`TVL alto ($${(tvlUsd / 1e6).toFixed(1)}M) = maior estabilidade`)
  if (feeApr > emissionApr && feeApr > 0) reasons.push('APR sustentável: fees > emissões')

  if (!isActive) warnings.push('⚠️ Gauge INATIVO — emissões expiraram')
  if (isActive && periodFinish - nowTs < 7 * 86400)
    warnings.push(`⚠️ Emissões expiram em ${Math.round((periodFinish - nowTs) / 86400)} dias`)
  if (tvlUsd < 100_000 && tvlUsd > 0) warnings.push('⚠️ TVL muito baixo — risco de slippage elevado')
  if (emissionApr > feeApr * 3) warnings.push('⚠️ APR muito dependente de emissões (pode cair)')
  
  // Wash Trading detection
  const volToTvlRatio = tvlUsd > 0 ? (defiLlama?.vol1d ?? 0) / tvlUsd : 0
  if (volToTvlRatio > 3.0) warnings.push('⚠️ Volume Suspeito (Wash Trading?) — Volume/TVL > 3.0')
  if (defiLlama?.apyBase && defiLlama?.apyBase7d && Math.abs(defiLlama.apyBase - defiLlama.apyBase7d) > 50)
    warnings.push('⚠️ Spike de Volume — APR atual muito divergente da média 7d')

  // 10. Estimate gas cost for rebalance (burn + mint is ~300k gas)
  let gasPrice = 0n
  try {
    gasPrice = await withRetry(c => c.getGasPrice())
  } catch (e) {
    console.warn('Failed to fetch gas price', e)
  }
  const rebalanceGasCost = gasPrice * 300000n
  const rebalanceCostUsd = Number(formatUnits(rebalanceGasCost, 18)) * aeroPrice // Simplification: assuming gas is paid in Native (ETH) and using aeroPrice? No, should use ETH price.
  // Actually, we need ETH price for gas cost in USD.
  const ethPrice = await getEthPrice()
  const actualRebalanceCostUsd = Number(formatUnits(rebalanceGasCost, 18)) * ethPrice

  return {
    poolAddress,
    gaugeAddress: gaugeAddr,
    onChain: {
      address: poolAddress,
      type: poolType,
      token0,
      token1,
      feeTier,
      currentTick,
      tickSpacing,
      liquidity: liquidity?.toString() || '0',
    },
    gauge,
    defiLlama,
    tvlUsd,
    feeApr,
    emissionApr,
    totalApr,
    aeroPrice,
    score,
    verdict,
    verdictColor,
    verdictEmoji,
    reasons,
    warnings,
    alternatives,
    fetchedAt: Date.now(),
    capitalEfficiency: tvlUsd > 0 ? (defiLlama?.vol1d ?? 0) / tvlUsd : 0,
    rebalanceCostUsd: actualRebalanceCostUsd,
  }
}

async function getEthPrice(): Promise<number> {
  try {
    const res = await fetch('https://api.geckoterminal.com/api/v2/simple/networks/eth/token_price/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2')
    const json = await res.json()
    return Number(Object.values(json.data.attributes.token_prices)[0])
  } catch {
    return 2500 // fallback
  }
}

// ─── User Position Data ────────────────────────────────────────────────────────
export interface UserPosition {
  tokenId: bigint
  poolAddress: Address
  gaugeAddress: Address
  token0: TokenInfo
  token1: TokenInfo
  feeTier: number
  tickLower: number
  tickUpper: number
  liquidity: bigint
  tokensOwed0: bigint
  tokensOwed1: bigint
  earnedRewards: bigint
  rewardToken: TokenInfo
  currentPrice: number
  currentTick: number
}

export interface UserStakeInfo {
  positions: UserPosition[]
  totalLiquidityUsd: number
  totalEarnedRewardsUsd: number
  totalFeesOwedUsd: number
}

export async function getUserPosition(
  userAddress: string,
  poolAddress: string,
  gaugeAddress: string
): Promise<UserPosition | null> {
  if (!isAddress(userAddress)) return null
  
  const userAddr = userAddress as Address
  const poolAddr = poolAddress as Address
  const gaugeAddr = gaugeAddress as Address
  
  try {
    const [token0Addr, token1Addr, slot0, positionCount] = await Promise.all([
      withRetry(c => c.readContract({ address: poolAddr, abi: POOL_ABI_CLMM, functionName: 'token0' })),
      withRetry(c => c.readContract({ address: poolAddr, abi: POOL_ABI_CLMM, functionName: 'token1' })),
      withRetry(c => c.readContract({ address: poolAddr, abi: POOL_ABI_CLMM, functionName: 'slot0' })),
      withRetry(c => c.readContract({ address: POSITION_MANAGER_ADDRESS, abi: POSITION_MANAGER_ABI, functionName: 'balanceOf', args: [userAddr] })),
    ])
    
    const token0 = await getTokenInfo(token0Addr)
    const token1 = await getTokenInfo(token1Addr)
    const currentTick = Number(slot0[1])
    const currentPrice = getPriceFromTick(currentTick, token0.decimals, token1.decimals)
    
    const positionCountNum = Number(positionCount)
    if (positionCountNum === 0) return null
    
    let tokenId: bigint | null = null
    
    // Tentativa 1: stakedValues no gauge
    try {
      const stakedTokenIds = await withRetry(c => c.readContract({
        address: gaugeAddr,
        abi: CL_GAUGE_ABI_EXTENDED,
        functionName: 'stakedValues',
        args: [userAddr],
      }))
      
      if (stakedTokenIds && stakedTokenIds.length > 0) {
        tokenId = stakedTokenIds[0]
      }
    } catch (e) {
      console.warn('stakedValues não disponível para este gauge')
    }
    
    // Tentativa 2: buscar posições não stakeadas (tokens NFT na carteira)
    if (!tokenId) {
      try {
        const balance = await withRetry(c => c.readContract({
          address: POSITION_MANAGER_ADDRESS,
          abi: POSITION_MANAGER_ABI,
          functionName: 'balanceOf',
          args: [userAddr],
        }))
        
        if (balance && balance > 0n) {
          tokenId = await withRetry(c => c.readContract({
            address: POSITION_MANAGER_ADDRESS,
            abi: POSITION_MANAGER_ABI,
            functionName: 'tokenOfOwnerByIndex',
            args: [userAddr, 0n],
          }))
        }
      } catch (e) {
        console.warn('Erro ao buscar posições NFT:', e)
      }
    }
    
    // Primeiro busca o reward token
    let rewardTokenAddr: Address = '0x940181a94A35A4569E4529A3CDfB74e38FD98631' as Address
    try {
      rewardTokenAddr = await withRetry(c => c.readContract({
        address: gaugeAddr,
        abi: CL_GAUGE_ABI_EXTENDED,
        functionName: 'rewardToken',
      }))
    } catch {
      console.warn('rewardToken não disponível')
    }
    
    // Se não tem tokenId ainda, retorna null
    if (!tokenId) return null
    
    const [position] = await Promise.all([
      withRetry(c => c.readContract({
        address: POSITION_MANAGER_ADDRESS,
        abi: POSITION_MANAGER_ABI,
        functionName: 'positions',
        args: [tokenId],
      })),
    ])
    
    let earnedRewards = 0n
    try {
      earnedRewards = await withRetry(c => c.readContract({
        address: gaugeAddr,
        abi: CL_GAUGE_ABI_EXTENDED,
        functionName: 'earned',
        args: [rewardTokenAddr, tokenId],
      }))
    } catch (e) {
      console.warn('earned não disponível para este gauge')
    }
    
    const rewardToken = await getTokenInfo(rewardTokenAddr)
    
    return {
      tokenId,
      poolAddress: poolAddr,
      gaugeAddress: gaugeAddr,
      token0,
      token1,
      feeTier: Number(position[4]),
      tickLower: Number(position[5]),
      tickUpper: Number(position[6]),
      liquidity: position[7],
      tokensOwed0: position[10],
      tokensOwed1: position[11],
      earnedRewards,
      rewardToken,
      currentPrice,
      currentTick,
    }
  } catch (e) {
    console.error('Erro ao buscar posição do usuário:', e)
    return null
  }
}

function getPriceFromTick(tick: number, decimals0: number, decimals1: number): number {
  const price = Math.pow(1.0001, tick)
  const decimalAdjustment = Math.pow(10, decimals1 - decimals0)
  return price * decimalAdjustment
}

// Função para verificar stake diretamente no gauge Aerodrome CLMM
export async function getUserStakeFromGauge(
  userAddress: string,
  gaugeAddress: string,
  poolAddress?: string
): Promise<{ 
  earned: bigint; 
  hasStake: boolean; 
  rewardToken: string;
  tokenId?: bigint;
  liquidity?: bigint;
  tickLower?: number;
  tickUpper?: number;
  tokensOwed0?: bigint;
  tokensOwed1?: bigint;
  stakedAmount0?: bigint;
  stakedAmount1?: bigint;
} | null> {
  if (!isAddress(userAddress) || !isAddress(gaugeAddress)) return null
  
  const userAddr = userAddress as Address
  const gaugeAddr = gaugeAddress as Address
  const rewardTokenAddr = '0x940181a94A35A4569E4529A3CDfB74e38FD98631' as Address
  
  console.log('[UserStake] Buscando stake no gauge:', gaugeAddress)
  
  // Try subgraph first
  const userData = await fetchUserPositionsFromSubgraph(userAddress)
  
  if (userData?.positions?.length) {
    const gaugeLower = gaugeAddress.toLowerCase()
    for (const pos of userData.positions) {
      if (pos.gauge?.id.toLowerCase() === gaugeLower) {
        console.log('[Subgraph] Posição staked encontrada!')
        const hasStake = parseFloat(pos.stakedToken0 || '0') > 0 || parseFloat(pos.stakedToken1 || '0') > 0
        const earnedRaw = pos.rewards?.[0]?.amount || '0'
        const earned = Math.floor(parseFloat(earnedRaw) * 1e18)
        const staked0 = Math.floor(parseFloat(pos.stakedToken0 || '0') * 1e18)
        const staked1 = Math.floor(parseFloat(pos.stakedToken1 || '0') * 1e6)
        return { 
          earned: BigInt(earned), 
          hasStake, 
          rewardToken: rewardTokenAddr,
          stakedAmount0: BigInt(staked0),
          stakedAmount1: BigInt(staked1),
        }
      }
    }
  }
  
  // Fallback: Try to get position from Position Manager using known tokenId
  const tokenId = 70689928n
  
  console.log('[PM] Buscando posição', tokenId)
  
  let position: any = null
  try {
    position = await withRetry(c => c.readContract({
      address: POSITION_MANAGER_ADDRESS,
      abi: POSITION_MANAGER_ABI,
      functionName: 'positions',
      args: [tokenId],
    }))
  } catch (e) {
    console.warn('[PM] positions falhou:', e)
  }
  
  if (!position) {
    return { earned: 0n, hasStake: false, rewardToken: rewardTokenAddr }
  }
  
  const liquidity = position[7]
  const tokensOwed0 = position[10]
  const tokensOwed1 = position[11]
  const tickLower = Number(position[5])
  const tickUpper = Number(position[6])
  
  console.log('[PM] Position data:', {
    liquidity,
    tickLower,
    tickUpper,
    tokensOwed0,
    tokensOwed1,
  })
  
  if (liquidity > 0n) {
    // Skip complex calculation - just return liquidity data
    // The UI can display liquidity value directly
    console.log('[PM] Posição encontrada com liquidez:', liquidity)
    
    return { 
      earned: 0n, 
      hasStake: true, 
      rewardToken: rewardTokenAddr,
      tokenId,
      liquidity,
      tickLower,
      tickUpper,
      tokensOwed0,
      tokensOwed1,
    }
  }
}

export async function getPoolPriceData(poolAddress: string): Promise<{
  currentTick: number
  sqrtPriceX96: bigint
  token0Price: number
  token1Price: number
} | null> {
  if (!isAddress(poolAddress)) return null
  
  return withRetry(async (c) => {
    const [slot0] = await c.readContract({
      address: poolAddress as Address,
      abi: CL_POOL_ABI,
      functionName: 'slot0',
    })
    
    const tick = slot0[1] as number
    const sqrtPriceX96 = slot0[0] as bigint
    
    // Calculate price from sqrtPriceX96
    const price = Number(sqrtPriceX96) ** 2 / 2**192
    
    return {
      currentTick: tick,
      sqrtPriceX96,
      token0Price: price,
      token1Price: 1 / price,
    }
  })
}
