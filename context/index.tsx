'use client'

import { projectId, networks } from '@/config'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'

if (!projectId) {
  throw new Error('Project ID is not defined')
}

// Set up metadata
const metadata = {
  name: 'PumpFight',
  description: 'Fighter Token Launchpad on Chiliz Chain',
  url: 'https://pumpfight.io', // origin must match your domain & subdomain
  icons: ['https://pumpfight.io/icon.png']
}

// Create the modal with PumpFight theme
export const modal = createAppKit({
  adapters: [],
  projectId,
  networks,
  metadata,
  themeMode: 'dark',
  features: {
    analytics: true,
    socials: [],
    email: false
  },
  themeVariables: {
    '--w3m-accent': '#d20a11', // UFC red
    '--w3m-color-mix': '#ff6b35', // Electric orange
    '--w3m-color-mix-strength': 20,
    '--w3m-border-radius-master': '12px'
  }
})

function ContextProvider({ children }: { children: ReactNode}) {
  return (
    <>{children}</>
  )
}

export default ContextProvider