import type { WaterfallItem } from '@/types'

export type WaterfallInput = {
  capital: number
  feeApr: number
  rewardApr: number
  ilPercent: number
  days: number
  gasCostPerRebalance: number
  rebalances: number
}

export function calculateWaterfall(input: WaterfallInput): {
  items: WaterfallItem[]
  netReturn: number
  netReturnPct: number
  netApr: number
} {
  const { capital, feeApr, rewardApr, ilPercent, days, gasCostPerRebalance, rebalances } = input
  const periodYears = days / 365

  const feeYield = capital * (feeApr / 100) * periodYears
  const rewardYield = capital * (rewardApr / 100) * periodYears
  const ilLoss = -(capital * (ilPercent / 100))
  const gasCost = gasCostPerRebalance * rebalances
  const grossYield = feeYield + rewardYield
  const netReturn = grossYield + ilLoss - gasCost
  const netReturnPct = (netReturn / capital) * 100
  const grossApr = feeApr + rewardApr
  const netApr = grossApr * (1 + ilPercent / 100) - (gasCost / capital / periodYears)

  const items: WaterfallItem[] = [
    { label: 'Capital Inicial', value: capital, color: '#3b82f6', type: 'positive' },
    { label: 'Taxas de Swap', value: feeYield, color: '#10b981', type: 'positive' },
    { label: 'Recompensas', value: rewardYield, color: '#f59e0b', type: 'positive' },
    { label: 'Perda Impermanente', value: ilLoss, color: '#ef4444', type: 'negative' },
    { label: 'Custo de Gás', value: -gasCost, color: '#a78bfa', type: 'negative' },
    { label: 'Retorno Líquido', value: netReturn, color: netReturn >= 0 ? '#10b981' : '#ef4444', type: 'total' },
  ]

  return { items, netReturn, netReturnPct, netApr }
}

export function waterfallSummary(input: WaterfallInput): string[] {
  const { items, netReturn, netReturnPct } = calculateWaterfall(input)
  const summaries: string[] = []

  if (items[1].value > items[2].value) {
    summaries.push('Taxas de swap dominam o retorno — pool saudável')
  } else if (items[2].value > items[1].value) {
    summaries.push('Recompensas dominam — verifique sustentabilidade das emissões')
  }

  const ilRatio = items[3].value !== 0 ? Math.abs(items[1].value / items[3].value) : Infinity
  if (ilRatio < 1) {
    summaries.push('IL supera taxas — range muito estreito ou pool volátil demais')
  } else if (ilRatio < 2) {
    summaries.push('IL consomem parcela significativa das taxas — considere ampliar range')
  } else {
    summaries.push('Taxas cobrem IL confortavelmente')
  }

  summaries.push(`Retorno líquido: ${netReturnPct >= 0 ? '+' : ''}${netReturnPct.toFixed(2)}%`)

  return summaries
}

export function feeToIlRatio(feeYield: number, ilLoss: number): number {
  if (ilLoss === 0) return Infinity
  return feeYield / Math.abs(ilLoss)
}
