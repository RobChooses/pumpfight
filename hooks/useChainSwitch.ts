'use client'

import { useState, useCallback } from 'react'
import { useAppKitNetwork } from '@reown/appkit/react'
import { chiliz, spicy } from '@reown/appkit/networks'

export function useChainSwitch() {
  const [isLoading, setIsLoading] = useState(false)
  const { chainId, switchNetwork } = useAppKitNetwork()

  const switchToNetwork = useCallback(async (targetChainId: number) => {
    console.log('🔄 Switch network requested to Chain ID:', targetChainId)
    
    if (isLoading) {
      console.log('⚠️ Already switching networks, ignoring request')
      return
    }

    setIsLoading(true)
    
    try {
      if (!switchNetwork) {
        throw new Error('Switch network function not available')
      }

      // Map chain IDs to network objects
      const targetNetwork = targetChainId === 88888 ? chiliz : spicy
      console.log('🎯 Switching to network:', targetNetwork.name, 'ID:', targetNetwork.id)
      
      await switchNetwork(targetNetwork)
      console.log('✅ Network switch successful')
      
    } catch (error) {
      console.error('❌ Error switching network:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [switchNetwork, isLoading])

  return {
    switchToNetwork,
    isLoading,
    currentChainId: chainId
  }
}