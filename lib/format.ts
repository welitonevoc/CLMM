export function fmtUSD(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  return `${n.toFixed(2)}%`
}

export function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '\u2014'
  if (n >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  if (n >= 1) return `$${n.toFixed(2)}`
  return `$${n.toFixed(4)}`
}

export function protoLabel(p: string): string {
  const map: Record<string, string> = {
    'uniswap-v3': 'Uniswap v3',
    'uniswap-v4': 'Uniswap v4',
    'aerodrome-slipstream': 'Aerodrome',
    'orca-dex': 'Orca',
  }
  return map[p] || p
}

export function chainColor(chain: string): string {
  const map: Record<string, string> = {
    Ethereum: '#627eea',
    Arbitrum: '#28a0f0',
    Base: '#0052ff',
    Polygon: '#8247e5',
    BSC: '#f0b90b',
    Solana: '#a78bfa',
  }
  return map[chain] || '#94a3b8'
}
