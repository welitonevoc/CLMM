// Chain slug mapping for Uniswap explore URLs
const UNISWAP_CHAIN_SLUG: Record<string, string> = {
  Ethereum: 'ethereum',
  Arbitrum: 'arbitrum',
  Base: 'base',
  Polygon: 'polygon',
  BSC: 'bnb',
  Optimism: 'optimism',
  Avalanche: 'avalanche',
  Celo: 'celo',
  Blast: 'blast',
  Zora: 'zora',
}

// DefiLlama chain slug mapping
const DEFILLAMA_CHAIN: Record<string, string> = {
  Ethereum: 'ethereum',
  Arbitrum: 'arbitrum',
  Base: 'base',
  Polygon: 'polygon',
  BSC: 'bsc',
  Optimism: 'optimism',
  Solana: 'solana',
  Avalanche: 'avax',
}

export interface PoolLink {
  label: string
  url: string
  icon: 'dex' | 'defillama'
}

/**
 * Returns an array of links for a pool:
 * 1. Direct DEX link (Uniswap / Aerodrome / Orca)
 * 2. DefiLlama pool page (always available when poolId is present)
 */
export function getPoolLinks(
  project: string,
  chain: string,
  poolId?: string
): PoolLink[] {
  const proj = project.toLowerCase()
  const links: PoolLink[] = []

  // ── Uniswap v3 / v4 ──
  if (proj.includes('uniswap')) {
    const chainSlug = UNISWAP_CHAIN_SLUG[chain]
    if (chainSlug && poolId) {
      links.push({
        label: 'Uniswap',
        url: `https://app.uniswap.org/explore/pools/${chainSlug}/${poolId}`,
        icon: 'dex',
      })
    } else {
      links.push({
        label: 'Uniswap',
        url: 'https://app.uniswap.org/explore/pools',
        icon: 'dex',
      })
    }
  }

  // ── Aerodrome ──
  else if (proj.includes('aerodrome')) {
    if (poolId) {
      links.push({
        label: 'Aerodrome',
        url: `https://aerodrome.finance/pools?filter=${poolId}`,
        icon: 'dex',
      })
    } else {
      links.push({
        label: 'Aerodrome',
        url: 'https://aerodrome.finance/pools',
        icon: 'dex',
      })
    }
  }

  // ── Orca ──
  else if (proj.includes('orca')) {
    if (poolId) {
      links.push({
        label: 'Orca',
        url: `https://www.orca.so/pools?address=${poolId}`,
        icon: 'dex',
      })
    } else {
      links.push({
        label: 'Orca',
        url: 'https://www.orca.so/pools',
        icon: 'dex',
      })
    }
  }

  // ── Fallback DEX ──
  else {
    links.push({
      label: project,
      url: `https://defillama.com/protocol/${project}`,
      icon: 'dex',
    })
  }

  // ── DefiLlama pool page (always added when poolId exists) ──
  if (poolId) {
    links.push({
      label: 'DefiLlama',
      url: `https://defillama.com/yields/pool/${poolId}`,
      icon: 'defillama',
    })
  }

  return links
}
