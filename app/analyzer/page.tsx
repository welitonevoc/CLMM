'use client'

import { PoolAnalyzer } from '@/components/PoolAnalyzer'
import Link from 'next/link'
import { Activity, ArrowLeft, BarChart3 } from 'lucide-react'

export default function AnalyzerPage() {
  return (
    <main className="min-h-screen">
      <div className="max-w-[1040px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <header className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 glow-accent">
              <BarChart3 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                <span className="bg-gradient-to-r from-accent via-blue-300 to-violet-400 bg-clip-text text-transparent">
                  Pool Analyzer
                </span>
              </h1>
              <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                Aerodrome · Base · Concentrated Liquidity
              </p>
            </div>
          </div>
          <Link href="/"
            className="flex items-center gap-2 text-xs font-semibold font-mono px-5 py-2.5 rounded-xl glass-panel text-zinc-400 hover:text-accent hover:border-accent/30 transition-all active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            Terminal
          </Link>
        </header>

        <PoolAnalyzer />

        <footer className="text-center py-10 border-t border-white/[0.04] mt-12 text-[11px] font-mono text-zinc-600 leading-relaxed">
          Dados: DefiLlama · Base RPC · Aerodrome Finance
          <br />
          <span className="text-zinc-600">Não é recomendação financeira. DYOR.</span>
        </footer>
      </div>
    </main>
  )
}
