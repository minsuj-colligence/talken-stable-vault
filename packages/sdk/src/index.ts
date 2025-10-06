// EVM
export { EVMVaultClient } from './evm/VaultClient.js'

// Solana
export { SolanaVaultClient } from './solana/VaultClient.js'

// API
export { YieldsClient } from './api/YieldsClient.js'

// Types
export type {
  VaultConfig,
  DepositParams,
  RedeemParams,
  PermitParams,
  MetaRedeemParams,
  VaultInfo,
  YieldData,
  Strategy,
} from './types/index.js'

// Re-export ethers and solana for convenience
export { ethers } from 'ethers'
export * as solana from '@solana/web3.js'
