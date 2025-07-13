'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createPublicClient, http, formatEther } from 'viem';
import { chiliz, spicy } from 'viem/chains';
import SimpleCAP20TokenABI from '@/lib/abis/SimpleCAP20TokenV3.json';
import { useNetwork } from './NetworkContext';

interface StoredToken {
  address: string;
  name: string;
  symbol: string;
  creator: string;
  createdAt: string;
  transactionHash: string;
  network: string;
  chainId: number;
}

interface TokenInfo extends StoredToken {
  currentPrice?: string;
  tokensSold?: string;
  currentStep?: string;
  totalSupply?: string;
}

export default function BrowseTokens() {
  const { ready, authenticated } = usePrivy();
  const { currentChain } = useNetwork();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'myTokens'>('all');

  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(),
  });

  // Load tokens from localStorage
  const loadTokens = () => {
    const storedTokens = JSON.parse(localStorage.getItem('createdTokens') || '[]') as StoredToken[];
    
    // Filter by current network
    const networkTokens = storedTokens.filter(token => token.chainId === currentChain.id);
    
    setTokens(networkTokens);
    return networkTokens;
  };

  // Fetch additional token info from blockchain
  const fetchTokenInfo = async (tokens: StoredToken[]) => {
    setLoading(true);
    const updatedTokens: TokenInfo[] = [];

    for (const token of tokens) {
      try {
        // Get bonding curve state
        const [currentPrice, tokensSold, currentStep] = await publicClient.readContract({
          address: token.address as `0x${string}`,
          abi: SimpleCAP20TokenABI as any,
          functionName: 'getBondingCurveState',
        }) as [bigint, bigint, bigint, bigint];

        // Get total supply
        const totalSupply = await publicClient.readContract({
          address: token.address as `0x${string}`,
          abi: SimpleCAP20TokenABI as any,
          functionName: 'totalSupply',
        }) as bigint;

        updatedTokens.push({
          ...token,
          currentPrice: formatEther(currentPrice),
          tokensSold: formatEther(tokensSold),
          currentStep: currentStep.toString(),
          totalSupply: formatEther(totalSupply),
        });
      } catch (error) {
        console.error(`Error fetching info for token ${token.address}:`, error);
        // Add token without additional info if blockchain call fails
        updatedTokens.push(token);
      }
    }

    setTokens(updatedTokens);
    setLoading(false);
  };

  // Clear all stored tokens (for development/testing)
  const clearTokens = () => {
    if (confirm('Clear all stored tokens? This cannot be undone.')) {
      localStorage.removeItem('createdTokens');
      setTokens([]);
    }
  };

  // Filter tokens based on current user
  const getFilteredTokens = () => {
    if (!authenticated || filter === 'all') return tokens;
    
    // This would need the current user's address - for now show all
    return tokens;
  };

  // Load tokens on component mount and network change
  useEffect(() => {
    if (ready) {
      const storedTokens = loadTokens();
      if (storedTokens.length > 0) {
        fetchTokenInfo(storedTokens);
      }
    }
  }, [ready, currentChain.id]);

  const filteredTokens = getFilteredTokens();

  if (!ready) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Browse Tokens</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => {
              const storedTokens = loadTokens();
              if (storedTokens.length > 0) fetchTokenInfo(storedTokens);
            }}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={clearTokens}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing tokens on <strong>{currentChain.name}</strong> ({filteredTokens.length} tokens)
        </p>
      </div>

      {filteredTokens.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">No tokens found on this network</p>
          <p className="text-sm text-gray-400">
            Create your first token using the Simple Token Creator
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTokens.map((token) => (
            <div key={token.address} className="bg-white rounded-lg shadow-md p-6 border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{token.name}</h3>
                  <p className="text-sm text-gray-500">{token.symbol}</p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                  Step {token.currentStep || '?'}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Address:</span>
                  <p className="font-mono text-xs break-all text-gray-600">
                    {token.address}
                  </p>
                </div>

                {token.currentPrice && (
                  <div>
                    <span className="font-medium">Current Price:</span>
                    <span className="ml-2 text-blue-600">
                      {parseFloat(token.currentPrice).toFixed(6)} CHZ/token
                    </span>
                  </div>
                )}

                {token.tokensSold && (
                  <div>
                    <span className="font-medium">Tokens Sold:</span>
                    <span className="ml-2">{parseFloat(token.tokensSold).toLocaleString()}</span>
                  </div>
                )}

                {token.totalSupply && (
                  <div>
                    <span className="font-medium">Total Supply:</span>
                    <span className="ml-2">{parseFloat(token.totalSupply).toLocaleString()}</span>
                  </div>
                )}

                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2 text-gray-600">
                    {new Date(token.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <span className="font-medium">Creator:</span>
                  <p className="font-mono text-xs break-all text-gray-600">
                    {token.creator}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <a
                  href={`https://${currentChain.id === 88882 ? 'spicy-blockscout' : 'blockscout'}.chiliz.com/address/${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  View on Explorer →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}