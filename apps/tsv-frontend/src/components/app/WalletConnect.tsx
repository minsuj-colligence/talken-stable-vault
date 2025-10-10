'use client'

import { useState } from 'react'
import { Wallet } from 'lucide-react'

export type WalletType = 'evm' | 'solana' | null

interface WalletConnectProps {
  onWalletChange?: (walletType: WalletType, address: string) => void
}

export function WalletConnect({ onWalletChange }: WalletConnectProps = {}) {
  const [connected, setConnected] = useState(false)
  const [walletType, setWalletType] = useState<WalletType>(null)
  const [address, setAddress] = useState<string>('')

  const connectEVM = async () => {
    // Placeholder for EVM wallet connection
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        })
        const addr = accounts[0]
        setAddress(addr)
        setWalletType('evm')
        setConnected(true)
        onWalletChange?.('evm', addr)
      } catch (error) {
        console.error('Failed to connect EVM wallet:', error)
      }
    } else {
      alert('Please install MetaMask or another EVM wallet')
    }
  }

  const connectSolana = async () => {
    // Placeholder for Solana wallet connection
    if (typeof window !== 'undefined' && (window as any).solana) {
      try {
        const response = await (window as any).solana.connect()
        const addr = response.publicKey.toString()
        setAddress(addr)
        setWalletType('solana')
        setConnected(true)
        onWalletChange?.('solana', addr)
      } catch (error) {
        console.error('Failed to connect Solana wallet:', error)
      }
    } else {
      alert('Please install Phantom or another Solana wallet')
    }
  }

  const disconnect = () => {
    setConnected(false)
    setWalletType(null)
    setAddress('')
    onWalletChange?.(null, '')
  }

  if (connected) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-center w-6 h-6 bg-primary/20 rounded-full text-base font-bold text-primary">
            {walletType === 'evm' ? '⟠' : '◎'}
          </div>
          <div className="text-sm font-medium">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        </div>
        <button
          onClick={disconnect}
          className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <button
        onClick={connectEVM}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Wallet className="w-4 h-4" />
        Connect EVM
      </button>
      <button
        onClick={connectSolana}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary bg-white dark:bg-gray-800 border border-primary rounded-lg hover:bg-primary/5 transition-colors"
      >
        <Wallet className="w-4 h-4" />
        Connect Solana
      </button>
    </div>
  )
}
