'use client'

import { useState, useEffect } from 'react'
import { ArrowUpRight, ArrowDownLeft, TrendingUp } from 'lucide-react'
import type { WalletType } from './WalletConnect'

interface VaultCardProps {
  name: string
  chain: string
  chainType: 'evm' | 'solana'
  asset: string
  assetAddress?: string // Token contract address
  apy: number
  tvl: string
  strategies: Array<{ protocol: string; pool?: string; chain?: string; allocation: number; apy: number }>
  connectedWallet: WalletType
  walletAddress?: string
}

export function VaultCard({
  name,
  chain,
  chainType,
  asset,
  assetAddress,
  apy,
  tvl,
  strategies,
  connectedWallet,
  walletAddress
}: VaultCardProps) {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit')
  const [amount, setAmount] = useState('')
  const [balance, setBalance] = useState('0.00')
  const [vaultBalance, setVaultBalance] = useState('0.00')
  const [loading, setLoading] = useState(false)

  const isWalletCompatible = connectedWallet === chainType
  const isDepositEnabled = isWalletCompatible && amount && parseFloat(amount) > 0

  useEffect(() => {
    const fetchBalance = async () => {
      if (!walletAddress || !isWalletCompatible) {
        setBalance('0.00')
        return
      }

      setLoading(true)
      try {
        if (chainType === 'evm') {
          // Fetch EVM token balance
          if (typeof window !== 'undefined' && (window as any).ethereum) {
            const provider = (window as any).ethereum

            // For native ETH or get ERC20 balance
            if (assetAddress) {
              // ERC20 token balance (simplified, needs proper ABI)
              // This is a placeholder - actual implementation would use ethers.js
              const mockBalance = (Math.random() * 1000).toFixed(2)
              setBalance(mockBalance)
            } else {
              // Native balance
              const balance = await provider.request({
                method: 'eth_getBalance',
                params: [walletAddress, 'latest'],
              })
              const balanceInEth = parseInt(balance, 16) / 1e18
              setBalance(balanceInEth.toFixed(2))
            }
          }
        } else if (chainType === 'solana') {
          // Fetch Solana token balance
          if (typeof window !== 'undefined' && (window as any).solana) {
            // This is a placeholder - actual implementation would use @solana/web3.js
            const mockBalance = (Math.random() * 1000).toFixed(2)
            setBalance(mockBalance)
          }
        }
      } catch (error) {
        console.error('Failed to fetch balance:', error)
        // Use mock balance for demo
        const mockBalance = (Math.random() * 1000).toFixed(2)
        setBalance(mockBalance)
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
  }, [walletAddress, chainType, isWalletCompatible, assetAddress])

  const handleDeposit = () => {
    if (!isWalletCompatible) {
      alert(`Please connect an ${chainType.toUpperCase()} wallet to deposit to ${name}`)
      return
    }
    // Placeholder for deposit logic
    console.log('Deposit:', amount)
    alert(`Deposit ${amount} ${asset} to ${name}`)
  }

  const handleWithdraw = () => {
    if (!isWalletCompatible) {
      alert(`Please connect an ${chainType.toUpperCase()} wallet to withdraw from ${name}`)
      return
    }
    // Placeholder for withdraw logic
    console.log('Withdraw:', amount)
    alert(`Withdraw ${amount} ${asset} from ${name}`)
  }

  const handleMaxClick = () => {
    if (activeTab === 'deposit') {
      setAmount(balance)
    } else {
      // For withdraw, use vault balance
      setAmount(vaultBalance)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-2xl font-bold mb-1">{name}</h3>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {chain}
            </span>
            <span className="text-sm text-muted-foreground">{asset}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {apy.toFixed(2)}%
          </div>
          <div className="text-xs text-muted-foreground">APY</div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Total Value Locked</div>
          <div className="text-lg font-semibold">{tvl}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground mb-1">Your Invested</div>
          <div className="text-lg font-semibold">
            0.00 {asset}
          </div>
        </div>
      </div>

      {/* Wallet compatibility warning */}
      {connectedWallet && !isWalletCompatible && (
        <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <p className="text-sm text-orange-800 dark:text-orange-200">
            Connect an {chainType.toUpperCase()} wallet to use this vault
          </p>
        </div>
      )}

      {/* Deposit/Withdraw Tabs */}
      <div className="mb-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'deposit'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 inline mr-2" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'withdraw'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-muted-foreground hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 inline mr-2" />
            Withdraw
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Amount</label>
              <span className="text-sm text-muted-foreground">
                {activeTab === 'deposit' ? 'Wallet' : 'Invested'}: {loading ? '...' : (activeTab === 'deposit' ? balance : vaultBalance)} {asset}
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                disabled={!connectedWallet}
                className="w-full px-4 py-3 pr-16 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleMaxClick}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={!connectedWallet || loading}
              >
                MAX
              </button>
            </div>
          </div>

          <button
            onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
            disabled={activeTab === 'deposit' ? !isDepositEnabled : !isWalletCompatible || !amount}
            className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {!connectedWallet
              ? 'Connect Wallet'
              : !isWalletCompatible
              ? `Connect ${chainType.toUpperCase()} Wallet`
              : activeTab === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
        </div>
      </div>

      {/* Current Protocol Allocations */}
      <div className="mt-6 pt-6 border-t border-border">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Current Protocol Allocations
        </h4>
        <div className="space-y-2">
          {strategies.slice(0, 10).map((strategy, index) => {
            const chainIcon =
              strategy.chain === 'ethereum' ? '⟠' :
              strategy.chain === 'arbitrum' ? '▲' :
              strategy.chain === 'base' ? '●' :
              strategy.chain === 'plasma' ? '◆' :
              strategy.chain === 'bsc' ? '◆' :
              strategy.chain === 'solana' ? '◎' :
              '⟠'

            return (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="flex items-center justify-center w-5 h-5 bg-primary/10 rounded-full text-xs font-bold text-primary flex-shrink-0">
                    {chainIcon}
                  </div>
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-medium truncate">{strategy.protocol}</span>
                    {strategy.pool && (
                      <span className="text-xs text-muted-foreground truncate">• {strategy.pool}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-green-600 dark:text-green-400">{strategy.apy.toFixed(2)}%</span>
                  <span className="text-muted-foreground min-w-[45px] text-right">{(strategy.allocation * 100).toFixed(1)}%</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
