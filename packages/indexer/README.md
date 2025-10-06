# Indexer

Event indexer for Talken Stable Vault - tracks onchain events, DefiLlama data, and APY calculations.

## Features

- **EVM Event Indexing**: Deposit, Redeem, Fee updates
- **Solana Event Indexing**: Program events via getProgramAccounts
- **DefiLlama Integration**: Fetch and store yield data
- **PostgreSQL**: Event storage and querying
- **Real-time**: Block-by-block indexing

## Setup

```bash
pnpm install
pnpm dev
```

## Database Schema

```sql
CREATE TABLE deposits (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(20),
  vault_address VARCHAR(66),
  user_address VARCHAR(66),
  assets BIGINT,
  shares BIGINT,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  timestamp TIMESTAMP
);

CREATE TABLE redeems (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(20),
  vault_address VARCHAR(66),
  user_address VARCHAR(66),
  assets BIGINT,
  shares BIGINT,
  fee BIGINT,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  timestamp TIMESTAMP
);

CREATE TABLE apy_snapshots (
  id SERIAL PRIMARY KEY,
  chain VARCHAR(20),
  vault_address VARCHAR(66),
  apy_model DECIMAL(10,4),
  apy_real DECIMAL(10,4),
  total_tvl BIGINT,
  timestamp TIMESTAMP
);
```

## License

MIT
