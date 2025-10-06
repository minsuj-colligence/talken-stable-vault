# BSC Contracts

Foundry-based smart contracts for Talken Stable Vault on Binance Smart Chain.

## Contracts

- **TSV_USDT_Vault_BSC.sol** - EIP-4626 vault for USDT with Permit2
- **BSCStrategyRouter.sol** - Routes funds to BSC yield strategies
- **IPermit2.sol** - Uniswap Permit2 interface

## Key Differences from Arbitrum

- **Native USDT** doesn't support EIP-2612 permit
- **Permit2 integration** for gasless approvals
- **BSC-specific protocols**: PancakeSwap, Venus, Alpaca

## Setup

### Build

```bash
forge build
```

### Test

```bash
forge test
forge test -vvv
forge coverage
```

### Deploy

```bash
# Set environment
cp .env.example .env
# Edit .env

# Deploy to BSC testnet
forge script script/Deploy.s.sol:DeployScript --rpc-url bsc_testnet --broadcast --verify

# Deploy to BSC mainnet
forge script script/Deploy.s.sol:DeployScript --rpc-url bsc --broadcast --verify
```

## Permit2 Integration

Native USDT on BSC doesn't have `permit()`, so we use Uniswap's Permit2:

```solidity
await vault.depositWithPermit2(
  amount,
  receiver,
  deadline,
  signature
);
```

### Permit2 Address

- **Mainnet**: `0x000000000022D473030F116dDEE9F6B43aC78BA3`
- **Testnet**: `0x000000000022D473030F116dDEE9F6B43aC78BA3`

## Strategy Adapters

BSC strategy adapters for:

- **PancakeSwap** V2/V3 pools
- **Venus** lending protocol
- **Alpaca Finance** yield farming
- **Thena** DEX

## Features

- 0.1% withdrawal fee (configurable)
- Permit2 for gasless deposits
- EIP-712 meta-redeem for gasless withdrawals
- Per-strategy caps and slippage guards
- Emergency exit mechanisms

## License

MIT
