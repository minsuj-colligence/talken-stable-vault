# Yields Backend

DefiLlama poller, APY calculation engine, and real-time WebSocket/REST API.

## Features

- **DefiLlama Integration**: Fetches yield data every 5 minutes
- **APY Engine**: Calculates model APY (weighted strategies) and real APY (price per share)
- **WebSocket**: Real-time APY updates every 30 seconds
- **REST API**: Query APYs, strategies, and rebalance recommendations
- **Auto-rebalancing**: Triggers rebalance when APY drift exceeds threshold

## API Endpoints

### GET /api/health
Health check

### GET /api/apy
Get all vault APYs

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "vault": "arbitrum-usdt0",
      "chain": "arbitrum",
      "asset": "USDT0",
      "apyModel": 8.5,
      "apyReal": 8.3,
      "totalAllocated": 5000000,
      "totalTVL": 10000000,
      "strategies": [...],
      "lastUpdate": 1234567890
    }
  ]
}
```

### GET /api/apy/:chain
Get APY for specific chain (arbitrum | solana | bsc)

### GET /api/strategies/:chain?limit=10
Get top strategies for chain

### GET /api/rebalance/:chain?tvl=1000000
Get rebalance recommendations

## WebSocket

Connect to `ws://localhost:3001/ws` to receive real-time APY updates.

**Message format:**
```json
{
  "type": "apy_update",
  "timestamp": 1234567890,
  "data": [...]
}
```

## Development

```bash
# Install dependencies
pnpm install

# Run in dev mode
pnpm dev

# Build
pnpm build

# Run production
pnpm start
```

## Environment Variables

See [.env.example](.env.example)

## Architecture

```
src/
  controllers/       # HTTP request handlers
  services/
    defiLlamaService.ts    # DefiLlama API integration
    apyEngine.ts           # APY calculation logic
    websocketService.ts    # WebSocket server
  types/            # TypeScript types
  utils/            # Logger, helpers
  index.ts          # Main entry point
```

## DefiLlama Integration

- Fetches pools from `https://yields.llama.fi/pools`
- Filters by chain (Arbitrum, Solana, BSC) and asset (USDT, USDC)
- Calculates net APY after 0.1% withdrawal fee
- Ranks strategies by net APY

## APY Calculation

**Model APY**: `Σ(weight_i * APY_net_i)`
**Real APY**: `(ΔpricePerShare / Δtime) * 365d`

## Rebalancing Logic

When user deposits:
1. Fetch latest DefiLlama yields
2. Calculate optimal allocation
3. Execute rebalance via Operator API
4. Update vault positions

## License

MIT
