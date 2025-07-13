'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, http, custom, formatEther, parseEther } from 'viem';
import { chiliz, spicy } from 'viem/chains';
import SimpleTokenLaunchpadABI from '@/lib/abis/SimpleTokenLaunchpadV3.json';
import SimpleCAP20TokenABI from '@/lib/abis/SimpleCAP20TokenV3.json';
import { useNetwork } from './NetworkContext';

// Use the existing ethereum type from window.d.ts

export default function SimpleTokenCreator() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { currentChain, isTestnet } = useNetwork();
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [lastCreatedToken, setLastCreatedToken] = useState<string>('');
  const [mintAmount, setMintAmount] = useState('1');
  const [isMinting, setIsMinting] = useState(false);
  const [bondingCurveState, setBondingCurveState] = useState<{
    currentPrice: string;
    tokensSold: string;
    currentStep: string;
    nextStepAt: string;
  } | null>(null);
  const [mintCost, setMintCost] = useState<string>('0');
  
  const launchpadAddress = process.env.NEXT_PUBLIC_SIMPLE_LAUNCHPAD_V3_ADDRESS as `0x${string}`;

  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(),
  });

  // Fetch bonding curve state for the current token
  const fetchBondingCurveState = async (tokenAddress: string) => {
    if (!tokenAddress || tokenAddress === 'created') return;

    try {
      const [currentPrice, tokensSold, currentStep, nextStepAt] = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: SimpleCAP20TokenABI as any,
        functionName: 'getBondingCurveState',
      }) as [bigint, bigint, bigint, bigint];

      setBondingCurveState({
        currentPrice: formatEther(currentPrice),
        tokensSold: formatEther(tokensSold),
        currentStep: currentStep.toString(),
        nextStepAt: formatEther(nextStepAt),
      });

      console.log('📊 Bonding curve state:', {
        currentPrice: formatEther(currentPrice),
        tokensSold: formatEther(tokensSold),
        currentStep: currentStep.toString(),
        nextStepAt: formatEther(nextStepAt),
      });
    } catch (error) {
      console.error('Error fetching bonding curve state:', error);
    }
  };

  // Calculate cost for minting tokens
  const calculateMintCost = async (tokenAddress: string, amount: string) => {
    if (!tokenAddress || tokenAddress === 'created' || !amount) {
      setMintCost('0');
      return;
    }

    try {
      const tokenAmount = parseEther(amount);
      const cost = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: SimpleCAP20TokenABI as any,
        functionName: 'calculateCHZFromTokens',
        args: [tokenAmount],
      }) as bigint;

      const costInCHZ = formatEther(cost);
      setMintCost(costInCHZ);
      console.log(`💰 Cost for ${amount} tokens: ${costInCHZ} CHZ`);
    } catch (error) {
      console.error('Error calculating mint cost:', error);
      setMintCost('0');
    }
  };

  // Update bonding curve data when token changes
  useEffect(() => {
    if (lastCreatedToken && lastCreatedToken !== 'created') {
      fetchBondingCurveState(lastCreatedToken);
    }
  }, [lastCreatedToken]);

  // Update mint cost when amount or token changes
  useEffect(() => {
    if (lastCreatedToken && lastCreatedToken !== 'created') {
      calculateMintCost(lastCreatedToken, mintAmount);
    }
  }, [lastCreatedToken, mintAmount]);

  const createToken = async () => {
    if (!ready || !authenticated || !user?.wallet?.address) {
      alert('Please connect your wallet first');
      return;
    }

    if (!tokenName.trim() || !tokenSymbol.trim()) {
      alert('Please enter both token name and symbol');
      return;
    }

    if (!launchpadAddress) {
      alert('Simple launchpad not deployed yet');
      return;
    }

    setIsCreating(true);
    try {
      // Use Privy wallet provider directly
      if (wallets.length === 0) {
        throw new Error('No Privy wallet found');
      }

      const wallet = wallets[0];
      const provider = await wallet.getEthereumProvider();
      
      console.log('🔧 Creating wallet client with:', {
        chainName: currentChain.name,
        chainId: currentChain.id,
        walletType: wallet.walletClientType,
        launchpadAddress
      });
      
      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom(provider),
      });

      const hash = await walletClient.writeContract({
        address: launchpadAddress,
        abi: SimpleTokenLaunchpadABI as any,
        functionName: 'createSimpleToken',
        args: [tokenName, tokenSymbol],
        account: user.wallet.address as `0x${string}`,
      });

      console.log('Transaction hash:', hash);

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed:', receipt);

      // Parse the logs to find the SimpleTokenCreated event
      const logs = await publicClient.getLogs({
        address: launchpadAddress,
        event: {
          type: 'event',
          name: 'SimpleTokenCreated',
          inputs: [
            { type: 'address', name: 'token', indexed: true },
            { type: 'address', name: 'creator', indexed: true },
            { type: 'string', name: 'name' },
            { type: 'string', name: 'symbol' },
            { type: 'uint256', name: 'initialPrice' },
            { type: 'uint256', name: 'timestamp' }
          ]
        },
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      console.log('📋 Event logs found:', logs.length);
      if (logs.length > 0) {
        console.log('📋 First log:', logs[0]);
        console.log('📋 Log args:', logs[0].args);
        
        const tokenAddress = logs[0].args?.token;
        console.log('📋 Extracted token address:', tokenAddress);
        
        if (tokenAddress) {
          setLastCreatedToken(tokenAddress);
          
          // Store token in localStorage
          const tokenData = {
            address: tokenAddress,
            name: tokenName,
            symbol: tokenSymbol,
            creator: user!.wallet!.address,
            createdAt: new Date().toISOString(),
            transactionHash: hash,
            network: currentChain.name,
            chainId: currentChain.id
          };
          
          try {
            // Get existing tokens from localStorage
            const existingTokens = JSON.parse(localStorage.getItem('createdTokens') || '[]');
            
            // Check if token already exists (prevent duplicates)
            const tokenExists = existingTokens.some((token: any) => token.address === tokenAddress);
            if (!tokenExists) {
              existingTokens.push(tokenData);
              localStorage.setItem('createdTokens', JSON.stringify(existingTokens));
              console.log('💾 Token saved to localStorage:', tokenData);
            } else {
              console.log('💾 Token already exists in localStorage');
            }
          } catch (error) {
            console.error('Error saving token to localStorage:', error);
          }
          alert(`Token created successfully!\nToken Address: ${tokenAddress}\nTransaction: ${hash}`);
        } else {
          setLastCreatedToken('created');
          alert(`Token created successfully!\nTransaction: ${hash}\nPlease check the transaction for the token address.`);
        }
      } else {
        console.log('📋 No event logs found, falling back to transaction parsing');
        setLastCreatedToken('created');
        alert(`Token created successfully!\nTransaction: ${hash}\nPlease check the transaction for the token address.`);
      }

      // Clear form
      setTokenName('');
      setTokenSymbol('');
    } catch (error) {
      console.error('Error creating token:', error);
      alert('Failed to create token. Check console for details.');
    } finally {
      setIsCreating(false);
    }
  };

  const mintTokens = async () => {
    if (!lastCreatedToken || !mintAmount || lastCreatedToken === 'created') {
      alert('Please enter a specific token address to mint from');
      return;
    }

    setIsMinting(true);
    try {
      if (wallets.length === 0) {
        throw new Error('No Privy wallet found');
      }

      const wallet = wallets[0];
      const provider = await wallet.getEthereumProvider();
      
      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom(provider),
      });

      const amount = parseEther(mintAmount);
      const value = parseEther(mintCost); // Use calculated cost from bonding curve

      const hash = await walletClient.writeContract({
        address: lastCreatedToken as `0x${string}`,
        abi: SimpleCAP20TokenABI as any,
        functionName: 'mint',
        args: [amount],
        value: value,
        account: user!.wallet!.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      alert(`Successfully minted ${mintAmount} tokens!`);
      
      // Refresh bonding curve state after successful mint
      await fetchBondingCurveState(lastCreatedToken);
    } catch (error) {
      console.error('Error minting tokens:', error);
      alert('Failed to mint tokens. Check console for details.');
    } finally {
      setIsMinting(false);
    }
  };

  if (!ready) {
    return <div className="p-4">Loading...</div>;
  }

  if (!authenticated) {
    return <div className="p-4 text-center">Please connect your wallet to create tokens</div>;
  }

  return (
    <div className="space-y-6">
      {/* Token Name */}
      <div>
        <label htmlFor="tokenName" className="block text-sm font-medium text-gray-300 mb-2">
          Token Name *
        </label>
        <input
          type="text"
          id="tokenName"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          placeholder="e.g., My Awesome Token"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent"
          disabled={isCreating}
        />
      </div>

      {/* Token Symbol */}
      <div>
        <label htmlFor="tokenSymbol" className="block text-sm font-medium text-gray-300 mb-2">
          Token Symbol *
        </label>
        <input
          type="text"
          id="tokenSymbol"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
          placeholder="e.g., MAT"
          maxLength={6}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent"
          disabled={isCreating}
        />
      </div>

      {/* Fighter Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
          Fighter Description *
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell fans about your fighting career, achievements, and what makes you special..."
          rows={4}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent resize-vertical"
          disabled={isCreating}
        />
      </div>

      {/* Fighter Image URL */}
      <div>
        <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-300 mb-2">
          Fighter Image URL *
        </label>
        <input
          type="url"
          id="imageUrl"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://example.com/fighter-photo.jpg"
          className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent"
          disabled={isCreating}
        />
        {imageUrl && isValidUrl(imageUrl) && (
          <div className="mt-3">
            <p className="text-sm text-gray-400 mb-2">Preview:</p>
            <img 
              src={imageUrl} 
              alt="Fighter preview" 
              className="w-32 h-32 object-cover rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* How It Works Info */}
      <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
        <h3 className="text-yellow-400 font-semibold mb-2">🚀 How It Works:</h3>
        <ul className="text-yellow-400 text-sm space-y-1">
          <li>• Create tokens with automatic bonding curve pricing</li>
          <li>• Price starts at 0.001 CHZ per token</li>
          <li>• Price increases by 0.0001 CHZ every 1,000 tokens sold</li>
          <li>• Step 0: 0.001 CHZ → Step 1: 0.0011 CHZ → Step 2: 0.0012 CHZ</li>
          <li>• Fair price discovery - early supporters get better prices</li>
          <li>• All revenue goes directly to the token creator</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-yellow-500/30">
          <p className="text-yellow-400 text-xs">
            <strong>Network:</strong> {currentChain.name} | 
            <strong> Contract:</strong> {launchpadAddress ? `${launchpadAddress.slice(0, 6)}...${launchpadAddress.slice(-4)}` : 'Not deployed'}
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-6">
        <button
          onClick={createToken}
          disabled={isCreating || !tokenName.trim() || !tokenSymbol.trim()}
          className="w-full px-6 py-4 bg-gradient-to-r from-ufc-red to-electric-orange text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Creating Token...
            </div>
          ) : (
            'Create Token'
          )}
        </button>
      </div>

      {lastCreatedToken && (
        <div className="mt-8 bg-card-dark border border-gray-700 rounded-xl p-6">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">🎉</div>
            <h3 className="text-xl font-bold text-white mb-2">Token Created Successfully!</h3>
            <div className="bg-gray-800 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-400 mb-1">Token Address:</p>
              <p className="text-white font-mono text-xs break-all">
                {lastCreatedToken}
              </p>
            </div>
          </div>

          {bondingCurveState && (
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
              <h4 className="text-white font-semibold mb-3">📊 Bonding Curve State</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Current Price:</span>
                  <p className="text-fight-gold font-mono">{parseFloat(bondingCurveState.currentPrice).toFixed(6)} CHZ/token</p>
                </div>
                <div>
                  <span className="text-gray-400">Tokens Sold:</span>
                  <p className="text-white">{parseFloat(bondingCurveState.tokensSold).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-gray-400">Current Step:</span>
                  <p className="text-electric-orange">{bondingCurveState.currentStep}</p>
                </div>
                <div>
                  <span className="text-gray-400">Next Step At:</span>
                  <p className="text-white">{parseFloat(bondingCurveState.nextStepAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Token Address
              </label>
              <input
                type="text"
                value={lastCreatedToken}
                onChange={(e) => setLastCreatedToken(e.target.value)}
                placeholder="0x... token contract address"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent font-mono text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount to Mint
              </label>
              <div className="flex space-x-3">
                <input
                  type="number"
                  min="1"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-ufc-red focus:border-transparent"
                />
                <button
                  onClick={mintTokens}
                  disabled={isMinting || !mintAmount || !lastCreatedToken || lastCreatedToken === 'created' || mintCost === '0'}
                  className="px-6 py-3 bg-gradient-to-r from-energy-green to-social-blue text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMinting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Minting...
                    </div>
                  ) : (
                    'Mint'
                  )}
                </button>
              </div>
              {mintCost !== '0' && (
                <div className="mt-3 bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Total Cost:</span>
                    <span className="text-fight-gold font-semibold">{parseFloat(mintCost).toFixed(6)} CHZ</span>
                  </div>
                  {bondingCurveState && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-gray-400 text-xs">Avg Price per Token:</span>
                      <span className="text-gray-300 text-xs">≈{(parseFloat(mintCost) / parseFloat(mintAmount)).toFixed(6)} CHZ</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}