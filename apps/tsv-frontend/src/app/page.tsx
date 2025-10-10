'use client'

import Link from 'next/link'
import { ArrowRight, Shield, Zap, Globe, Lock } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Talken Stable Vault
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-4">
            Cross-chain stablecoin yield aggregator
          </p>
          <p className="text-lg text-muted-foreground mb-8">
            Maximize your stablecoin yields across multiple chains with automated strategy optimization
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/app"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
            >
              Launch App
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-primary bg-white dark:bg-gray-800 border border-border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">6</div>
            <div className="text-muted-foreground">Supported Chains</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">3</div>
            <div className="text-muted-foreground">Active Vaults</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6 text-center">
            <div className="text-3xl font-bold text-primary mb-2">20+</div>
            <div className="text-muted-foreground">Yield Strategies</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose Talken Stable Vault?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Cross-Chain Support</h3>
                  <p className="text-muted-foreground">
                    Access yield opportunities across Ethereum, Arbitrum, Base, Plasma, Solana, and BSC networks
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Automated Optimization</h3>
                  <p className="text-muted-foreground">
                    Smart rebalancing algorithm continuously finds the best yields across DeFi protocols
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">EIP-4626 Compliant</h3>
                  <p className="text-muted-foreground">
                    Standard vault interface with built-in security features and transparent fee structure (0.1%)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Lock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Gasless Transactions</h3>
                  <p className="text-muted-foreground">
                    Deposit and withdraw using meta-transactions via EIP-2612, EIP-3009, and Permit2
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Supported Chains */}
      <section className="container mx-auto px-4 py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Supported Chains
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {['Ethereum', 'Arbitrum', 'Base', 'Plasma', 'Solana', 'BSC'].map((chain) => (
              <div
                key={chain}
                className="bg-white dark:bg-gray-800 rounded-lg border border-border p-6 text-center hover:border-primary transition-colors"
              >
                <div className="text-lg font-semibold">{chain}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Maximize Your Yields?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Start earning optimized returns on your stablecoins today
          </p>
          <Link
            href="/app"
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-primary bg-white rounded-lg hover:bg-gray-100 transition-colors"
          >
            Launch App
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 Talken Stable Vault. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
