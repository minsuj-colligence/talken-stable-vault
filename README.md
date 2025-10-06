# Talken Stable Vault

> Cross-domain stable-yield aggregator using **Ethereum (USDT)**, **Solana (USDC)**, and **BSC (USDT)** domains. Gasless UX via **EIP-2612 / Permit2 / EIP-3009**, cross-chain messaging with **LayerZero**, value transfer via **CCTP (USDC)** and **USDT routing via usdt0.to/USDT0**. Vaults are **EIP-4626-compliant** with a flat **0.1% withdrawal fee**.

## 🌟 Features

### Multi-Chain Vaults
- **Ethereum (EVM)**: USDT vault with bridge support (Arbitrum, Base, Plasma)
- **Solana**: USDC vault with Anchor programs
- **BSC**: USDT vault with Permit2 fallback

### Gasless Transactions
- **Deposits**: EIP-2612 `permit()`, EIP-3009 `transferWithAuthorization()`, Permit2
- **Withdrawals**: EIP-712 meta-redeem signatures, Solana relayer pattern

### Cross-Chain Infrastructure
- **Messaging**: LayerZero OApp with 2-phase PREPARE/COMMIT protocol
- **Token Transfer**: CCTP for USDC, usdt0.to for USDT
- **Bridge Chains**: Arbitrum, Base, Plasma route to Ethereum

### Yield Optimization
- **30-Day Average APY Strategy**: Uses `apyMean30d` for stable, predictable returns
- **DefiLlama Integration**: Real-time data from 19,697+ pools
- **Smart Allocation**:
  - **EVM**: 10 strategies from preferred protocols (Uniswap, Curve, Yearn, Pendle, etc.)
  - **Solana**: Greedy selection until 90% coverage or 20 strategies
  - **BSC**: Greedy selection until 90% coverage or 20 strategies
- **Safety Filters**: $0.2M minimum TVL, stablecoin-only pairs, 5% minimum APY

### Fee Structure
- **Withdrawal Fee**: Flat 0.1% (10 bps) on assets out
- **Owner Configurable**: Timelock + multisig protected
- **Max Cap**: 1.00% hard limit

## 📁 Monorepo Structure

```
/talken-stable-vault
  /apps
    /dashboard            # Next.js 14 (App Router) + shadcn/ui + Recharts
    /operator-api         # NestJS API for rebalancing operations
    /yields-backend       # DefiLlama poller + APY engine + WebSocket/REST
  /packages
    /evm-contracts        # Foundry: EIP-4626 vaults, LayerZero OApp, routers
    /bsc-contracts        # BSC vault with Permit2 support
    /solana-programs      # Anchor: USDC vault + meta-redeem
    /indexer              # Event indexer (Rust/TS)
    /sdk                  # TypeScript SDK for integration
  /infra
    /docker               # Dockerfiles + compose
    /terraform            # IaC (optional)
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- pnpm >= 8
- Foundry (for EVM contracts)
- Anchor CLI (for Solana programs)
- Rust (for indexer)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Local Development

```bash
# Run yields backend (port 3001)
cd apps/yields-backend
npm run dev

# Run dashboard (port 3000)
cd apps/dashboard
npm run dev
```

**Access:**
- Dashboard: http://localhost:3000
- Yields API: http://localhost:3001/api/yields
- WebSocket: ws://localhost:3001/ws

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy dashboard
cd apps/dashboard
vercel --prod

# Deploy yields backend
cd apps/yields-backend
vercel --prod
```

## 📊 Dashboard Features

### Real-Time Metrics
- **Total TVL**: Aggregated across all vaults
- **Average APY**: Weighted by vault allocation (50% EVM, 30% Solana, 20% BSC)
- **Active Strategies**: Live strategy count
- **Total Chains**: 6 chains (Ethereum, Arbitrum, Base, Plasma, Solana, BSC)

### APY Trends Chart
- 30-day historical APY for each vault
- Uses 30d average APY weighted by strategy allocation
- Real-time updates every 30 seconds

### Strategies Table
- **Three-tier filtering**: Vault → Chain → Protocol
- **Sortable columns**: Protocol, Chain, Base APY, Allocated, Weight
- **Live data**: DefiLlama pools with $0.2M+ TVL
- **Columns**:
  - Protocol, Pool, Chain
  - Base APY, Reward APY, 30d Avg APY
  - Allocated (Yes/No), Weight (%)

## 🔐 Security

### Smart Contracts
- EIP-4626 compliance for vault standardization
- Timelock + multisig for admin operations
- Idempotent LayerZero message handling
- Replay protection via nonces
- Emergency exit mechanisms

### Yield Safety
- Stablecoin-only pairs (23+ whitelisted stables)
- $0.2M minimum TVL requirement
- 5% minimum 30d average APY
- Preferred protocol whitelist (EVM)

## 🏗️ Architecture

### EVM (Ethereum)
- **Main Vault**: `TSV_USDT_Vault` (EIP-4626)
- **Strategy Router**: Multi-protocol adapter (Aave, Curve, Pendle, etc.)
- **Bridge Orchestrator**: USDT (usdt0.to) + USDC (CCTP)
- **OApp Coordinator**: LayerZero messaging

### Solana
- **Vault Program**: `tsv-usdc-vault` (Anchor)
- **Strategy Adapters**: Kamino, marginfi, Solend, Orca, Raydium
- **Meta-Redeem**: Off-chain signature verification

### BSC
- **Vault**: `TSV_USDT_Vault_BSC`
- **Strategy Router**: PancakeSwap, UniswapV3 adapters
- **Permit2**: Gasless deposit support

## 🔄 Automated Rebalancing

When users deposit:
1. Backend fetches latest DefiLlama data
2. APY engine calculates optimal allocation
3. Operator API executes rebalance via StrategyRouter
4. Vault positions updated, events emitted

**Strategy Selection:**
- **EVM**: Top 10 from preferred protocols (100% weight)
- **Solana**: Greedy until 90% coverage or 20 strategies
- **BSC**: Greedy until 90% coverage or 20 strategies

## 📚 Documentation

- **Implementation Guide**: [CLAUDE.md](CLAUDE.md)
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **Project Summary**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)
- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md)

## 🌐 Live Deployments

- **Dashboard**: https://dashboard-o0eamta69-minsu-jus-projects.vercel.app
- **Yields Backend**: https://yields-backend-gmf74acdo-minsu-jus-projects.vercel.app
- **GitHub**: https://github.com/minsuj-colligence/talken-stable-vault

## 🛠️ Tech Stack

### Frontend
- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- Recharts for visualizations
- TypeScript

### Backend
- Express.js + TypeScript
- WebSocket (ws) for real-time updates
- DefiLlama API integration
- 30-day APY averaging engine

### Smart Contracts
- **EVM**: Solidity + Foundry
- **Solana**: Rust + Anchor
- **Standards**: EIP-4626, EIP-2612, EIP-3009, EIP-712

### Infrastructure
- Vercel (hosting)
- LayerZero (messaging)
- CCTP (USDC bridge)
- usdt0.to (USDT routing)

## 📝 License

MIT

---

**Built with [Claude Code](https://claude.com/claude-code)**
