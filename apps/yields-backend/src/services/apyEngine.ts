import type { VaultAPY, Strategy } from '../types/index.js';
import { defiLlamaService } from './defiLlamaService.js';
import { logger } from '../utils/logger.js';

interface VaultState {
  totalAssets: bigint;
  totalShares: bigint;
  lastPricePerShare: number;
  lastUpdateTime: number;
}

export class APYEngine {
  private vaultStates: Map<string, VaultState> = new Map();
  private currentAPYs: Map<string, VaultAPY> = new Map();

  /**
   * Calculate real APY from price per share change
   */
  calculateRealAPY(vaultId: string, currentPricePerShare: number): number {
    const state = this.vaultStates.get(vaultId);
    if (!state) return 0;

    const timeDelta = (Date.now() - state.lastUpdateTime) / 1000; // seconds
    if (timeDelta === 0) return 0;

    const priceChange = currentPricePerShare - state.lastPricePerShare;
    const priceChangeRate = priceChange / state.lastPricePerShare;

    // Annualize: (rate / timeDelta) * secondsPerYear
    const secondsPerYear = 365 * 24 * 60 * 60;
    const annualizedAPY = (priceChangeRate / timeDelta) * secondsPerYear * 100;

    return annualizedAPY;
  }

  /**
   * Calculate model APY from strategy weights
   */
  calculateModelAPY(strategies: Strategy[]): number {
    if (strategies.length === 0) return 0;

    return strategies.reduce((sum, s) => sum + s.apyNet * s.weight, 0);
  }

  /**
   * Update vault state
   */
  updateVaultState(
    vaultId: string,
    totalAssets: bigint,
    totalShares: bigint,
    pricePerShare: number
  ): void {
    const existing = this.vaultStates.get(vaultId);

    this.vaultStates.set(vaultId, {
      totalAssets,
      totalShares,
      lastPricePerShare: pricePerShare,
      lastUpdateTime: Date.now(),
    });

    if (existing) {
      logger.info(`Updated vault state for ${vaultId}`, {
        totalAssets: totalAssets.toString(),
        totalShares: totalShares.toString(),
        pricePerShare,
      });
    }
  }

  /**
   * Get vault APY (model + real)
   */
  async getVaultAPY(
    vaultId: string,
    chain: 'arbitrum' | 'ethereum' | 'base' | 'plasma' | 'solana' | 'bsc',
    asset: string
  ): Promise<VaultAPY | null> {
    // Get cached APY
    const cached = this.currentAPYs.get(vaultId);
    if (cached && Date.now() - cached.lastUpdate < 60000) {
      return cached;
    }

    // For EVM main vault and bridge vaults, fetch strategies from all EVM chains
    let topStrategies: any[];
    const isEVMVault = vaultId === 'ethereum-usdt' || vaultId.endsWith('-bridge');

    if (isEVMVault) {
      // Combine strategies from all EVM chains
      const evmChains: ('arbitrum' | 'ethereum' | 'base' | 'plasma')[] = ['ethereum', 'arbitrum', 'base', 'plasma'];
      const allEvmStrategies = await Promise.all(
        evmChains.map(c => defiLlamaService.getTopStrategies(c, 100))
      );
      topStrategies = allEvmStrategies.flat();
    } else {
      // Other vaults (Solana, BSC): fetch strategies for their specific chain
      topStrategies = await defiLlamaService.getTopStrategies(chain, 100);
    }

    const state = this.vaultStates.get(vaultId);
    // Use mock TVL for development (in production, this comes from onchain state)
    const totalTVL = state ? Number(state.totalAssets) / 1e6 : 10_000_000; // Default $10M for development

    // Calculate optimal weights (pass 'ethereum' for all EVM vaults to apply preferred protocol rules)
    const chainForWeights = isEVMVault ? 'ethereum' as const : chain;
    const optimizedStrategies = defiLlamaService.calculateOptimalWeights(topStrategies, totalTVL, chainForWeights);

    // Calculate model APY
    const apyModel = this.calculateModelAPY(optimizedStrategies);

    // Calculate real APY
    const currentPPS = state && state.totalShares > 0n
      ? Number(state.totalAssets) / Number(state.totalShares)
      : 1.0;

    const apyReal = this.calculateRealAPY(vaultId, currentPPS);

    const vaultAPY: VaultAPY = {
      vault: vaultId,
      chain,
      asset,
      apyModel,
      apyReal,
      totalAllocated: optimizedStrategies.reduce((sum, s) => sum + s.allocated, 0),
      totalTVL,
      strategies: optimizedStrategies,
      lastUpdate: Date.now(),
    };

    this.currentAPYs.set(vaultId, vaultAPY);
    return vaultAPY;
  }

  /**
   * Get all vault APYs
   */
  async getAllVaultAPYs(): Promise<VaultAPY[]> {
    // Actual vaults with contracts (3 vaults)
    const vaults = [
      { id: 'ethereum-usdt', chain: 'ethereum' as const, asset: 'USDT' },
      { id: 'solana-usdc', chain: 'solana' as const, asset: 'USDC' },
      { id: 'bsc-usdt', chain: 'bsc' as const, asset: 'USDT' },
    ];

    // Bridge chains (strategies shown in UI, but route to Ethereum vault)
    const bridgeChains = [
      { id: 'arbitrum-bridge', chain: 'arbitrum' as const, asset: 'USDT' },
      { id: 'base-bridge', chain: 'base' as const, asset: 'USDC' },
      { id: 'plasma-bridge', chain: 'plasma' as const, asset: 'USDT' },
    ];

    const allChains = [...vaults, ...bridgeChains];

    const results = await Promise.all(
      allChains.map((v) => this.getVaultAPY(v.id, v.chain, v.asset))
    );

    return results.filter((r): r is VaultAPY => r !== null);
  }

  /**
   * Trigger rebalance based on APY updates
   */
  async triggerRebalanceIfNeeded(vaultId: string, threshold: number = 1.0): Promise<boolean> {
    const vaultAPY = this.currentAPYs.get(vaultId);
    if (!vaultAPY) return false;

    // Trigger rebalance if model APY differs from real APY by more than threshold
    const apyDiff = Math.abs(vaultAPY.apyModel - vaultAPY.apyReal);

    if (apyDiff > threshold) {
      logger.info(`Rebalance needed for ${vaultId}`, {
        apyModel: vaultAPY.apyModel,
        apyReal: vaultAPY.apyReal,
        diff: apyDiff,
      });
      return true;
    }

    return false;
  }
}

export const apyEngine = new APYEngine();
