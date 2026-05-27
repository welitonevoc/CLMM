import type { Pool, TechAnalysis, PoolCategory } from '@/types'

export const POOL_DATA: Record<PoolCategory, Pool[]> = {
  ETH: [
    {symbol:"ETH-USDC",project:"uniswap-v4",chain:"BSC",apy:120.67,apyBase:120.67,apyReward:0,tvl:182834,vol1d:201489,apyMean30d:71.93,category:"ETH"},
    {symbol:"WETH-USDC",project:"uniswap-v3",chain:"Arbitrum",apy:31.51,apyBase:31.51,apyReward:0,tvl:138069,vol1d:11919,apyBase7d:22.30,apyMean30d:23.91,category:"ETH"},
    {symbol:"ETH-USDC",project:"uniswap-v4",chain:"Arbitrum",apy:30.45,apyBase:30.45,apyReward:0,tvl:1258059,vol1d:349808,apyMean30d:25.56,category:"ETH"},
    {symbol:"WETH-USDT",project:"uniswap-v3",chain:"Polygon",apy:29.17,apyBase:29.17,apyReward:0,tvl:524687,vol1d:838711,apyMean30d:33.71,category:"ETH"},
    {symbol:"USDC-WETH",project:"uniswap-v3",chain:"Polygon",apy:23.91,apyBase:23.91,apyReward:0,tvl:553490,vol1d:725196,apyMean30d:22.71,category:"ETH"},
    {symbol:"WETH-USDC",project:"uniswap-v3",chain:"Arbitrum",apy:20.19,apyBase:20.19,apyReward:0,tvl:53852781,vol1d:59566498,apyBase7d:19.91,apyMean30d:21.50,category:"ETH"},
    {symbol:"ETH-USDT",project:"uniswap-v3",chain:"BSC",apy:18.17,apyBase:18.17,apyReward:0,tvl:207360,vol1d:206415,apyMean30d:9.32,category:"ETH"},
    {symbol:"WETH-USDT",project:"uniswap-v3",chain:"Arbitrum",apy:16.27,apyBase:16.27,apyReward:0,tvl:10919832,vol1d:9734179,apyBase7d:15.20,apyMean30d:16.62,category:"ETH"},
  ],
  BTC: [
    {symbol:"USDC-CBBTC",project:"aerodrome-slipstream",chain:"Base",apy:296.88,apyBase:287.75,apyReward:9.13,tvl:4093359,vol1d:4297743,apyBase7d:269.19,apyMean30d:308.65,category:"BTC"},
    {symbol:"USDC-CBBTC",project:"aerodrome-slipstream",chain:"Base",apy:194.67,apyBase:0,apyReward:194.67,tvl:2977082,vol1d:null,apyMean30d:218.31,category:"BTC"},
    {symbol:"WBTC-USDC",project:"uniswap-v3",chain:"Polygon",apy:36.65,apyBase:36.65,apyReward:0,tvl:317864,vol1d:106397,apyMean30d:15.70,category:"BTC"},
    {symbol:"WBTC-USDC",project:"uniswap-v3",chain:"Arbitrum",apy:24.60,apyBase:24.60,apyReward:0,tvl:358631,vol1d:80574,apyBase7d:21.41,apyMean30d:10.77,category:"BTC"},
    {symbol:"WBTC-USDC",project:"uniswap-v4",chain:"Polygon",apy:23.63,apyBase:23.63,apyReward:0,tvl:142963,vol1d:185100,apyMean30d:19.04,category:"BTC"},
    {symbol:"WBTC-USDC",project:"uniswap-v3",chain:"Polygon",apy:21.76,apyBase:21.76,apyReward:0,tvl:668116,vol1d:796571,apyMean30d:19.01,category:"BTC"},
    {symbol:"WBTC-USDC",project:"uniswap-v4",chain:"Arbitrum",apy:21.47,apyBase:21.47,apyReward:0,tvl:236963,vol1d:13940,apyMean30d:24.32,category:"BTC"},
    {symbol:"BTCB-USDC",project:"uniswap-v3",chain:"BSC",apy:19.96,apyBase:19.96,apyReward:0,tvl:243946,vol1d:44459,apyMean30d:6.05,category:"BTC"},
    {symbol:"WBTC-USDC",project:"uniswap-v3",chain:"Polygon",apy:19.27,apyBase:19.27,apyReward:0,tvl:100167,vol1d:105755,apyMean30d:12.19,category:"BTC"},
    {symbol:"WBTC-USDC",project:"uniswap-v3",chain:"Arbitrum",apy:16.06,apyBase:16.06,apyReward:0,tvl:8056881,vol1d:7088559,apyBase7d:12.32,apyMean30d:6.32,category:"BTC"},
    {symbol:"WBTC-USDT",project:"uniswap-v3",chain:"Arbitrum",apy:15.84,apyBase:15.84,apyReward:0,tvl:10968405,vol1d:9521926,apyBase7d:14.85,apyMean30d:16.34,category:"BTC"},
  ],
  SOL: [
    {symbol:"SOL-USDC",project:"uniswap-v3",chain:"Arbitrum",apy:80.72,apyBase:80.72,apyReward:0,tvl:121517,vol1d:26875,apyBase7d:25.19,apyMean30d:9.19,category:"SOL"},
    {symbol:"SOL-USDC",project:"orca-dex",chain:"Solana",apy:54.52,apyBase:54.52,apyReward:0,tvl:27409193,vol1d:102385509,apyBase7d:56.35,apyMean30d:48.06,category:"SOL"},
  ],
  STABLE: [
    {symbol:"USDC-BRLA",project:"uniswap-v3",chain:"Polygon",apy:29.50,apyBase:29.50,apyReward:0,tvl:185560,vol1d:299981,apyMean30d:17.11,category:"STABLE"},
    {symbol:"DAI-USDT",project:"uniswap-v3",chain:"Polygon",apy:21.01,apyBase:21.01,apyReward:0,tvl:674917,vol1d:3884875,apyMean30d:6.02,category:"STABLE"},
    {symbol:"USDC-XSGD",project:"uniswap-v3",chain:"Polygon",apy:13.60,apyBase:13.60,apyReward:0,tvl:183270,vol1d:136531,apyMean30d:7.59,category:"STABLE"},
    {symbol:"USDC-DAI",project:"uniswap-v4",chain:"Polygon",apy:12.25,apyBase:12.25,apyReward:0,tvl:375935,vol1d:2522708,apyMean30d:7.72,category:"STABLE"},
    {symbol:"USDC-XSGD",project:"uniswap-v3",chain:"Polygon",apy:10.58,apyBase:10.58,apyReward:0,tvl:209159,vol1d:121236,apyMean30d:8.36,category:"STABLE"},
    {symbol:"DAI-USDT",project:"uniswap-v4",chain:"Polygon",apy:9.90,apyBase:9.90,apyReward:0,tvl:798090,vol1d:10818023,apyMean30d:9.94,category:"STABLE"},
    {symbol:"USDC-USDT",project:"uniswap-v3",chain:"Polygon",apy:9.43,apyBase:9.43,apyReward:0,tvl:421347,vol1d:1088503,apyMean30d:6.84,category:"STABLE"},
    {symbol:"USDT-USD1",project:"uniswap-v3",chain:"BSC",apy:9.05,apyBase:9.05,apyReward:0,tvl:176328,vol1d:437012,apyMean30d:7.17,category:"STABLE"},
    {symbol:"USDC-USDT",project:"uniswap-v3",chain:"Polygon",apy:6.86,apyBase:6.86,apyReward:0,tvl:483447,vol1d:908142,apyMean30d:2.26,category:"STABLE"},
  ],
}

export const TECH_DATA: Partial<Record<PoolCategory, TechAnalysis>> = {
  BTC: {
    price: 78000.58, rsi: 48.42, rsiSignal: 'neutral',
    macdVal: 1152.93, macdSignal: -448.57, macdHist: 1601.50, macdCross: 'golden_cross',
    bbUpper: 83079.70, bbMiddle: 79319.80, bbLower: 75559.89,
    ma7: 80282.51, ma25: 79062.05, ma99: 72092.71,
    trend: 'mixed', atr: 2154.48, atrPct: 2.76, verdict: 'BULLISH',
    supports: [70740.98, 73801.79, 75780.00],
    resistances: [78657.55, 82210.07],
    rangeLow: 66000, rangeHigh: 90000,
  },
  ETH: {
    price: 2178.20, rsi: 38.77, rsiSignal: 'neutral',
    macdVal: -9.08, macdSignal: -18.70, macdHist: 9.62, macdCross: 'golden_cross',
    bbUpper: 2393.88, bbMiddle: 2297.65, bbLower: 2201.42,
    ma7: 2275.84, ma25: 2306.45, ma99: 2150.35,
    trend: 'mixed', atr: 78.67, atrPct: 3.61, verdict: 'BULLISH',
    supports: [2252.90, 2263.27],
    resistances: [2371.27, 2419.00],
    rangeLow: 1850, rangeHigh: 2500,
  },
  SOL: {
    price: 86.26, rsi: 45.10, rsiSignal: 'neutral',
    macdVal: 1.46, macdSignal: -0.24, macdHist: 1.70, macdCross: 'golden_cross',
    bbUpper: 97.68, bbMiddle: 88.35, bbLower: 79.02,
    ma7: 92.42, ma25: 87.97, ma99: 85.96,
    trend: 'mixed', atr: 3.60, atrPct: 4.17, verdict: 'BULLISH',
    supports: [81.53, 83.04, 83.47],
    resistances: [85.56, 86.93, 89.05],
    rangeLow: 68, rangeHigh: 104,
  },
}

export const CATEGORY_META: Record<PoolCategory, { label: string; color: string }> = {
  ETH: { label: 'Pools ETH / Stablecoin', color: '#3b9eff' },
  BTC: { label: 'Pools BTC / Stablecoin', color: '#f59e0b' },
  SOL: { label: 'Pools SOL / Stablecoin', color: '#a78bfa' },
  STABLE: { label: 'Pools Stablecoin / Stablecoin', color: '#34d399' },
}

export const DATA_TIMESTAMP = '2026-05-16T00:00:00Z'
