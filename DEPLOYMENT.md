# Deployment Guide

Complete deployment guide for Talken Stable Vault across all environments.

## 📋 Prerequisites

- Node.js >= 18
- pnpm >= 8 or npm
- Foundry (for EVM contracts)
- Anchor CLI (for Solana programs)
- Vercel account (for hosting)
- GitHub account (for deployment)

## 🚀 Quick Start (Local Development)

### 1. Clone and Install

```bash
git clone https://github.com/minsuj-colligence/talken-stable-vault.git
cd talken-stable-vault
pnpm install
```

### 2. Start Services

```bash
# Terminal 1: Yields Backend (port 3001)
cd apps/yields-backend
npm run dev

# Terminal 2: Dashboard (port 3000)
cd apps/dashboard
npm run dev
```

### 3. Access Services

- **Dashboard**: http://localhost:3000
- **Yields API**: http://localhost:3001/api/yields
- **WebSocket**: ws://localhost:3001/ws

## ☁️ Vercel Deployment

### Prerequisites

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

### Dashboard Deployment

```bash
cd apps/dashboard

# Deploy to production
vercel --prod

# Or use token
vercel --prod --token=<YOUR_VERCEL_TOKEN>
```

**Environment Variables** (set in Vercel dashboard):
- `NEXT_PUBLIC_API_URL` = `https://your-yields-backend.vercel.app`

### Yields Backend Deployment

```bash
cd apps/yields-backend

# Deploy to production
vercel --prod --token=<YOUR_VERCEL_TOKEN>
```

**Project Settings**:
- Root Directory: `apps/yields-backend`
- Framework Preset: Other
- Build Command: `npm run build`
- Output Directory: `dist`

### Current Live Deployments

- **Dashboard**: https://dashboard-o0eamta69-minsu-jus-projects.vercel.app
- **Yields Backend**: https://yields-backend-gmf74acdo-minsu-jus-projects.vercel.app

## 📦 Contract Deployment

### EVM Contracts (Ethereum + Bridge Chains)

```bash
cd packages/evm-contracts

# Install dependencies
forge install

# Build contracts
forge build

# Run tests
forge test

# Deploy to Ethereum Sepolia (testnet)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $ETHEREUM_SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify

# Deploy to Ethereum Mainnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $ETHEREUM_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

**Bridge Chains** (Arbitrum, Base, Plasma):
- Deploy LayerZero OApp on each chain
- Configure peer addresses
- Set up CCTP for USDC transfers
- Configure usdt0.to routing for USDT

### BSC Contracts

```bash
cd packages/bsc-contracts

# Build and test
forge build
forge test

# Deploy to BSC Testnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BSC_TESTNET_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify

# Deploy to BSC Mainnet
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $BSC_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --broadcast \
  --verify
```

### Solana Programs

```bash
cd packages/solana-programs

# Build program
anchor build

# Run tests
anchor test

# Deploy to Devnet
anchor deploy --provider.cluster devnet

# Deploy to Mainnet-Beta
anchor deploy --provider.cluster mainnet
```

## 🐳 Docker Deployment (Optional)

### Build Images

```bash
# Build all images
cd infra/docker
docker-compose build

# Or build individually
docker build -t talken/dashboard -f Dockerfile.dashboard ../..
docker build -t talken/yields-backend -f Dockerfile.yields-backend ../..
```

### Run with Docker Compose

```bash
cd infra/docker

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## ⚙️ Environment Variables

### Dashboard (.env.local)

```env
NEXT_PUBLIC_API_URL=https://yields-backend-gmf74acdo-minsu-jus-projects.vercel.app
```

### Yields Backend (.env)

```env
PORT=3001
NODE_ENV=production
LOG_LEVEL=info

# Optional: Redis for caching
REDIS_URL=redis://localhost:6379
```

### EVM Contracts (.env)

```env
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
BSC_RPC_URL=https://bsc-dataseed.binance.org/
DEPLOYER_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=YOUR_KEY
```

### Solana Programs (.env)

```env
ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
ANCHOR_WALLET=~/.config/solana/id.json
```

## 🔍 Monitoring & Health Checks

### API Health Endpoints

```bash
# Yields Backend
curl https://yields-backend-gmf74acdo-minsu-jus-projects.vercel.app/api/yields

# Check specific vault
curl https://yields-backend-gmf74acdo-minsu-jus-projects.vercel.app/api/yields/ethereum-usdt
```

### Vercel Logs

```bash
# View deployment logs
vercel logs [deployment-url]

# View function logs
vercel logs --follow
```

### Local Development Logs

```bash
# Yields backend
cd apps/yields-backend
npm run dev
# Check console for: "Yields backend running on port 3001"

# Dashboard
cd apps/dashboard
npm run dev
# Check console for: "Ready on http://localhost:3000"
```

## 🔐 Security Checklist

### Pre-Deployment
- [ ] All private keys stored in secure vaults (never in .env files)
- [ ] Environment variables configured in Vercel dashboard
- [ ] RPC URLs set to production endpoints
- [ ] API rate limiting enabled
- [ ] CORS configured for allowed origins only

### Contract Deployment
- [ ] Contracts audited (recommended for mainnet)
- [ ] Multi-sig wallet configured for admin operations
- [ ] Timelock set for fee changes (min 24-48 hours)
- [ ] Emergency pause mechanism tested
- [ ] Contract addresses verified on explorers

### Post-Deployment
- [ ] All contract addresses documented
- [ ] LayerZero peer addresses configured
- [ ] CCTP relayers set up
- [ ] Strategy routers funded with gas
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested

## 🛠️ Troubleshooting

### Vercel Deployment Issues

**Build Fails with TypeScript Errors**
```bash
# Fix locally first
cd apps/dashboard
npm run build

# Then commit and redeploy
git add .
git commit -m "Fix TypeScript errors"
git push
vercel --prod
```

**Environment Variables Not Loading**
- Check Vercel dashboard: Settings → Environment Variables
- Ensure variables are set for "Production" environment
- Redeploy after adding variables

### Contract Deployment Issues

**Insufficient Gas**
- Check wallet balance on target chain
- Increase gas limit in forge script
- Use `--legacy` flag for older chains

**Verification Fails**
```bash
# Manual verification
forge verify-contract \
  --chain-id 1 \
  --num-of-optimizations 200 \
  --constructor-args $(cast abi-encode "constructor(address)" 0x...) \
  0xYOUR_CONTRACT_ADDRESS \
  src/TSV_USDT_Vault.sol:TSV_USDT_Vault \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### Local Development Issues

**Port Already in Use**
```bash
# Find and kill process
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill
```

**DefiLlama API Rate Limited**
- Backend automatically implements 10-minute caching
- Check logs for "Returning cached DefiLlama pools"
- Reduce polling frequency if needed

## 📊 Deployment Workflow

### 1. Development
```bash
# Create feature branch
git checkout -b feature/new-strategy

# Make changes and test locally
npm run dev
npm run test

# Commit and push
git commit -m "Add new strategy adapter"
git push origin feature/new-strategy
```

### 2. Staging (Vercel Preview)
```bash
# Push to GitHub triggers automatic preview deployment
# Check preview URL in Vercel dashboard
```

### 3. Production
```bash
# Merge to main
git checkout main
git merge feature/new-strategy
git push origin main

# Or manual production deploy
vercel --prod --token=$VERCEL_TOKEN
```

### 4. Contract Updates
```bash
# Deploy new strategy router
cd packages/evm-contracts
forge script script/DeployStrategy.s.sol --broadcast

# Update operator API with new address
# Redeploy operator-api
```

## 🔄 Rollback Procedures

### Vercel Rollback
```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote [previous-deployment-url]
```

### Contract Rollback
- Contracts are immutable - use emergency pause
- Deploy new version with fixes
- Update operator API to use new addresses

### Database Rollback (if using)
```bash
# Restore from backup
pg_restore -U talken -d talken_vault backup.sql
```

## 📚 Additional Resources

- **Vercel Docs**: https://vercel.com/docs
- **Foundry Book**: https://book.getfoundry.sh/
- **Anchor Docs**: https://www.anchor-lang.com/
- **LayerZero Docs**: https://layerzero.gitbook.io/

## 🆘 Support

- **GitHub Issues**: https://github.com/minsuj-colligence/talken-stable-vault/issues
- **Implementation Guide**: [CLAUDE.md](CLAUDE.md)
- **Project Summary**: [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

---

**Built with [Claude Code](https://claude.com/claude-code)**
