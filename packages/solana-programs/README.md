# Solana Programs

Anchor-based Solana programs for Talken Stable Vault.

## Programs

### tsv-usdc-vault

EIP-4626-style vault for USDC on Solana with:

- **Deposit/Redeem**: Standard vault operations
- **Meta-redeem**: Gasless withdrawals via signature verification
- **0.1% withdrawal fee** (10 bps)
- **Governance controls**: Fee updates, emergency withdrawals

## Setup

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

### Build

```bash
anchor build
```

### Test

```bash
# Start local validator
solana-test-validator

# Run tests
anchor test
```

### Deploy

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

## Program Structure

```
programs/
  tsv-usdc-vault/
    src/
      lib.rs          # Main program logic
    Cargo.toml
tests/
  tsv-usdc-vault.ts  # Anchor tests
```

## Instructions

### Initialize

```typescript
await program.methods
  .initialize(feeBps)
  .accounts({
    vault,
    authority,
    assetMint,
    shareMint,
    assetVault,
  })
  .rpc();
```

### Deposit

```typescript
await program.methods
  .deposit(assets)
  .accounts({
    vault,
    user,
    userAsset,
    userShares,
    assetVault,
    shareMint,
  })
  .rpc();
```

### Redeem

```typescript
await program.methods
  .redeem(shares)
  .accounts({
    vault,
    user,
    userAsset,
    userShares,
    assetVault,
    shareMint,
  })
  .rpc();
```

### Meta-Redeem (Gasless)

```typescript
await program.methods
  .metaRedeem(shares, deadline, signature)
  .accounts({
    vault,
    owner,
    relayer,
    userNonce,
  })
  .rpc();
```

## Features

- **SPL Token Integration**: Standard token operations
- **Fee Mechanism**: Configurable withdrawal fee (max 1%)
- **Gasless Transactions**: Meta-redeem with signature verification
- **Emergency Controls**: Admin emergency withdrawal
- **Event Emissions**: Comprehensive event logging

## Security

- PDA-based vault authority
- Nonce tracking for replay protection
- Deadline enforcement for meta-transactions
- Ownership verification
- Safe math operations

## License

MIT
