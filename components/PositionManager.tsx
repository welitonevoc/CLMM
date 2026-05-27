'use client'

import { useState, useEffect } from 'react'
import { fmtUSD, fmtPrice, fmtPct } from '@/lib/format'
import { concentratedIL } from '@/lib/impermanentLoss'
import { Plus, Trash2, TrendingUp, TrendingDown, Target } from 'lucide-react'

interface Position {
  id: string
  poolAddress: string
  symbol: string
  entryPrice: number
  capital: number
  entryDate: number
  rangeLow: number
  rangeHigh: number
}

interface Props {
  poolAddress: string
  symbol: string
  currentPrice: number
  apr: number
}

export function PositionManager({ poolAddress, symbol, currentPrice, apr }: Props) {
  const [positions, setPositions] = useState<Position[]>([])
  const [showForm, setShowForm] = useState(false)
  
  // Form state
  const [entryPrice, setEntryPrice] = useState(currentPrice)
  const [capital, setCapital] = useState(1000)
  const [rangeLow, setRangeLow] = useState(currentPrice * 0.9)
  const [rangeHigh, setRangeHigh] = useState(currentPrice * 1.1)

  useEffect(() => {
    const saved = localStorage.getItem('clmm_positions')
    if (saved) setPositions(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem('clmm_positions', JSON.stringify(positions))
  }, [positions])

  const addPosition = () => {
    const newPos: Position = {
      id: Math.random().toString(36).substr(2, 9),
      poolAddress,
      symbol,
      entryPrice,
      capital,
      entryDate: Date.now(),
      rangeLow,
      rangeHigh
    }
    setPositions([...positions, newPos])
    setShowForm(false)
  }

  const removePosition = (id: string) => {
    setPositions(positions.filter(p => p.id !== id))
  }

  const activePos = positions.filter(p => p.poolAddress === poolAddress)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" /> Minhas Posicoes
        </h4>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="text-[10px] bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded hover:bg-accent/20 transition-colors"
        >
          {showForm ? 'Cancelar' : 'Nova Posicao'}
        </button>
      </div>

      {showForm && (
        <div className="bg-bg border border-border rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Preco de Entrada</label>
              <input type="number" value={entryPrice} onChange={e => setEntryPrice(+e.target.value)} className="w-full bg-card border border-border rounded px-2 py-1 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Capital ($)</label>
              <input type="number" value={capital} onChange={e => setCapital(+e.target.value)} className="w-full bg-card border border-border rounded px-2 py-1 text-xs font-mono" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Range Low</label>
              <input type="number" value={rangeLow} onChange={e => setRangeLow(+e.target.value)} className="w-full bg-card border border-border rounded px-2 py-1 text-xs font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 block mb-1">Range High</label>
              <input type="number" value={rangeHigh} onChange={e => setRangeHigh(+e.target.value)} className="w-full bg-card border border-border rounded px-2 py-1 text-xs font-mono" />
            </div>
          </div>
          <button onClick={addPosition} className="w-full bg-accent text-white py-1.5 rounded-lg text-xs font-semibold hover:brightness-110 transition-all">
            Salvar Posicao
          </button>
        </div>
      )}

      <div className="space-y-3">
        {activePos.map(pos => {
          const daysActive = Math.max(1, (Date.now() - pos.entryDate) / (1000 * 60 * 60 * 24))
          const estimatedFees = pos.capital * (apr / 100 / 365) * daysActive
          const il = concentratedIL(currentPrice, pos.rangeLow, pos.rangeHigh, pos.entryPrice)
          const ilUsd = pos.capital * (il / 100)
          const netPnL = estimatedFees + ilUsd
          const roi = (netPnL / pos.capital) * 100

          return (
            <div key={pos.id} className="bg-card border border-border rounded-xl p-3 relative group">
              <button onClick={() => removePosition(pos.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-bear transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase">PnL Real Estimado</div>
                  <div className={`text-lg font-mono font-bold ${netPnL >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {netPnL >= 0 ? '+' : ''}{fmtUSD(netPnL)}
                  </div>
                  <div className={`text-[10px] font-semibold ${roi >= 0 ? 'text-bull' : 'text-bear'}`}>
                    {roi >= 0 ? '+' : ''}{roi.toFixed(2)}% ROI ({daysActive.toFixed(1)}d)
                  </div>
                </div>
                
                <div className="space-y-1.5 border-l border-border pl-4">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">Fees Acumuladas</span>
                    <span className="text-bull font-mono">{fmtUSD(estimatedFees)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">Impermanent Loss</span>
                    <span className="text-bear font-mono">{fmtUSD(ilUsd)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-zinc-500">Preco Entrada</span>
                    <span className="text-zinc-300 font-mono">{fmtPrice(pos.entryPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Status bar */}
              <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${currentPrice >= pos.rangeLow && currentPrice <= pos.rangeHigh ? 'bg-bull animate-pulse' : 'bg-bear'}`} />
                  <span className="text-[9px] text-zinc-500 uppercase font-semibold">
                    {currentPrice >= pos.rangeLow && currentPrice <= pos.rangeHigh ? 'In-Range' : 'Out-of-Range'}
                  </span>
                </div>
                <div className="text-[9px] text-zinc-400 font-mono">
                  {fmtPrice(pos.rangeLow)} — {fmtPrice(pos.rangeHigh)}
                </div>
              </div>
            </div>
          )
        })}
        {activePos.length === 0 && !showForm && (
          <div className="text-center py-6 bg-bg/50 border border-dashed border-border rounded-xl">
            <div className="text-[10px] text-zinc-500">Nenhuma posicao ativa nesta pool.</div>
          </div>
        )}
      </div>
    </div>
  )
}
