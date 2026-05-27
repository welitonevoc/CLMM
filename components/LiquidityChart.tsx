'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

interface LiquidityChartProps {
  currentTick: number
  tickLower: number
  tickUpper: number
  poolLiquidity: bigint
  inRangeLiquidity: bigint
  token0Symbol: string
  token1Symbol: string
  token0Decimals: number
  token1Decimals: number
}

export function LiquidityChart({
  currentTick,
  tickLower,
  tickUpper,
  poolLiquidity,
  inRangeLiquidity,
  token0Symbol,
  token1Symbol,
  token0Decimals,
  token1Decimals,
}: LiquidityChartProps) {
  const data = useMemo(() => {
    const ticks = 20
    const range = tickUpper - tickLower
    const step = range / ticks
    
    const chartData = []
    let cumLiquidity = 0
    
    for (let i = 0; i <= ticks; i++) {
      const tick = tickLower + (i * step)
      const price = Math.pow(1.0001, tick)
      const priceUsd = price * Math.pow(10, token1Decimals - token0Decimals)
      
      let inUserRange = false
      let liquidityValue = 0
      
      if (tick >= tickLower && tick <= tickUpper) {
        inUserRange = true
        const distFromCurrent = Math.abs(tick - currentTick) / range
        liquidityValue = Number(poolLiquidity) * (1 - distFromCurrent * 0.8) / 1e12
      } else {
        const distFromRange = Math.min(Math.abs(tick - tickLower), Math.abs(tick - tickUpper)) / range
        liquidityValue = Number(poolLiquidity) * 0.1 * Math.exp(-distFromRange * 2) / 1e12
      }
      
      cumLiquidity += liquidityValue
      
      chartData.push({
        tick: tick,
        price: priceUsd,
        priceLabel: priceUsd > 1000 ? `$${priceUsd.toFixed(0)}` : priceUsd > 1 ? `$${priceUsd.toFixed(2)}` : `$${priceUsd.toFixed(4)}`,
        liquidity: liquidityValue,
        inUserRange,
        isCurrentPrice: Math.abs(tick - currentTick) < step / 2,
      })
    }
    
    return chartData
  }, [currentTick, tickLower, tickUpper, poolLiquidity, token0Decimals, token1Decimals])

  const currentPrice = useMemo(() => {
    const price = Math.pow(1.0001, currentTick)
    return price * Math.pow(10, token1Decimals - token0Decimals)
  }, [currentTick, token0Decimals, token1Decimals])

  const rangeStart = Math.pow(1.0001, tickLower) * Math.pow(10, token1Decimals - token0Decimals)
  const rangeEnd = Math.pow(1.0001, tickUpper) * Math.pow(10, token1Decimals - token0Decimals)

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-zinc-200">Distribuição de Liquidez</span>
        </div>
        <div className="text-xs text-zinc-500">
          Range: <span className="text-zinc-300">${rangeStart.toFixed(2)} - ${rangeEnd.toFixed(2)}</span>
        </div>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
            <XAxis 
              dataKey="priceLabel" 
              tick={{ fontSize: 10, fill: '#71717a' }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#71717a' }}
              axisLine={{ stroke: '#3f3f46' }}
              tickLine={false}
              tickFormatter={(v) => `${(v / 1e6).toFixed(1)}M`}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#18181b', 
                border: '1px solid #3f3f46', 
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#e4e4e7' }}
              formatter={(value: number) => [`$${(value / 1e6).toFixed(2)}M`, 'Liquidez']}
            />
            <ReferenceLine 
              x={data.find(d => d.isCurrentPrice)?.priceLabel} 
              stroke="#22c55e" 
              strokeDasharray="3 3"
              strokeWidth={2}
            />
            <Bar dataKey="liquidity" radius={[2, 2, 0, 0]}>
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.inUserRange ? '#22c55e' : '#52525b'}
                  opacity={entry.inUserRange ? 0.8 : 0.4}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-3 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-sm opacity-80"></div>
          <span className="text-zinc-400">Sua Liquidez</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-zinc-500 rounded-sm opacity-40"></div>
          <span className="text-zinc-400">Fora do Range</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border border-green-500 border-dashed rounded-sm"></div>
          <span className="text-zinc-400">Preço Atual</span>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-border grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <div className="text-zinc-500 mb-1">Preço Atual</div>
          <div className="font-mono text-green-400 font-semibold">${currentPrice.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-zinc-500 mb-1">Liquidez Ativa</div>
          <div className="font-mono text-accent font-semibold">
            {Number(inRangeLiquidity / 10n**12n).toFixed(0)}T
          </div>
        </div>
        <div>
          <div className="text-zinc-500 mb-1">Status</div>
          <div className={`font-semibold ${currentTick >= tickLower && currentTick <= tickUpper ? 'text-green-400' : 'text-red-400'}`}>
            {currentTick >= tickLower && currentTick <= tickUpper ? 'In Range ✓' : 'Out of Range'}
          </div>
        </div>
      </div>
    </div>
  )
}