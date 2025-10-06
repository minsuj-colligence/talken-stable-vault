export interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apyBase: number;
  apyReward: number;
  apy: number;
  rewardTokens: string[];
  pool: string;
  apyPct1D: number;
  apyPct7D: number;
  apyPct30D: number;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  poolMeta: string;
  mu: number;
  sigma: number;
  count: number;
  outlier: boolean;
  underlyingTokens: string[];
  il7d: number;
  apyBase7d: number;
  apyMean30d: number;
  volumeUsd1d: number;
  volumeUsd7d: number;
  apyBaseInception: number;
}

export interface Strategy {
  id: string;
  chain: 'arbitrum' | 'ethereum' | 'base' | 'plasma' | 'solana' | 'bsc';
  protocol: string;
  poolId: string;
  asset: string;
  apyBase: number;      // Base APY (stable yield without rewards)
  apyReward: number;    // Reward APY (token incentives)
  apyGross: number;     // Total APY = apyBase + apyReward
  apyNet: number;       // Net APY after fees
  apyMean30d: number;   // 30-day average APY (used for selection)
  tvl: number;
  cap: number;
  allocated: number;
  weight: number;
  lastUpdate: number;
}

export interface VaultAPY {
  vault: string;
  chain: 'arbitrum' | 'ethereum' | 'base' | 'plasma' | 'solana' | 'bsc';
  asset: string;
  apyModel: number; // Weighted average of strategy APYs
  apyReal: number;  // Actual vault APY from price per share
  totalAllocated: number;
  totalTVL: number;
  strategies: Strategy[];
  lastUpdate: number;
}

export interface APYUpdate {
  timestamp: number;
  vaults: VaultAPY[];
}
