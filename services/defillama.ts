const API = 'https://yields.llama.fi/pools'

export interface DefiLlamaPool {
  pool: string
  chain: string
  project: string
  symbol: string
  tvlUsd: number
  apy: number
  apyBase: number | null
  apyReward: number | null
  volumeUsd1d: number | null
  volumeUsd7d: number | null
  apyBase7d: number | null
  apyMean30d: number | null
  il7d: number | null
  poolMeta?: string | null
  outlier?: boolean
}

export async function fetchPools(): Promise<DefiLlamaPool[]> {
  const res = await fetch(API)
  if (!res.ok) throw new Error(`DefiLlama API error: ${res.status}`)
  const json = await res.json()
  return json.data as DefiLlamaPool[]
}

const PROTOCOLS = ['uniswap', 'orca', 'aerodrome']
const STABLECOINS = new Set([
  'USDC','USDT','DAI','USD1','BUSD','FRAX','XSGD','BRZ','BRLA',
  'PYUSD','TUSD','LUSD','GUSD','USDP','USDD','CRVUSD','GHO',
  'DOLA','SUSD','USDE','USDBC','AXLUSDC','USDCE',
])
const ETH_TOKENS = new Set(['WETH','ETH','STETH','WSTETH','CBETH','RETH'])
const BTC_TOKENS = new Set(['WBTC','CBBTC','BTCB','TBTC','RENBTC','SBTC'])
const SOL_TOKENS = new Set(['SOL','WSOL','MSOL','JITOSOL','BSOL'])

export function classifyPool(symbol: string): string | null {
  const tokens = symbol.toUpperCase().split(/[-\/]/).map(t => t.trim())
  const hasStable = tokens.some(t => STABLECOINS.has(t))
  const hasEth = tokens.some(t => ETH_TOKENS.has(t))
  const hasBtc = tokens.some(t => BTC_TOKENS.has(t))
  const hasSol = tokens.some(t => SOL_TOKENS.has(t))
  const allStable = tokens.filter(Boolean).every(t => STABLECOINS.has(t))

  if (allStable && tokens.length >= 2) return 'STABLE'
  if (hasEth && hasStable) return 'ETH'
  if (hasBtc && hasStable) return 'BTC'
  if (hasSol && hasStable) return 'SOL'
  return null
}

export function filterPools(pools: DefiLlamaPool[]) {
  return pools.filter(p => {
    const project = (p.project || '').toLowerCase()
    const isAerodrome = project.includes('aerodrome')
    if (!PROTOCOLS.some(pr => project.includes(pr))) return false
    const tvl = p.tvlUsd || 0
    if (tvl < 100000) return false

    // Skip known unstable metadata pools in migration/transition states.
    const meta = (p.poolMeta || '').toLowerCase()
    if (meta.includes('migrating') || meta.includes('migration')) return false
    if (p.outlier) return false

    const cat = classifyPool(p.symbol)
    if (!cat) return false

    const apy = p.apy || 0
    const vol1d = p.volumeUsd1d || 0
    const volToTvl = tvl > 0 ? vol1d / tvl : 0

    // Defensive APY/quality bounds to avoid distorted rankings.
    if (cat === 'STABLE') {
      if (apy < 4 || apy > (isAerodrome ? 300 : 120)) return false
    } else {
      if (apy < 8 || apy > (isAerodrome ? 1200 : 500)) return false
    }

    // Suspicious pools: huge APY with no/very low volume, or extreme volume/tvl spikes.
    if (!isAerodrome && apy > 150 && vol1d <= 0) return false
    if (volToTvl > 5) return false

    return true
  })
}
