'use client'

import { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import WalletConnectButton from './WalletConnectButton'
import CHZBalance from './CHZBalance'
import NetworkToggle from './NetworkToggle'

export function Navbar() {
  const [isClient, setIsClient] = useState(false)
  const { authenticated, user } = usePrivy()

  // Initialize client-side only
  useEffect(() => {
    setIsClient(true)
  }, [])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
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
              href="/simple-token" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
            >
              Simple Token
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
            {/* Network Toggle - Show when authenticated */}
            {isClient && <NetworkToggle />}

            {/* CHZ Balance - Show when authenticated */}
            {isClient && <CHZBalance />}

            {/* Wallet Connection */}
            <div className="wallet-connect-wrapper">
              <WalletConnectButton />
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-700 py-3">
          <div className="flex flex-col space-y-2">
            {authenticated && user?.wallet?.address && (
              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-300">
                  {formatAddress(user.wallet.address)}
                </div>
                <div className="flex items-center space-x-2">
                  <NetworkToggle />
                  <CHZBalance />
                </div>
              </div>
            )}
            
            <div className="flex space-x-4">
              <a href="/" className="text-gray-300 hover:text-white text-sm">Home</a>
              <a href="/create" className="text-gray-300 hover:text-white text-sm">Create</a>
              <a href="/simple-token" className="text-gray-300 hover:text-white text-sm">Simple</a>
              <a href="/tokens" className="text-gray-300 hover:text-white text-sm">Browse</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}