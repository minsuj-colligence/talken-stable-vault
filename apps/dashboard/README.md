# Dashboard

Next.js dashboard with shadcn/ui, Recharts, and real-time APY tracking.

## Features

- **Vault Metrics**: Total TVL, Average APY, Active Strategies
- **APY Chart**: Historical 30-day trends across all chains
- **Top Strategies**: Live table of best-performing strategies
- **Real-time Updates**: Auto-refresh every 30 seconds
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS

## Tech Stack

- **Next.js 14** (App Router)
- **React 18**
- **Tailwind CSS**
- **shadcn/ui** components
- **Recharts** for visualizations
- **TypeScript**

## Development

```bash
# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Environment Variables

See [.env.example](.env.example)

## Project Structure

```
src/
  app/
    page.tsx        # Main dashboard page
    layout.tsx      # Root layout
    globals.css     # Global styles
  components/
    VaultMetrics.tsx        # KPI cards
    APYChart.tsx            # Line chart
    StrategiesTable.tsx     # Strategies table
  lib/
    api.ts          # API client & utilities
```

## API Integration

Connects to:
- **Yields Backend** (port 3001): APY data, strategies
- **Operator API** (port 3002): Rebalance status, allocations

## Features in Detail

### Vault Metrics
- Total TVL across all chains
- Weighted average APY
- Active strategies count
- Supported chains

### APY Chart
- 30-day historical trends
- Multi-chain comparison
- Interactive tooltips
- Responsive design

### Strategies Table
- Top 10 strategies by net APY
- Protocol, chain, allocated amount
- Weight percentage
- Real-time sorting

## Customization

All components use shadcn/ui design system and can be customized via `tailwind.config.ts` and CSS variables in `globals.css`.

## License

MIT
