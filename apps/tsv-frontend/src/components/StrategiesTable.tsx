'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatCurrency, formatAPY, type VaultAPY } from '@/lib/api'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface StrategiesTableProps {
  data: VaultAPY[] | null
}

type SortField = 'protocol' | 'chain' | 'apy' | 'apy30d' | 'allocated' | 'weight'
type SortDirection = 'asc' | 'desc' | null

// Preferred protocols for EVM vaults (target 80% weight)
const PREFERRED_PROTOCOLS = [
  'aave-v3',
  'curve',
  'pendle',
  'fraxlend',
  'balancer',
  'uniswap-v3',
  'compound-v3',
  'ethena',
  'yearn',
]

const PREFERRED_PROTOCOL_BOOST = 2.0 // 2x weight multiplier for preferred protocols

export function StrategiesTable({ data }: StrategiesTableProps) {
  const [sortField, setSortField] = useState<SortField>('apy30d')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [chainFilter, setChainFilter] = useState<string>('all')
  const [vaultFilter, setVaultFilter] = useState<string>('all')
  const [protocolFilter, setProtocolFilter] = useState<string>('all')

  if (!data) return null

  // Get all strategies from all vaults (only invested strategies with weight > 0)
  // For EVM vaults (ethereum-usdt and bridge vaults), they share the same strategies,
  // so we only include them once to avoid counting duplicates
  const allStrategies = data.flatMap((vault) => {
    // Skip bridge vaults since they have the same strategies as ethereum-usdt
    if (vault.vault.endsWith('-bridge')) return []

    return vault.strategies
      .filter((s) => s.weight > 0) // Only show invested strategies
      .map((s) => ({
        ...s,
        vault: vault.vault,
        vaultChain: vault.chain,
      }))
  })

  // Get unique chains for filter
  const uniqueChains = Array.from(new Set(allStrategies.map((s) => s.chain)))

  // Only 3 actual vaults (Arbitrum, Base, Plasma bridge to Ethereum)
  const actualVaults = [
    { id: 'ethereum-usdt', label: 'EVM (Ethereum)' },
    { id: 'solana-usdc', label: 'Solana' },
    { id: 'bsc-usdt', label: 'BSC' },
  ]

  // Get filtered protocols based on current vault and chain selection
  const availableProtocols = useMemo(() => {
    let filtered = [...allStrategies]

    // Apply vault filter
    if (vaultFilter !== 'all') {
      if (vaultFilter === 'ethereum-usdt') {
        filtered = filtered.filter((s) =>
          s.vault === 'ethereum-usdt' ||
          s.vault === 'arbitrum-bridge' ||
          s.vault === 'base-bridge' ||
          s.vault === 'plasma-bridge'
        )
      } else {
        filtered = filtered.filter((s) => s.vault === vaultFilter)
      }
    }

    // Apply chain filter
    if (chainFilter !== 'all') {
      filtered = filtered.filter((s) => s.chain === chainFilter)
    }

    // Get unique protocols from filtered strategies
    return Array.from(new Set(filtered.map((s) => s.protocol))).sort()
  }, [allStrategies, vaultFilter, chainFilter])

  // Reset protocol filter if current selection is not available
  useEffect(() => {
    if (protocolFilter !== 'all' && !availableProtocols.includes(protocolFilter)) {
      setProtocolFilter('all')
    }
  }, [availableProtocols, protocolFilter])

  // Filter and sort strategies
  const processedStrategies = useMemo(() => {
    let filtered = [...allStrategies]

    // Apply vault filter
    if (vaultFilter !== 'all') {
      if (vaultFilter === 'ethereum-usdt') {
        // EVM vault includes ethereum and all bridge chains
        filtered = filtered.filter((s) =>
          s.vault === 'ethereum-usdt' ||
          s.vault === 'arbitrum-bridge' ||
          s.vault === 'base-bridge' ||
          s.vault === 'plasma-bridge'
        )
      } else {
        filtered = filtered.filter((s) => s.vault === vaultFilter)
      }
    }

    // Apply chain filter
    if (chainFilter !== 'all') {
      filtered = filtered.filter((s) => s.chain === chainFilter)
    }

    // Apply protocol dropdown filter
    if (protocolFilter !== 'all') {
      filtered = filtered.filter((s) => s.protocol === protocolFilter)
    }

    // Weight is already calculated by backend - don't recalculate
    // Just use the actual investment weights from the API

    // Apply sorting
    if (sortDirection) {
      filtered.sort((a, b) => {
        let aVal: any
        let bVal: any

        switch (sortField) {
          case 'protocol':
            aVal = a.protocol.toLowerCase()
            bVal = b.protocol.toLowerCase()
            break
          case 'chain':
            aVal = a.chain.toLowerCase()
            bVal = b.chain.toLowerCase()
            break
          case 'apy':
            aVal = a.apyNet
            bVal = b.apyNet
            break
          case 'apy30d':
            aVal = a.apyMean30d || 0
            bVal = b.apyMean30d || 0
            break
          case 'allocated':
            aVal = a.allocated
            bVal = b.allocated
            break
          case 'weight':
            aVal = a.weight
            bVal = b.weight
            break
          default:
            return 0
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [allStrategies, vaultFilter, chainFilter, protocolFilter, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction
      if (sortDirection === 'desc') {
        setSortDirection('asc')
      } else if (sortDirection === 'asc') {
        setSortDirection(null)
        setSortField('apy')
      }
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />
    }
    if (sortDirection === 'desc') {
      return <ChevronDown className="w-4 h-4 text-primary" />
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4 text-primary" />
    }
    return <ChevronsUpDown className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Top Strategies</h2>
        <div className="text-sm text-muted-foreground">
          {processedStrategies.length} strategies
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <select
            value={vaultFilter}
            onChange={(e) => setVaultFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Vaults</option>
            {actualVaults.map((vault) => (
              <option key={vault.id} value={vault.id}>
                {vault.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Chains</option>
            {uniqueChains.sort().map((chain) => (
              <option key={chain} value={chain}>
                {chain === 'bsc' ? 'BSC' : chain.charAt(0).toUpperCase() + chain.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={protocolFilter}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
          >
            <option value="all">All Protocols</option>
            {availableProtocols.map((protocol) => (
              <option key={protocol} value={protocol}>
                {protocol}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th
                className="text-left py-2 px-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort('protocol')}
              >
                <div className="flex items-center gap-1">
                  Protocol
                  <SortIcon field="protocol" />
                </div>
              </th>
              <th className="text-left py-2 px-2 text-sm font-medium text-muted-foreground">
                Vault
              </th>
              <th
                className="text-left py-2 px-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort('chain')}
              >
                <div className="flex items-center gap-1">
                  Chain
                  <SortIcon field="chain" />
                </div>
              </th>
              <th
                className="text-right py-2 px-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort('apy30d')}
              >
                <div className="flex items-center justify-end gap-1">
                  30d Avg APY
                  <SortIcon field="apy30d" />
                </div>
              </th>
              <th
                className="text-right py-2 px-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort('apy')}
              >
                <div className="flex items-center justify-end gap-1">
                  Base APY
                  <SortIcon field="apy" />
                </div>
              </th>
              <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">
                Reward APY
              </th>
              <th className="text-right py-2 px-2 text-sm font-medium text-muted-foreground">
                Total APY
              </th>
              <th
                className="text-right py-2 px-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort('allocated')}
              >
                <div className="flex items-center justify-end gap-1">
                  Allocated
                  <SortIcon field="allocated" />
                </div>
              </th>
              <th
                className="text-right py-2 px-2 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                onClick={() => handleSort('weight')}
              >
                <div className="flex items-center justify-end gap-1">
                  Weight
                  <SortIcon field="weight" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {processedStrategies.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground">
                  No strategies found
                </td>
              </tr>
            ) : (
              processedStrategies.map((strategy) => (
                <tr key={strategy.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                  <td className="py-3 px-2">
                    <div className="font-medium">{strategy.protocol}</div>
                    <div className="text-sm text-muted-foreground">{strategy.asset}</div>
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {strategy.vault === 'ethereum-usdt' ? 'EVM' :
                       strategy.vault === 'solana-usdc' ? 'Solana' :
                       strategy.vault === 'bsc-usdt' ? 'BSC' :
                       strategy.vault.includes('arbitrum') ? 'EVM' :
                       strategy.vault.includes('base') ? 'EVM' :
                       strategy.vault.includes('plasma') ? 'EVM' :
                       strategy.vault.split('-')[0].toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                      {strategy.chain === 'bsc' ? 'BSC' : strategy.chain.charAt(0).toUpperCase() + strategy.chain.slice(1)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-purple-600 dark:text-purple-400">
                    {formatAPY(strategy.apyMean30d || 0)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-green-600 dark:text-green-400">
                    {formatAPY(strategy.apyBase || 0)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-blue-600 dark:text-blue-400">
                    {formatAPY(strategy.apyReward || 0)}
                  </td>
                  <td className="py-3 px-2 text-right font-medium text-primary">
                    {formatAPY(strategy.apyNet)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {formatCurrency(strategy.allocated)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    {(strategy.weight * 100).toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
