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
          <nav className="hidden md:block">
            <ul className="flex items-center space-x-12">
              <li>
                <a
                  href="/"
                  className="text-gray-300 hover:text-white transition-colors font-medium px-4 py-2"
                >
                  Home&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
                </a>
              </li>
              <li>
                <a
                  href="/simple-token"
                  className="text-gray-300 hover:text-white transition-colors font-medium px-4 py-2"
                >
                  Launch Coin&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
                </a>
              </li>
              <li>
                <a
                  href="/browse-tokens"
                  className="text-gray-300 hover:text-white transition-colors font-medium px-4 py-2"
                >
                  Browse Coins
                </a>
              </li>
            </ul>
          </nav>

          {/* Right side - Wallet & Network Info */}
          <div className="flex items-center space-x-4">
            {/* Network Toggle - Show when authenticated */}
            {isClient && (
              <div className="px-2">
                <NetworkToggle />
              </div>
            )}

            {/* CHZ Balance - Show when authenticated */}
            {isClient && (
              <div className="px-2">
                <CHZBalance />
              </div>
            )}

            {/* Wallet Connection */}
            <div className="wallet-connect-wrapper px-2">
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

            <div className="flex flex-col space-y-4">
              <a href="/" className="text-gray-300 hover:text-white text-sm">Home</a>
              <a href="/simple-token" className="text-gray-300 hover:text-white text-sm">Simple Token</a>
              <a href="/browse-tokens" className="text-gray-300 hover:text-white text-sm">Browse Tokens</a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}