import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Info, AlertTriangle } from 'lucide-react'
import { useTechnicalAnalysis } from '../hooks/useTechnicalAnalysis'

interface PoolForAnalysis {
  address: string
  chain: string
  rangeLow: number
  rangeHigh: number
  symbol?: string
}

interface Props {
  pool: PoolForAnalysis
  injectedData?: { data: any; loading: boolean; error: string | null }
}

const SOURCE_LABEL: Record<string, { text: string; color: string }> = {
  geckoterminal: { text: 'GeckoTerminal', color: '#10b981' },
  subgraph: { text: 'Subgraph', color: '#3b82f6' },
  dexscreener: { text: 'DexScreener', color: '#f59e0b' },
  unavailable: { text: 'Indisponível', color: '#ef4444' },
  synthetic: { text: 'Estimado', color: '#f59e0b' },
}

export default function SidePanelTechnicalSection({ pool, injectedData }: Props) {
  const [activeInfo, setActiveInfo] = useState<{ title: string; content: string } | null>(null)

  const hookData = useTechnicalAnalysis(
    pool.chain, pool.address, pool.rangeLow, pool.rangeHigh, 5 * 60 * 1000, pool.symbol
  )

  const { data, loading, error } = injectedData || hookData

  if (loading && !data) {
    return (
      <div className="glass-card p-4 text-center">
        <div className="inline-block h-4 w-4 animate-spin rounded-full border border-accent/30 border-t-accent mb-2" />
        <div className="text-[11px] font-mono text-zinc-500">Carregando dados de mercado...</div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="glass-card p-4 border-bear/20">
        <div className="flex items-center gap-2 text-bear text-[11px] font-mono">
          <AlertTriangle className="w-3.5 h-3.5" /> Erro: {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { indicators, clmmMetrics, clmmHealth, sufficiency } = data
  const source = SOURCE_LABEL[sufficiency.source as string] || { text: 'Unknown', color: '#64748b' }

  return (
    <div className="space-y-4">
      {/* Source badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: source.color }} />
          <span className="text-[10px] font-mono font-bold" style={{ color: source.color }}>{source.text}</span>
          {data.lastUpdated && (
            <span className="text-[9px] font-mono text-zinc-600">
              {new Date(data.lastUpdated).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        {loading && <div className="w-3 h-3 animate-spin rounded-full border border-accent/30 border-t-accent" />}
      </div>

      {sufficiency.source === 'synthetic' && (
        <div className="flex items-start gap-2 glass-card p-2.5 border-warn/20 text-[10px] font-mono text-warn">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>Dados estimados — indicadores podem não refletir a realidade da pool.</span>
        </div>
      )}

      {/* CLMM Metrics */}
      {clmmMetrics && (
        <div className="grid grid-cols-2 gap-2">
          <CLMMMetric label="In-Range" value={`${clmmMetrics.inRangeTimePct.toFixed(0)}%`} pct={clmmMetrics.inRangeTimePct / 100} />
          <CLMMMetric label="Fee Capture" value={`${clmmMetrics.feeCaptureRate.toFixed(0)}%`} pct={clmmMetrics.feeCaptureRate / 100} />
          <CLMMMetric label="Range Util." value={clmmMetrics.rangeUtilization.toFixed(2)} pct={Math.min(clmmMetrics.rangeUtilization / 2, 1)} />
          <CLMMMetric label="Saída (est.)" value={`~${clmmMetrics.daysUntilExit.toFixed(0)}d`} pct={Math.min(clmmMetrics.daysUntilExit / 30, 1)} />
        </div>
      )}

      {/* Indicators */}
      <div className="space-y-0.5">
        <IndicatorRow label="RSI (14)" value={indicators.rsi !== null ? indicators.rsi.toFixed(1) : '—'}
          sub={indicators.rsi === null ? 'Sem dados' :
            indicators.rsi >= 70 ? `Sobrecomprado (${indicators.rsi.toFixed(1)})` :
            indicators.rsi <= 30 ? `Sobrevendido (${indicators.rsi.toFixed(1)})` :
            indicators.rsi > 55 ? 'Força Alta' :
            indicators.rsi < 45 ? 'Força Baixa' : 'Neutro'}
          color={indicators.rsi === null ? '#64748b' : indicators.rsi >= 70 ? '#ef4444' : indicators.rsi <= 30 ? '#10b981' : '#64748b'}
          onInfo={() => setActiveInfo({ title: 'RSI', content: 'Relative Strength Index (0-100). >70 sobrecomprado, <30 sobrevendido, 40-60 neutro.' })}
        />
        <IndicatorRow label="MACD" value={indicators.macd !== null ? indicators.macd.histogram.toFixed(2) : '—'}
          sub={indicators.macd?.crossType === 'golden' ? 'Golden Cross' :
            indicators.macd?.crossType === 'death' ? 'Death Cross' :
            (indicators.macd?.histogram ?? 0) > 0.01 ? 'Momentum +' :
            (indicators.macd?.histogram ?? 0) < -0.01 ? 'Momentum −' : 'Neutro'}
          color={indicators.macd?.crossType === 'golden' ? '#10b981' : indicators.macd?.crossType === 'death' ? '#ef4444' : '#64748b'}
          onInfo={() => setActiveInfo({ title: 'MACD', content: 'Moving Average Convergence Divergence. Golden Cross = alta, Death Cross = baixa.' })}
        />
        <IndicatorRow label="%B" value={indicators.bollingerBands !== null ? `${(indicators.bollingerBands.percentB * 100).toFixed(0)}%` : '—'}
          sub={!indicators.bollingerBands ? '—' :
            indicators.bollingerBands.percentB > 1 ? 'Acima BB' :
            indicators.bollingerBands.percentB > 0.8 ? 'Banda Sup.' :
            indicators.bollingerBands.percentB < 0 ? 'Abaixo BB' :
            indicators.bollingerBands.percentB < 0.2 ? 'Banda Inf.' : 'Zona Central'}
          color={!indicators.bollingerBands ? '#64748b' : indicators.bollingerBands.percentB > 0.8 || indicators.bollingerBands.percentB < 0.2 ? '#f59e0b' : '#64748b'}
          onInfo={() => setActiveInfo({ title: '%B', content: 'Posição do preço dentro das Bandas de Bollinger. >80% = topo, <20% = fundo.' })}
        />
        <IndicatorRow label="Bandwidth" value={indicators.bollingerBands !== null ? `${indicators.bollingerBands.bandwidth.toFixed(1)}%` : '—'}
          sub={!indicators.bollingerBands ? '—' :
            indicators.bollingerBands.bandwidth < 2 ? 'Squeeze' :
            indicators.bollingerBands.bandwidth < 4 ? 'Compressão' :
            indicators.bollingerBands.bandwidth > 10 ? 'Alta Vol' : 'Normal'}
          color={!indicators.bollingerBands ? '#64748b' : indicators.bollingerBands.bandwidth < 4 ? '#3b82f6' : indicators.bollingerBands.bandwidth > 10 ? '#ef4444' : '#64748b'}
          onInfo={() => setActiveInfo({ title: 'Bandwidth', content: 'Largura das Bandas de Bollinger. Squeeze (<2%) precede explosão. >10% = alta volatilidade.' })}
        />
        <IndicatorRow label="ATR (14)" value={indicators.atr ? `$${indicators.atr.value.toFixed(2)}` : '—'}
          sub={indicators.atr ? `${indicators.atr.percentOfPrice.toFixed(1)}%` : 'Sem dados'}
          color={indicators.atr?.confidence === 'high' ? '#10b981' : '#f59e0b'}
          onInfo={() => setActiveInfo({ title: 'ATR', content: 'Average True Range — volatilidade média. Use como guia para largura do range.' })}
        />
        <IndicatorRow label="MA7 / MA25" value={indicators.ma7 && indicators.ma25 ? `$${indicators.ma7.toFixed(0)} / $${indicators.ma25.toFixed(0)}` : '—'}
          sub={!indicators.ma7 || !indicators.ma25 ? '—' : indicators.ma7 > indicators.ma25 ? 'MA7 > MA25 ↑' : 'MA7 < MA25 ↓'}
          color={!indicators.ma7 || !indicators.ma25 ? '#64748b' : indicators.ma7 > indicators.ma25 ? '#10b981' : '#ef4444'}
          onInfo={() => setActiveInfo({ title: 'MAs', content: 'Médias Móveis 7 e 25 períodos. MA7 > MA25 = tendência de alta.' })}
        />
      </div>

      {/* Divergences */}
      <div className="space-y-0.5 pt-2 border-t border-white/[0.04]">
        <DivergenceRow label="RSI Diverg." result={indicators.rsiDivergence}
          onInfo={() => setActiveInfo({ title: 'Divergência RSI', content: 'Preço vs RSI. Bullish: price low < anterior, RSI low > anterior. Bearish: price high > anterior, RSI high < anterior.' })}
        />
        <DivergenceRow label="MACD Diverg." result={indicators.macdDivergence}
          onInfo={() => setActiveInfo({ title: 'Divergência MACD', content: 'Preço vs histograma MACD. Sinal de reversão iminente.' })}
        />
      </div>

      {/* Info Modal */}
      <AnimatePresence>
        {activeInfo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
            onClick={() => setActiveInfo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-sm glass-panel p-6 shadow-glass"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10">
                  <Info className="w-4 h-4 text-accent" />
                </div>
                <h3 className="text-sm font-bold font-mono">{activeInfo.title}</h3>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-5 font-mono">{activeInfo.content}</p>
              <button onClick={() => setActiveInfo(null)}
                className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold font-mono text-zinc-300 transition-colors border border-white/[0.06]">
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alerts */}
      {clmmHealth && clmmHealth.messages.length > 0 && (
        <div className="space-y-1">
          {clmmHealth.messages.map((msg, i) => (
            <div key={i} className="flex items-start gap-2 glass-card p-2.5 border-warn/20 text-[10px] font-mono text-warn">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CLMMMetric({ label, value, pct }: { label: string; value: string; pct: number }) {
  const color = pct >= 0.7 ? '#10b981' : pct >= 0.5 ? '#f59e0b' : '#ef4444'
  return (
    <div className="glass-card p-2.5">
      <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="font-mono text-xs font-bold text-zinc-200 mt-0.5">{value}</div>
      <div className="h-1 bg-white/[0.04] rounded-full mt-1.5 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 1) * 100}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function IndicatorRow({ label, value, sub, color, onInfo }: { label: string; value: string; sub: string; color: string; onInfo: () => void }) {
  return (
    <div className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={onInfo}>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300 transition-colors">{label}</span>
        <Info className="w-2.5 h-2.5 text-zinc-700 group-hover:text-accent transition-colors" />
      </div>
      <div className="flex items-center gap-2 text-right">
        <span className="font-mono text-[11px] font-medium text-zinc-200">{value}</span>
        <span className="w-20 text-[9px] font-mono font-semibold uppercase tracking-wider text-right" style={{ color }}>{sub}</span>
      </div>
    </div>
  )
}

function DivergenceRow({ label, result, onInfo }: { label: string; result: any; onInfo: () => void }) {
  const bull = result?.type === 'bullish'
  const bear = result?.type === 'bearish'
  return (
    <div className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={onInfo}>
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${!result?.type ? 'bg-zinc-700' : bull ? 'bg-bull' : 'bg-bear'}`} />
        <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300">{label}</span>
        <Info className="w-2.5 h-2.5 text-zinc-700 group-hover:text-accent transition-colors" />
      </div>
      {!result?.type ? (
        <span className="text-[9px] font-mono text-zinc-600 italic">Nenhuma</span>
      ) : (
        <span className={`text-[10px] font-mono font-bold ${bull ? 'text-bull' : 'text-bear'}`}>
          {bull ? 'Bullish' : 'Bearish'} {result.strength === 'strong' ? 'Forte' : 'Fraca'}
        </span>
      )}
    </div>
  )
}
