import axios, { type AxiosInstance } from 'axios'
import type { YieldData, Strategy } from '../types/index.js'

export class YieldsClient {
  private api: AxiosInstance

  constructor(baseURL: string = 'http://localhost:3001') {
    this.api = axios.create({
      baseURL: `${baseURL}/api`,
      timeout: 10000,
    })
  }

  /**
   * Get all vault APYs
   */
  async getAllAPYs(): Promise<YieldData[]> {
    const response = await this.api.get('/apy')
    return response.data.data
  }

  /**
   * Get APY for specific chain
   */
  async getChainAPY(chain: 'arbitrum' | 'solana' | 'bsc'): Promise<YieldData> {
    const response = await this.api.get(`/apy/${chain}`)
    return response.data.data
  }

  /**
   * Get top strategies for chain
   */
  async getTopStrategies(
    chain: 'arbitrum' | 'solana' | 'bsc',
    limit: number = 10
  ): Promise<Strategy[]> {
    const response = await this.api.get(`/strategies/${chain}`, {
      params: { limit },
    })
    return response.data.data
  }

  /**
   * Get rebalance recommendations
   */
  async getRebalanceRecommendations(
    chain: 'arbitrum' | 'solana' | 'bsc',
    tvl: number
  ): Promise<any> {
    const response = await this.api.get(`/rebalance/${chain}`, {
      params: { tvl },
    })
    return response.data.data
  }

  /**
   * Subscribe to real-time APY updates via WebSocket
   */
  subscribeToAPYUpdates(
    callback: (data: YieldData[]) => void,
    wsUrl: string = 'ws://localhost:3001/ws'
  ): () => void {
    const ws = new WebSocket(wsUrl)

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === 'apy_update') {
        callback(message.data)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    // Return cleanup function
    return () => {
      ws.close()
    }
  }
}
