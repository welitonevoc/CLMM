import type { LpStrategy } from '@/types'

export type VolatilityTier = 'ultra_low' | 'low' | 'medium' | 'high' | 'extreme'

export function getVolatilityTier(volatility: number): VolatilityTier {
  if (volatility < 5) return 'ultra_low'
  if (volatility < 20) return 'low'
  if (volatility < 50) return 'medium'
  if (volatility < 100) return 'high'
  return 'extreme'
}

export const VOLATILITY_LABELS: Record<VolatilityTier, string> = {
  ultra_low: 'Ultra Baixa (<5%)',
  low: 'Baixa (5-20%)',
  medium: 'Média (20-50%)',
  high: 'Alta (50-100%)',
  extreme: 'Extrema (>100%)',
}

export const LP_STRATEGIES: LpStrategy[] = [
  {
    id: 'passive-wide',
    name: 'Passivo Amplo',
    description: 'Range ±20-40%. Funciona como full-range com captura mínima de taxas. Zero estresse, rebalanceamento raro.',
    rangeMultiplier: 3,
    rangePct: 30,
    rebalanceFrequency: '15-30 dias',
    bestFor: 'Posições < $1K, LPs sem tempo para gerenciar',    riskLevel: 'baixo',
    feeTier: '0.05% - 0.30%',
    expectedApyRange: [5, 15],
    ilRisk: 0.15,
    timeInRange: 0.95,
    managementType: 'manual',
    gasCostPerRebalance: 0.5,
    volatilityCap: 200,
    feeTiers: ['0.05%', '0.30%'],
  },
  {
    id: 'moderate',
    name: 'Moderado',
    description: 'Range ±10-20%. Equilíbrio entre captura de taxas e permanência em range. O padrão para a maioria dos LPs.',
    rangeMultiplier: 2,
    rangePct: 15,
    rebalanceFrequency: '7-14 dias',
    bestFor: 'Posições $1K-$10K, check-ins semanais',
    riskLevel: 'médio',
    feeTier: '0.05% - 0.30%',
    expectedApyRange: [12, 35],
    ilRisk: 0.3,
    timeInRange: 0.85,
    managementType: 'semi-auto',
    gasCostPerRebalance: 1.0,
    volatilityCap: 100,
    feeTiers: ['0.05%', '0.30%', '1.00%'],
  },
  {
    id: 'active-narrow',
    name: 'Ativo Estreito',
    description: 'Range ±3-8%. Máxima eficiência de capital. Requer monitoramento diário e rebalanceamento frequente.',
    rangeMultiplier: 1,
    rangePct: 6,
    rebalanceFrequency: '1-3 dias',
    bestFor: 'Posições > $10K, LPs dedicados ou bots',
    riskLevel: 'alto',
    feeTier: '0.30% - 1.00%',
    expectedApyRange: [30, 80],
    ilRisk: 0.6,
    timeInRange: 0.65,
    managementType: 'manual',
    gasCostPerRebalance: 2.0,
    volatilityCap: 60,
    feeTiers: ['0.30%', '1.00%'],
  },
  {
    id: 'stable-micro',
    name: 'Stable Micro',
    description: 'Range ±0.5-2%. Para pares stablecoin. Spread mínimo, capital 100% ativa, IL quase zero.',
    rangeMultiplier: 0.35,
    rangePct: 1.5,
    rebalanceFrequency: '30-60 dias',
    bestFor: 'Pares stablecoin (USDC/USDT, DAI/USDC)',
    riskLevel: 'baixo',
    feeTier: '0.01% - 0.05%',
    expectedApyRange: [5, 15],
    ilRisk: 0.02,
    timeInRange: 0.98,
    managementType: 'manual',
    gasCostPerRebalance: 0.5,
    volatilityCap: 10,
    feeTiers: ['0.01%', '0.05%'],
  },
  {
    id: 'automated-vault',
    name: 'Vault Automatizado',
    description: 'Delega para vaults profissionais (Gamma, Arrakis, Steer). Eles gerenciam range, rebalance e compound automaticamente. Taxa de gestão: 5-10% dos fees.',
    rangeMultiplier: 0,
    rangePct: 0,
    rebalanceFrequency: 'Automático (bot)',
    bestFor: 'Qualquer capital, LP hands-off, quem quer APY consistente',
    riskLevel: 'médio',
    feeTier: 'N/A (vault define)',
    expectedApyRange: [20, 60],
    ilRisk: 0.3,
    timeInRange: 0.85,
    managementType: 'automated',
    gasCostPerRebalance: 0,
    volatilityCap: 150,
    feeTiers: ['N/A'],
  },
  {
    id: 'ladder',
    name: 'Escada (Ladder)',
    description: 'Múltiplas posições em ranges sobrepostos (±5-15% cada). Diversifica captura de taxas e reduz risco de saída total.',
    rangeMultiplier: 0,
    rangePct: 10,
    rebalanceFrequency: '7-14 dias',
    bestFor: 'Capital > $50K, LPs avançados',
    riskLevel: 'médio',
    feeTier: '0.05% - 1.00%',
    expectedApyRange: [18, 45],
    ilRisk: 0.35,
    timeInRange: 0.9,
    managementType: 'semi-auto',
    gasCostPerRebalance: 3.0,
    volatilityCap: 80,
    feeTiers: ['0.05%', '0.30%', '1.00%'],
  },
  {
    id: 'one-sided',
    name: 'One-Sided Bid/Ask',
    description: 'Posição assimétrica que favorece um ativo. Útil para DCA, acúmulo direcional ou limit orders avançados.',
    rangeMultiplier: 0,
    rangePct: 8,
    rebalanceFrequency: 'Conforme necessidade',
    bestFor: 'Estratégias direcionais, acúmulo de um ativo específico',
    riskLevel: 'alto',
    feeTier: '0.30% - 1.00%',
    expectedApyRange: [10, 50],
    ilRisk: 0.7,
    timeInRange: 0.5,
    managementType: 'manual',
    gasCostPerRebalance: 1.5,
    volatilityCap: 50,
    feeTiers: ['0.30%', '1.00%'],
  },
]

const CHAIN_GAS_MULTIPLIER: Record<string, number> = {
  Ethereum: 1.0,
  Arbitrum: 0.15,
  Optimism: 0.1,
  Base: 0.08,
  Polygon: 0.05,
  Solana: 0.002,
  BNB: 0.03,
  Avalanche: 0.04,
}

export function adjustedGasCost(strategy: LpStrategy, chain: string): number {
  const mult = CHAIN_GAS_MULTIPLIER[chain] || 0.15
  return strategy.gasCostPerRebalance * mult
}

export function getVolatilityAdjustedWidth(strategy: LpStrategy, volatility: number): number {
  const tier = getVolatilityTier(volatility)
  const caps: Record<VolatilityTier, number> = {
    ultra_low: 3,
    low: 8,
    medium: 15,
    high: 30,
    extreme: 50,
  }
  const cap = caps[tier]
  const base = strategy.rangePct || 15
  return Math.max(base, Math.min(base + volatility * 0.3, cap))
}

export function estimateTimeInRange(rangePct: number, volatility: number): number {
  if (rangePct <= 0 || volatility <= 0) return 0.5
  return Math.min(0.99, (rangePct / (volatility * 1.5)) * 0.5 + 0.5)
}

export function suggestStrategy(
  capital: number,
  isStable: boolean,
  volatility: number,
  chain?: string
): LpStrategy {
  if (isStable) return LP_STRATEGIES.find(s => s.id === 'stable-micro')!

  const gasLow = chain ? (CHAIN_GAS_MULTIPLIER[chain] || 0.15) < 0.1 : false

  if (capital >= 10000 && (gasLow || volatility < 60)) {
    return LP_STRATEGIES.find(s => s.id === 'automated-vault')!
  }
  if (capital < 1000) return LP_STRATEGIES.find(s => s.id === 'passive-wide')!
  if (capital < 10000) return LP_STRATEGIES.find(s => s.id === 'moderate')!
  if (volatility > 80) return LP_STRATEGIES.find(s => s.id === 'passive-wide')!
  if (volatility < 30) return LP_STRATEGIES.find(s => s.id === 'active-narrow')!
  return LP_STRATEGIES.find(s => s.id === 'moderate')!
}

export function suggestFeeTier(strategy: LpStrategy, volatility: number, isStable: boolean): string {
  if (isStable) return '0.01%'
  if (volatility > 80) return '1.00%'
  if (volatility > 50) return '0.30%'
  if (volatility > 20) return '0.05%'
  if (strategy.id === 'active-narrow') return '0.30%'
  return strategy.feeTiers[0] || '0.05%'
}

export function estimateFeeApr(volatility: number, tvl: number, rangePct: number): number {
  const base = 5 + volatility * 0.3
  const rangeEfficiency = Math.max(0.5, 30 / Math.max(rangePct, 1))
  const tvlFactor = Math.max(0.5, 1 - Math.log10(Math.max(tvl, 1000) / 10000))
  return base * rangeEfficiency * tvlFactor
}

export function strategyFromMode(mode: string): LpStrategy {
  const map: Record<string, string> = {
    conservative: 'passive-wide',
    balanced: 'moderate',
    aggressive: 'active-narrow',
    stable: 'stable-micro',
  }
  const id = map[mode] || 'moderate'
  return LP_STRATEGIES.find(s => s.id === id)!
}
