# Talken Stable Vault SDK

TypeScript SDK for interacting with Talken Stable Vault across Arbitrum, Solana, and BSC.

## Installation

```bash
npm install @talken/sdk
# or
pnpm add @talken/sdk
```

## Features

- **EVM Support**: Arbitrum & BSC vaults with gasless deposits/withdrawals
- **Solana Support**: USDC vault with meta-transactions
- **Yields API**: Query APY data, strategies, and recommendations
- **TypeScript**: Full type safety
- **WebSocket**: Real-time APY updates

## Usage

### EVM Vault (Arbitrum/BSC)

```typescript
import { EVMVaultClient, ethers } from '@talken/sdk'

const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc')
const signer = new ethers.Wallet(privateKey, provider)

const vault = new EVMVaultClient(
  {
    address: '0x...', // Vault address
    asset: 'USDT0',
    chain: 'arbitrum',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
  },
  signer
)

// Get vault info
const info = await vault.getVaultInfo()
console.log(`Total TVL: ${info.totalAssets}`)
console.log(`Price per share: ${info.pricePerShare}`)

// Standard deposit
const tx = await vault.deposit({ amount: '1000' })
await tx.wait()

// Gasless deposit with permit
const permitSig = await getPermitSignature() // Your permit logic
await vault.depositWithPermit(
  { amount: '1000' },
  {
    amount: '1000',
    deadline: Math.floor(Date.now() / 1000) + 3600,
    v: permitSig.v,
    r: permitSig.r,
    s: permitSig.s,
  }
)

// Redeem
const redeemTx = await vault.redeem({ shares: '100' })
await redeemTx.wait()

// Gasless redeem (meta-redeem)
const sig = await vault.createMetaRedeemSignature(
  ownerAddress,
  shares,
  receiverAddress,
  nonce,
  deadline
)

await vault.redeemWithSig({
  owner: ownerAddress,
  shares,
  receiver: receiverAddress,
  deadline,
  signature: sig,
})
```

### Solana Vault

```typescript
import { SolanaVaultClient, solana } from '@talken/sdk'

const connection = new solana.Connection('https://api.mainnet-beta.solana.com')
const vault = new SolanaVaultClient(
  {
    address: 'vault_pubkey',
    asset: 'USDC',
    chain: 'solana',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  },
  connection
)

// Get vault info
const info = await vault.getVaultInfo()

// Deposit
const payer = solana.Keypair.fromSecretKey(secretKey)
const sig = await vault.deposit(
  payer,
  userAssetPubkey,
  userSharesPubkey,
  1000000n // 1 USDC (6 decimals)
)

// Redeem
const redeemSig = await vault.redeem(payer, userAssetPubkey, userSharesPubkey, shares)
```

### Yields API

```typescript
import { YieldsClient } from '@talken/sdk'

const yields = new YieldsClient('http://localhost:3001')

// Get all APYs
const allAPYs = await yields.getAllAPYs()

// Get chain-specific APY
const arbitrumAPY = await yields.getChainAPY('arbitrum')
console.log(`Arbitrum model APY: ${arbitrumAPY.apyModel}%`)

// Get top strategies
const strategies = await yields.getTopStrategies('arbitrum', 5)
strategies.forEach((s) => {
  console.log(`${s.protocol}: ${s.apyNet}% APY`)
})

// Real-time updates
const unsubscribe = yields.subscribeToAPYUpdates((data) => {
  console.log('APY updated:', data)
})

// Cleanup
unsubscribe()
```

## API Reference

### EVMVaultClient

- `getVaultInfo()` - Get vault state
- `deposit(params)` - Standard deposit
- `depositWithPermit(params, permit)` - Gasless deposit
- `redeem(params)` - Standard redeem
- `redeemWithSig(params)` - Gasless redeem
- `previewDeposit(amount)` - Preview shares for deposit
- `previewRedeem(shares)` - Preview assets for redeem
- `balanceOf(address)` - Get user share balance
- `createMetaRedeemSignature(...)` - Create EIP-712 signature

### SolanaVaultClient

- `getVaultInfo()` - Get vault state
- `deposit(payer, userAsset, userShares, amount)` - Deposit USDC
- `redeem(payer, userAsset, userShares, shares)` - Redeem shares
- `metaRedeem(...)` - Gasless redeem

### YieldsClient

- `getAllAPYs()` - Get all vault APYs
- `getChainAPY(chain)` - Get chain-specific APY
- `getTopStrategies(chain, limit)` - Get top strategies
- `getRebalanceRecommendations(chain, tvl)` - Get rebalance recommendations
- `subscribeToAPYUpdates(callback, wsUrl)` - Subscribe to real-time updates

## Types

```typescript
interface VaultInfo {
  totalAssets: bigint
  totalShares: bigint
  pricePerShare: number
  feeBps: number
}

interface YieldData {
  apyModel: number
  apyReal: number
  totalTVL: number
  strategies: Strategy[]
}

interface Strategy {
  id: string
  protocol: string
  apyNet: number
  allocated: number
  weight: number
}
```

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Test
pnpm test
```

## License

MIT
