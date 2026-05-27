import type { LpStrategy } from '@/types'

export const LP_STRATEGIES: LpStrategy[] = [
  {
    id: 'passive-wide',
    name: 'Passivo Amplo',
    description: 'Range ±15-30% ao redor do preço. Mínimo gerenciamento, ideal para quem quer renda passiva sem monitorar diariamente.',
    rangeMultiplier: 3,
    rebalanceFrequency: 'Mensal',
    bestFor: 'Posições < $1K, LPs com tempo limitado',
    riskLevel: 'baixo',
    feeTier: '0.05% - 0.30%',
  },
  {
    id: 'moderate',
    name: 'Moderado',
    description: 'Range ±8-15%. Equilíbrio entre captura de taxas e tempo em range. Rebalanceamento semanal.',
    rangeMultiplier: 2,
    rebalanceFrequency: 'Semanal',
    bestFor: 'Posições $1K-$10K, check-ins semanais',
    riskLevel: 'médio',
    feeTier: '0.05% - 0.30%',
  },
  {
    id: 'active-narrow',
    name: 'Ativo Estreito',
    description: 'Range ±3-8%. Máxima eficiência de capital, requer monitoramento diário e rebalanceamento frequente.',
    rangeMultiplier: 1,
    rebalanceFrequency: 'Diário',
    bestFor: 'Posições > $10K, LPs ativos',
    riskLevel: 'alto',
    feeTier: '0.30% - 1.00%',
  },
  {
    id: 'stable-micro',
    name: 'Stable Micro',
    description: 'Range ±0.5-2%. Para pares stablecoin ou altamente correlacionados. Spread mínimo, eficiência máxima.',
    rangeMultiplier: 0.35,
    rebalanceFrequency: 'Raro',
    bestFor: 'Pares stablecoin (USDC/USDT)',
    riskLevel: 'baixo',
    feeTier: '0.01% - 0.05%',
  },
  {
    id: 'ladder',
    name: 'Escada (Ladder)',
    description: 'Múltiplas posições em ranges sobrepostos. Diversifica captura de taxas e reduz risco de saída total do range.',
    rangeMultiplier: 0,
    rebalanceFrequency: 'Variável',
    bestFor: 'LPs avançados com capital relevante',
    riskLevel: 'médio',
    feeTier: '0.05% - 1.00%',
  },
  {
    id: 'one-sided',
    name: 'One-Sided Bid/Ask',
    description: 'Posição assimétrica que favorece um dos ativos. Útil para DCA ou estratégias direcionais como limite.',
    rangeMultiplier: 0,
    rebalanceFrequency: 'Conforme necessário',
    bestFor: 'Estratégias direcionais, acúmulo de um ativo',
    riskLevel: 'alto',
    feeTier: '0.30% - 1.00%',
  },
]

export function suggestStrategy(capital: number, isStable: boolean, volatility: number): LpStrategy {
  if (isStable) return LP_STRATEGIES.find(s => s.id === 'stable-micro')!
  if (capital < 1000) return LP_STRATEGIES.find(s => s.id === 'passive-wide')!
  if (capital < 10000) return LP_STRATEGIES.find(s => s.id === 'moderate')!
  if (volatility > 80) return LP_STRATEGIES.find(s => s.id === 'passive-wide')!
  return LP_STRATEGIES.find(s => s.id === 'active-narrow')!
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
