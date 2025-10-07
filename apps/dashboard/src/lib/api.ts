import axios from 'axios'

// Use Next.js API route as proxy to avoid CORS issues
const API_BASE_URL = typeof window !== 'undefined' ? '/api' : 'http://localhost:3000/api'

export interface VaultAPY {
  vault: string
  chain: 'arbitrum' | 'solana' | 'bsc'
  asset: string
  apyModel: number
  apyReal: number
  totalAllocated: number
  totalTVL: number
  strategies: Strategy[]
  lastUpdate: number
}

export interface Strategy {
  id: string
  chain: string
  protocol: string
  poolId: string
  asset: string
  apyBase?: number
  apyReward?: number
  apyGross: number
  apyNet: number
  apyMean30d?: number
  tvl: number
  cap: number
  allocated: number
  weight: number
  lastUpdate: number
}

export async function fetchVaultAPYs(): Promise<VaultAPY[]> {
  const response = await axios.get(`${API_BASE_URL}/apy`)
  return response.data.data
}

export async function fetchChainAPY(chain: string): Promise<VaultAPY> {
  const response = await axios.get(`${API_BASE_URL}/apy/${chain}`)
  return response.data.data
}

export async function fetchStrategies(chain: string, limit: number = 10): Promise<Strategy[]> {
  const response = await axios.get(`${API_BASE_URL}/strategies/${chain}?limit=${limit}`)
  return response.data.data
}

export function formatCurrency(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`
  } else {
    return `$${value.toFixed(2)}`
  }
}

export function formatAPY(apy: number): string {
  return `${apy.toFixed(2)}%`
}
