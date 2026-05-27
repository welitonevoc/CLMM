const BASE = 'https://api.geckoterminal.com/api/v2'

export async function getTokenPrice(network: string, pool: string) {
  const res = await fetch(`${BASE}/networks/${network}/pools/${pool}`)
  if (!res.ok) throw new Error(`GeckoTerminal error: ${res.status}`)
  return res.json()
}

export async function getOHLCV(
  network: string,
  pool: string,
  timeframe: string = 'day',
  limit: number = 30
) {
  const res = await fetch(
    `${BASE}/networks/${network}/pools/${pool}/ohlcv/${timeframe}?limit=${limit}`
  )
  if (!res.ok) throw new Error(`GeckoTerminal OHLCV error: ${res.status}`)
  return res.json()
}
