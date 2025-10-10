'use client'

import { formatCurrency, formatAPY, type VaultAPY } from '@/lib/api'

interface VaultMetricsProps {
  data: VaultAPY[] | null
}

export function VaultMetrics({ data }: VaultMetricsProps) {
  if (!data) return null

  // Vault weights (allocation percentages) - TODO: get from backend
  const vaultWeights = {
    evm: 0.5,     // 50% allocation (Ethereum + bridge chains)
    solana: 0.3,  // 30% allocation
    bsc: 0.2,     // 20% allocation
  }

  // Calculate weighted average APY for each vault using 30d avg APY (same as APYChart)
  // EVM: Combine strategies from ethereum-usdt and all bridge chains
  const evmStrategies = data
    .filter(v => v.vault === 'ethereum-usdt' || v.vault.includes('-bridge'))
    .flatMap(v => v.strategies)
  const evmInvestedStrategies = evmStrategies.filter(s => s.weight > 0)
  const evmTotalWeight = evmInvestedStrategies.reduce((sum, s) => sum + s.weight, 0)
  const evmWeightedAPY = evmInvestedStrategies.reduce((sum, s) => sum + (s.apyMean30d || s.apyBase || s.apyNet) * s.weight, 0)
  const evmAPY = evmTotalWeight > 0 ? evmWeightedAPY / evmTotalWeight : 0

  // Solana
  const solanaVault = data.find(v => v.vault === 'solana-usdc')
  const solanaStrategies = solanaVault?.strategies || []
  const solanaInvestedStrategies = solanaStrategies.filter(s => s.weight > 0)
  const solanaTotalWeight = solanaInvestedStrategies.reduce((sum, s) => sum + s.weight, 0)
  const solanaWeightedAPY = solanaInvestedStrategies.reduce((sum, s) => sum + (s.apyMean30d || s.apyBase || s.apyNet) * s.weight, 0)
  const solanaAPY = solanaTotalWeight > 0 ? solanaWeightedAPY / solanaTotalWeight : 0

  // BSC
  const bscVault = data.find(v => v.vault === 'bsc-usdt')
  const bscStrategies = bscVault?.strategies || []
  const bscInvestedStrategies = bscStrategies.filter(s => s.weight > 0)
  const bscTotalWeight = bscInvestedStrategies.reduce((sum, s) => sum + s.weight, 0)
  const bscWeightedAPY = bscInvestedStrategies.reduce((sum, s) => sum + (s.apyMean30d || s.apyBase || s.apyNet) * s.weight, 0)
  const bscAPY = bscTotalWeight > 0 ? bscWeightedAPY / bscTotalWeight : 0

  // Calculate weighted average APY
  const avgAPY = (evmAPY * vaultWeights.evm) + (solanaAPY * vaultWeights.solana) + (bscAPY * vaultWeights.bsc)

  const totalTVL = data.reduce((sum, vault) => sum + vault.totalTVL, 0)
  const totalStrategies = data.reduce((sum, vault) => sum + vault.strategies.length, 0)

  const metrics: Array<{
    label: string
    value: string
    change: string
    changeType: 'positive' | 'negative' | 'neutral'
  }> = [
    {
      label: 'Total TVL',
      value: formatCurrency(totalTVL),
      change: '+12.5%',
      changeType: 'positive',
    },
    {
      label: 'Average APY',
      value: formatAPY(avgAPY),
      change: '+0.3%',
      changeType: 'positive',
    },
    {
      label: 'Active Strategies',
      value: totalStrategies.toString(),
      change: '+2',
      changeType: 'neutral',
    },
    {
      label: 'Total Chains',
      value: '6',
      change: 'Arbitrum, Ethereum, Base, Plasma, Solana, BSC',
      changeType: 'neutral',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6"
        >
          <div className="text-sm text-muted-foreground mb-1">{metric.label}</div>
          <div className="text-3xl font-bold mb-2">{metric.value}</div>
          <div
            className={`text-sm ${
              metric.changeType === 'positive'
                ? 'text-green-600 dark:text-green-400'
                : metric.changeType === 'negative'
                ? 'text-red-600 dark:text-red-400'
                : 'text-muted-foreground'
            }`}
          >
            {metric.change}
          </div>
        </div>
      ))}
    </div>
  )
}
