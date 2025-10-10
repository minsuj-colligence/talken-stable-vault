# CLAUDE.md — Talken Stable Vault (Implementation Guide)

> Implementation handbook for Claude Code to scaffold and ship **Talken Stable Vault**: a cross-domain stable-yield aggregator using **Ethereum(USDT)**, **Solana(USDC)**, and **BSC(USDT)** domains. **Gasless UX** via **EIP-2612 / Permit2 / EIP-3009**, cross-chain **messaging with LayerZero**, **value transfer via CCTP (USDC)** and **USDT routing via usdt0.to/USDT0**. **Vaults are EIP-4626-compliant** with a **flat 0.1% withdraw fee**.

---

## 0. Overview

* Three vault domains:

  * **EVM domain (Main: Ethereum)**, base asset **USDT** only.
  * **Solana domain**, base asset **USDC** only.
  * **BSC domain**, base asset **USDT** with Permit2 fallback.
* **EVM bridge chains**: Arbitrum, Base, Plasma bridge to Ethereum via LayerZero (no separate vaults).
* Users deposit stablecoins; the system allocates to top net-APY pools (from **DefiLlama Yields**).
* **Stablecoin filtering**: Only stable-to-stable pairs, minimum $0.2M TVL for liquidity.
* **Gasless** deposits: `permit` (2612) / `transferWithAuthorization` (3009) / **Permit2** for native USDT.
* **Gasless** withdrawals: vault-level EIP-712 meta-redeem.
* **Cross-chain** messaging (LayerZero) and **token movement** (CCTP for USDC, usdt0.to for USDT).
* **Fees**: flat **0.1%** on withdrawals, **owner configurable** (timelocked).
* **Dashboard**: KPIs, charts, real-time APY, top 100 strategies with filtering/sorting, allocations, and bridge status.

---

## 1. Monorepo Layout

```
/talken-stable-vault
  /apps
    /dashboard            # Next.js (App Router) + shadcn/ui
    /operator-api         # NestJS/Express API for ops (rebalance, indexers)
    /yields-backend       # DefiLlama poller + APY_net engine + websocket/REST
  /packages
    /evm-contracts        # Foundry/Hardhat: 4626 vaults, routers, LZ OApp, Permit2 helpers
    /bsc-contracts        # BSC build (USDT base, Permit2 path, Pancake/UniswapV3 adapter)
    /solana-programs      # Anchor program: USDC vault, meta-redeem, strategy adapters
    /indexer              # Rust/TS indexer: onchain events, DefiLlama fetch, APY_net scoring
    /sdk                  # TS SDK for front/back integration
  /infra
    /docker               # Dockerfiles, compose for local dev
    /terraform            # Optional IaC for staging/prod
  CLAUDE.md               # This file
  README.md               # Quickstart
```

---

## 2. EVM / Ethereum

### Core Contracts

* **`Talken_USDT_Vault`** (EIP-4626 compliant)

  * Asset: **USDT** on Ethereum.
  * Withdraw fee: **10 bps** (0.1%) on **assetsOut** — owner can adjust via `setFeeBps(uint16)` (timelock+multisig protected).
  * `previewRedeem/previewWithdraw` return net of fee.
  * Gasless helpers:

    * `depositWithPermit(...)` — EIP-2612
    * `depositWithAuth(...)` — EIP-3009 `transferWithAuthorization`
    * `redeemWithSig(...)` — EIP-712 meta-redeem
* **`StrategyRouter`**

  * Adapters for **Aave v3, Curve, Pendle, FraxLend, Balancer, Uniswap V3, Compound v3, Ethena, Yearn**.
  * Pool caps, slippage guards, cooldowns, emergency exit.
* **`OAppCoordinator`** (LayerZero)

  * 2-phase messages: `PREPARE` → `COMMIT/ABORT`, idempotent `msgId`.
  * Peer allowlist; replay protection, nonce.
* **`BridgeOrchestrator`**

  * USDT flows via **usdt0.to**, USDC via **CCTP**.
* **`Permit2Puller`** optional for native USDT.

---

## 3. Solana Programs (Anchor)

* **`Talken_USDC_Vault`**

  * Asset: USDC (SPL), fee 10 bps, owner-updatable via governance timelock.
  * Meta-redeem verifying off-chain user signature; relayer as fee-payer.
  * (Optional) LZ receiver for status/ack.
* **Accounts/State**: total_assets, total_shares, fee_bps, nonces, seen_msg_ids.
* **Instructions**: `deposit`, `redeem`, `meta_redeem`, `admin_update`.

### Strategy Adapters

* **Lending**: Kamino, marginfi, Solend, save.
* **DEX/LP**: Orca, Raydium.
* **Controls**: per-adapter caps, slippage, cooldowns, emergency exit.
* **Accounting**: tracked in PDA, realized PnL returns to vault.

---

## 4. BSC Contracts

* **Base Asset**: USDT with Permit2 for gasless deposits.
* **Adapters**: PancakeSwap/UniswapV3 and lending protocols.
* No cross-domain auto-rebalance.

---

## 5. Fee Logic

```solidity
uint256 gross = _convertToAssets(shares, Math.Rounding.Down);
uint256 fee = gross * feeBps / 10_000;
uint256 net = gross - fee;
```

```solidity
function setFeeBps(uint16 newBps) external onlyOwner {
  require(newBps <= 100, "max 1.00%");
  feeBps = newBps;
  emit FeeUpdated(newBps);
}
```

---

## 6. Gasless Design

* **EVM**: 2612/3009/Permit2 for deposits, EIP-712 meta-redeem for withdrawals.
* **Solana**: fee-payer relayer pattern for meta-deposit and meta-redeem (signature verification in program).

---

## 7. Yield Sourcing via DefiLlama

### User Deposit & Automated Rebalancing

* When a user **deposits stablecoins** into any Vault (USDT0 / USDC / USDT), the **backend service** automatically:

  1. Retrieves the latest DefiLlama yield data and internal strategy stats.
  2. Calculates the **optimal APY allocation** across available strategies for that domain.
  3. Executes or schedules a **rebalance** transaction via the Operator API and StrategyRouter.
  4. Updates Vault position weights and emits onchain/offchain events.

* This ensures all deposits immediately participate in the **highest net-APY strategies** while maintaining exposure caps and safety limits.

### Chain Configuration & Filtering

* **Actual Vaults** (3):
  * `ethereum-usdt` (USDT, USDC, DAI, USDE, FRAX) - **Main EVM Vault**
  * `solana-usdc` (USDC, USDT, USD1)
  * `bsc-usdt` (USDT)

* **Bridge Chains** (no vaults, route to Ethereum via CCTP or usdt0.to):
  * Arbitrum (USDT0, USDC)
  * Base (USDC)
  * Plasma (USDT0)

* **Stablecoin Whitelist**: USDT, USDC, DAI, USDT0, USDS, FRAX, USDP, GUSD, SUSD, USDE, USD1, LUSD, USDM, USDB, FDUSD, PYUSD, CUSD, USDX

* **Exclusion List**: Non-stablecoins like DAILYBET, BTC, ETH, SOL, etc. explicitly filtered

* **Safety Requirements**:
  * Minimum TVL: **$0.2M** ($200k) for stability and liquidity
  * All tokens in LP pairs must be stablecoins
  * Pool must have recent APY data

### APY Calculation & Weight Optimization

* Fetch **DefiLlama Yields API** every 600 seconds.

* Filter by domain/asset and apply stablecoin validation.

* **30-Day Average APY Strategy** (optimized for sustainability):
  * Sort strategies by `APY_mean30d` (30-day historical average APY)
  * Calculate weights based on **30d Average APY** to maximize stable returns
  * `APY_mean30d` provides more stable metric than current APY, excludes short-term volatility
  * Fallback to `APY_base` if 30d average not available
  * Minimum 5.0% 30d avg APY required (filters out low-yield strategies)

* **Strategy Selection Algorithm**:
  * **EVM Vault (Ethereum + bridge chains)**:
    * Total: **10 strategies** from preferred protocols only (100% weight)
    * Only invests in preferred protocols (Aave, Curve, Pendle, FraxLend, Balancer, Uniswap, Compound, Ethena, Yearn)
    * No other protocols allowed for EVM vault
    * Allow multiple strategies per protocol if different pools
    * Deduplication: 1 strategy per protocol+asset combination per chain
      * Example: yearn USDC on Ethereum (1), yearn USDT on Ethereum (1), yearn USDC on Base (1) ✓
    * Strategies selected from all EVM chains (Ethereum, Arbitrum, Base, Plasma)
    * Minimum TVL: **$0.2M** per strategy
    * Minimum 30d avg APY: **5.0%** per strategy

  * **Solana Vault**:
    * Standard greedy selection (no protocol limit)
    * Continue until 90% coverage or 20 strategies
    * Minimum TVL: **$0.2M** per strategy

  * **BSC Vault**:
    * Standard greedy selection (no protocol limit)
    * Continue until 90% coverage or 20 strategies
    * Minimum TVL: **$0.2M** per strategy

* **APY Breakdown**:
  * `APY_base`: Stable yield from lending/LP fees
  * `APY_reward`: Token incentive programs (excluded from weight calculation)
  * `APY_gross = APY_base + APY_reward`
  * `APY_net = APY_gross * (1 - fee_impact)`

* `VaultAPY_real = (ΔpricePerShare / Δtime) * 365d`.

* `VaultAPY_model = Σ(weight_i * APY_base_i)` (using base APY for stability).

* Use **/apps/yields-backend** service to poll, store, and expose via REST/WebSocket.

---

## 8. Service App

* **Stack**: Next.js 14 (App Router) + Tailwind + shadcn/ui + Recharts + lucide-react icons.
* **Structure**:
  * `/` - Landing page with service overview, features, supported chains, and CTA
  * `/app` - Main vault interaction page with wallet connection and deposit/withdraw
  * `/dashboard` - Analytics dashboard with metrics, APY trends, and strategy details

### Landing Page (`/`)
* Hero section with service description
* Stats: 6 chains, 3 vaults, 20+ strategies
* Features showcase: Cross-chain, auto-optimization, EIP-4626, gasless txs
* Supported chains display
* Call-to-action buttons

### App Page (`/app`)
* **Wallet Connection**:
  * EVM wallets (MetaMask) with ⟠ icon
  * Solana wallets (Phantom) with ◎ icon
  * Display: [Icon] address
* **3 Vault Cards** (TalkenUSDe, TalkenUSDs, TalkenUSDb):
  * Header: Vault name, chain badge, asset, weighted APY
  * Stats: Total Value Locked, Your Invested
  * Deposit/Withdraw tabs with amount input
  * Wallet/Invested balance display with MAX button
  * Current Protocol Allocations (top 5):
    * [Chain Icon] Protocol • Asset/Pool    APY%  Weight%
* **Auto-refresh**: Every 30 seconds
* **Chain-specific deposit**: Only enabled when compatible wallet connected

### Dashboard Page (`/dashboard`)
* **Metrics Cards** (4 cards):
  * Total TVL, Average APY (weighted), Active Strategies, Total Chains
* **APY Trends Chart**:
  * 30-day historical trend for 3 vaults
  * Uses 30d average APY weighted by strategy allocation
* **Strategies Table**:
  * Filters: Vault → Chain → Protocol (cascading)
  * Sortable columns: Protocol, Chain, Base APY, Allocated, Weight
  * Display: Chain icon, protocol, pool/asset, APY, allocation %
* **Auto-refresh**: Every 30 seconds

* **Port**: 3000 (frontend), 3001 (yields-backend), 3002 (operator-api)

---

## 9. Operator API

* Endpoints: `/status`, `/yields`, `/allocations`, `/rebalance`, `/pause`.
* Connected to indexer and yields-backend.

---

## 10. SDK

* Helpers for deposits (permit/3009/Permit2), meta-redeem (EIP-712), yield queries, and vault metrics.

---

## 11. Security & Testing

* Idempotent LZ processing, replay-safe signatures, strict allowlists.
* Unit tests: fee math, preview correctness, permit/3009.
* Anchor tests: meta-redeem signature paths.
* Fuzzing: share math, feeBps bounds.

---

## 12. Implementation Status

### ✅ Completed

* **Monorepo**: Turborepo with pnpm workspaces
* **Contracts**:
  * **EVM (Ethereum)**: TSV_USDT_Vault (EIP-4626), StrategyRouter, BridgeOrchestrator, OAppCoordinator (LayerZero)
  * **Solana**: Anchor-based USDC vault
  * **BSC**: USDT vault with Permit2
* **Yields Backend**:
  * DefiLlama polling (every 10 minutes)
  * Strategy selection: 10 from preferred protocols (EVM), greedy until 90% or 20 strategies (Solana/BSC)
  * Preferred protocols (EVM): Aave, Curve, Pendle, FraxLend, Balancer, Uniswap, Compound, Ethena, Yearn
  * 30d average APY (`apyMean30d`) for weight calculation
  * Minimum filters: 5% APY, $0.2M TVL
  * REST API + WebSocket
* **Dashboard**:
  * Next.js 14 + Tailwind + shadcn/ui + Recharts
  * Auto-refresh every 30 seconds
  * 4 metrics cards, APY trends chart (30 days), strategies table
  * Three-tier filters: Vault → Chain → Protocol
  * Sortable columns with 3-state toggle
* **SDK & Indexer**: TypeScript clients, event indexing
* **Infrastructure**: Docker Compose, Foundry/Anchor tests

### 🔄 Key Decisions

* **EVM Vault Model**: Ethereum as main vault; bridge chains (Arbitrum, Base, Plasma) route via LayerZero/CCTP
* **30d Average APY**: Uses `apyMean30d` for stable, predictable returns (fallback: `apyBase`)
* **Preferred Protocols**: EVM vault invests only in 9 whitelisted protocols (100% allocation)
* **Stablecoin Safety**: 23+ stablecoin whitelist, $0.2M min TVL, strict LP validation

### 📊 Current Setup

* **3 Vaults**: EVM (Ethereum USDT), Solana (USDC), BSC (USDT)
* **6 Chains**: Ethereum, Arbitrum, Base, Plasma, Solana, BSC
* **Local Dev**: yields-backend (port 3001), dashboard (port 3000)

---

End of CLAUDE.md
