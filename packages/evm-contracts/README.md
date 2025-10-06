# EVM Contracts (Arbitrum)

Foundry-based smart contracts for Talken Stable Vault on Arbitrum.

## Contracts

### Core

- **TSV_USDT0_Vault.sol** - EIP-4626 vault for USDT0 with gasless features
- **StrategyRouter.sol** - Routes funds to yield strategies
- **OAppCoordinator.sol** - LayerZero cross-chain coordinator
- **BridgeOrchestrator.sol** - USDT0/CCTP bridge orchestrator
- **Permit2Puller.sol** - Uniswap Permit2 integration

### Interfaces

- **IERC3009.sol** - EIP-3009 transferWithAuthorization interface

## Setup

### Install Dependencies

```bash
# Install Foundry if not already installed
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts
forge install LayerZero-Labs/LayerZero-v2
forge install foundry-rs/forge-std
```

### Build

```bash
forge build
```

### Test

```bash
forge test
forge test -vvv  # Verbose output
forge coverage   # Coverage report
```

### Deploy

```bash
# Set environment variables
cp .env.example .env
# Edit .env with your values

# Deploy to Arbitrum Sepolia (testnet)
forge script script/Deploy.s.sol:DeployScript --rpc-url arbitrum_sepolia --broadcast --verify

# Deploy to Arbitrum (mainnet)
forge script script/Deploy.s.sol:DeployScript --rpc-url arbitrum --broadcast --verify
```

## Features

### Gasless Deposits

- **EIP-2612 Permit**: `depositWithPermit()`
- **EIP-3009**: `depositWithAuth()`
- **Permit2**: Via `Permit2Puller`

### Gasless Withdrawals

- **EIP-712 Meta-Redeem**: `redeemWithSig()`

### Fee Structure

- Withdrawal fee: 0.1% (10 bps)
- Configurable by owner (max 1.0%)
- Timelock protected via `Ownable2Step`

### Strategy Management

- Per-strategy caps
- Slippage guards (default 0.5%)
- Cooldown periods
- Emergency exit

### Cross-Chain

- LayerZero 2-phase messaging (PREPARE/COMMIT/ABORT)
- USDT bridging via usdt0.to
- USDC bridging via Circle CCTP

## Security

- OpenZeppelin contracts
- ReentrancyGuard on all external functions
- Ownable2Step for critical functions
- Replay protection (nonces)
- Idempotent message processing

## License

MIT
