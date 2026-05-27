export type Position = {
  id: string
  poolSymbol: string
  poolProject: string
  poolChain: string
  poolAddress: string
  entryPrice: number
  entryDate: number
  capital: number
  rangeLow: number
  rangeHigh: number
  entryTx?: string
  exitTx?: string
  exited: boolean
  exitPrice?: number
  exitDate?: number
}

export type PoolMetrics = {
  apr: number
  tvl: number
  volume24h: number
  volatility?: number
  ilRisk?: number
  inRangeProbability?: number
  hasGauge?: boolean
  emissionApr?: number
  apyMean30d?: number
  apyBase?: number
  apyReward?: number
}

export type PoolMetricsFromPool = {
  apr: number
  tvl: number
  volume24h: number
  apyBase: number
  apyReward: number
  apyMean30d: number
  hasRewards: boolean
}

export type BacktestInput = {
  capital: number
  apr: number
  days: number
}

export type BacktestResult = {
  feeReturn: number
  ilLoss: number
  net: number
  roi: number
  dailyYield: number[]
}

export type PoolCategory = 'ETH' | 'BTC' | 'SOL' | 'STABLE'

export type StrategyMode = 'conservative' | 'balanced' | 'aggressive' | 'stable'

export type Pool = {
  symbol: string
  project: string
  chain: string
  apy: number
  apyBase: number
  apyReward: number
  tvl: number
  vol1d: number | null
  apyBase7d?: number | null
  apyMean30d: number | null
  category: PoolCategory
  poolId?: string
  score?: number
}

export type TechAnalysis = {
  price: number
  rsi: number
  rsiSignal: string
  macdVal: number
  macdSignal: number
  macdHist: number
  macdCross: string
  bbUpper: number
  bbMiddle: number
  bbLower: number
  ma7: number
  ma25: number
  ma99: number
  trend: string
  atr: number
  atrPct: number
  verdict: string
  supports: number[]
  resistances: number[]
  rangeLow: number
  rangeHigh: number
}

export type RangeResult = {
  low: number
  high: number
  width: number
  lowPct: number
  highPct: number
}

export type AlertCondition = 'range_exit' | 'apr_drop' | 'il_threshold' | 'fee_target' | 'price_level'
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical'

export type AlertConfig = {
  id: string
  poolKey: string
  poolSymbol: string
  condition: AlertCondition
  priority: AlertPriority
  threshold: number
  enabled: boolean
  lastTriggered?: number
}

export type LpStrategy = {
  id: string
  name: string
  description: string
  rangeMultiplier: number
  rangePct: number
  rebalanceFrequency: string
  bestFor: string
  riskLevel: 'baixo' | 'médio' | 'alto'
  feeTier: string
  expectedApyRange: [number, number]
  ilRisk: number
  timeInRange: number
  managementType: 'manual' | 'semi-auto' | 'automated'
  gasCostPerRebalance: number
  volatilityCap: number
  feeTiers: string[]
}

export type WaterfallItem = {
  label: string
  value: number
  color: string
  type: 'positive' | 'negative' | 'total'
}

export type CorrelationResult = {
  pearson: number
  label: string
  strength: 'forte' | 'moderada' | 'fraca' | 'inversa'
  direction: 'mesma_direcao' | 'oposta'
  samples: number
}

export type PoolRecommendation = {
  pool: Pool
  reason: string
  matchScore: number
  category: PoolCategory
  feeSustainability: number
  volatilityScore: number
  timeInRange: number
  suggestedStrategy?: string
}

export type AppState = {
  selectedPool: Pool | null
  selectedCategory: PoolCategory | null
  panelOpen: boolean
  topOnly: boolean
  strategyMode: StrategyMode
  watchlist: string[]
  comparePools: Pool[]
  pinnedPools: string[]
  alerts: AlertConfig[]
  setSelectedPool: (pool: Pool | null, category: PoolCategory | null) => void
  togglePanel: (open: boolean) => void
  setTopOnly: (v: boolean) => void
  setStrategyMode: (m: StrategyMode) => void
  toggleWatchlist: (poolKey: string) => void
  addComparePool: (pool: Pool) => void
  removeComparePool: (poolKey: string) => void
  clearComparePools: () => void
  addAlert: (alert: AlertConfig) => void
  removeAlert: (id: string) => void
  toggleAlert: (id: string) => void
  updateAlertThreshold: (id: string, threshold: number) => void
}
