'use client'

import { useState } from 'react'
import { Download, Check, ChevronDown } from 'lucide-react'
import { exportToCSV, exportToJSON } from '@/lib/exportUtils'
import type { Pool } from '@/types'

interface Props {
  pools: Pool[]
}

export function ExportButton({ pools }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState<'csv' | 'json' | null>(null)

  const data = pools.map((p) => ({
    symbol: p.symbol,
    project: p.project,
    chain: p.chain,
    apy: p.apy,
    apyMean30d: p.apyMean30d ?? 0,
    tvl: p.tvl,
    vol1d: p.vol1d ?? 0,
    score: p.score ?? 0,
  }))

  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      exportToCSV(data, `pools-${new Date().toISOString().slice(0, 10)}.csv`)
    } else {
      exportToJSON(data, `pools-${new Date().toISOString().slice(0, 10)}.json`)
    }
    setCopied(format)
    setTimeout(() => setCopied(null), 2000)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold glass-select border-white/[0.06] text-zinc-400 hover:text-zinc-200"
      >
        <Download className="w-3.5 h-3.5" />
        Exportar
        <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 z-50 glass-panel p-1.5 shadow-glass min-w-[140px]">
            <button
              onClick={() => handleExport('csv')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
            >
              {copied === 'csv' ? <Check className="w-3.5 h-3.5 text-bull" /> : <Download className="w-3.5 h-3.5" />}
              CSV ({pools.length} pools)
            </button>
            <button
              onClick={() => handleExport('json')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors"
            >
              {copied === 'json' ? <Check className="w-3.5 h-3.5 text-bull" /> : <Download className="w-3.5 h-3.5" />}
              JSON ({pools.length} pools)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
