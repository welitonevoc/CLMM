/**
 * Monte Carlo Simulation for CLMM Backtesting
 * Generates a distribution of possible outcomes based on historical volatility.
 */

export interface SimulationResult {
  p10: number[] // 10th percentile (Pessimistic)
  p50: number[] // 50th percentile (Median)
  p90: number[] // 90th percentile (Optimistic)
  labels: string[]
}

/**
 * Simulates price paths using Geometric Brownian Motion (GBM)
 * @param startPrice Initial price
 * @param volatility Annualized volatility (e.g., 0.8 for 80%)
 * @param days Number of days to simulate
 * @param simulations Number of paths to generate
 */
export function runMonteCarlo(
  startPrice: number,
  volatility: number,
  days: number,
  simulations: number = 100
): SimulationResult {
  const dt = 1 / 365 // Time step in years
  const paths: number[][] = []

  for (let s = 0; s < simulations; s++) {
    const path = [startPrice]
    let currentPrice = startPrice
    
    for (let d = 1; d <= days; d++) {
      // GBM Formula: dP = P * (mu*dt + sigma*dW)
      // We assume mu = 0 for neutral backtesting (market efficiency)
      const drift = 0
      const shock = volatility * Math.sqrt(dt) * normalRandom()
      currentPrice = currentPrice * Math.exp(drift - 0.5 * Math.pow(volatility, 2) * dt + shock)
      path.push(currentPrice)
    }
    paths.push(path)
  }

  // Calculate percentiles at each time step
  const p10: number[] = []
  const p50: number[] = []
  const p90: number[] = []
  const labels: string[] = []

  for (let d = 0; d <= days; d++) {
    const pricesAtDay = paths.map(p => p[d]).sort((a, b) => a - b)
    p10.push(pricesAtDay[Math.floor(simulations * 0.1)])
    p50.push(pricesAtDay[Math.floor(simulations * 0.5)])
    p90.push(pricesAtDay[Math.floor(simulations * 0.9)])
    labels.push(`Dia ${d}`)
  }

  return { p10, p50, p90, labels }
}

// Standard Box-Muller transform for normal distribution
function normalRandom() {
  let u = 0, v = 0;
  while(u === 0) u = Math.random();
  while(v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
