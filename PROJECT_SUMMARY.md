# Talken Stable Vault - Project Summary

## Overview

**Talken Stable Vault** is a cross-chain stable-yield aggregator built on Arbitrum (USDT0), Solana (USDC), and BSC (USDT). It features gasless UX via EIP-2612/Permit2/EIP-3009, cross-chain messaging with LayerZero, value transfer via CCTP and USDT0, and EIP-4626-compliant vaults with a flat 0.1% withdrawal fee.

## Project Structure

```
talken-stable-vault/
├── apps/
│   ├── dashboard/              # Next.js dashboard with real-time APY
│   ├── operator-api/           # Express API for rebalancing
│   └── yields-backend/         # DefiLlama poller + APY engine
├── packages/
│   ├── evm-contracts/          # Foundry: Arbitrum vaults
│   ├── bsc-contracts/          # Foundry: BSC vaults
│   ├── solana-programs/        # Anchor: Solana USDC vault
│   ├── indexer/                # Event indexer
│   └── sdk/                    # TypeScript SDK
├── infra/
│   ├── docker/                 # Docker configs
│   └── terraform/              # IaC (optional)
├── CLAUDE.md                   # Implementation handbook
├── README.md                   # Quickstart
├── DEPLOYMENT.md               # Deployment guide
└── CONTRIBUTING.md             # Contribution guide
```

## Core Components

### 1. Smart Contracts

#### EVM/Arbitrum ([packages/evm-contracts/](packages/evm-contracts/))
- **TSV_USDT0_Vault**: EIP-4626 vault with gasless deposits/withdrawals
- **StrategyRouter**: Routes funds to Aave, Curve, Pendle, etc.
- **OAppCoordinator**: LayerZero cross-chain coordinator
- **BridgeOrchestrator**: USDT0/CCTP bridge orchestrator
- **Permit2Puller**: Uniswap Permit2 integration

#### BSC ([packages/bsc-contracts/](packages/bsc-contracts/))
- **TSV_USDT_Vault_BSC**: USDT vault with Permit2
- **BSCStrategyRouter**: PancakeSwap, Venus, Alpaca adapters

#### Solana ([packages/solana-programs/](packages/solana-programs/))
- **tsv_usdc_vault**: USDC vault with meta-redeem
- Strategy adapters for Kamino, marginfi, Orca, Raydium

### 2. Backend Services

#### Yields Backend ([apps/yields-backend/](apps/yields-backend/))
- DefiLlama API integration (fetches every 5 minutes)
- APY calculation engine (model vs. real APY)
- WebSocket server (real-time updates every 30 seconds)
- REST API for APY, strategies, and recommendations

#### Operator API ([apps/operator-api/](apps/operator-api/))
- Rebalance execution (EVM & Solana)
- Status monitoring
- Admin controls (pause/unpause)
- Allocations management

#### Indexer ([packages/indexer/](packages/indexer/))
- Onchain event tracking (Deposit, Redeem, Fee updates)
- PostgreSQL storage
- Real-time block-by-block indexing

### 3. Frontend

#### Dashboard ([apps/dashboard/](apps/dashboard/))
- Next.js 14 (App Router)
- shadcn/ui components
- Recharts visualizations
- Real-time APY tracking
- KPIs: Total TVL, Average APY, Active Strategies
- Top strategies table

### 4. SDK

#### TypeScript SDK ([packages/sdk/](packages/sdk/))
- EVM vault client (Arbitrum/BSC)
- Solana vault client
- Yields API client
- Full TypeScript support
- Gasless transaction helpers

## Key Features

### Gasless Transactions
- **EVM Deposits**: EIP-2612 permit, EIP-3009, Permit2
- **EVM Withdrawals**: EIP-712 meta-redeem
- **Solana**: Meta-transactions with relayer

### Fee Structure
- **Withdrawal Fee**: 0.1% (10 bps)
- **Configurable**: Max 1.0% (100 bps)
- **Timelock Protected**: Ownable2Step

### Cross-Chain
- **LayerZero**: 2-phase messaging (PREPARE/COMMIT/ABORT)
- **USDT Bridging**: via usdt0.to
- **USDC Bridging**: via Circle CCTP

### Yield Optimization
- **DefiLlama Integration**: Top pools by net APY
- **Auto-rebalancing**: On user deposits
- **Real-time APY**: Model vs. actual tracking

## Technology Stack

### Smart Contracts
- **Solidity**: 0.8.24
- **Foundry**: Testing & deployment
- **Anchor**: 0.30.0 (Solana)
- **OpenZeppelin**: Security patterns

### Backend
- **Node.js**: 18+
- **TypeScript**: 5.3+
- **Express**: REST APIs
- **WebSocket**: Real-time updates
- **PostgreSQL**: Event storage
- **Redis**: Caching

### Frontend
- **Next.js**: 14 (App Router)
- **React**: 18
- **Tailwind CSS**: Styling
- **shadcn/ui**: Component library
- **Recharts**: Data visualization

### Infrastructure
- **Docker**: Containerization
- **Docker Compose**: Multi-service orchestration
- **pnpm**: Monorepo management
- **Turbo**: Build system

## Quick Start

```bash
# Install dependencies
pnpm install

# Start infrastructure
cd infra/docker && docker-compose up -d

# Start all services
pnpm dev

# Access dashboard
open http://localhost:3000
```

## Testing

```bash
# EVM contracts
cd packages/evm-contracts && forge test

# Solana programs
cd packages/solana-programs && anchor test

# Backend services
cd apps/yields-backend && pnpm test
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment instructions.

### Contract Addresses

#### Arbitrum
- Vault: `TBD`
- Strategy Router: `TBD`
- OApp Coordinator: `TBD`

#### BSC
- Vault: `TBD`
- Strategy Router: `TBD`

#### Solana
- Program ID: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`

## API Endpoints

### Yields Backend (port 3001)
- `GET /api/health` - Health check
- `GET /api/apy` - All vault APYs
- `GET /api/apy/:chain` - Chain-specific APY
- `GET /api/strategies/:chain` - Top strategies
- `GET /api/rebalance/:chain` - Rebalance recommendations
- `WS /ws` - Real-time APY updates

### Operator API (port 3002)
- `GET /api/health` - Health check
- `POST /api/rebalance` - Execute rebalance
- `GET /api/rebalance/status/:chain` - Check rebalance status
- `POST /api/pause/:chain` - Pause operations
- `GET /api/allocations/:chain` - Current allocations

### Dashboard (port 3000)
- `/` - Main dashboard
- Real-time metrics and charts

## Security

- ✅ ReentrancyGuard on all external functions
- ✅ Ownable2Step for critical functions
- ✅ EIP-712 signature verification
- ✅ Replay protection (nonces)
- ✅ Idempotent message processing
- ✅ Per-strategy caps and slippage guards
- ✅ Emergency exit mechanisms

## Performance

- **DefiLlama**: 5-minute cache
- **WebSocket**: 30-second update interval
- **Dashboard**: Auto-refresh every 30 seconds
- **Indexer**: Real-time block processing

## Future Enhancements

- [ ] Additional chains (Polygon, Optimism)
- [ ] More yield strategies
- [ ] Advanced rebalancing algorithms
- [ ] Governance token
- [ ] Insurance fund
- [ ] Mobile app

## License

MIT

## Contributors

Built with ❤️ by the Talken team and contributors.

## Support

- **Documentation**: [README.md](README.md), [CLAUDE.md](CLAUDE.md)
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Email**: dev@talken.io

---

**Status**: ✅ All 12 implementation tasks completed
**Version**: 1.0.0
**Last Updated**: 2025-10-05
