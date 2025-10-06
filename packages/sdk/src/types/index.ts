export interface VaultConfig {
  address: string
  asset: string
  chain: 'arbitrum' | 'solana' | 'bsc'
  rpcUrl: string
}

export interface DepositParams {
  amount: string | bigint
  receiver?: string
}

export interface RedeemParams {
  shares: string | bigint
  receiver?: string
}

export interface PermitParams {
  amount: string | bigint
  deadline: number
  v: number
  r: string
  s: string
}

export interface MetaRedeemParams {
  owner: string
  shares: string | bigint
  receiver: string
  deadline: number
  signature: {
    v: number
    r: string
    s: string
  }
}

export interface VaultInfo {
  totalAssets: bigint
  totalShares: bigint
  pricePerShare: number
  feeBps: number
}

export interface YieldData {
  apyModel: number
  apyReal: number
  totalTVL: number
  strategies: Strategy[]
}

export interface Strategy {
  id: string
  protocol: string
  apyNet: number
  allocated: number
  weight: number
}
