import type { AlertConfig, AlertCondition, Pool } from '@/types'

export type AlertCheckResult = {
  alert: AlertConfig
  triggered: boolean
  message: string
  currentValue: number
}

export function checkAlertCondition(
  alert: AlertConfig,
  pool: Pool,
  context: {
    currentPrice?: number
    rangeLow?: number
    rangeHigh?: number
    currentApr?: number
    il?: number
  }
): AlertCheckResult {
  const { condition, threshold, poolKey } = alert
  const poolK = `${pool.symbol}-${pool.chain}-${pool.project}`
  if (poolK !== poolKey) return { alert, triggered: false, message: '', currentValue: 0 }

  let triggered = false
  let message = ''
  let currentValue = 0

  switch (condition) {
    case 'range_exit': {
      const { currentPrice, rangeLow, rangeHigh } = context
      if (currentPrice && rangeLow && rangeHigh) {
        currentValue = currentPrice
        triggered = currentPrice < rangeLow || currentPrice > rangeHigh
        if (triggered) message = `${pool.symbol}: preço saiu do range (${currentPrice.toFixed(2)})`
      }
      break
    }
    case 'apr_drop': {
      const { currentApr } = context
      if (currentApr) {
        currentValue = currentApr
        triggered = currentApr < threshold
        if (triggered) message = `${pool.symbol}: APR caiu para ${currentApr.toFixed(1)}% (limite: ${threshold}%)`
      }
      break
    }
    case 'il_threshold': {
      const { il } = context
      if (il !== undefined) {
        currentValue = il
        triggered = Math.abs(il) > threshold
        if (triggered) message = `${pool.symbol}: IL atingiu ${Math.abs(il).toFixed(1)}% (limite: ${threshold}%)`
      }
      break
    }
    case 'fee_target': {
      const { currentApr } = context
      if (currentApr) {
        currentValue = currentApr
        triggered = currentApr >= threshold
        if (triggered) message = `${pool.symbol}: APR atingiu ${currentApr.toFixed(1)}% (meta: ${threshold}%)`
      }
      break
    }
    case 'price_level': {
      const { currentPrice } = context
      if (currentPrice) {
        currentValue = currentPrice
        triggered = currentPrice >= threshold
        if (triggered) message = `${pool.symbol}: preço atingiu ${currentPrice.toFixed(2)} (alvo: ${threshold})`
      }
      break
    }
  }

  return { alert, triggered, message, currentValue }
}

export function conditionLabel(condition: AlertCondition): string {
  const labels: Record<AlertCondition, string> = {
    range_exit: 'Saída do Range',
    apr_drop: 'Queda de APR',
    il_threshold: 'Limite de IL',
    fee_target: 'Meta de Taxas',
    price_level: 'Nível de Preço',
  }
  return labels[condition]
}

export function conditionDescription(condition: AlertCondition): string {
  const descs: Record<AlertCondition, string> = {
    range_exit: 'Dispara quando o preço sai do range definido',
    apr_drop: 'Dispara quando o APR cai abaixo do阈值',
    il_threshold: 'Dispara quando a perda impermanente excede o limite',
    fee_target: 'Dispara quando as taxas acumuladas atingem a meta',
    price_level: 'Dispara quando o preço atinge o nível alvo',
  }
  return descs[condition]
}

export function generateAlertId(): string {
  return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
}
