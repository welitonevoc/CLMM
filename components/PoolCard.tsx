'use client'

import { motion } from 'framer-motion'

interface Props {
  symbol: string
  apr: number
  tvl: number
  score: number
  chain: string
  onClick?: () => void
}

export function PoolCard({ symbol, apr, tvl, score, chain, onClick }: Props) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="rounded-2xl border border-border bg-card p-5 cursor-pointer transition-colors hover:border-accent/30"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{symbol}</h3>
        <span className="text-[10px] px-2 py-0.5 rounded bg-border text-zinc-400">{chain}</span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold font-mono text-bull">{apr.toFixed(2)}%</span>
        <span className="text-[10px] text-zinc-500 uppercase">apr</span>
      </div>

      <div className="mt-3 flex justify-between text-xs text-zinc-500">
        <span>TVL: ${tvl.toLocaleString()}</span>
        <span className="text-accent">Score: {score.toFixed(0)}</span>
      </div>
    </motion.div>
  )
}
