'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import {
  RainbowKitProvider,
  darkTheme,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit'
import {
  metaMaskWallet,
  coinbaseWallet,
  trustWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { WagmiProvider, http, fallback } from 'wagmi'
import { mainnet, base } from 'wagmi/chains'
import { useEffect } from 'react'

// ID oficial do projeto (WalletConnect Cloud)
const projectId = 'a8bd69a4d817759a73ee4d438a0d5c4c'

// API Key do DRPC (chave pessoal)
const DRPC_API_KEY = 'AligtlpObkivpssVHD1co2nTYP9QUXER8a04tiKh6MJI'

// Fallback transport: tenta cada RPC em sequência se o anterior falhar
const baseTransport = fallback([
  http(`https://base.drpc.org?api_key=${DRPC_API_KEY}`, { timeout: 10_000 }),
  http('https://base-rpc.publicnode.com', { timeout: 10_000 }),
  http('https://mainnet.base.org', { timeout: 10_000 }),
  http('https://base.llamarpc.com', { timeout: 10_000 }),
  http('https://base.blockpi.network/v1/rpc/public', { timeout: 10_000 }),
], {
  rank: false,
  retryCount: 3,
})

const config = getDefaultConfig({
  appName: 'CLMM Terminal',
  projectId,
  chains: [base, mainnet],
  wallets: [
    {
      groupName: 'Carteiras Recomendadas',
      wallets: [metaMaskWallet, trustWallet, coinbaseWallet],
    },
  ],
  transports: {
    [base.id]: baseTransport,
    [mainnet.id]: http('https://cloudflare-eth.com', { timeout: 10_000 }),
  },
  pollingInterval: 4_000,
  ssr: true,
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 10 * 1000, // 10 segundos para dados novos
            refetchOnWindowFocus: false,
            retry: 2,
          },
        },
      })
  )

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#3b9eff',
          accentColorForeground: 'white',
          borderRadius: 'large',
          fontStack: 'system',
          overlayBlur: 'small',
        })}>
          {mounted ? children : null}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
