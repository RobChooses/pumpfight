'use client'

import { useState, useEffect } from 'react'
import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { ChainToggle } from './ChainToggle'
import { WalletConnect } from './WalletConnect'

interface NetworkInfo {
  chainId: number
  name: string
  symbol: string
  rpcUrl: string
}

const NETWORKS: { [key: number]: NetworkInfo } = {
  88888: {
    chainId: 88888,
    name: 'Chiliz Mainnet',
    symbol: 'CHZ',
    rpcUrl: 'https://rpc.chiliz.com/'
  },
  88882: {
    chainId: 88882,
    name: 'Chiliz Spicy Testnet',
    symbol: 'CHZ',
    rpcUrl: 'https://spicy-rpc.chiliz.com/'
  }
}

export function Navbar() {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { chainId, switchNetwork } = useAppKitNetwork()
  const [balance, setBalance] = useState<string>('0')

  // Get current network info
  const currentNetwork = chainId ? NETWORKS[chainId] : null

  // Update balance when network or address changes
  useEffect(() => {
    if (isConnected && address && currentNetwork) {
      updateBalance()
    }
  }, [isConnected, address, currentNetwork, chainId])

  const updateBalance = async () => {
    try {
      if (!address || !window.ethereum) return
      
      const { ethers } = await import('ethers')
      const provider = new ethers.providers.Web3Provider(window.ethereum)
      const balance = await provider.getBalance(address)
      setBalance(parseFloat(ethers.utils.formatEther(balance)).toFixed(4))
    } catch (error) {
      console.error('Error updating balance:', error)
      setBalance('0')
    }
  }

  const switchToNetwork = async (targetChainId: number) => {
    try {
      await switchNetwork(targetChainId)
    } catch (error) {
      console.error('Error switching network:', error)
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getNetworkColor = () => {
    if (!chainId) return 'bg-gray-600'
    
    switch (chainId) {
      case 88888: return 'bg-green-600' // Mainnet - Green
      case 88882: return 'bg-orange-600' // Testnet - Orange
      default: return 'bg-red-600' // Unknown - Red
    }
  }

  return (
    <nav className="bg-card-dark border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="text-2xl font-black text-white">
              <span className="text-white">PUMP</span>
              <span className="text-fight-gold">FIGHT</span>
            </a>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a 
              href="/" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Home
            </a>
            <a 
              href="/create" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Create Token
            </a>
            <a 
              href="/tokens" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Browse Tokens
            </a>
          </div>

          {/* Right side - Wallet & Network Info */}
          <div className="flex items-center space-x-4">
            {/* Chain Toggle */}
            {isConnected && (
              <ChainToggle 
                currentChainId={chainId || 88882}
                onSwitchNetwork={switchToNetwork}
              />
            )}

            {/* Network & Balance Info */}
            {isConnected && currentNetwork && (
              <div className="hidden sm:flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getNetworkColor()}`}></div>
                  <span className="text-sm text-gray-300">
                    {currentNetwork.name}
                  </span>
                </div>
                <div className="text-sm text-white font-medium">
                  {balance} {currentNetwork.symbol}
                </div>
              </div>
            )}

            {/* Wallet Connection */}
            <div className="wallet-connect-wrapper">
              <WalletConnect />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-700 py-3">
          <div className="flex flex-col space-y-2">
            {isConnected && currentNetwork && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getNetworkColor()}`}></div>
                  <span className="text-gray-300">{currentNetwork.name}</span>
                </div>
                <div className="text-white font-medium">
                  {balance} {currentNetwork.symbol}
                </div>
              </div>
            )}
            
            {isConnected && address && (
              <div className="text-sm text-gray-300">
                {formatAddress(address)}
              </div>
            )}
            
            <div className="flex space-x-4">
              <a href="/" className="text-gray-300 hover:text-white text-sm">Home</a>
              <a href="/create" className="text-gray-300 hover:text-white text-sm">Create</a>
              <a href="/tokens" className="text-gray-300 hover:text-white text-sm">Browse</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}