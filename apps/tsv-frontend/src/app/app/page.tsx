'use client'

import { useEffect, useState } from 'react'
import { WalletConnect, type WalletType } from '@/components/app/WalletConnect'
import { VaultCard } from '@/components/app/VaultCard'
import { fetchVaultAPYs } from '@/lib/api'

export default function AppPage() {
  const [vaultsData, setVaultsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [connectedWallet, setConnectedWallet] = useState<WalletType>(null)
  const [walletAddress, setWalletAddress] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchVaultAPYs()
        setVaultsData(data)
      } catch (error) {
        console.error('Failed to fetch vault data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleWalletChange = (walletType: WalletType, address: string) => {
    setConnectedWallet(walletType)
    setWalletAddress(address)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading vaults...</p>
        </div>
      </div>
    )
  }

  // Map vaults data to vault cards
  // For EVM vault (TalkenUSDe), use only ethereum-usdt to avoid duplicates
  // (bridge vaults have the same strategies as ethereum-usdt)
  const evmVault = vaultsData?.find((v: any) => v.vault === 'ethereum-usdt')

  const evmStrategies = evmVault?.strategies || []
  const evmTotalTVL = evmVault?.totalAllocated || 0

  const vaults = [
    {
      id: 'ethereum-usdt',
      name: 'TalkenUSDe',
      chain: 'Ethereum',
      chainType: 'evm' as const,
      asset: 'USDT',
      data: {
        strategies: evmStrategies,
        totalAllocated: evmTotalTVL,
      },
    },
    {
      id: 'solana-usdc',
      name: 'TalkenUSDs',
      chain: 'Solana',
      chainType: 'solana' as const,
      asset: 'USDC',
      data: vaultsData?.find((v: any) => v.vault === 'solana-usdc'),
    },
    {
      id: 'bsc-usdt',
      name: 'TalkenUSDb',
      chain: 'BSC',
      chainType: 'evm' as const,
      asset: 'USDT',
      data: vaultsData?.find((v: any) => v.vault === 'bsc-usdt'),
    },
  ]

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Talken Stable Vault</h1>
            <p className="text-muted-foreground">
              Deposit stablecoins and earn optimized yields
            </p>
          </div>
          <WalletConnect onWalletChange={handleWalletChange} />
        </div>

        {/* Vaults Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {vaults.map((vault) => {
            const vaultData = vault.data
            const totalTVL = vaultData?.strategies?.reduce(
              (sum: number, s: any) => sum + (s.allocated || 0),
              0
            ) || 0
            const strategies = vaultData?.strategies
              ?.filter((s: any) => s.weight > 0)
              .map((s: any) => ({
                protocol: s.protocol,
                pool: s.asset || s.pool || s.symbol || '',
                chain: s.chain,
                allocation: s.weight,
                apy: s.apyMean30d || s.apyNet,
              }))
              .sort((a: any, b: any) => b.allocation - a.allocation) || []

            // Calculate weighted average APY
            const avgAPY = strategies.reduce((sum: number, s: any) => {
              return sum + (s.apy * s.allocation)
            }, 0)

            return (
              <VaultCard
                key={vault.id}
                name={vault.name}
                chain={vault.chain}
                chainType={vault.chainType}
                asset={vault.asset}
                apy={avgAPY}
                tvl={`$${(totalTVL / 1_000_000).toFixed(2)}M`}
                strategies={strategies}
                connectedWallet={connectedWallet}
                walletAddress={walletAddress}
              />
            )
          })}
        </div>

        {/* Info Section */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold mb-2">How it works</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Connect your EVM or Solana wallet</li>
            <li>• Choose a vault and deposit stablecoins (USDT/USDC)</li>
            <li>• Your funds are automatically allocated to top-yielding DeFi protocols</li>
            <li>• Earn optimized APY with automated rebalancing</li>
            <li>• Withdraw anytime with a 0.1% fee</li>
          </ul>
        </div>
      </div>
    </main>
  )
}
