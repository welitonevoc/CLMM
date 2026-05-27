'use client'

import { useMemo } from 'react'
import { calculatePearsonCorrelation, estimateVolatility, volatilityLabel, suggestRangeWidth } from '@/lib/correlationEngine'
import { fmtPct } from '@/lib/format'

interface Props {
  simulatedPricesA?: number[]
  simulatedPricesB?: number[]
  volatility?: number
}

export function CorrelationPanel({ simulatedPricesA, simulatedPricesB, volatility }: Props) {
  const correlation = useMemo(() => {
    if (simulatedPricesA && simulatedPricesB) {
      return calculatePearsonCorrelation(simulatedPricesA, simulatedPricesB)
    }
    return null
  }, [simulatedPricesA, simulatedPricesB])

  const volEstimate = volatility || (simulatedPricesA ? estimateVolatility(simulatedPricesA) : 0)
  const suggestedRange = volEstimate > 0 ? suggestRangeWidth(volEstimate, 30) : 0

  const strengthColors: Record<string, string> = {
    forte: '#10b981',
    moderada: '#3b82f6',
    fraca: '#f59e0b',
    inversa: '#ef4444',
  }

  return (
    <div className="glass-card p-3 space-y-2.5">
      <h4 className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">
        Correlação & Volatilidade
      </h4>

      {correlation && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-zinc-500">Correlação dos Ativos</span>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] font-mono font-bold"
              style={{ color: strengthColors[correlation.strength] || '#64748b' }}
            >
              {correlation.label}
            </span>
            <div
              className="w-16 h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
              title={`Pearson: ${correlation.pearson.toFixed(3)}`}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.abs(correlation.pearson) * 100}%`,
                  backgroundColor: strengthColors[correlation.strength] || '#64748b',
                  marginLeft: correlation.pearson < 0 ? 'auto' : 0,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {volEstimate > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500">Volatilidade Anualizada</span>
            <span className="text-[10px] font-mono font-bold text-zinc-300">{fmtPct(volEstimate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-zinc-500">Nível</span>
            <span className={`text-[10px] font-mono font-bold ${
              volEstimate < 40 ? 'text-bull' : volEstimate < 80 ? 'text-warn' : 'text-bear'
            }`}>
              {volatilityLabel(volEstimate)}
            </span>
          </div>
          {suggestedRange > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-zinc-500">Range Sugerido (30d)</span>
              <span className="text-[10px] font-mono font-bold text-accent">±{suggestedRange}%</span>
            </div>
          )}
        </>
      )}

      {!correlation && !volEstimate && (
        <div className="text-[10px] font-mono text-zinc-600 text-center py-2">
          Dados insuficientes para análise de correlação
        </div>
      )}

      {correlation && correlation.samples > 0 && (
        <div className="text-[8px] font-mono text-zinc-700">
          Baseado em {correlation.samples} amostras · Pearson r = {correlation.pearson.toFixed(3)}
        </div>
      )}
    </div>
  )
}
