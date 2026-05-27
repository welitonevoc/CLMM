'use client'

import { calculateNetPnL } from '@/lib/impermanentLoss'

interface Props {
  fees: number
  il: number
  rewards: number
  capital?: number
  isStable?: boolean
}

export function ILPanel({ fees, il, rewards, capital = 500, isStable = false }: Props) {
  const net = calculateNetPnL({ fees, il, rewards })
  const netColor = net >= 0 ? 'text-bull' : 'text-bear'

  // 1. Gas Optimizer calculations
  const dailyFees = fees / 7
  const gasCost = 0.10 // Average Base gas fee in USD
  // Formula: d = sqrt(2 * gasCost / (dailyFees * dailyRate))
  // We approximate the dailyRate (APR/365) from fees/capital
  const dailyRate = capital > 0 ? dailyFees / capital : 0.001
  const optimalDays = dailyFees > 0 && dailyRate > 0
    ? Math.max(1, Math.min(30, Math.round(Math.sqrt((2 * gasCost) / (dailyFees * dailyRate)))))
    : 0

  // 2. Delta-neutral hedging calculation
  // For non-stable pools, delta is typically ~0.50 at center range
  const shortSize = capital * 0.50

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div>
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          PnL & Retornos Estimados
        </h4>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-zinc-500">Fees acumuladas</span>
            <span className="font-mono text-bull">+${fees.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">Impermanent Loss</span>
            <span className="font-mono text-bear">{il >= 0 ? '+' : ''}${il.toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-zinc-500">Rewards (AERO)</span>
            <span className="font-mono text-accent">+${rewards.toFixed(2)}</span>
          </div>

          <div className="border-t border-border pt-2 flex justify-between font-semibold">
            <span>Net PnL Estimado</span>
            <span className={`font-mono ${netColor}`}>
              {net >= 0 ? '+' : ''}${net.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Optimization block */}
      <div className="border-t border-border/50 pt-3 space-y-3">
        <h5 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
          Otimizações Avançadas DeFi
        </h5>

        <div className="space-y-2.5 text-[11px]">
          {/* Gas Optimizer */}
          <div className="bg-bg border border-border/50 rounded-lg p-2">
            <div className="font-semibold text-zinc-300 flex items-center justify-between">
              <span>⛽ Frequência Ótima de Compounding</span>
              {optimalDays > 0 ? (
                <span className="text-accent font-mono">A cada {optimalDays} {optimalDays === 1 ? 'dia' : 'dias'}</span>
              ) : (
                <span className="text-zinc-500 font-mono">N/A</span>
              )}
            </div>
            <p className="text-zinc-500 mt-1 leading-relaxed">
              {optimalDays > 0 
                ? `Reaplicar seus rendimentos a cada ${optimalDays} dias minimiza o impacto do gás da rede Base ($${gasCost.toFixed(2)}) e maximiza o efeito dos juros compostos.`
                : 'Capital ou taxas insuficientes para calcular otimização de compounding.'}
            </p>
          </div>

          {/* Delta-neutral hedging */}
          {!isStable && (
            <div className="bg-bg border border-border/50 rounded-lg p-2">
              <div className="font-semibold text-zinc-300 flex items-center justify-between">
                <span>🛡️ Estratégia Delta-Neutral (IL Fighter)</span>
                <span className="text-warn font-mono">Short de $${shortSize.toFixed(0)}</span>
              </div>
              <p className="text-zinc-500 mt-1 leading-relaxed">
                Abra uma posição vendida (*short*) de 1x de **${shortSize.toFixed(0)} USD** no ativo volátil (ex: ETH ou BTC) em uma corretora perpétua (GMX/Synthetix) para proteger seu capital de LP contra a desvalorização do mercado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
