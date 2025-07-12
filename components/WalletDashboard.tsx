'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useNetwork } from './NetworkContext';
import WalletConnectButton from './WalletConnectButton';
import CHZBalance from './CHZBalance';
import NetworkToggle from './NetworkToggle';

/**
 * Example dashboard component showing how to use all the new Privy components together
 * This demonstrates the complete wallet integration pattern
 */
export default function WalletDashboard() {
  const { authenticated, user } = usePrivy();
  const { currentChain, isTestnet } = useNetwork();

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!authenticated) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
        <p className="text-gray-400 mb-6">
          Connect your wallet to start trading fighter tokens on Chiliz Chain
        </p>
        <WalletConnectButton />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Wallet Dashboard</h2>
        <WalletConnectButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wallet Info */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400">Wallet Address</label>
            <div className="mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white font-mono">
              {user?.wallet?.address ? formatAddress(user.wallet.address) : 'Not connected'}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Network</label>
            <div className="mt-1">
              <NetworkToggle />
            </div>
          </div>
        </div>

        {/* Balance Info */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-400">CHZ Balance</label>
            <div className="mt-1">
              <CHZBalance />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-400">Chain Details</label>
            <div className="mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isTestnet ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm">
                  {currentChain.name} (ID: {currentChain.id})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors">
            Create Fighter Token
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
            Browse Tokens
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
            View Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}