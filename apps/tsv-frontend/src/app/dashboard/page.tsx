'use client'

import { useEffect, useState } from 'react'
import { VaultMetrics } from '@/components/VaultMetrics'
import { APYChart } from '@/components/APYChart'
import { StrategiesTable } from '@/components/StrategiesTable'
import { fetchVaultAPYs } from '@/lib/api'

export default function DashboardPage() {
  const [apyData, setApyData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchVaultAPYs()
        setApyData(data)
      } catch (error) {
        console.error('Failed to fetch APY data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading vault data...</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time vault metrics and strategies
          </p>
        </header>

        <VaultMetrics data={apyData} />

        <div className="mt-6 space-y-6">
          <APYChart data={apyData} />
          <StrategiesTable data={apyData} />
        </div>
      </div>
    </main>
  )
}
