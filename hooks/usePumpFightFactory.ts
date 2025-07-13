'use client'

import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import PumpFightFactoryABI from '@/lib/abis/PumpFightFactory.json'

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS
const CHILIZ_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHILIZ_CHAIN_ID || '88882')

interface TokenCreationParams {
  tokenName: string
  tokenSymbol: string
  description: string
  imageUrl: string
}

export function usePumpFightFactory() {
  const [isLoading, setIsLoading] = useState(false)

  const getProvider = useCallback(() => {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('Ethereum wallet not found')
    }
    return new ethers.providers.Web3Provider(window.ethereum)
  }, [])

  const getContract = useCallback(async () => {
    if (!FACTORY_ADDRESS) {
      throw new Error('Factory address not configured')
    }

    const provider = getProvider()
    const signer = provider.getSigner()
    
    // Check if we're on the correct network
    const network = await provider.getNetwork()
    console.log('🔗 Current network from ethers:', network.chainId, 'Expected:', CHILIZ_CHAIN_ID)
    
    // Accept both Chiliz mainnet (88888) and Spicy testnet (88882)
    const validChainIds = [88888, 88882]
    if (!validChainIds.includes(network.chainId)) {
      throw new Error(`Please switch to Chiliz Mainnet (88888) or Spicy Testnet (88882). Current: ${network.chainId}`)
    }

    return new ethers.Contract(FACTORY_ADDRESS, PumpFightFactoryABI, signer)
  }, [getProvider])

  const createFighterToken = useCallback(async (
    tokenName: string,
    tokenSymbol: string,
    description: string,
    imageUrl: string
  ) => {
    setIsLoading(true)
    
    try {
      const contract = await getContract()
      
      // Get creation fee from contract
      const creationFee = await contract.creationFee()
      
      // Call the createFighterToken function
      const tx = await contract.createFighterToken(
        tokenName,
        tokenSymbol,
        description,
        imageUrl,
        {
          value: creationFee,
          gasLimit: 2000000 // Set a reasonable gas limit
        }
      )

      return tx
    } catch (error) {
      console.error('Error creating fighter token:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [getContract])

  const getFighterTokens = useCallback(async (fighterAddress: string) => {
    try {
      const contract = await getContract()
      return await contract.getFighterTokens(fighterAddress)
    } catch (error) {
      console.error('Error getting fighter tokens:', error)
      throw error
    }
  }, [getContract])

  const getTotalTokens = useCallback(async () => {
    try {
      const contract = await getContract()
      return await contract.getTotalTokens()
    } catch (error) {
      console.error('Error getting total tokens:', error)
      throw error
    }
  }, [getContract])

  const getCreationFee = useCallback(async () => {
    try {
      const contract = await getContract()
      return await contract.creationFee()
    } catch (error) {
      console.error('Error getting creation fee:', error)
      throw error
    }
  }, [getContract])

  const getDefaultConfig = useCallback(async () => {
    try {
      const contract = await getContract()
      return await contract.defaultConfig()
    } catch (error) {
      console.error('Error getting default config:', error)
      throw error
    }
  }, [getContract])

  // Helper function to check if user's wallet is connected
  const isWalletConnected = useCallback(async () => {
    try {
      const provider = getProvider()
      const accounts = await provider.listAccounts()
      return accounts.length > 0
    } catch (error) {
      return false
    }
  }, [getProvider])

  // Helper function to get current account
  const getCurrentAccount = useCallback(async () => {
    try {
      const provider = getProvider()
      const signer = provider.getSigner()
      return await signer.getAddress()
    } catch (error) {
      console.error('Error getting current account:', error)
      throw error
    }
  }, [getProvider])

  // Helper function to check account balance
  const getAccountBalance = useCallback(async () => {
    try {
      const provider = getProvider()
      const signer = provider.getSigner()
      const address = await signer.getAddress()
      const balance = await provider.getBalance(address)
      return ethers.utils.formatEther(balance)
    } catch (error) {
      console.error('Error getting account balance:', error)
      throw error
    }
  }, [getProvider])

  return {
    createFighterToken,
    getFighterTokens,
    getTotalTokens,
    getCreationFee,
    getDefaultConfig,
    isWalletConnected,
    getCurrentAccount,
    getAccountBalance,
    isLoading
  }
}