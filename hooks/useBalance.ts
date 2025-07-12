'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { ethers } from 'ethers'

export function useBalance() {
  const [balance, setBalance] = useState<string>('0')
  const [isLoading, setIsLoading] = useState(false)
  const { address, isConnected } = useAppKitAccount()
  const { chainId } = useAppKitNetwork()

  const fetchBalance = useCallback(async () => {
    if (!isConnected || !address || !window.ethereum) {
      setBalance('0')
      return
    }

    setIsLoading(true)
    try {
      console.log('💰 Fetching balance for:', address, 'on chain:', chainId)
      
      const provider = new ethers.providers.Web3Provider(window.ethereum as any)
      const balanceWei = await provider.getBalance(address)
      const balanceEth = ethers.utils.formatEther(balanceWei)
      const formattedBalance = parseFloat(balanceEth).toFixed(4)
      
      console.log('💰 Balance updated:', formattedBalance, 'CHZ')
      setBalance(formattedBalance)
      
    } catch (error) {
      console.error('❌ Error fetching balance:', error)
      setBalance('0')
    } finally {
      setIsLoading(false)
    }
  }, [address, isConnected, chainId])

  // Auto-fetch balance when wallet connects or network changes
  useEffect(() => {
    fetchBalance()
  }, [fetchBalance])

  const refreshBalance = useCallback(() => {
    fetchBalance()
  }, [fetchBalance])

  return {
    balance,
    isLoading,
    refreshBalance
  }
}