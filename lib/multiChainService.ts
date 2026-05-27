import { createPublicClient, http, fallback, parseAbi } from 'viem'
import { base, arbitrum, optimism, polygon } from 'viem/chains'

export type ChainId = 'base' | 'arbitrum' | 'optimism' | 'polygon'

interface ChainConfig {
  chain: typeof base
  rpcFallback: string[]
  name: string
  explorer: string
}

const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  base: {
    chain: base,
    rpcFallback: [
      'https://base-rpc.publicnode.com',
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
    ],
    name: 'Base',
    explorer: 'https://basescan.org',
  },
  arbitrum: {
    chain: arbitrum,
    rpcFallback: [
      'https://arb-rpc.publicnode.com',
      'https://arb1.arbitrum.io',
      'https://arbitrum.llamarpc.com',
    ],
    name: 'Arbitrum',
    explorer: 'https://arbiscan.io',
  },
  optimism: {
    chain: optimism,
    rpcFallback: [
      'https://opt-rpc.publicnode.com',
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
    ],
    name: 'Optimism',
    explorer: 'https://optimistic.etherscan.io',
  },
  polygon: {
    chain: polygon,
    rpcFallback: [
      'https://pol-rpc.publicnode.com',
      'https://polygon-rpc.com',
      'https://polygon.llamarpc.com',
    ],
    name: 'Polygon',
    explorer: 'https://polygonscan.com',
  },
}

export function getChainClient(chainId: ChainId) {
  const config = CHAIN_CONFIGS[chainId]
  const transport = fallback(config.rpcFallback.map(rpc => http(rpc, { timeout: 20000 })))
  
  return createPublicClient({
    chain: config.chain,
    transport,
  })
}

export function getChainConfig(chainId: ChainId): ChainConfig {
  return CHAIN_CONFIGS[chainId]
}

export function getSupportedChains(): { id: ChainId; name: string }[] {
  return [
    { id: 'base', name: 'Base' },
    { id: 'arbitrum', name: 'Arbitrum' },
    { id: 'optimism', name: 'Optimism' },
    { id: 'polygon', name: 'Polygon' },
  ]
}

// Uniswap V3 / CLMM style pool ABI
const CL_POOL_ABI = parseAbi([
  'function token0() view returns (address)',
  'function token1() view returns (address)',
  'function fee() view returns (uint24)',
  'function liquidity() view returns (uint128)',
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)',
  'function tickSpacing() view returns (int24)',
])

interface PoolInfo {
  address: string
  chainId: ChainId
  token0: string
  token1: string
  fee: number
  liquidity: bigint
  tick: number
  sqrtPriceX96: bigint
}

export async function getPoolInfo(chainId: ChainId, poolAddress: string): Promise<PoolInfo | null> {
  try {
    const client = getChainClient(chainId)
    
    const [token0, token1, fee, liquidity, slot0] = await Promise.all([
      client.readContract({ address: poolAddress as `0x${string}`, abi: CL_POOL_ABI, functionName: 'token0' }),
      client.readContract({ address: poolAddress as `0x${string}`, abi: CL_POOL_ABI, functionName: 'token1' }),
      client.readContract({ address: poolAddress as `0x${string}`, abi: CL_POOL_ABI, functionName: 'fee' }),
      client.readContract({ address: poolAddress as `0x${string}`, abi: CL_POOL_ABI, functionName: 'liquidity' }),
      client.readContract({ address: poolAddress as `0x${string}`, abi: CL_POOL_ABI, functionName: 'slot0' }),
    ])
    
    return {
      address: poolAddress,
      chainId,
      token0,
      token1,
      fee,
      liquidity,
      tick: slot0[1] as number,
      sqrtPriceX96: slot0[0] as bigint,
    }
  } catch (e) {
    console.error(`[MultiChain] Error fetching pool ${poolAddress} on ${chainId}:`, e)
    return null
  }
}

// Get DEX-specific pool addresses for comparison
export async function findAlternativePools(
  token0: string,
  token1: string,
  chainId: ChainId
): Promise<{ protocol: string; pool: string; fee: number }[]> {
  // For now return a placeholder - in production would query subgraph or registry
  const alternatives: { protocol: string; pool: string; fee: number }[] = []
  
  if (chainId === 'base') {
    alternatives.push(
      { protocol: 'Aerodrome', pool: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359dc59', fee: 500 },
      { protocol: 'Velodrome', pool: '0x3D476FDeEc7a985d4C73A63C6B012e2B82B27D7', fee: 500 },
    )
  }
  
  return alternatives
}