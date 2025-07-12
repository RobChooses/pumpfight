'use client'

import { useState } from 'react'

interface ChainToggleProps {
  currentChainId: number
  onSwitchNetwork: (chainId: number) => void
}

export function ChainToggle({ currentChainId, onSwitchNetwork }: ChainToggleProps) {
  const [isToggling, setIsToggling] = useState(false)

  const isMainnet = currentChainId === 88888
  const isTestnet = currentChainId === 88882

  const handleToggle = async () => {
    setIsToggling(true)
    try {
      const targetChainId = isMainnet ? 88882 : 88888
      await onSwitchNetwork(targetChainId)
    } catch (error) {
      console.error('Error switching network:', error)
    } finally {
      // Add a small delay to show the toggle animation
      setTimeout(() => setIsToggling(false), 500)
    }
  }

  const getToggleState = () => {
    if (isToggling) return 'switching'
    if (isMainnet) return 'mainnet'
    if (isTestnet) return 'testnet'
    return 'unknown'
  }

  const toggleState = getToggleState()

  return (
    <div className="flex items-center space-x-3">
      {/* Network Labels */}
      <span className={`text-sm font-medium transition-colors ${
        toggleState === 'testnet' ? 'text-orange-400' : 'text-gray-500'
      }`}>
        Testnet
      </span>

      {/* Toggle Switch */}
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
          toggleState === 'mainnet' 
            ? 'bg-green-600 focus:ring-green-500' 
            : toggleState === 'testnet'
            ? 'bg-orange-600 focus:ring-orange-500'
            : 'bg-gray-600 focus:ring-gray-500'
        }`}
        title={`Switch to ${isMainnet ? 'Testnet' : 'Mainnet'}`}
      >
        <span className="sr-only">
          Switch between Mainnet and Testnet
        </span>
        
        {/* Toggle Slider */}
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            toggleState === 'mainnet' ? 'translate-x-6' : 'translate-x-1'
          } ${isToggling ? 'animate-pulse' : ''}`}
        >
          {isToggling && (
            <div className="absolute inset-0 rounded-full border-2 border-gray-300 animate-spin">
              <div className="h-1 w-1 bg-gray-600 rounded-full"></div>
            </div>
          )}
        </span>
      </button>

      {/* Mainnet Label */}
      <span className={`text-sm font-medium transition-colors ${
        toggleState === 'mainnet' ? 'text-green-400' : 'text-gray-500'
      }`}>
        Mainnet
      </span>

      {/* Network Status Indicator */}
      {toggleState === 'unknown' && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-red-400">Unknown Network</span>
        </div>
      )}
    </div>
  )
}