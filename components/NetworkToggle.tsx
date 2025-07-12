'use client';

import { usePrivy } from "@privy-io/react-auth";
import { useNetwork } from "./NetworkContext";

export default function NetworkToggle() {
  const { authenticated } = usePrivy();
  const { isTestnet, switchNetwork, switching, currentChain } = useNetwork();

  console.log('🔗 NetworkToggle - Chain:', currentChain.name, 'ID:', currentChain.id, 'isTestnet:', isTestnet);

  return (
    <div className="flex items-center space-x-3">
      {/* Network Labels */}
      <span className={`text-sm font-medium transition-colors ${
        isTestnet ? 'text-orange-400' : 'text-gray-500'
      }`}>
        Testnet
      </span>

      {/* Toggle Switch */}
      <button
        onClick={switchNetwork}
        disabled={switching || !authenticated}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed ${
          !isTestnet 
            ? 'bg-green-600 focus:ring-green-500' 
            : 'bg-orange-600 focus:ring-orange-500'
        }`}
        title={`Switch to ${isTestnet ? 'Mainnet' : 'Testnet'}`}
      >
        <span className="sr-only">
          Switch between Mainnet and Testnet
        </span>
        
        {/* Toggle Slider */}
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            !isTestnet ? 'translate-x-6' : 'translate-x-1'
          } ${switching ? 'animate-pulse' : ''}`}
        >
          {switching && (
            <div className="absolute inset-0 rounded-full border-2 border-gray-300 animate-spin">
              <div className="h-1 w-1 bg-gray-600 rounded-full"></div>
            </div>
          )}
        </span>
      </button>

      {/* Mainnet Label */}
      <span className={`text-sm font-medium transition-colors ${
        !isTestnet ? 'text-green-400' : 'text-gray-500'
      }`}>
        Mainnet
      </span>

      {/* Network Status Indicator */}
      {!authenticated && (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
          <span className="text-xs text-gray-400">Not Connected</span>
        </div>
      )}
    </div>
  );
}