# Talken Stable Vault

Cross-domain stable-yield aggregator using Arbitrum (USDT0), Solana (USDC), and BSC (USDT).

## Features

- **Multi-chain**: Arbitrum, Solana, BSC
- **Gasless UX**: EIP-2612, Permit2, EIP-3009, meta-transactions
- **Cross-chain**: LayerZero messaging, CCTP (USDC), USDT0 routing
- **EIP-4626 Vaults**: Standard compliant with 0.1% withdrawal fee
- **Auto-rebalancing**: DefiLlama yield optimization
- **Real-time Dashboard**: KPIs, APY tracking, pool allocations

## Monorepo Structure

```
/apps
  /dashboard          # Next.js dashboard
  /operator-api       # NestJS operator API
  /yields-backend     # DefiLlama poller + APY engine
/packages
  /evm-contracts      # Foundry: Arbitrum vaults
  /bsc-contracts      # BSC vault contracts
  /solana-programs    # Anchor: Solana USDC vault
  /indexer            # Event indexer
  /sdk                # TypeScript SDK
/infra
  /docker             # Docker configs
  /terraform          # IaC (optional)
```

## Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Foundry (for EVM contracts)
- Anchor (for Solana programs)
- Rust (for indexer)

### Installation

```bash
pnpm install
```

### Development

```bash
# Run all apps in dev mode
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Documentation

See [CLAUDE.md](CLAUDE.md) for full implementation guide.

## License

MIT
