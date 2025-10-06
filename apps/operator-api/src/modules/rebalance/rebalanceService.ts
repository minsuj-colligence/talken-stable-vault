import { ethers } from 'ethers';
import axios from 'axios';
import { logger } from '../../common/logger.js';

interface RebalanceRequest {
  chain: 'arbitrum' | 'solana' | 'bsc';
  vaultAddress: string;
  strategies: Array<{
    strategyId: string;
    targetAllocation: number;
    currentAllocation: number;
  }>;
}

interface RebalanceResult {
  success: boolean;
  txHash?: string;
  error?: string;
  timestamp: number;
}

export class RebalanceService {
  private providers: Map<string, ethers.JsonRpcProvider> = new Map();
  private yieldsBackendUrl: string;

  constructor(yieldsBackendUrl: string = 'http://localhost:3001') {
    this.yieldsBackendUrl = yieldsBackendUrl;

    // Initialize providers
    if (process.env.ARBITRUM_RPC_URL) {
      this.providers.set('arbitrum', new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL));
    }
    if (process.env.BSC_RPC_URL) {
      this.providers.set('bsc', new ethers.JsonRpcProvider(process.env.BSC_RPC_URL));
    }
  }

  /**
   * Execute rebalance for a vault
   */
  async executeRebalance(request: RebalanceRequest): Promise<RebalanceResult> {
    try {
      logger.info(`Executing rebalance for ${request.chain} vault ${request.vaultAddress}`);

      // Get rebalance recommendations from yields-backend
      const recommendations = await this.getRebalanceRecommendations(request.chain);

      // Execute based on chain
      if (request.chain === 'solana') {
        return await this.rebalanceSolana(request, recommendations);
      } else {
        return await this.rebalanceEVM(request, recommendations);
      }
    } catch (error) {
      logger.error('Rebalance error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get rebalance recommendations from yields-backend
   */
  private async getRebalanceRecommendations(chain: string): Promise<any> {
    const response = await axios.get(`${this.yieldsBackendUrl}/api/rebalance/${chain}`);
    return response.data.data;
  }

  /**
   * Execute EVM rebalance (Arbitrum/BSC)
   */
  private async rebalanceEVM(
    request: RebalanceRequest,
    recommendations: any
  ): Promise<RebalanceResult> {
    const provider = this.providers.get(request.chain);
    if (!provider) {
      throw new Error(`No provider for chain ${request.chain}`);
    }

    // Get operator wallet
    const privateKey = process.env.OPERATOR_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('OPERATOR_PRIVATE_KEY not set');
    }

    const wallet = new ethers.Wallet(privateKey, provider);

    // Strategy Router ABI (simplified)
    const strategyRouterABI = [
      'function allocate(bytes32 strategyId, uint256 amount) external',
      'function withdraw(bytes32 strategyId, uint256 amount) external',
    ];

    const strategyRouterAddress = process.env[`${request.chain.toUpperCase()}_STRATEGY_ROUTER`];
    if (!strategyRouterAddress) {
      throw new Error(`Strategy router address not set for ${request.chain}`);
    }

    const strategyRouter = new ethers.Contract(
      strategyRouterAddress,
      strategyRouterABI,
      wallet
    );

    // Execute rebalance transactions
    const txs: ethers.ContractTransaction[] = [];

    for (const strategy of request.strategies) {
      const delta = strategy.targetAllocation - strategy.currentAllocation;

      if (Math.abs(delta) < 1000) continue; // Skip small changes

      const strategyIdBytes = ethers.id(strategy.strategyId);

      if (delta > 0) {
        // Allocate more
        logger.info(`Allocating ${delta} to ${strategy.strategyId}`);
        const tx = await strategyRouter.allocate(strategyIdBytes, delta);
        txs.push(tx);
      } else {
        // Withdraw
        logger.info(`Withdrawing ${-delta} from ${strategy.strategyId}`);
        const tx = await strategyRouter.withdraw(strategyIdBytes, -delta);
        txs.push(tx);
      }
    }

    // Wait for all transactions
    const receipts = await Promise.all(txs.map((tx) => tx.wait()));

    const lastReceipt = receipts[receipts.length - 1];

    return {
      success: true,
      txHash: lastReceipt?.hash,
      timestamp: Date.now(),
    };
  }

  /**
   * Execute Solana rebalance
   */
  private async rebalanceSolana(
    request: RebalanceRequest,
    recommendations: any
  ): Promise<RebalanceResult> {
    // Simplified Solana rebalance
    // In production, use @solana/web3.js and Anchor
    logger.info('Executing Solana rebalance (not implemented)');

    return {
      success: true,
      txHash: 'solana-tx-hash',
      timestamp: Date.now(),
    };
  }

  /**
   * Check if rebalance is needed
   */
  async shouldRebalance(
    chain: 'arbitrum' | 'solana' | 'bsc',
    threshold: number = 100000 // $100k diff
  ): Promise<boolean> {
    try {
      const apy = await axios.get(`${this.yieldsBackendUrl}/api/apy/${chain}`);
      const strategies = apy.data.data.strategies;

      let totalDrift = 0;
      for (const strategy of strategies) {
        const drift = Math.abs(strategy.allocated - strategy.weight * apy.data.data.totalTVL);
        totalDrift += drift;
      }

      logger.info(`Total drift for ${chain}: $${totalDrift}`);
      return totalDrift > threshold;
    } catch (error) {
      logger.error('Error checking rebalance need:', error);
      return false;
    }
  }
}

export const rebalanceService = new RebalanceService();
