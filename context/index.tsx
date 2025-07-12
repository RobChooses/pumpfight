'use client'

import React, { type ReactNode } from 'react'
import PrivyProvider from '@/components/PrivyProvider'
import { NetworkProvider } from '@/components/NetworkContext'

function ContextProvider({ children }: { children: ReactNode}) {
  return (
    <PrivyProvider>
      <NetworkProvider>
        {children}
      </NetworkProvider>
    </PrivyProvider>
  )
}

export default ContextProvider