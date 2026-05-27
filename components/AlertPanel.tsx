'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, Plus, Trash2, AlertTriangle } from 'lucide-react'
import { useAlerts } from '@/hooks/useAlerts'
import { conditionLabel, conditionDescription } from '@/lib/alertEngine'
import type { AlertCondition, AlertPriority, Pool } from '@/types'

interface Props {
  pool: Pool
  poolKey: string
  currentPrice?: number
  rangeLow?: number
  rangeHigh?: number
}

const CONDITIONS: { value: AlertCondition; label: string }[] = [
  { value: 'range_exit', label: 'Saída do Range' },
  { value: 'apr_drop', label: 'Queda de APR' },
  { value: 'il_threshold', label: 'Limite de IL' },
  { value: 'fee_target', label: 'Meta de APR' },
  { value: 'price_level', label: 'Nível de Preço' },
]

const PRIORITIES: { value: AlertPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Baixa', color: '#64748b' },
  { value: 'medium', label: 'Média', color: '#f59e0b' },
  { value: 'high', label: 'Alta', color: '#ef4444' },
  { value: 'critical', label: 'Crítica', color: '#dc2626' },
]

export function AlertPanel({ pool, poolKey, currentPrice, rangeLow, rangeHigh }: Props) {
  const { alerts: poolAlerts, createAlert, removeAlert, toggleAlert } = useAlerts()
  const [showForm, setShowForm] = useState(false)
  const [newCondition, setNewCondition] = useState<AlertCondition>('range_exit')
  const [newThreshold, setNewThreshold] = useState(10)
  const [newPriority, setNewPriority] = useState<AlertPriority>('medium')

  const filtered = poolAlerts.filter(a => a.poolKey === poolKey)

  const handleCreate = () => {
    if (newCondition === 'range_exit' && rangeLow && rangeHigh) {
      createAlert(poolKey, pool.symbol, newCondition, newThreshold, newPriority)
    } else {
      createAlert(poolKey, pool.symbol, newCondition, newThreshold, newPriority)
    }
    setShowForm(false)
  }

  return (
    <div className="glass-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-accent" />
          <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
            Alertas
          </h4>
          {filtered.length > 0 && (
            <span className="text-[9px] font-mono text-zinc-500">{filtered.length}</span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-[9px] font-mono text-accent hover:text-accent/70 transition-colors"
        >
          <Plus className="w-3 h-3" /> Novo
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2.5 overflow-hidden"
          >
            <select
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value as AlertCondition)}
              className="w-full glass-input text-[10px] font-mono py-1.5"
            >
              {CONDITIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <div className="text-[9px] font-mono text-zinc-600 -mt-1">
              {conditionDescription(newCondition)}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider mb-1 block">
                  {newCondition === 'apr_drop' || newCondition === 'fee_target' ? 'APR %' :
                   newCondition === 'il_threshold' ? 'IL %' :
                   newCondition === 'price_level' ? 'Preço' : 'Distância %'}
                </label>
                <input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(+e.target.value)}
                  className="w-full glass-input text-[10px] font-mono py-1.5"
                  step={newCondition === 'price_level' ? 0.01 : 1}
                />
              </div>
              <div className="flex-1">
                <label className="text-[8px] font-mono text-zinc-500 uppercase tracking-wider mb-1 block">
                  Prioridade
                </label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as AlertPriority)}
                  className="w-full glass-input text-[10px] font-mono py-1.5"
                >
                  {PRIORITIES.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleCreate}
              className="w-full bg-accent/10 text-accent border border-accent/20 rounded-lg py-1.5 text-[10px] font-mono font-semibold hover:bg-accent/20 transition-colors"
            >
              Criar Alerta
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-1.5">
        {filtered.length === 0 && !showForm && (
          <div className="text-[10px] font-mono text-zinc-600 text-center py-3">
            Nenhum alerta configurado para esta pool
          </div>
        )}
        {filtered.map(alert => {
          const priority = PRIORITIES.find(p => p.value === alert.priority)!
          return (
            <div key={alert.id} className="flex items-center justify-between bg-black/30 rounded-lg px-2.5 py-2 text-[10px] font-mono">
              <div className="flex items-center gap-2">
                <button onClick={() => toggleAlert(alert.id)} className="transition-colors">
                  {alert.enabled
                    ? <Bell className="w-3 h-3 text-accent" />
                    : <BellOff className="w-3 h-3 text-zinc-600" />
                  }
                </button>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-zinc-300">{conditionLabel(alert.condition)}</span>
                    <span className="text-[8px]" style={{ color: priority.color }}>{priority.label}</span>
                  </div>
                  <div className="text-[8px] text-zinc-600">
                    {alert.condition === 'range_exit' ? `${alert.threshold}% distância` :
                     alert.condition === 'price_level' ? `$${alert.threshold}` :
                     `${alert.threshold}%`}
                  </div>
                </div>
              </div>
              <button onClick={() => removeAlert(alert.id)} className="p-1 text-zinc-600 hover:text-bear transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
