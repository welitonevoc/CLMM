'use client'

import { useCallback, useMemo } from 'react'
import { useAppStore } from './useStore'
import { checkAlertCondition, generateAlertId } from '@/lib/alertEngine'
import type { AlertConfig, AlertCondition, Pool, AlertPriority } from '@/types'

export function useAlerts() {
  const { alerts, addAlert, removeAlert, toggleAlert, updateAlertThreshold } = useAppStore()

  const createAlert = useCallback((
    poolKey: string,
    poolSymbol: string,
    condition: AlertCondition,
    threshold: number,
    priority: AlertPriority = 'medium'
  ) => {
    const newAlert: AlertConfig = {
      id: generateAlertId(),
      poolKey,
      poolSymbol,
      condition,
      priority,
      threshold,
      enabled: true,
    }
    addAlert(newAlert)
    return newAlert
  }, [addAlert])

  const checkAlerts = useCallback((
    pool: Pool,
    context: { currentPrice?: number; rangeLow?: number; rangeHigh?: number; currentApr?: number; il?: number }
  ) => {
    return alerts
      .filter(a => a.enabled && a.poolKey === `${pool.symbol}-${pool.chain}-${pool.project}`)
      .map(a => checkAlertCondition(a, pool, context))
      .filter(r => r.triggered)
  }, [alerts])

  const activeAlerts = useMemo(() => alerts.filter(a => a.enabled), [alerts])
  const byPool = useMemo(() => {
    const map = new Map<string, AlertConfig[]>()
    alerts.forEach(a => {
      const existing = map.get(a.poolKey) || []
      existing.push(a)
      map.set(a.poolKey, existing)
    })
    return map
  }, [alerts])

  return {
    alerts,
    activeAlerts,
    byPool,
    createAlert,
    removeAlert,
    toggleAlert,
    updateAlertThreshold,
    checkAlerts,
  }
}
