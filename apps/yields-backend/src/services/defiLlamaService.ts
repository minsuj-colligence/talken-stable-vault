import axios from 'axios';
import type { DefiLlamaPool, Strategy } from '../types/index.js';
import { logger } from '../utils/logger.js';

const DEFILLAMA_YIELDS_API = 'https://yields.llama.fi/pools';

interface ChainConfig {
  chain: 'arbitrum' | 'ethereum' | 'base' | 'plasma' | 'solana' | 'bsc';
  assets: string[];
  chainFilter: string;
}

const CHAIN_CONFIGS: ChainConfig[] = [
  // EVM Hub - Arbitrum (actual vault exists)
  { chain: 'arbitrum', assets: ['USDT0', 'USDT', 'USDC', 'DAI'], chainFilter: 'Arbitrum' },
  // EVM chains - bridge to Arbitrum via LayerZero (no vaults)
  { chain: 'ethereum', assets: ['USDT', 'USDC', 'DAI', 'USDE', 'FRAX'], chainFilter: 'Ethereum' },
  { chain: 'base', assets: ['USDC', 'USDT', 'DAI'], chainFilter: 'Base' },
  { chain: 'plasma', assets: ['USDC', 'USDT'], chainFilter: 'Plasma' },
  // Non-EVM chains with actual vaults
  { chain: 'solana', assets: ['USDC', 'USDT'], chainFilter: 'Solana' },
  { chain: 'bsc', assets: ['USDT', 'USDC', 'BUSD'], chainFilter: 'BSC' },
];

// Preferred protocols for EVM vaults (only these protocols allowed)
const PREFERRED_PROTOCOLS = [
  'aave-v3',
  'curve',
  'pendle',
  'fraxlend',
  'balancer',
  'uniswap-v3',
  'compound-v3',
  'ethena',
  'yearn',
];

export class DefiLlamaService {
  private cache: Map<string, { data: DefiLlamaPool[]; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch all pools from DefiLlama
   */
  async fetchPools(): Promise<DefiLlamaPool[]> {
    const cacheKey = 'all-pools';
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      logger.info('Returning cached DefiLlama pools');
      return cached.data;
    }

    try {
      logger.info('Fetching pools from DefiLlama API');
      const response = await axios.get<{ data: DefiLlamaPool[] }>(DEFILLAMA_YIELDS_API);

      this.cache.set(cacheKey, {
        data: response.data.data,
        timestamp: Date.now(),
      });

      logger.info(`Fetched ${response.data.data.length} pools from DefiLlama`);
      return response.data.data;
    } catch (error) {
      logger.error('Error fetching DefiLlama pools:', error);
      return cached?.data || [];
    }
  }

  /**
   * Check if symbol contains only stablecoins
   */
  private isStablePair(symbol: string): boolean {
    const stablecoins = [
      'USDT', 'USDC', 'DAI', 'USDT0', 'USDS', 'FRAX', 'USDP',
      'GUSD', 'SUSD', 'USDE', 'USD1', 'LUSD', 'USDM', 'USDB',
      'FDUSD', 'PYUSD', 'CUSD', 'USDX'
    ];
    const upperSymbol = symbol.toUpperCase().trim();

    // Exclude non-stablecoin tokens explicitly
    const excludeTokens = [
      'DAILYBET', 'BTC', 'ETH', 'SOL', 'BNB', 'MATIC', 'AVAX', 'ARB',
      'OP', 'LINK', 'UNI', 'AAVE', 'CRV', 'SUSHI', 'COMP', 'YFI',
      'MKR', 'SNX', 'BAL', 'LDO', 'RPL', 'RETH', 'WETH', 'WBTC',
      'STETH', 'WSTETH', 'RNDR', 'PEPE', 'SHIB', 'DOGE', 'XRP'
    ];

    // Check for excluded tokens
    if (excludeTokens.some(excluded => upperSymbol.includes(excluded))) {
      return false;
    }

    // Helper function to check if a token exactly matches a stablecoin (with optional .e or ET suffix)
    const isExactStablecoin = (token: string): boolean => {
      return stablecoins.some(stable => {
        // Exact match
        if (token === stable) return true;
        // Allow .e or ET suffix (like USDC.E, USDCET)
        if (token === stable + '.E' || token === stable + 'ET') return true;
        return false;
      });
    };

    // Check if it's a LP pair (contains -)
    if (upperSymbol.includes('-')) {
      const tokens = upperSymbol.split('-').map(t => t.trim());

      // All tokens must be exact stablecoins
      return tokens.every(token => isExactStablecoin(token));
    }

    // Single token pools - must be exact stablecoin
    return isExactStablecoin(upperSymbol);
  }

  /**
   * Filter pools by chain and asset
   */
  async getPoolsForChain(chain: 'arbitrum' | 'ethereum' | 'base' | 'plasma' | 'solana' | 'bsc'): Promise<DefiLlamaPool[]> {
    const config = CHAIN_CONFIGS.find((c) => c.chain === chain);
    if (!config) return [];

    const allPools = await this.fetchPools();

    return allPools.filter((pool) => {
      const matchesChain = pool.chain.toLowerCase().includes(config.chainFilter.toLowerCase());
      const matchesAsset = config.assets.some((asset) =>
        pool.symbol.toUpperCase().includes(asset.toUpperCase())
      );
      const isStablecoin = pool.stablecoin === true;
      const isStablePair = this.isStablePair(pool.symbol);
      const hasPositiveAPY = pool.apy > 0;

      // Minimum TVL: $0.2M for all chains
      const minTVL = 200000; // $0.2M TVL
      const hasMinTVL = pool.tvlUsd >= minTVL;

      return matchesChain && matchesAsset && isStablecoin && isStablePair && hasPositiveAPY && hasMinTVL;
    });
  }

  /**
   * Calculate net APY after platform fees
   */
  calculateNetAPY(grossAPY: number, feeBps: number = 10): number {
    // Approximate: net APY = gross APY * (1 - annualized fee impact)
    // For 0.1% withdrawal fee, approximate annual impact
    const feeImpact = feeBps / 10000;
    return grossAPY * (1 - feeImpact);
  }

  /**
   * Get top strategies by net APY
   */
  async getTopStrategies(
    chain: 'arbitrum' | 'ethereum' | 'base' | 'plasma' | 'solana' | 'bsc',
    limit: number = 10
  ): Promise<Strategy[]> {
    const pools = await this.getPoolsForChain(chain);

    const strategies: Strategy[] = pools.map((pool) => ({
      id: pool.pool,
      chain,
      protocol: pool.project,
      poolId: pool.pool,
      asset: pool.symbol,
      apyBase: pool.apyBase || 0,
      apyReward: pool.apyReward || 0,
      apyGross: pool.apy,
      apyNet: this.calculateNetAPY(pool.apy),
      apyMean30d: pool.apyMean30d || pool.apyBase || 0, // Use 30d avg, fallback to base
      tvl: pool.tvlUsd,
      cap: 0, // Will be set by strategy router
      allocated: 0,
      weight: 0,
      lastUpdate: Date.now(),
    }));

    // Filter out strategies with 30d avg APY < 5%
    const MIN_AVG_APY = 5.0;
    const validStrategies = strategies.filter(s => s.apyMean30d >= MIN_AVG_APY);

    // Sort by 30d average APY descending
    validStrategies.sort((a, b) => b.apyMean30d - a.apyMean30d);

    // Return top strategies
    return validStrategies.slice(0, limit);
  }

  /**
   * Greedy selection helper with protocol limit
   */
  private greedySelect(strategies: any[], maxCount: number, maxProtocolWeight: number): any[] {
    const selected: any[] = [];
    const protocolAPYs: Record<string, number> = {};
    let totalSelectedAPY = 0;

    for (const strategy of strategies) {
      if (selected.length >= maxCount) break;

      const currentProtocolAPY = protocolAPYs[strategy.protocol] || 0;
      const newProtocolAPY = currentProtocolAPY + strategy.boostedAPY;
      const newTotalAPY = totalSelectedAPY + strategy.boostedAPY;

      const wouldExceedLimit = totalSelectedAPY > 0 && (newProtocolAPY / newTotalAPY) > maxProtocolWeight;

      if (!wouldExceedLimit) {
        selected.push(strategy);
        protocolAPYs[strategy.protocol] = newProtocolAPY;
        totalSelectedAPY = newTotalAPY;
      }
    }

    return selected;
  }

  /**
   * Calculate optimal allocation weights with protocol concentration limit
   * Pure greedy algorithm per CLAUDE.md spec:
   * - Sort by boosted APY descending
   * - Select greedily, skip if protocol would exceed 20%
   * - Stop at 90% coverage or 20 strategies (max per vault)
   * - EVM Vault: 80% to preferred protocols, 20% to others
   */
  calculateOptimalWeights(strategies: Strategy[], totalTVL: number, chain?: 'arbitrum' | 'ethereum' | 'base' | 'plasma' | 'solana' | 'bsc'): Strategy[] {
    if (strategies.length === 0) return [];

    const MAX_PROTOCOL_WEIGHT = 0.20; // 20% max per protocol
    const TARGET_COVERAGE = 0.90; // 90% coverage target
    const MAX_STRATEGIES = 20; // Maximum 20 strategies per vault

    // EVM Vault special rule: 10 preferred strategies only (100% weight)
    const isEVM = chain === 'arbitrum' || chain === 'ethereum' || chain === 'base' || chain === 'plasma';
    const PREFERRED_COUNT = 10; // 10 strategies from preferred protocols only
    const OTHER_COUNT = 0; // No other protocols for EVM
    const PREFERRED_TARGET = 1.0; // 100% weight for preferred protocols
    const OTHER_TARGET = 0.0; // 0% weight for other protocols

    // Mark preferred protocols and use 30d avg APY for sorting (no boost needed)
    const boostedStrategies = strategies.map(s => {
      const isPreferred = PREFERRED_PROTOCOLS.some(p => s.protocol.toLowerCase().includes(p));
      return {
        ...s,
        isPreferred,
        boostedAPY: s.apyMean30d, // Use 30d avg APY directly (no boost)
      };
    });

    // Sort by 30d avg APY descending (greedy selection order)
    boostedStrategies.sort((a, b) => b.boostedAPY - a.boostedAPY);

    // Greedy selection
    let selected: typeof boostedStrategies = [];

    if (isEVM) {
      // For EVM: select 16 preferred strategies + 4 other strategies (20 total)
      // If fewer than 16 preferred available, fill remaining slots with "other" protocols
      const preferredStrategies = boostedStrategies.filter(s => s.isPreferred);
      const otherStrategies = boostedStrategies.filter(s => !s.isPreferred);

      // For preferred protocols: allow multiple strategies from same protocol
      // But limit to 1 strategy per protocol+asset combination per chain
      // (e.g., yearn USDC on Ethereum: 1 strategy, yearn USDT on Ethereum: 1 strategy)
      const preferredSelected: typeof preferredStrategies = [];
      const usedProtocolAssetChain = new Set<string>();

      for (const strategy of preferredStrategies) {
        if (preferredSelected.length >= PREFERRED_COUNT) break;

        // Create unique key: protocol + base asset + chain
        // Extract base asset (remove suffixes like .E, ET, 0, -XXX for pairs)
        const baseAsset = strategy.asset.split('-')[0].replace(/\.(E|ET)$/, '').replace(/0$/, '');
        const key = `${strategy.protocol}:${baseAsset}:${strategy.chain}`;

        // Skip if we already selected this protocol+asset combination on this chain
        if (usedProtocolAssetChain.has(key)) continue;

        preferredSelected.push(strategy);
        usedProtocolAssetChain.add(key);
      }

      // Calculate how many "other" slots we need
      // If we got less than 16 preferred, add the deficit to other count
      const otherNeeded = OTHER_COUNT + (PREFERRED_COUNT - preferredSelected.length);

      // For non-preferred protocols: limit to 1 strategy per protocol
      const otherSelected: typeof otherStrategies = [];
      const usedOtherProtocols = new Set<string>();

      for (const strategy of otherStrategies) {
        if (otherSelected.length >= otherNeeded) break;

        // Skip if we already selected a strategy from this protocol
        if (usedOtherProtocols.has(strategy.protocol)) continue;

        otherSelected.push(strategy);
        usedOtherProtocols.add(strategy.protocol);
      }

      selected = [...preferredSelected, ...otherSelected];
    } else {
      // Non-EVM: use standard greedy selection without protocol limit
      // (Solana/BSC have fewer strategies, allow same protocol multiple times)
      const totalPossibleAPY = boostedStrategies.reduce((sum, s) => sum + s.boostedAPY, 0);
      let totalSelectedAPY = 0;

      for (let i = 0; i < boostedStrategies.length && selected.length < MAX_STRATEGIES; i++) {
        const strategy = boostedStrategies[i];

        selected.push(strategy);
        totalSelectedAPY += strategy.boostedAPY;

        // Check coverage target
        const coverage = totalSelectedAPY / totalPossibleAPY;
        if (coverage >= TARGET_COVERAGE) {
          break;
        }
      }
    }

    const totalSelectedAPY = selected.reduce((sum, s) => sum + s.boostedAPY, 0);

    if (isEVM) {
      const preferredCount = selected.filter(s => s.isPreferred).length;
      const otherCount = selected.filter(s => !s.isPreferred).length;
      logger.info(`EVM selection: ${preferredCount} preferred + ${otherCount} other = ${selected.length} total strategies`);
    } else {
      logger.info(`Greedy selection completed: ${selected.length} strategies`);
    }

    // Calculate final weights
    let weighted: any[];

    if (isEVM) {
      // For EVM: adjust weights to ensure 80% preferred, 20% others
      const preferredSelected = selected.filter(s => s.isPreferred);
      const otherSelected = selected.filter(s => !s.isPreferred);

      const preferredTotalAPY = preferredSelected.reduce((sum, s) => sum + s.boostedAPY, 0);
      const otherTotalAPY = otherSelected.reduce((sum, s) => sum + s.boostedAPY, 0);

      // Allocate 80% to preferred, 20% to others
      const preferredWeighted = preferredSelected.map(s => ({
        ...s,
        weight: (s.boostedAPY / preferredTotalAPY) * PREFERRED_TARGET,
        allocated: ((s.boostedAPY / preferredTotalAPY) * PREFERRED_TARGET) * totalTVL,
      }));

      const otherWeighted = otherSelected.map(s => ({
        ...s,
        weight: (s.boostedAPY / otherTotalAPY) * OTHER_TARGET,
        allocated: ((s.boostedAPY / otherTotalAPY) * OTHER_TARGET) * totalTVL,
      }));

      weighted = [...preferredWeighted, ...otherWeighted];
    } else {
      // Standard weight calculation
      weighted = selected.map(s => ({
        ...s,
        weight: s.boostedAPY / totalSelectedAPY,
        allocated: (s.boostedAPY / totalSelectedAPY) * totalTVL,
      }));
    }

    // Log top protocols
    const finalProtocolWeights: Record<string, number> = {};
    weighted.forEach(s => {
      finalProtocolWeights[s.protocol] = (finalProtocolWeights[s.protocol] || 0) + s.weight;
    });
    const topProtocols = Object.entries(finalProtocolWeights)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([protocol, weight]) => `${protocol}: ${(weight*100).toFixed(1)}%`);
    logger.info(`Top 5 protocol allocations: ${topProtocols.join(', ')}`);

    // Create a map of calculated weights
    const weightMap = new Map(weighted.map(s => [s.id, { weight: s.weight, allocated: s.allocated }]));

    // Return all strategies with weights (set 0 for non-selected ones)
    return strategies.map(s => {
      const calculated = weightMap.get(s.id);
      return {
        ...s,
        weight: calculated?.weight || 0,
        allocated: calculated?.allocated || 0,
      };
    });
  }

  /**
   * Get recommended rebalance actions
   */
  async getRebalanceRecommendations(chain: 'arbitrum' | 'ethereum' | 'base' | 'plasma' | 'solana' | 'bsc', currentTVL: number) {
    const topStrategies = await this.getTopStrategies(chain, 5);
    const optimized = this.calculateOptimalWeights(topStrategies, currentTVL);

    return {
      chain,
      timestamp: Date.now(),
      totalTVL: currentTVL,
      recommendations: optimized.map((s) => ({
        strategyId: s.id,
        protocol: s.protocol,
        targetAPY: s.apyNet,
        targetAllocation: s.allocated,
        targetWeight: s.weight,
      })),
    };
  }
}

export const defiLlamaService = new DefiLlamaService();
