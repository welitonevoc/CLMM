'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, Position, AlertConfig } from '@/types'

interface PositionState {
  positions: Position[]
  addPosition: (position: Position) => void
  removePosition: (id: string) => void
  updatePosition: (id: string, updates: Partial<Position>) => void
}

export const useAppStore = create<AppState & PositionState>()(
  persist(
    (set, get) => ({
      // App state
      selectedPool: null,
      selectedCategory: null,
      panelOpen: false,
      topOnly: false,
      strategyMode: 'balanced',

      watchlist: [],
      comparePools: [],
      pinnedPools: [],
      alerts: [],

      setSelectedPool: (pool, category) =>
        set({ selectedPool: pool, selectedCategory: category, panelOpen: !!pool }),

      togglePanel: (open) =>
        set({ panelOpen: open, ...(open ? {} : { selectedPool: null, selectedCategory: null }) }),

      setTopOnly: (v) => set({ topOnly: v }),
      setStrategyMode: (m) => set({ strategyMode: m }),

      toggleWatchlist: (poolKey) =>
        set((state) => ({
          watchlist: state.watchlist.includes(poolKey)
            ? state.watchlist.filter((k) => k !== poolKey)
            : [...state.watchlist, poolKey],
        })),

      addComparePool: (pool) =>
        set((state) => {
          const key = `${pool.symbol}-${pool.chain}-${pool.project}`
          if (state.comparePools.length >= 4) return state
          if (state.comparePools.some((p) => `${p.symbol}-${p.chain}-${p.project}` === key)) return state
          return { comparePools: [...state.comparePools, pool] }
        }),

      removeComparePool: (poolKey) =>
        set((state) => ({
          comparePools: state.comparePools.filter(
            (p) => `${p.symbol}-${p.chain}-${p.project}` !== poolKey
          ),
        })),

      clearComparePools: () => set({ comparePools: [] }),

      // Alert state
      addAlert: (alert) =>
        set((state) => ({
          alerts: [...state.alerts, alert],
        })),

      removeAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        })),

      toggleAlert: (id) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, enabled: !a.enabled } : a
          ),
        })),

      updateAlertThreshold: (id, threshold) =>
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, threshold } : a
          ),
        })),

      // Position state
      positions: [],

      addPosition: (position) =>
        set((state) => {
          const newPosition = { ...position, id: position.id || Math.random().toString(36).substr(2, 9) }
          return { positions: [...state.positions, newPosition] }
        }),

      removePosition: (id) =>
        set((state) => ({ positions: state.positions.filter((p) => p.id !== id) })),

      updatePosition: (id, updates) =>
        set((state) => ({
          positions: state.positions.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),
    }),
    {
      name: 'clmm-storage',
      partialize: (state) => ({
        watchlist: state.watchlist,
        pinnedPools: state.pinnedPools,
        strategyMode: state.strategyMode,
        topOnly: state.topOnly,
        positions: state.positions,
        alerts: state.alerts,
      }),
    }
  )
)
