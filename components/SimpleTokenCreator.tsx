'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, http, custom, formatEther, parseEther } from 'viem';
import { chiliz, spicy } from 'viem/chains';
import PumpFightFactoryABI from '@/lib/abis/PumpFightFactory.json';
import FighterTokenABI from '@/lib/abis/FighterToken.json';
import SimpleCAP20TokenABI from '@/lib/abis/SimpleCAP20TokenV3.json';
import { useNetwork } from './NetworkContext';

// Use the existing ethereum type from window.d.ts

export default function SimpleTokenCreator() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { currentChain } = useNetwork();
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
  
  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;

  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(),
  });

  // URL validation helper
  const isValidUrl = (string: string): boolean => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Fetch bonding curve state for the current token
  const fetchBondingCurveState = async (tokenAddress: string) => {
    if (!tokenAddress || tokenAddress === 'created') return;

    try {
      // Check if this is a FighterToken
      const storedTokens = JSON.parse(localStorage.getItem('createdTokens') || '[]');
      const tokenData = storedTokens.find((t: any) => t.address.toLowerCase() === tokenAddress.toLowerCase());
      const isFighterToken = tokenData?.vaultAddress ? true : false;
      
      let currentPrice, tokensSold, currentStep, nextStepAt;
      
      if (isFighterToken) {
        // FighterToken: use bondingCurve getter (currentPrice, tokensSold, currentStep, reserveBalance)
        const [price, sold, step] = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: FighterTokenABI as any,
          functionName: 'bondingCurve',
          args: [],
        }) as [bigint, bigint, bigint, bigint];
        
        currentPrice = price;
        tokensSold = sold;
        currentStep = step;
        nextStepAt = BigInt(0); // FighterToken doesn't have nextStepAt, use 0
      } else {
        // SimpleCAP20Token: use getBondingCurveState
        const result = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: SimpleCAP20TokenABI as any,
          functionName: 'getBondingCurveState',
          args: [],
        }) as [bigint, bigint, bigint, bigint];
        
        [currentPrice, tokensSold, currentStep, nextStepAt] = result;
      }

      setBondingCurveState({
        currentPrice: formatEther(currentPrice),
        tokensSold: formatEther(tokensSold),
        currentStep: currentStep.toString(),
        nextStepAt: formatEther(nextStepAt),
      });

      console.log('📊 Bonding curve state:', {
        type: isFighterToken ? 'FighterToken' : 'SimpleCAP20Token',
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
      // Check if this is a FighterToken
      const storedTokens = JSON.parse(localStorage.getItem('createdTokens') || '[]');
      const tokenData = storedTokens.find((t: any) => t.address.toLowerCase() === tokenAddress.toLowerCase());
      const isFighterToken = tokenData?.vaultAddress ? true : false;
      
      let cost;
      if (isFighterToken) {
        // For FighterToken: amount is CHZ to spend, calculate tokens
        const chzAmount = parseEther(amount);
        cost = chzAmount;
        
        const expectedTokens = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: FighterTokenABI as any,
          functionName: 'calculateTokensFromCHZ',
          args: [chzAmount],
        }) as bigint;
        
        // Update display to show expected tokens
        console.log(`Spending ${amount} CHZ to get ~${formatEther(expectedTokens)} tokens`);
      } else {
        // For SimpleCAP20Token: amount is tokens, calculate CHZ cost
        const tokenAmount = parseEther(amount);
        cost = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: FighterTokenABI as any,
          functionName: 'calculateCHZFromTokens',
          args: [tokenAmount],
        }) as bigint;
      }

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

    if (!factoryAddress) {
      alert('PumpFight factory not deployed yet');
      return;
    }

    if (!description.trim()) {
      alert('Please enter a fighter description');
      return;
    }

    if (!imageUrl.trim() || !isValidUrl(imageUrl)) {
      alert('Please enter a valid fighter image URL');
      return;
    }

    setIsCreating(true);
    try {
      // Find the wallet that matches the authenticated user's wallet
      const userWallet = wallets.find(w => w.address === user?.wallet?.address);
      if (!userWallet) {
        throw new Error('Authenticated wallet not found in Privy wallets');
      }

      const provider = await userWallet.getEthereumProvider();
      
      // Check balance before attempting transaction
      const balance = await publicClient.getBalance({
        address: user.wallet.address as `0x${string}`,
      });
      
      console.log('🔧 Creating wallet client with:', {
        chainName: currentChain.name,
        chainId: currentChain.id,
        walletType: userWallet.walletClientType,
        factoryAddress,
        userWalletAddress: user.wallet.address,
        walletAddress: userWallet.address,
        balance: formatEther(balance)
      });
      
      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom(provider),
      });

      // Get creation fee
      const creationFee = await publicClient.readContract({
        address: factoryAddress,
        abi: PumpFightFactoryABI as any,
        functionName: 'creationFee',
        args: [],
      }) as bigint;

      const hash = await walletClient.writeContract({
        address: factoryAddress,
        abi: PumpFightFactoryABI as any,
        functionName: 'createFighterToken',
        args: [tokenName, tokenSymbol, description, imageUrl],
        value: creationFee,
        account: user.wallet.address as `0x${string}`,
      });

      console.log('Transaction hash:', hash);

      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      console.log('Transaction confirmed:', receipt);

      // Parse the logs to find the TokenCreated event
      const logs = await publicClient.getLogs({
        address: factoryAddress,
        event: {
          type: 'event',
          name: 'TokenCreated',
          inputs: [
            { type: 'address', name: 'token', indexed: true },
            { type: 'address', name: 'fighter', indexed: true },
            { type: 'address', name: 'vault', indexed: true },
            { type: 'string', name: 'fighterName' },
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
        const vaultAddress = logs[0].args?.vault;
        console.log('📋 Extracted addresses:', { tokenAddress, vaultAddress });
        
        if (tokenAddress) {
          setLastCreatedToken(tokenAddress);
          
          // Store token in localStorage
          const tokenData = {
            address: tokenAddress,
            name: tokenName,
            symbol: tokenSymbol,
            description: description || '',
            imageUrl: imageUrl || '',
            creator: user!.wallet!.address,
            vaultAddress: vaultAddress || '', // Store vault address from event
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
          alert(`Fighter token created successfully!\nToken Address: ${tokenAddress}\nVault Address: ${vaultAddress}\nTransaction: ${hash}`);
        } else {
          setLastCreatedToken('created');
          alert(`Fighter token created successfully!\nTransaction: ${hash}\nPlease check the transaction for addresses.`);
        }
      } else {
        console.log('📋 No event logs found, falling back to transaction parsing');
        setLastCreatedToken('created');
        alert(`Token created successfully!\nTransaction: ${hash}\nPlease check the transaction for the token address.`);
      }

      // Clear form
      setTokenName('');
      setTokenSymbol('');
      setDescription('');
      setImageUrl('');
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

      // For new FighterTokens created with PumpFightFactory, use buy() function
      // Check if this is a FighterToken by looking for stored vaultAddress
      const storedTokens = JSON.parse(localStorage.getItem('createdTokens') || '[]');
      const tokenData = storedTokens.find((t: any) => t.address.toLowerCase() === lastCreatedToken.toLowerCase());
      const isFighterToken = tokenData?.vaultAddress ? true : false;

      let hash;
      if (isFighterToken) {
        // FighterToken: send CHZ, get tokens with slippage protection
        const chzAmount = parseEther(mintCost);
        
        // Calculate expected tokens
        const expectedTokens = await publicClient.readContract({
          address: lastCreatedToken as `0x${string}`,
          abi: FighterTokenABI as any,
          functionName: 'calculateTokensFromCHZ',
          args: [chzAmount],
        }) as bigint;
        
        // Use 95% of expected for slippage protection
        const minTokensOut = expectedTokens * BigInt(95) / BigInt(100);
        
        hash = await walletClient.writeContract({
          address: lastCreatedToken as `0x${string}`,
          abi: FighterTokenABI as any,
          functionName: 'buy',
          args: [minTokensOut],
          value: chzAmount,
          account: user!.wallet!.address as `0x${string}`,
        });
      } else {
        // Legacy SimpleCAP20Token: specify token amount, pay calculated CHZ
        const amount = parseEther(mintAmount);
        const value = parseEther(mintCost);
        
        hash = await walletClient.writeContract({
          address: lastCreatedToken as `0x${string}`,
          abi: FighterTokenABI as any, // This should be SimpleCAP20TokenABI for legacy tokens
          functionName: 'mint',
          args: [amount],
          value: value,
          account: user!.wallet!.address as `0x${string}`,
        });
      }

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
          <li>• Price starts at 0.0005 CHZ per token</li>
          <li>• Price doubles every 50,000 tokens sold</li>
          <li>• Step 1: 0.0005 CHZ → Step 2: 0.001 CHZ → Step 3: 0.002 CHZ</li>
          <li>• Fair price discovery - early supporters get better prices</li>
          <li>• All revenue goes directly to the token creator</li>
        </ul>
        <div className="mt-3 pt-3 border-t border-yellow-500/30">
          <p className="text-yellow-400 text-xs">
            <strong>Network:</strong> {currentChain.name} | 
            <strong> Factory:</strong> {factoryAddress ? `${factoryAddress.slice(0, 6)}...${factoryAddress.slice(-4)}` : 'Not deployed'}
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-6">
        <button
          onClick={createToken}
          disabled={isCreating || !tokenName.trim() || !tokenSymbol.trim() || !description.trim() || !imageUrl.trim()}
          className="w-full px-6 py-4 bg-gradient-to-r from-ufc-red to-electric-orange text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
'Creating Fighter Token...'
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
                Amount to Purchase
              </label>
              <div className="flex space-x-3">
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  placeholder="1.0"
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
                      Buying...
                    </div>
                  ) : (
                    'Buy Tokens'
                  )}
                </button>
              </div>
              {mintCost !== '0' && (
                <div className="mt-3 bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Amount to Spend:</span>
                    <span className="text-fight-gold font-semibold">{parseFloat(mintCost).toFixed(6)} CHZ</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-1">
                    Tokens received will vary based on current bonding curve price
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}