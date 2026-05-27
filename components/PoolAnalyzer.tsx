'use client'

import { useState, useEffect, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Loader2, ExternalLink, AlertTriangle, CheckCircle2,
  TrendingUp, Shield, Zap, Clock, ArrowRight, Copy, Check,
  BarChart2, BarChart3, Droplets, Activity, RefreshCw, Plus, Trash2,
  Bookmark, Star, Info, TrendingDown,
} from 'lucide-react'
import type { PoolAnalysisResult, UserPosition } from '@/lib/aerodromeService'
import { getUserPosition, getUserStakeFromGauge, getPoolPriceData } from '@/lib/aerodromeService'
import { useTechnicalAnalysis } from '@/hooks/useTechnicalAnalysis'
import { useAccount, usePublicClient } from 'wagmi'
import { NPM_ABI } from '@/lib/abis/npm'
import { formatUnits } from 'viem'
import { LiquidityChart } from './LiquidityChart'
import { concentratedILForPriceChange, defaultConcentratedRange } from '@/lib/impermanentLoss'

// ─── Types ───────────────────────────────────────────────────────────────────
interface SavedPool {
  id: string
  pool: string
  gauge: string
  label: string
  addedAt: number
}

// ─── Presets ─────────────────────────────────────────────────────────────────
const PRESETS = [
  {
    label: 'WETH/USDC · Aerodrome',
    pool: '0xb2cc224c1c9fee385f8ad6a55b4d94e92359dc59',
    gauge: '0xF33a96b5932D9E9B9A0eDA447AbD8C9d48d2e0c8',
    network: 'Base',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtUSD(v: number) {
  if (!v) return '—'
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toFixed(2)}`
}
function fmtPct(v: number) { return v > 0 ? `${v.toFixed(2)}%` : '—' }
function fmtTs(ts: number) {
  if (!ts) return '—'
  return new Date(ts * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function daysLeft(ts: number) {
  const diff = ts - Math.floor(Date.now() / 1000)
  if (diff <= 0) return null
  const d = Math.floor(diff / 86400)
  return d > 0 ? `${d}d` : `${Math.floor(diff / 3600)}h`
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function MetricBox({
  label, value, sub, color = 'text-zinc-200', icon: Icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon?: React.ElementType
}) {
  return (
    <div className="bg-bg border border-border rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 uppercase tracking-wider">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <div className={`font-mono text-base font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-zinc-500">{sub}</div>}
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-zinc-600 hover:text-zinc-300 transition-colors">
      {copied ? <Check className="w-3.5 h-3.5 text-bull" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function UserPositionCard({ 
  poolAddress, 
  gaugeAddress,
  token0Symbol,
  token1Symbol,
}: { 
  poolAddress: string
  gaugeAddress: string
  token0Symbol: string
  token1Symbol: string
}) {
  const { address, isConnected } = useAccount()
  const [position, setPosition] = useState<UserPosition | null>(null)
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (isConnected && address && poolAddress && gaugeAddress) {
      loadPosition()
    }
  }, [isConnected, address, poolAddress, gaugeAddress])
  
  async function loadPosition() {
    if (!address) return
    setLoading(true)
    try {
      console.log('[UserPosition] Buscando posição para:', address, poolAddress, gaugeAddress)
      
      // Tentativa 1: Buscar posição completa via NPM
      let pos = await getUserPosition(address, poolAddress, gaugeAddress)
      
      // Tentativa 2: Se não encontrou, verificar diretamente no gauge
      if (!pos && gaugeAddress) {
        console.log('[UserPosition] Tentando buscar diretamente do gauge...')
        const gaugeInfo = await getUserStakeFromGauge(address, gaugeAddress, poolAddress)
        console.log('[UserPosition] Gauge info:', gaugeInfo)
        
        if (gaugeInfo?.hasStake) {
          // Cria posição com dados reais do Position Manager
          pos = {
            tokenId: gaugeInfo.tokenId || 0n,
            poolAddress: poolAddress as any,
            gaugeAddress: gaugeAddress as any,
            token0: { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', decimals: 18, name: 'WETH' },
            token1: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6, name: 'USDC' },
            feeTier: gaugeInfo.tickLower ? 100 : 500,
            tickLower: gaugeInfo.tickLower || 0,
            tickUpper: gaugeInfo.tickUpper || 0,
            liquidity: gaugeInfo.liquidity || 0n,
            tokensOwed0: gaugeInfo.stakedAmount0 || gaugeInfo.tokensOwed0 || 0n,
            tokensOwed1: gaugeInfo.stakedAmount1 || gaugeInfo.tokensOwed1 || 0n,
            earnedRewards: gaugeInfo.earned,
            rewardToken: { address: gaugeInfo.rewardToken as any, symbol: 'AERO', decimals: 18, name: 'Aerodrome' },
            currentPrice: 0,
            currentTick: 0,
          }
        }
      }
      
      console.log('[UserPosition] Resultado final:', pos)
      setPosition(pos)
    } catch (e) {
      console.warn('Erro ao carregar posição:', e)
    } finally {
      setLoading(false)
    }
  }
  
  if (!isConnected || !address) {
    return (
      <div className="bg-bg border border-border rounded-xl p-4 text-center">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Minha Posição</div>
        <div className="text-xs text-zinc-500">Conecte sua wallet para ver sua posição neste pool</div>
      </div>
    )
  }
  
  if (loading) {
    return (
      <div className="bg-bg border border-border rounded-xl p-4">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Minha Posição</div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="w-3 h-3 animate-spin" />
          Carregando posição...
        </div>
      </div>
    )
  }
  
  if (!position) {
    return (
      <div className="bg-bg border border-border rounded-xl p-4">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2">Minha Posição</div>
        <div className="text-xs text-warn">Você não tem posição ativa neste pool</div>
      </div>
    )
  }
  
  // For CLMM - use tokensOwed for actual deposited amounts (these are the position amounts, not fees)
  // tokensOwed0 = WETH (18 dec), tokensOwed1 = USDC (6 dec)
  const staked0 = Number(position.tokensOwed0) / 1e18
  const staked1 = Number(position.tokensOwed1) / 1e6
  const liquidityUsd = (staked0 * 2500 + staked1) || 0 // WETH ~$2500 + USDC
  const earnedAero = Number(position.earnedRewards) / 1e18
  const earnedUsd = earnedAero * 18
  const feesOwed0 = staked0  // These are actually the position amounts
  const feesOwed1 = staked1
  
  const [currentTick, setCurrentTick] = useState(0)
  
  useEffect(() => {
    async function fetchCurrentPrice() {
      try {
        const priceData = await getPoolPriceData(poolAddress)
        if (priceData?.currentTick) {
          setCurrentTick(priceData.currentTick)
        }
      } catch (e) {
        console.log('[Position] Não foi obter preço atual')
      }
    }
    fetchCurrentPrice()
  }, [poolAddress])

  return (
    <div className="bg-bull/5 border border-bull/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-bull uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Droplets className="w-3 h-3" />
          Minha Posição neste Pool
        </div>
        <div className="text-[10px] text-zinc-500 font-mono">Token ID: #{position.tokenId.toString()}</div>
      </div>

      <LiquidityChart
        currentTick={currentTick}
        tickLower={position.tickLower}
        tickUpper={position.tickUpper}
        poolLiquidity={position.liquidity}
        inRangeLiquidity={position.liquidity}
        token0Symbol={position.token0.symbol}
        token1Symbol={position.token1.symbol}
        token0Decimals={position.token0.decimals}
        token1Decimals={position.token1.decimals}
      />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-bg-secondary rounded-lg p-2">
          <div className="text-zinc-500 mb-1">Liquidez depositada</div>
          <div className="font-mono font-semibold text-bull">
            {fmtUSD(liquidityUsd)}
          </div>
          <div className="text-[10px] text-zinc-500">
            WETH: {feesOwed0.toFixed(4)} | USDC: {feesOwed1.toFixed(2)}
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-lg p-2">
          <div className="text-zinc-500 mb-1">Recompensas AERO</div>
          <div className="font-mono font-semibold text-warn">
            {earnedAero.toFixed(4)} AERO
          </div>
          <div className="text-[10px] text-zinc-500">
            ≈ {fmtUSD(earnedUsd)}
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-lg p-2">
          <div className="text-zinc-500 mb-1">Taxas pendentes</div>
          <div className="font-mono text-zinc-300">
            {feesOwed0 > 0 && `${feesOwed0.toFixed(4)} ${token0Symbol}`}
            {feesOwed0 > 0 && feesOwed1 > 0 && ' + '}
            {feesOwed1 > 0 && `${feesOwed1.toFixed(2)} USDC`}
            {feesOwed0 === 0 && feesOwed1 === 0 && '—'}
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-lg p-2">
          <div className="text-zinc-500 mb-1">Range da posição</div>
          <div className="font-mono text-zinc-300 text-[10px]">
            Lower: {position.tickLower}
          </div>
          <div className="font-mono text-zinc-300 text-[10px]">
            Upper: {position.tickUpper}
          </div>
        </div>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={() => alert('Funcionalidade de reivindicação em desenvolvimento')}
          className="flex-1 bg-warn/20 hover:bg-warn/30 text-warn text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
        >
          Reivindicar Recompensas
        </button>
        <button 
          onClick={() => alert('Funcionalidade de saque em desenvolvimento')}
          className="flex-1 bg-bear/20 hover:bg-bear/30 text-bear text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
        >
          Sacar Liquidez
        </button>
      </div>

      <div className="bg-bg-secondary rounded-lg p-3 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">PnL da Posição</span>
          <span className={`text-[10px] font-semibold ${liquidityUsd + earnedUsd >= staked0 * 2500 + staked1 ? 'text-green-400' : 'text-red-400'}`}>
            {liquidityUsd + earnedUsd >= staked0 * 2500 + staked1 ? 'Lucro' : 'Prejuízo'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-bg rounded p-2">
            <div className="text-zinc-500 mb-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              Fees Coletados
            </div>
            <div className="font-mono text-green-400 font-semibold">
              {earnedUsd > 0 ? fmtUSD(earnedUsd) : '—'}
            </div>
            {earnedAero > 0 && (
              <div className="text-[10px] text-zinc-500">{earnedAero.toFixed(4)} AERO</div>
            )}
          </div>
          <div className="bg-bg rounded p-2">
            <div className="text-zinc-500 mb-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-400" />
              IL Estimado
            </div>
            <div className="font-mono text-red-400 font-semibold">
              {(() => {
                const priceChange = currentTick > 0 ? (Math.pow(1.0001, currentTick) / Math.pow(1.0001, (position.tickLower + position.tickUpper) / 2) - 1) * 100 : 0
                const il = Math.abs(priceChange) > 5 ? -Math.abs(priceChange) * 0.5 : -Math.abs(priceChange) * 0.2
                return il < -0.1 ? `${il.toFixed(2)}%` : 'Mínima'
              })()}
            </div>
            <div className="text-[10px] text-zinc-500">
              {currentTick >= position.tickLower && currentTick <= position.tickUpper ? 'Ativo ✓' : 'Inativo'}
            </div>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-border flex justify-between text-[10px]">
          <span className="text-zinc-500">Valor Total</span>
          <span className="font-mono text-zinc-300">{fmtUSD(liquidityUsd + earnedUsd)}</span>
        </div>
      </div>
    </div>
  )
}

function GaugeExpiryAlert({ gauge, feeApr, tvlUsd }: {
  gauge: PoolAnalysisResult['gauge']
  feeApr: number
  tvlUsd: number
}) {
  const now = Math.floor(Date.now() / 1000)
  const secondsLeft = gauge.periodFinish - now
  const daysLeft = Math.floor(secondsLeft / 86400)
  
  if (daysLeft <= 0 || !gauge.isActive || daysLeft > 30) return null
  
  const dailyRewards = gauge.rewardRatePerSecond * 86400
  const rewardsLeft = dailyRewards * secondsLeft
  
  return (
    <div className="bg-warn/10 border border-warn/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-warn">
        <Clock className="w-4 h-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Emissões expiram em {daysLeft} dias
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div>
          <div className="text-zinc-500">APR atual (com emissões)</div>
          <div className="font-mono font-semibold text-warn">
            {(feeApr + (gauge.rewardRatePerSecond * 86400 * 365 * 18 / (tvlUsd || 1) * 100)).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-zinc-500">APR pós-emissões</div>
          <div className="font-mono font-semibold text-zinc-300">
            {feeApr.toFixed(2)}%
          </div>
        </div>
      </div>
      
      <div className="text-[11px] text-zinc-400 space-y-1">
        <div>AERO restantes: <span className="font-mono text-zinc-300">{(rewardsLeft / 1e6).toFixed(2)}M</span></div>
        <div>Impacto: <span className="text-warn">-{((gauge.rewardRatePerSecond * 86400 * 365 * 18 / (tvlUsd || 1) * 100)).toFixed(2)}%</span> quando expirar</div>
      </div>
      
      <a
        href="https://vote.aerodrome.finance"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-[11px] text-warn hover:text-warn/80 transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Verificar proposta de renovação na governança
      </a>
    </div>
  )
}

function GaugeDetails({ gauge, aeroPrice, tvlUsd }: {
  gauge: PoolAnalysisResult['gauge']
  aeroPrice: number
  tvlUsd: number
}) {
  const now = Math.floor(Date.now() / 1000)
  const secondsLeft = Math.max(0, gauge.periodFinish - now)
  const totalAeroLeft = Number(gauge.rewardRatePerSecond) * secondsLeft
  
  const estimatedEmissionApr = tvlUsd > 0 && aeroPrice > 0
    ? (gauge.rewardRatePerSecond * 86400 * 365 * aeroPrice / tvlUsd) * 100
    : 0
  
  return (
    <div className="bg-bg border border-border rounded-xl p-4 space-y-3">
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
        Métricas Detalhadas do Gauge
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-bg-secondary rounded-lg p-2.5">
          <div className="text-zinc-500 mb-1">AERO até expiração</div>
          <div className="font-mono font-semibold text-zinc-200">
            {totalAeroLeft > 0 ? `${(totalAeroLeft / 1e6).toFixed(2)}M` : '—'}
          </div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2.5">
          <div className="text-zinc-500 mb-1">Diário (AERO)</div>
          <div className="font-mono font-semibold text-zinc-200">
            {gauge.rewardRatePerSecond > 0 
              ? `${(gauge.rewardRatePerSecond * 86400 / 1e6).toFixed(2)}M`
              : '—'}
          </div>
        </div>
        <div className="bg-bg-secondary rounded-lg p-2.5 col-span-2">
          <div className="text-zinc-500 mb-1 flex items-center gap-1">
            Cálculo do APR de Emissões
            <span className="text-zinc-600 text-[10px]">(rewardRate × 86400 × 365 × price ÷ TVL)</span>
          </div>
          <div className="font-mono text-sm text-zinc-300">
            ({gauge.rewardRatePerSecond.toFixed(6)} × 86400 × 365 × ${aeroPrice.toFixed(2)} ÷ ${fmtUSD(tvlUsd)}) = 
            <span className="text-bull font-semibold ml-1">{estimatedEmissionApr.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function WashTradingAlert({ vol1d, tvlUsd, feeApr }: { vol1d: number | null; tvlUsd: number; feeApr: number }) {
  if (!vol1d || tvlUsd <= 0) return null
  
  const ratio = vol1d / tvlUsd
  if (ratio < 2.5) return null
  
  // Fee típica de pools WETH/USDC 0.05% = 0.05% APR
  // fee tier 0.05% = 500 bps = 0.5% por trade
  // Volume diário esperado ≈ TVL * (fee tier) * (1/365) para 1x turnover diário
  const TYPICAL_FEE_TIER = 0.0005 // 0.05%
  const expectedDailyVolume = tvlUsd * TYPICAL_FEE_TIER / 365 * 2 // ~2x turnover diário normal
  
  const inflatedRatio = vol1d / expectedDailyVolume
  
  return (
    <div className="bg-bear/10 border border-bear/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-bear text-xs font-semibold">
        <AlertTriangle className="w-3.5 h-3.5" />
        Volume Suspício (Wash Trading?)
      </div>
      <div className="text-[11px] text-zinc-400 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-zinc-500">Volume declarado</div>
            <div className="font-mono text-zinc-200">{fmtUSD(vol1d)}/dia</div>
          </div>
          <div>
            <div className="text-zinc-500">Volume "normal" para esse TVL</div>
            <div className="font-mono text-bull">{fmtUSD(expectedDailyVolume)}/dia</div>
          </div>
        </div>
        
        <div className="bg-bg-secondary rounded-lg p-2 space-y-1">
          <div className="text-zinc-400">
            <span className="text-bear font-semibold">{inflatedRatio.toFixed(0)}×</span> maior que o esperado
          </div>
          <div className="text-zinc-500 text-[10px]">
            Com TVL de {fmtUSD(tvlUsd)} e fee tier 0.05%, seria normal ter ~{fmtUSD(expectedDailyVolume)}/dia. 
            Um pool com {fmtUSD(vol1d)}/dia de volume está operando com volume {inflatedRatio.toFixed(0)}× acima do normal.
          </div>
        </div>
        
        {inflatedRatio > 5 && (
          <div className="text-bear/80">
            ⚠️ <strong>Cuidado:</strong> Esse volume parece muito alto. Pode ser wash trading (volume inflado artificialmente para ganhar recompensas de gauge). Recomendação: Verifique as fees reais recebidas antes de depositar capital significativo.
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const [showInfo, setShowInfo] = useState(false)
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="relative w-24 h-24 shrink-0 group">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1e2330" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-xl font-bold" style={{ color }}>{score}</span>
        <span className="text-[9px] text-zinc-500 uppercase">/100</span>
        <button 
          onClick={() => setShowInfo(!showInfo)}
          className="absolute bottom-1"
        >
          <Info className="w-3 h-3 text-zinc-600 hover:text-zinc-400" />
        </button>
      </div>
      
      {/* Modal explicativo - com position fixed para garantir visibilidade */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInfo(false)}>
          <div 
            className="bg-bg-secondary border border-border rounded-xl p-5 shadow-2xl text-xs max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-semibold text-zinc-300 mb-4 flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-accent" />
              Como o Score é calculado
            </div>
            <div className="space-y-3 text-zinc-400">
              <div className="flex justify-between items-center">
                <span>APR Ajustado (Fee + Emission)</span>
                <span className="text-zinc-300 font-mono bg-zinc-800 px-2 py-0.5 rounded">0-40 pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span>TVL (Liquidez)</span>
                <span className="text-zinc-300 font-mono bg-zinc-800 px-2 py-0.5 rounded">0-25 pts</span>
              </div>
              <div className="text-[10px] text-zinc-500 pl-1">
                $10M+ = 25 | $2M+ = 20 | $500K+ = 13 | $100K+ = 6
              </div>
              <div className="flex justify-between items-center mt-2">
                <span>Gauge Ativo (Emissões)</span>
                <span className="text-zinc-300 font-mono bg-zinc-800 px-2 py-0.5 rounded">0-20 pts</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Sustentabilidade (% Fees)</span>
                <span className="text-zinc-300 font-mono bg-zinc-800 px-2 py-0.5 rounded">0-15 pts</span>
              </div>
              <div className="text-[10px] text-zinc-500 pl-1">
                Maior peso se fees &gt; emissions
              </div>
              <div className="flex justify-between items-center mt-2 text-bear">
                <span>Penalidade (expira &lt;3 dias)</span>
                <span className="font-mono bg-bear/20 px-2 py-0.5 rounded">-15 pts</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <div className="text-[10px] text-zinc-500 text-center">
                <span className="text-bull font-semibold">≥75</span> Excellent · 
                <span className="text-accent ml-1">≥55</span> Good · 
                <span className="text-warn ml-1">≥35</span> Fair · 
                <span className="text-bear ml-1">&lt;35</span> Poor
              </div>
            </div>
            <button 
              onClick={() => setShowInfo(false)}
              className="mt-4 w-full bg-accent hover:bg-accent/80 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
function TechnicalRadarSection({ chain, address, symbol }: { chain: string; address: string; symbol: string }) {
  const { data, loading } = useTechnicalAnalysis(chain, address, 0, 0, 5 * 60 * 1000, symbol)

  if (loading && !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 animate-pulse">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-border/50 rounded-xl" />
        ))}
      </div>
    )
  }

  const indicators = data?.indicators
  const hasData = indicators && (indicators.rsi !== null || indicators.currentPrice !== null)
  
  if (!hasData) {
    return (
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Activity className="w-3 h-3" /> Radar Técnico
        </div>
        <div className="text-xs text-zinc-500 text-center py-4">
          Dados técnicos indisponíveis para esta rede/pool.
          <br />
          <span className="text-[10px] text-zinc-600">
            Otimizado para pools Base (Aerodrome). Outras redes em breve.
          </span>
        </div>
      </div>
    )
  }

  // Lógica de Range Sugerido
  const isSqueeze = (indicators.bollingerBands?.bandwidth ?? 10) < 2.5
  const isVolatile = (indicators.bollingerBands?.bandwidth ?? 0) > 10
  const isTrending = (indicators.rsi ?? 50) > 60 || (indicators.rsi ?? 50) < 40
  
  let suggestedRange = 'Balanced'
  let rangeColor = 'text-accent'
  
  if (isSqueeze) {
    suggestedRange = 'Aggressive'
    rangeColor = 'text-bull'
  } else if (isVolatile || isTrending) {
    suggestedRange = 'Conservative'
    rangeColor = 'text-warn'
  }

  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Activity className="w-3 h-3 text-accent" /> Radar Técnico (Real-time)
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="relative group">
          <MetricBox 
            label="RSI (14)" 
            value={indicators.rsi ? indicators.rsi.toFixed(1) : '--'} 
            sub={(indicators.rsi ?? 50) > 60 ? 'Força Alta ↑' : (indicators.rsi ?? 50) < 40 ? 'Força Baixa ↓' : 'Estável'}
            color={(indicators.rsi ?? 50) > 60 ? 'text-green-400' : (indicators.rsi ?? 50) < 40 ? 'text-red-400' : 'text-gray-400'}
          />
          <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
            <div className="font-semibold text-zinc-300 mb-1">RSI (Relative Strength Index)</div>
            <div className="space-y-1.5">
              <div><span className="text-green-400">≥70</span> = Sobrecomprado - possível correção</div>
              <div><span className="text-red-400">≤30</span> = Sobrevendido - possível alta</div>
              <div><span className="text-zinc-500">40-60</span> = Estável</div>
            </div>
            <div className="mt-2 pt-2 border-t border-border text-zinc-500">
              Período: 14 candles
            </div>
          </div>
        </div>
        <div className="relative group">
          <MetricBox 
            label="MACD" 
            value={indicators.macd?.histogram != null ? indicators.macd.histogram.toFixed(2) : '--'} 
            sub={(indicators.macd?.histogram ?? 0) > 0 ? 'Momentum Alta' : 'Momentum Baixa'}
            color={(indicators.macd?.histogram ?? 0) > 0 ? 'text-green-400' : 'text-red-400'}
          />
          <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
            <div className="font-semibold text-zinc-300 mb-1">MACD (Moving Average Convergence Divergence)</div>
            <div className="space-y-1.5">
              <div>Histograma: diferença entre MACD e linha de sinal</div>
              <div><span className="text-green-400">Positivo</span> = Momentum de alta</div>
              <div><span className="text-red-400">Negativo</span> = Momentum de baixa</div>
            </div>
            <div className="mt-2 pt-2 border-t border-border text-zinc-500">
              Config: 12/26/9 (padrão)
            </div>
          </div>
        </div>
        <div className="relative group">
          <MetricBox 
            label="%B" 
            value={indicators.bollingerBands?.percentB != null ? `${(indicators.bollingerBands.percentB * 100).toFixed(0)}%` : '--'} 
            sub="Posição na Banda"
          />
          <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
            <div className="font-semibold text-zinc-300 mb-1">%B (Percent Bollinger)</div>
            <div className="space-y-1.5">
              <div>Posição do preço dentro das Bandas de Bollinger</div>
              <div><span className="text-green-400">100%</span> = No topo da banda superior</div>
              <div><span className="text-red-400">0%</span> = No fundo da banda inferior</div>
              <div><span className="text-zinc-500">50%</span> = No centro das bandas</div>
            </div>
          </div>
        </div>
        <div className="relative group">
          <MetricBox 
            label="Bandwidth" 
            value={indicators.bollingerBands?.bandwidth != null ? `${indicators.bollingerBands.bandwidth.toFixed(1)}%` : '--'} 
            sub={isSqueeze ? 'Squeeze 🔥' : 'Normal'}
            color={isSqueeze ? 'text-bull' : 'text-gray-400'}
          />
          <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
            <div className="font-semibold text-zinc-300 mb-1">Bandwidth (Largura das Bandas)</div>
            <div className="space-y-1.5">
              <div>Mede a volatilidade atual do preço</div>
              <div><span className="text-bull">&lt;2.5%</span> = Squeeze - baixa volatilidade</div>
              <div><span className="text-warn">&gt;10%</span> = Alta volatilidade</div>
              <div><span className="text-zinc-500">2.5-10%</span> = Normal</div>
            </div>
            <div className="mt-2 pt-2 border-t border-border text-zinc-500">
              Squeeze = oportunidade para range estreito
            </div>
          </div>
        </div>
        <div className="relative group">
          <MetricBox 
            label="Range Sugerido" 
            value={suggestedRange} 
            sub="Baseado em Volatilidade"
            color={rangeColor}
          />
          <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-64 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
            <div className="font-semibold text-zinc-300 mb-1">Explicação dos modos:</div>
            <div className="space-y-1.5">
              <div><span className="text-bull">Aggressive</span> – Volatilidade baixa (squeeze). Range estreito para mais taxas.</div>
              <div><span className="text-accent">Balanced</span> – Volatilidade normal. Range 2-3× ATR.</div>
              <div><span className="text-warn">Conservative</span> – Alta volatilidade ou tendência forte. Range amplo para evitar IL.</div>
            </div>
            <div className="mt-2 pt-2 border-t border-border text-zinc-500">
              Atual: <span className="text-zinc-300">{indicators.bollingerBands?.bandwidth != null ? `${indicators.bollingerBands.bandwidth.toFixed(1)}%` : '--'}</span> bandwidth
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Result Panel ─────────────────────────────────────────────────────────────
function AnalysisResult({ result, onSave, isSaved }: { 
  result: PoolAnalysisResult; 
  onSave: (res: PoolAnalysisResult) => void;
  isSaved: boolean;
}) {
  const { onChain, gauge, defiLlama, score, verdict, verdictColor, verdictEmoji,
    totalApr, feeApr, emissionApr, tvlUsd, aeroPrice, reasons, warnings, alternatives } = result

  const pairLabel = `${onChain.token0.symbol} / ${onChain.token1.symbol}`
  const feeLabel = onChain.feeTier ? `${(onChain.feeTier / 10000).toFixed(2)}%` : '—'
  const dl = defiLlama

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-5"
    >
      {/* ── Header card ── */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-5 flex-wrap">
          <ScoreRing score={score} color={verdictColor} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold">{pairLabel}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full border"
                style={{ borderColor: verdictColor + '55', backgroundColor: verdictColor + '18', color: verdictColor }}>
                {onChain.type === 'clmm' ? 'CLMM' : 'V2'}
              </span>
              <span className="text-xs text-zinc-500">Fee {feeLabel}</span>
              <span className="text-xs text-zinc-500">· {dl?.chain ?? 'Base'}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="text-2xl">{verdictEmoji}</span>
              <span className="text-lg font-bold" style={{ color: verdictColor }}>
                {verdict === 'EXCELLENT' ? 'EXCELENTE' : verdict === 'GOOD' ? 'BOM' : verdict === 'FAIR' ? 'REGULAR' : 'RUIM'}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs font-mono text-zinc-500 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="truncate max-w-[120px]">{result.poolAddress}</span>
                <CopyButton text={result.poolAddress} />
              </div>
              
              <div className="flex items-center gap-3 border-l border-border pl-3">
                <a href={`https://basescan.org/address/${result.poolAddress}`} target="_blank"
                  rel="noopener noreferrer" className="text-accent hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> BaseScan
                </a>

                <a href={onChain.type === 'clmm' 
                  ? `https://aerodrome.finance/liquidity/${result.poolAddress}`
                  : `https://aerodrome.finance/deposit?pool=${result.poolAddress}`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-purple-400 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> Aerodrome
                </a>

                {dl && (
                  <a href={`https://defillama.com/yields/pool/${dl.pool}`} target="_blank"
                    rel="noopener noreferrer" className="text-zinc-400 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> DefiLlama
                  </a>
                )}
              </div>
            </div>
          </div>
          
          <button
            onClick={() => onSave(result)}
            disabled={isSaved}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
              isSaved
                ? 'bg-bull/10 border-bull/20 text-bull cursor-default'
                : 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/20'
            }`}
          >
            {isSaved ? (
              <><Check className="w-3.5 h-3.5" /> Na minha lista</>
            ) : (
              <><Plus className="w-3.5 h-3.5" /> Adicionar à lista</>
            )}
          </button>
        </div>
      </div>

      {/* ── APR metrics ── */}
      <div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3" /> Retornos
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative group">
            <MetricBox label="APR Total" value={fmtPct(totalApr)} color="text-bull" icon={TrendingUp} />
            <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
              <div className="font-semibold text-zinc-300 mb-1">APR Total</div>
              <div className="space-y-1.5">
                <div>Soma de Fees + Emissões do gauge</div>
                <div className="pt-2 border-t border-border">
                  <div className="text-zinc-500 font-medium mb-1">Benchmarks:</div>
                  <div><span className="text-zinc-400">&lt;5%</span> = Baixo retorno</div>
                  <div><span className="text-accent">5-20%</span> = Normal</div>
                  <div><span className="text-bull">&gt;20%</span> = Excelente</div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative group">
            <MetricBox label="Fees (base)" value={fmtPct(feeApr)} color="text-accent" icon={Droplets} />
            <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
              <div className="font-semibold text-zinc-300 mb-1">Fees (Taxas)</div>
              <div className="space-y-1.5">
                <div>APR baseado nas taxas de trading coletadas</div>
                <div className="text-zinc-500 mt-2">Varia conforme volume e fee tier da pool:</div>
                <div><span className="text-zinc-400">0.01%</span> = Stable pools</div>
                <div><span className="text-zinc-400">0.05%</span> = Pools normais</div>
                <div><span className="text-zinc-400">0.3%</span> = Pools concentradas</div>
              </div>
            </div>
          </div>
          <div className="relative group">
            <MetricBox label="Emissões" value={fmtPct(emissionApr)}
              color={emissionApr > 0 ? 'text-warn' : 'text-zinc-600'}
              sub={gauge.isActive ? 'Ativo' : 'Expirado'} icon={Zap}
            />
            <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
              <div className="font-semibold text-zinc-300 mb-1">Emissões (Token Rewards)</div>
              <div className="space-y-1.5">
                <div>APR das emissões do gauge (AERO)</div>
                <div className="pt-2 border-t border-border">
                  <div className="text-zinc-500 font-medium mb-1">Status do Gauge:</div>
                  <div><span className="text-bull">Ativo</span> = recebe emissões</div>
                  <div><span className="text-zinc-500">Expirado</span> = sem emissões</div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative group">
            <MetricBox label="APR Média 30d" value={fmtPct(dl?.apyMean30d ?? 0)} icon={BarChart3} />
            <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
              <div className="font-semibold text-zinc-300 mb-1">APR Média 30d</div>
              <div className="space-y-1.5">
                <div>Média móvel do APR nos últimos 30 dias</div>
                <div className="pt-2 border-t border-border">
                  <div className="text-zinc-500 font-medium mb-1">Importante:</div>
                  <div>Use para validar consistência do APR atual</div>
                  <div><span className="text-warn">Alta variação</span> = instável</div>
                  <div><span className="text-bull">Estável</span> = sustentável</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Radar Técnico (Real-time) ── */}
      <TechnicalRadarSection chain={dl?.chain || 'base'} address={result.poolAddress} symbol={onChain.token0.symbol} />


      {/* ── TVL / Volume ── */}
      <div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3" /> Liquidez & Volume
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="relative group">
            <MetricBox label="TVL" value={fmtUSD(tvlUsd)} color="text-accent" icon={Shield} />
            <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
              <div className="font-semibold text-zinc-300 mb-1">TVL (Total Value Locked)</div>
              <div className="space-y-1.5">
                <div>Valor total de liquidez depositado na pool</div>
                <div className="pt-2 border-t border-border">
                  <div className="text-zinc-500 font-medium mb-1">Benchmarks:</div>
                  <div><span className="text-warn">&lt;$100k</span> = Arriscado - rug pull</div>
                  <div><span className="text-accent">$100k-$1M</span> = Baixa profundidade</div>
                  <div><span className="text-bull">&gt;$1M</span> = Boa liquidez</div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative group">
            <MetricBox 
              label="Liquidez In-Range" 
              value={result.onChain.liquidity !== '0' ? (BigInt(result.onChain.liquidity) / 10n**12n).toString() + 'T' : '—'} 
              sub="Ativa no preço atual"
              icon={Zap} 
            />
            <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
              <div className="font-semibold text-zinc-300 mb-1">Liquidez In-Range</div>
              <div className="space-y-1.5">
                <div>Quantidade de liquidez concentrada dentro do range de preço atual</div>
                <div className="pt-2 border-t border-border">
                  <div className="text-zinc-500">Mais liquidez = menos slippage para traders</div>
                </div>
                <div className="text-zinc-500">100% = toda liquidez ativa</div>
              </div>
            </div>
          </div>
          <div className="relative group">
            <MetricBox label="Volume 24h" value={fmtUSD(result.defiLlama?.vol1d ?? 0)} icon={Activity} />
            <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-56 bg-[#0a0a0a] border border-border rounded-lg p-3 text-[11px] text-zinc-400 shadow-xl">
              <div className="font-semibold text-zinc-300 mb-1">Volume 24h</div>
              <div className="space-y-1.5">
                <div>Total de trades nas últimas 24 horas</div>
                <div className="pt-2 border-t border-border">
                  <div className="text-zinc-500 font-medium mb-1">Benchmarks:</div>
                  <div><span className="text-warn">&lt;$10k</span> = Baixo volume</div>
                  <div><span className="text-zinc-400">$10k-$100k</span> = Normal</div>
                  <div><span className="text-bull">&gt;$1M</span> = Muito ativo</div>
                </div>
              </div>
            </div>
          </div>
          <div className="relative group">
            <MetricBox 
              label="Eficiência de Capital" 
              value={result.capitalEfficiency > 0 ? result.capitalEfficiency.toFixed(2) + '×' : '—'} 
              sub="Volume / TVL"
              color={result.capitalEfficiency > 2 ? 'text-warn' : result.capitalEfficiency < 1 ? 'text-zinc-500' : 'text-bull'}
              icon={TrendingUp} 
            />
            <div className="absolute z-10 hidden group-hover:block bottom-full left-0 mb-2 w-72 bg-[#0a0a0a] border border-bull/30 rounded-lg p-3 text-xs text-zinc-400 shadow-xl">
              <div className="font-semibold text-bull mb-2">📊 O que é Eficiência de Capital?</div>
              <div className="space-y-2">
                <div>Mede quanto volume de trade acontece para cada dollar de liquidez no pool.</div>
                <div className="pt-2 border-t border-border">
                  <div className="text-zinc-500 font-medium mb-1">Benchmarks:</div>
                  <div className="grid gap-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-zinc-700 rounded text-[10px]">&lt;1×</span>
                      <span className="text-zinc-400">Liquidez ociosa - poucos trades</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">1-2×</span>
                      <span className="text-zinc-400">Eficiente - volume normal</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 bg-warn/20 text-warn rounded text-[10px]">&gt;3×</span>
                      <span className="text-zinc-400">Alto volume - verifique wash trading</span>
                    </div>
                  </div>
                </div>
                <div className="pt-2 text-zinc-500 text-[10px]">
                  Seu pool: {result.capitalEfficiency.toFixed(2)}× {result.capitalEfficiency < 1 ? '(abaixo do ideal)' : result.capitalEfficiency > 3 ? '(suspeito)' : '(normal)'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── IL Estimator ── */}
      {defiLlama && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3 text-accent" /> Estimativa de Impermanent Loss
          </div>
          <div className="text-[11px] text-zinc-400">
            IL estimado para diferentes movimentos de preço (posição concentrada ~50% bandwidth):
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {[
              { pct: -20, label: '-20%' },
              { pct: -10, label: '-10%' },
              { pct: 10, label: '+10%' },
              { pct: 20, label: '+20%' },
            ].map(({ pct, label }) => {
              const { rangeLow, rangeHigh } = defaultConcentratedRange(1, 20)
              const il = Math.abs(concentratedILForPriceChange(pct, rangeLow, rangeHigh, 1))
              return (
                <div key={pct} className="bg-bg-secondary rounded-lg p-2 text-center">
                  <div className="text-zinc-500 mb-1">{label}</div>
                  <div className={`font-mono font-semibold ${il > 5 ? 'text-bear' : il > 2 ? 'text-warn' : 'text-zinc-300'}`}>
                    -{il.toFixed(2)}%
                  </div>
                </div>
              )
            })}
          </div>
          <div className="text-[10px] text-zinc-500">
            Range simétrico ±10% em torno do preço de entrada (CLMM). Ranges mais estreitos amplificam o IL.
          </div>
        </div>
      )}

      {/* ── Gauge details ── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-warn" /> Gauge & Infraestrutura
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <div className="text-zinc-500 mb-0.5">Tick Spacing</div>
            <div className="font-mono font-semibold text-zinc-200">
              {result.onChain.tickSpacing || '—'}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 mb-0.5">Spread Mínimo</div>
            <div className="font-mono font-semibold text-bull">
              {result.onChain.tickSpacing ? (result.onChain.tickSpacing * 0.01).toFixed(2) + '%' : '—'}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 mb-0.5">Taxa/segundo</div>
            <div className="font-mono font-semibold text-zinc-200">
              {gauge.rewardRatePerSecond.toFixed(6)} {gauge.rewardToken.symbol}
            </div>
          </div>
          <div>
            <div className="text-zinc-500 mb-0.5">Emissões anuais</div>
            <div className="font-mono font-semibold text-zinc-200">
              {gauge.annualRewardTokens > 0
                ? `${(gauge.annualRewardTokens / 1e6).toFixed(2)}M ${gauge.rewardToken.symbol}`
                : '—'}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 items-center pt-2 border-t border-border/50">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase mb-1.5">Período de Emissões</div>
            <div className={`font-mono text-sm font-semibold flex items-center gap-1.5 ${gauge.isActive ? 'text-bull' : 'text-bear'}`}>
              <Clock className="w-3.5 h-3.5" />
              {gauge.isActive
                ? `${fmtTs(gauge.periodFinish)} (${daysLeft(gauge.periodFinish)} restantes)`
                : gauge.periodFinish > 0 ? `Expirou em ${fmtTs(gauge.periodFinish)}` : 'Inativo'}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-[10px] text-zinc-500 uppercase">Endereço do Gauge</div>
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="truncate max-w-[150px]">{result.gaugeAddress}</span>
              <CopyButton text={result.gaugeAddress} />
            </div>
          </div>
        </div>
        
        {/* Posição do Usuário */}
        <UserPositionCard 
          poolAddress={result.poolAddress} 
          gaugeAddress={result.gaugeAddress}
          token0Symbol={onChain.token0.symbol}
          token1Symbol={onChain.token1.symbol}
        />
        
        {/* Projeção pós-emissões */}
        <GaugeExpiryAlert gauge={gauge} feeApr={feeApr} tvlUsd={tvlUsd} />
        
        {/* Métricas detalhadas do gauge */}
        <GaugeDetails gauge={gauge} aeroPrice={aeroPrice} tvlUsd={tvlUsd} />
      </div>

      {/* Alerta de wash trading */}
      {defiLlama?.vol1d && (
        <WashTradingAlert vol1d={defiLlama.vol1d} tvlUsd={tvlUsd} feeApr={feeApr} />
      )}

      {/* ── Reasons & Warnings ── */}
      {(reasons.length > 0 || warnings.length > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          {reasons.length > 0 && (
            <div className="bg-bull/5 border border-bull/20 rounded-xl p-4 space-y-2">
              <div className="text-[10px] text-bull uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> Pontos Positivos
              </div>
              {reasons.map((r, i) => (
                <div key={i} className="text-xs text-zinc-300 flex items-start gap-2">
                  <span className="text-bull mt-0.5">✓</span> {r}
                </div>
              ))}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="bg-bear/5 border border-bear/20 rounded-xl p-4 space-y-2">
              <div className="text-[10px] text-bear uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> Alertas
              </div>
              {warnings.map((w, i) => (
                <div key={i} className="text-xs text-zinc-300">{w}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Alternatives ── */}
      {alternatives.length > 0 && (
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3" /> Alternativas com APR Superior
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2.5 text-zinc-500 font-medium">Par</th>
                  <th className="text-left px-4 py-2.5 text-zinc-500 font-medium">Protocolo</th>
                  <th className="text-left px-4 py-2.5 text-zinc-500 font-medium">Rede</th>
                  <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">APR</th>
                  <th className="text-right px-4 py-2.5 text-zinc-500 font-medium">TVL</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {alternatives.map((alt, i) => (
                  <tr key={alt.pool}
                    className={`border-b border-border last:border-0 transition-colors hover:bg-row-hover ${
                      alt.apy > totalApr * 1.5 ? 'bg-bull/3' : ''
                    }`}>
                    <td className="px-4 py-2.5 font-medium text-zinc-200">{alt.symbol}</td>
                    <td className="px-4 py-2.5 text-zinc-400 capitalize">{alt.project}</td>
                    <td className="px-4 py-2.5 text-zinc-400">{alt.chain}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-bull">{fmtPct(alt.apy)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{fmtUSD(alt.tvlUsd)}</td>
                    <td className="px-4 py-2.5">
                      <a href={`https://defillama.com/yields/pool/${alt.pool}`} target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:text-accent/70 transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-zinc-600 mt-2">
            * Alternativas encontradas via DefiLlama com o mesmo par de tokens e APR superior ao atual.
            Avalie o risco antes de migrar.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-[11px] text-zinc-600">
          Análise gerada em {new Date(result.fetchedAt).toLocaleTimeString('pt-BR')} · DYOR. Não é recomendação financeira.
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-accent transition-colors"
          title="Atualizar dados"
        >
          <RefreshCw className="w-3 h-3" />
          Atualizar
        </button>
      </div>
    </motion.div>
  )
}

const AERODROME_NPM = '0x827922686190790b37229fd06084350E74485b72'
const AERODROME_FACTORY = '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A'

// ─── Portfolio Components ─────────────────────────────────────────────────────
import { base } from 'wagmi/chains'

function PortfolioView({ onSelectPool }: { onSelectPool: (addr: string) => void }) {
  const { address, isConnected } = useAccount()
  // Força a leitura SEMPRE na rede Base, independente da carteira do usuário
  const publicClient = usePublicClient({ chainId: base.id })
  const [positions, setPositions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isConnected && address) {
      scanPositions()
    }
  }, [isConnected, address, publicClient])

  async function scanPositions() {
    if (!address || !publicClient) return
    setLoading(true)
    setPositions([])
    
    try {
      // 0. Verifica se o endereço realmente é um contrato na rede atual
      const code = await publicClient.getCode({ address: AERODROME_NPM })
      if (!code || code === '0x' || code === '0x0') {
        console.warn(`[Scanner] Endereço ${AERODROME_NPM} não é um contrato válido nesta rede.`)
        return
      }

      // 1. Ler o saldo de NFTs "soltos" na carteira
      let unstakedIds: bigint[] = []
      try {
        const balance = await publicClient.readContract({
          address: AERODROME_NPM,
          abi: NPM_ABI,
          functionName: 'balanceOf',
          args: [address],
        }) as bigint

        for (let i = 0; i < Number(balance); i++) {
          const tokenId = await publicClient.readContract({
            address: AERODROME_NPM,
            abi: NPM_ABI,
            functionName: 'tokenOfOwnerByIndex',
            args: [address, BigInt(i)],
          }) as bigint
          unstakedIds.push(tokenId)
        }
      } catch (error: any) {
        if (error.message?.includes('returned no data') || error.name === 'ContractFunctionZeroDataError') {
          console.warn(`[Scanner] NPM não suportado nesta rede.`)
        }
      }

      // 1.5 Ler NFTs que estão em Farm (Staked) nos Gauges conhecidos
      const KNOWN_GAUGES = [
        '0xF33a96b5932D9E9B9A0eDA447AbD8C9d48d2e0c8' // Gauge informado pelo usuário
      ]
      let stakedIds: bigint[] = []

      for (const gauge of KNOWN_GAUGES) {
        try {
          const ids = await publicClient.readContract({
            address: gauge as `0x${string}`,
            abi: [{ name: 'stakedValues', type: 'function', inputs: [{type:'address'}], outputs: [{type:'uint256[]'}] }],
            functionName: 'stakedValues',
            args: [address],
          }) as bigint[]
          stakedIds = [...stakedIds, ...ids]
        } catch (e) {
          console.warn(`[Scanner] Sem posições no Gauge ${gauge}`)
        }
      }

      const allTokenIds = [...unstakedIds, ...stakedIds]
      if (allTokenIds.length === 0) return

      const foundPositions = []

      // 2. Buscar detalhes de cada NFT (Staked ou não)
      for (const tokenId of allTokenIds) {

        const details: any = await publicClient.readContract({
          address: AERODROME_NPM,
          abi: NPM_ABI,
          functionName: 'positions',
          args: [tokenId],
        })

        let poolAddress = ''
        try {
          poolAddress = await publicClient.readContract({
            address: AERODROME_FACTORY,
            abi: [{ name: 'getPool', type: 'function', inputs: [{type:'address'}, {type:'address'}, {type:'int24'}], outputs: [{type:'address'}] }],
            functionName: 'getPool',
            args: [details[2], details[3], details[4]],
          }) as string
        } catch(e) {
          console.warn(`[Scanner] Falha ao resolver endereço da Pool para NFT ${tokenId}`)
        }

        foundPositions.push({
          id: tokenId.toString(),
          poolAddress,
          token0: details[2],
          token1: details[3],
          fee: details[4],
          liquidity: details[7].toString(),
          tickLower: details[5],
          tickUpper: details[6],
        })
      }

      setPositions(foundPositions)
    } catch (error) {
      console.error('Erro ao escanear portfólio:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-card/30 border border-dashed border-border rounded-2xl p-8 text-center">
        <Shield className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-zinc-400">Portfólio Privado</h3>
        <p className="text-xs text-zinc-600 mt-1 max-w-xs mx-auto">
          Conecte sua carteira para escanear automaticamente seus contratos de liquidez no Aerodrome e Uniswap.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
      {/* Background glow para destacar o portfólio */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/5 blur-[100px] pointer-events-none" />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
            <BarChart2 className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-200">Meu Portfólio Ativo</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-mono">
                {address?.slice(0, 6)}...{address?.slice(-4)} &middot; Base Network
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={scanPositions}
          disabled={loading}
          className="bg-accent/10 hover:bg-accent/20 border border-accent/30 px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold text-accent transition-all flex items-center gap-2 group"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />}
          {loading ? 'Sincronizando...' : 'Escanear Blockchain'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 py-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent/40 mx-auto mb-2" />
          <p className="text-[11px] text-zinc-500 animate-pulse">Lendo contratos inteligentes do Aerodrome Slipstream...</p>
        </div>
      ) : positions.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-border rounded-xl">
          <Droplets className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
          <p className="text-xs text-zinc-500 italic">Nenhum NFT de liquidez (CLMM) detectado nesta carteira no momento.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {positions.map((pos) => (
            <div key={pos.id} className="bg-bg border border-border rounded-xl p-3 flex items-center justify-between hover:border-accent/30 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent group-hover:bg-accent/20 transition-colors">
                  #{pos.id}
                </div>
                <div>
                  <div className="text-[11px] font-bold text-zinc-200">Aerodrome CLMM</div>
                  <div className="text-[9px] text-zinc-500 font-mono truncate max-w-[150px]">
                    {pos.token0.slice(0,6)}... / {pos.token1.slice(0,6)}...
                  </div>
                </div>
              </div>
              <div className="text-right mr-3">
                <div className="text-[10px] font-mono text-bull">Liq: {pos.liquidity.slice(0,8)}...</div>
                <div className="text-[9px] text-zinc-600">Tick: {pos.tickLower} / {pos.tickUpper}</div>
              </div>
              <button 
                onClick={() => {
                  if (pos.poolAddress) {
                    onSelectPool(pos.poolAddress)
                  } else {
                    alert('Endereço da Pool não resolvido.')
                  }
                }}
                className="p-2 hover:bg-accent/10 rounded-lg text-accent transition-colors"
                title="Analisar esta Pool"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function PoolAnalyzer() {
  const [poolAddress, setPoolAddress] = useState('')
  const [gaugeAddress, setGaugeAddress] = useState('')
  const [result, setResult] = useState<PoolAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  
  const [savedPools, setSavedPools] = useState<SavedPool[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('clmm_saved_pools')
    if (stored) {
      try {
        setSavedPools(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to parse saved pools', e)
      }
    }
    setIsInitialized(true)
  }, [])

  // Save to localStorage
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('clmm_saved_pools', JSON.stringify(savedPools))
    }
  }, [savedPools, isInitialized])

  const isValid = (poolAddress.startsWith('http') || /^0x[0-9a-fA-F]{40}$/.test(poolAddress)) && 
    (gaugeAddress === '' || /^0x[0-9a-fA-F]{40}$/.test(gaugeAddress))

  async function run() {
    setError(null)
    let targetPool = poolAddress.trim()
    let targetGauge = gaugeAddress.trim()

    // URL Parsing Logic
    if (targetPool.startsWith('http')) {
      try {
        const url = new URL(targetPool)
        const parts = url.pathname.split('/')
        // Uniswap: /explore/pools/{network}/{id}
        if (url.hostname.includes('uniswap.org')) {
          const networkIndex = parts.indexOf('pools') + 1
          if (networkIndex > 0 && parts[networkIndex + 1]) {
            targetPool = parts[networkIndex + 1]
            console.log(`Detected Uniswap pool ID: ${targetPool} on network ${parts[networkIndex]}`)
          }
        }
        // Aerodrome: /liquidity/{address}
        else if (url.hostname.includes('aerodrome.finance')) {
          const liqIndex = parts.indexOf('liquidity')
          if (liqIndex > -1 && parts[liqIndex + 1]) {
            targetPool = parts[liqIndex + 1]
          }
        }
        setPoolAddress(targetPool)
      } catch (e) {
        console.error('URL parsing failed', e)
      }
    }

    if (!targetPool) return

    startTransition(async () => {
      try {
        const { analyzePoolAction } = await import('@/app/actions/analyzer')
        const res = await analyzePoolAction(targetPool, targetGauge)
        setResult(res)
      } catch (e: any) {
        setError(e?.message ?? 'Erro ao analisar pool. Verifique os endereços e tente novamente.')
      }
    })
  }

  function loadPreset(preset: { pool: string; gauge: string }) {
    setPoolAddress(preset.pool)
    setGaugeAddress(preset.gauge)
    setResult(null)
    setError(null)
  }

  function savePool(res: PoolAnalysisResult) {
    const id = `${res.poolAddress}-${res.gaugeAddress}`.toLowerCase()
    if (savedPools.some(p => p.id === id)) return

    const newPool: SavedPool = {
      id,
      pool: res.poolAddress,
      gauge: res.gaugeAddress,
      label: `${res.onChain.token0.symbol}/${res.onChain.token1.symbol}`,
      addedAt: Date.now(),
    }
    setSavedPools(prev => [newPool, ...prev])
  }

  function removePool(id: string) {
    setSavedPools(prev => prev.filter(p => p.id !== id))
  }

  const isCurrentSaved = result ? savedPools.some(p => p.id === `${result.poolAddress}-${result.gaugeAddress}`.toLowerCase()) : false

  return (
    <div className="space-y-6">
      {/* ── Form ── */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Search className="w-4 h-4 text-accent" />
            Analisar Pool
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Cole os endereços da pool e do gauge para obter uma análise completa de APR, TVL,
            emissões e comparação com alternativas.
          </p>
        </div>

        {/* Presets & My List */}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Star className="w-3 h-3 text-warn" /> Exemplos rápidos
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.pool}
                  onClick={() => loadPreset(p)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-border bg-bg hover:border-accent/50 hover:text-accent transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Bookmark className="w-3 h-3 text-accent" /> Minhas Pools
            </div>
            {savedPools.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {savedPools.map((p) => (
                  <div key={p.id} className="group relative">
                    <button
                      onClick={() => loadPreset(p)}
                      className="text-xs px-3 py-1.5 rounded-lg border border-border bg-bg hover:border-accent/50 hover:text-accent transition-all pr-8"
                    >
                      {p.label}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removePool(p.id) }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-600 hover:text-bear opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-zinc-600 italic border border-dashed border-border rounded-lg p-2 text-center">
                Sua lista está vazia. Adicione pools após a análise.
              </div>
            )}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
              <Droplets className="w-3 h-3 text-accent" />
              Endereço da Pool
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={poolAddress}
              onChange={(e) => { setPoolAddress(e.target.value.trim()); setResult(null) }}
              className={`w-full bg-bg border rounded-xl px-4 py-3 text-xs font-mono placeholder-zinc-600 focus:outline-none transition-colors ${
                poolAddress && !/^0x[0-9a-fA-F]{40}$/.test(poolAddress)
                  ? 'border-bear/50 text-bear'
                  : 'border-border focus:border-accent/50'
              }`}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] text-zinc-400 font-medium flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-warn" />
              Endereço do Gauge <span className="text-[10px] opacity-60 font-normal">(Opcional - detectamos para você)</span>
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={gaugeAddress}
              onChange={(e) => { setGaugeAddress(e.target.value.trim()); setResult(null) }}
              className={`w-full bg-bg border rounded-xl px-4 py-3 text-xs font-mono placeholder-zinc-600 focus:outline-none transition-colors ${
                gaugeAddress && !/^0x[0-9a-fA-F]{40}$/.test(gaugeAddress)
                  ? 'border-bear/50 text-bear'
                  : 'border-border focus:border-accent/50'
              }`}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={run}
            disabled={!isValid || isPending}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              isValid && !isPending
                ? 'bg-accent text-bg hover:bg-accent/80 active:scale-[0.98]'
                : 'bg-border text-zinc-600 cursor-not-allowed'
            }`}
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
            ) : (
              <><Search className="w-4 h-4" /> Analisar Pool</>
            )}
          </button>
          {result && !isPending && (
            <button
              onClick={run}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
          )}
          {!isValid && (poolAddress || gaugeAddress) && (
            <span className="text-xs text-zinc-500">
              Insira endereços Ethereum válidos (0x + 40 hex chars)
            </span>
          )}
        </div>
      </div>

      <PortfolioView onSelectPool={(addr) => { setPoolAddress(addr); run() }} />

      {/* ── Loading skeleton ── */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-card border border-border rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3 text-sm text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
              <span>Consultando blockchain e APIs…</span>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-border rounded animate-pulse" style={{ width: `${60 + i * 10}%` }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 bg-bear/8 border border-bear/30 rounded-xl p-4 text-xs text-bear"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-0.5">Erro na análise</div>
              <div className="text-zinc-400">{error}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result ── */}
      <AnimatePresence>
        {result && !isPending && (
          <AnalysisResult 
            result={result} 
            onSave={savePool} 
            isSaved={isCurrentSaved}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
