interface PoolData {
  symbol: string
  project: string
  chain: string
  apy: number
  apyMean30d: number
  tvl: number
  vol1d: number
  score: number
}

interface PositionData {
  pool: string
  tokenId: string
  liquidity: string
  tickLower: number
  tickUpper: number
  tokensOwed0: string
  tokensOwed1: string
  earnedRewards: string
  valueUsd: number
  status: string
}

export function exportToCSV(data: PoolData[], filename: string = 'pools.csv') {
  const headers = ['Symbol', 'Protocol', 'Chain', 'APR', 'APR 30d', 'TVL', 'Volume 24h', 'Score']
  const rows = data.map(p => [
    p.symbol,
    p.project,
    p.chain,
    p.apy?.toString() ?? '',
    p.apyMean30d?.toString() ?? '',
    p.tvl?.toString() ?? '',
    p.vol1d?.toString() ?? '',
    p.score?.toString() ?? '',
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportPositionToCSV(positions: PositionData[], filename: string = 'positions.csv') {
  const headers = ['Pool', 'Token ID', 'Liquidity', 'Tick Lower', 'Tick Upper', 'Token0', 'Token1', 'Earned', 'Value USD', 'Status']
  const rows = positions.map(p => [
    p.pool,
    p.tokenId,
    p.liquidity,
    p.tickLower.toString(),
    p.tickUpper.toString(),
    p.tokensOwed0,
    p.tokensOwed1,
    p.earnedRewards,
    p.valueUsd.toString(),
    p.status,
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportToJSON(data: any, filename: string = 'data.json') {
  const jsonContent = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonContent], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}