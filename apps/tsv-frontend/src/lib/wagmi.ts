import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, arbitrum, base, bsc } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'Talken Stable Vault',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, arbitrum, base, bsc],
  ssr: true,
})
