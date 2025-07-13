'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, http, custom, formatEther, parseEther } from 'viem';
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
  maxSupply?: string;
}

export default function BrowseTokens() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { currentChain } = useNetwork();
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'myTokens'>('all');
  const [buyingToken, setBuyingToken] = useState<string | null>(null);

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
          args: [],
        }) as [bigint, bigint, bigint, bigint];

        // Get total supply
        const totalSupply = await publicClient.readContract({
          address: token.address as `0x${string}`,
          abi: SimpleCAP20TokenABI as any,
          functionName: 'totalSupply',
          args: [],
        }) as bigint;

        // Get max supply
        const maxSupply = await publicClient.readContract({
          address: token.address as `0x${string}`,
          abi: SimpleCAP20TokenABI as any,
          functionName: 'MAX_SUPPLY',
          args: [],
        }) as bigint;

        updatedTokens.push({
          ...token,
          currentPrice: formatEther(currentPrice),
          tokensSold: formatEther(tokensSold),
          currentStep: currentStep.toString(),
          totalSupply: formatEther(totalSupply),
          maxSupply: formatEther(maxSupply),
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

  // Buy tokens function
  const buyTokens = async (tokenAddress: string, tokenName: string) => {
    if (!authenticated || !user?.wallet?.address) {
      alert('Please connect your wallet first');
      return;
    }

    const amount = prompt(`How many ${tokenName} tokens would you like to buy?`, '1');
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return;
    }

    setBuyingToken(tokenAddress);
    try {
      // Find the wallet that matches the authenticated user's wallet
      const userWallet = wallets.find(w => w.address === user?.wallet?.address);
      if (!userWallet) {
        throw new Error('Authenticated wallet not found in Privy wallets');
      }

      const provider = await userWallet.getEthereumProvider();
      
      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom(provider),
      });

      // Calculate cost for the tokens
      const tokenAmount = parseEther(amount);
      const cost = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: SimpleCAP20TokenABI as any,
        functionName: 'calculateCHZFromTokens',
        args: [tokenAmount],
      }) as bigint;

      const costInCHZ = formatEther(cost);
      const confirmPurchase = confirm(`Buy ${amount} tokens for ${parseFloat(costInCHZ).toFixed(6)} CHZ?`);
      
      if (!confirmPurchase) {
        setBuyingToken(null);
        return;
      }

      const hash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: SimpleCAP20TokenABI as any,
        functionName: 'mint',
        args: [tokenAmount],
        value: cost,
        account: user.wallet.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      alert(`Successfully bought ${amount} tokens!\nTransaction: ${hash}`);
      
      // Refresh token info after successful purchase
      const storedTokens = loadTokens();
      if (storedTokens.length > 0) {
        fetchTokenInfo(storedTokens);
      }
    } catch (error) {
      console.error('Error buying tokens:', error);
      alert('Failed to buy tokens. Check console for details.');
    } finally {
      setBuyingToken(null);
    }
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
    <div className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div className="flex space-x-4">
          <button
            onClick={() => {
              const storedTokens = loadTokens();
              if (storedTokens.length > 0) fetchTokenInfo(storedTokens);
            }}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-electric-orange to-neon-pink text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
          <button
            onClick={clearTokens}
            className="px-6 py-3 bg-gradient-to-r from-ufc-red to-electric-orange text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-gray-300">
          Showing tokens on <strong className="text-fight-gold">{currentChain.name}</strong> ({filteredTokens.length} tokens)
        </p>
      </div>

      {filteredTokens.length === 0 ? (
        <div className="text-center py-12 bg-card-dark border border-gray-700 rounded-2xl">
          <p className="text-gray-300 mb-4 text-lg">No tokens found on this network</p>
          <p className="text-gray-400">
            Create your first token using the Token Creator
          </p>
          <div className="mt-6">
            <a 
              href="/simple-token"
              className="px-8 py-4 bg-gradient-to-r from-fight-gold to-energy-green text-black font-black rounded-lg hover:opacity-90 transition-opacity shadow-lg inline-block"
            >
              🚀 CREATE TOKEN
            </a>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTokens.map((token) => (
            <div key={token.address} className="bg-card-dark border-2 border-gray-700 hover:border-fight-gold transition-all duration-300 rounded-2xl p-6 shadow-2xl hover:shadow-fight-gold/20 transform hover:scale-105">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{token.name}</h3>
                  <p className="text-fight-gold font-medium">{token.symbol}</p>
                </div>
                <span className="px-3 py-1 bg-gradient-to-r from-energy-green to-fight-gold text-black text-xs font-bold rounded-full">
                  Step {token.currentStep || '?'}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-300">Address:</span>
                  <p className="font-mono text-xs break-all text-gray-400 mt-1">
                    {token.address}
                  </p>
                </div>

                {token.currentPrice && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <span className="font-medium text-gray-300">Current Price:</span>
                    <div className="text-fight-gold font-bold text-lg">
                      {parseFloat(token.currentPrice).toFixed(6)} CHZ/token
                    </div>
                  </div>
                )}

                {token.tokensSold && (
                  <div>
                    <span className="font-medium text-gray-300">Tokens Sold:</span>
                    <span className="ml-2 text-white font-semibold">{parseFloat(token.tokensSold).toLocaleString()}</span>
                  </div>
                )}

                {token.totalSupply && (
                  <div>
                    <span className="font-medium text-gray-300">Total Supply:</span>
                    <span className="ml-2 text-white font-semibold">
                      {parseFloat(token.totalSupply).toLocaleString()}
                      {token.maxSupply && (
                        <span className="text-gray-400 text-xs ml-1">
                          / {parseFloat(token.maxSupply).toLocaleString()} max
                        </span>
                      )}
                    </span>
                  </div>
                )}

                <div>
                  <span className="font-medium text-gray-300">Created:</span>
                  <span className="ml-2 text-gray-400">
                    {new Date(token.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-gray-300">Creator:</span>
                  <p className="font-mono text-xs break-all text-gray-400 mt-1">
                    {token.creator}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Buy Button - only show if max supply not reached */}
                  {token.totalSupply && token.maxSupply && 
                   parseFloat(token.totalSupply) < parseFloat(token.maxSupply) && (
                    <button
                      onClick={() => buyTokens(token.address, token.name)}
                      disabled={buyingToken === token.address || !authenticated}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-fight-gold to-energy-green text-black font-bold rounded-lg hover:opacity-90 transition-opacity text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {buyingToken === token.address ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                          Buying...
                        </div>
                      ) : (
                        '💰 Buy Tokens'
                      )}
                    </button>
                  )}
                  
                  {/* Explorer Link */}
                  <a
                    href={`https://${currentChain.id === 88882 ? 'spicy-explorer' : 'explorer'}.chiliz.com/address/${token.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-electric-orange to-neon-pink text-white font-bold rounded-lg hover:opacity-90 transition-opacity text-sm"
                  >
                    🔍 Explorer
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}