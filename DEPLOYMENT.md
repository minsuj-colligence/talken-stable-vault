# Deployment Guide

Complete deployment guide for Talken Stable Vault across all environments.

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- Foundry (for EVM contracts)
- Anchor CLI (for Solana programs)
- Docker & Docker Compose
- PostgreSQL (optional, can use Docker)
- Redis (optional, can use Docker)

## Quick Start (Local Development)

### 1. Clone and Install

```bash
git clone <repo-url>
cd talken-stable-vault
pnpm install
```

### 2. Start Infrastructure

```bash
cd infra/docker
docker-compose up -d postgres redis
```

### 3. Configure Environment

```bash
# Copy environment files
cp apps/yields-backend/.env.example apps/yields-backend/.env
cp apps/operator-api/.env.example apps/operator-api/.env
cp apps/dashboard/.env.example apps/dashboard/.env
cp packages/indexer/.env.example packages/indexer/.env
cp packages/evm-contracts/.env.example packages/evm-contracts/.env

# Edit each .env file with your values
```

### 4. Start Services

```bash
# Terminal 1: Yields Backend
cd apps/yields-backend
pnpm dev

# Terminal 2: Operator API
cd apps/operator-api
pnpm dev

# Terminal 3: Dashboard
cd apps/dashboard
pnpm dev

# Terminal 4: Indexer
cd packages/indexer
pnpm dev
```

### 5. Access Services

- **Dashboard**: http://localhost:3000
- **Yields API**: http://localhost:3001/api
- **Operator API**: http://localhost:3002/api
- **WebSocket**: ws://localhost:3001/ws

## Contract Deployment

### EVM Contracts (Arbitrum)

```bash
cd packages/evm-contracts

# Install Foundry dependencies
forge install

# Build
forge build

# Test
forge test

# Deploy to Arbitrum Sepolia (testnet)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $ARBITRUM_SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Deploy to Arbitrum (mainnet)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $ARBITRUM_RPC_URL \
  --broadcast \
  --verify
```

### BSC Contracts

```bash
cd packages/bsc-contracts

forge build
forge test

# Deploy to BSC Testnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BSC_TESTNET_RPC_URL \
  --broadcast \
  --verify

# Deploy to BSC Mainnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BSC_RPC_URL \
  --broadcast \
  --verify
```

### Solana Programs

```bash
cd packages/solana-programs

# Build
anchor build

# Test
anchor test

# Deploy to Devnet
anchor deploy --provider.cluster devnet

# Deploy to Mainnet
anchor deploy --provider.cluster mainnet
```

## Production Deployment

### Using Docker Compose (All Services)

```bash
# Build and start all services
cd infra/docker
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Individual Service Deployment

#### Yields Backend

```bash
cd apps/yields-backend
pnpm build
pnpm start
```

#### Operator API

```bash
cd apps/operator-api
pnpm build
pnpm start
```

#### Dashboard

```bash
cd apps/dashboard
pnpm build
pnpm start
```

## Environment Variables

### Yields Backend

```env
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
REDIS_URL=redis://localhost:6379
```

### Operator API

```env
PORT=3002
NODE_ENV=production
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
BSC_RPC_URL=https://bsc-dataseed.binance.org/
OPERATOR_PRIVATE_KEY=<your_key>
ARBITRUM_STRATEGY_ROUTER=0x...
BSC_STRATEGY_ROUTER=0x...
YIELDS_BACKEND_URL=http://localhost:3001
```

### Dashboard

```env
NEXT_PUBLIC_YIELDS_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_OPERATOR_API_URL=http://localhost:3002
```

## Database Setup

### PostgreSQL Schema

```sql
-- Connect to database
psql -U talken -d talken_vault

-- Run migrations
\i migrations/001_initial.sql
```

## Monitoring

### Health Checks

```bash
# Yields Backend
curl http://localhost:3001/api/health

# Operator API
curl http://localhost:3002/api/health

# Dashboard
curl http://localhost:3000/api/health
```

### Logs

```bash
# Docker
docker-compose logs -f yields-backend
docker-compose logs -f operator-api

# PM2 (if using)
pm2 logs yields-backend
pm2 logs operator-api
```

## Security Checklist

- [ ] All `.env` files configured with production values
- [ ] Private keys stored securely (use AWS Secrets Manager, Vault, etc.)
- [ ] RPC URLs set to production endpoints
- [ ] Contract addresses verified on block explorers
- [ ] Rate limiting enabled on APIs
- [ ] CORS configured properly
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Database backups enabled
- [ ] Monitoring and alerting set up

## Troubleshooting

### Services Won't Start

- Check logs: `docker-compose logs -f <service>`
- Verify environment variables
- Ensure ports are available
- Check database connectivity

### Contract Deployment Fails

- Verify RPC URL is correct
- Check wallet has sufficient gas
- Ensure Foundry/Anchor is up to date
- Review error messages carefully

### Database Connection Issues

- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure network connectivity
- Check credentials

## Rollback Procedure

If deployment fails:

1. Stop services: `docker-compose down`
2. Restore previous database backup
3. Revert to previous Git commit
4. Redeploy: `docker-compose up -d`

## Support

For issues, contact the team or open a GitHub issue.
