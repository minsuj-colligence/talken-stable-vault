# Operator API

NestJS/Express API for vault operations: rebalancing, indexing, and admin controls.

## Features

- **Rebalance Execution**: Execute strategy rebalances based on yield data
- **Status Monitoring**: Check if rebalance is needed
- **Pause/Unpause**: Emergency controls for vault operations
- **Allocations**: Query current strategy allocations
- **Integration**: Works with yields-backend for APY data

## API Endpoints

### GET /api/health
Health check

### GET /api/status
Service status and version

### POST /api/rebalance
Execute rebalance

**Request:**
```json
{
  "chain": "arbitrum",
  "vaultAddress": "0x...",
  "strategies": [
    {
      "strategyId": "aave-v3-usdt",
      "targetAllocation": 5000000,
      "currentAllocation": 3000000
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x...",
  "timestamp": 1234567890
}
```

### GET /api/rebalance/status/:chain
Check if rebalance is needed

### POST /api/pause/:chain
Pause vault operations (admin only)

### POST /api/unpause/:chain
Resume vault operations

### GET /api/allocations/:chain
Get current allocations

### GET /api/yields/:chain
Get yield data (proxied from yields-backend)

## Development

```bash
# Install
pnpm install

# Dev mode
pnpm dev

# Build
pnpm build

# Production
pnpm start
```

## Environment Variables

See [.env.example](.env.example)

## Rebalance Logic

1. Fetch recommendations from yields-backend
2. Calculate deltas (target - current)
3. Execute allocate/withdraw on StrategyRouter
4. Wait for transaction confirmations
5. Return results

## Security

- Operator private key required
- Admin-only endpoints (pause/unpause)
- Transaction validation
- Error handling and retries

## Architecture

```
src/
  modules/
    rebalance/
      rebalanceService.ts       # Core rebalance logic
      rebalanceController.ts    # HTTP handlers
  common/
    logger.ts                   # Logging
  main.ts                       # Entry point
```

## Integration

Works with:
- **Yields Backend**: APY data and recommendations
- **EVM Contracts**: StrategyRouter on Arbitrum/BSC
- **Solana Programs**: Vault programs
- **Redis**: Job queues (optional)

## License

MIT
