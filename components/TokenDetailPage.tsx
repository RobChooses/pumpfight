'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createPublicClient, http, formatEther } from 'viem';
import SimpleCAP20TokenABI from '@/lib/abis/SimpleCAP20TokenV3.json';
import FighterTokenABI from '@/lib/abis/FighterToken.json';
import { useNetwork } from './NetworkContext';
import TokenStaking from './TokenStaking';
import PollCreator from './PollCreator';
import VotingInterface from './VotingInterface';

interface TokenDetailPageProps {
  tokenAddress: string;
  vaultAddress?: string;
}

interface TokenDetails {
  name: string;
  symbol: string;
  totalSupply: string;
  maxSupply: string;
  currentPrice: string;
  tokensSold: string;
  currentStep: string;
  creator: string;
  userBalance: string;
  description?: string;
  imageUrl?: string;
}

interface StakingInfo {
  stakedAmount: string;
  stakingStartTime: number;
  votingPower: string;
  isStaking: boolean;
}

export default function TokenDetailPage({ tokenAddress, vaultAddress }: TokenDetailPageProps) {
  const { ready, authenticated, user } = usePrivy();
  const { currentChain } = useNetwork();
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [resolvedVaultAddress, setResolvedVaultAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'staking' | 'polls' | 'voting'>('overview');
  const [isFighterToken, setIsFighterToken] = useState<boolean>(false);

  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(),
  });

  // Determine which ABI to use based on token characteristics
  const getTokenABI = () => {
    return isFighterToken ? FighterTokenABI : SimpleCAP20TokenABI;
  };

  // Resolve vault address for this token
  const resolveVaultAddress = async (): Promise<boolean> => {
    if (vaultAddress) {
      setResolvedVaultAddress(vaultAddress);
      setIsFighterToken(true);
      return true;
    }

    // TODO: Implement vault address resolution logic
    // This would query the factory contract to get the vault address for this token
    // For now, we'll use a placeholder or derive from token address
    
    try {
      // Placeholder logic - in a real implementation this would call:
      // const vaultAddr = await factoryContract.getVaultForToken(tokenAddress);
      
      // For now, we'll assume vault address follows a pattern or is stored
      const storedTokens = JSON.parse(localStorage.getItem('createdTokens') || '[]');
      const tokenData = storedTokens.find((t: any) => t.address.toLowerCase() === tokenAddress.toLowerCase());
      
      if (tokenData && tokenData.vaultAddress) {
        setResolvedVaultAddress(tokenData.vaultAddress);
        setIsFighterToken(true); // If has vault, it's a FighterToken
        console.log('✅ Found FighterToken with vault:', tokenData.vaultAddress);
        return true;
      } else {
        console.warn('No vault address found for token:', tokenAddress);
        setResolvedVaultAddress(null);
        setIsFighterToken(false); // If no vault, it's a SimpleCAP20Token
        console.log('✅ Found SimpleCAP20Token (no vault)');
        return false;
      }
    } catch (error) {
      console.error('Error resolving vault address:', error);
      setResolvedVaultAddress(null);
      setIsFighterToken(false);
      return false;
    }
  };

  // Fetch comprehensive token details
  const fetchTokenDetails = async () => {
    setLoading(true);
    try {
      console.log(`📊 Fetching details for token: ${tokenAddress}`);
      console.log(`Using ${isFighterToken ? 'FighterToken' : 'SimpleCAP20Token'} ABI`);

      const tokenABI = getTokenABI();

      // Basic token info
      const [name, symbol] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: tokenABI as any,
          functionName: 'name',
          args: [],
        }) as Promise<string>,
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: tokenABI as any,
          functionName: 'symbol',
          args: [],
        }) as Promise<string>,
      ]);

      // Supply and pricing info
      let totalSupply = BigInt(0);
      let maxSupply = BigInt(0);
      let currentPrice = BigInt(0);
      let tokensSold = BigInt(0);
      let currentStep = BigInt(0);
      let creator = '';
      let userBalance = BigInt(0);

      try {
        totalSupply = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: tokenABI as any,
          functionName: 'totalSupply',
          args: [],
        }) as bigint;

        if (isFighterToken) {
          // FighterToken: get maxSupply from config struct
          const configData = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: tokenABI as any,
            functionName: 'config',
            args: [],
          }) as [bigint, bigint, bigint, bigint, bigint, bigint, bigint];
          
          maxSupply = configData[6]; // maxSupply is the 7th field (index 6)

          // FighterToken: use bondingCurve getter (currentPrice, tokensSold, currentStep, reserveBalance)
          const bondingCurveData = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: tokenABI as any,
            functionName: 'bondingCurve',
            args: [],
          }) as [bigint, bigint, bigint, bigint];
          
          [currentPrice, tokensSold, currentStep] = bondingCurveData;

          // FighterToken: get creator from fighter field
          creator = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: tokenABI as any,
            functionName: 'fighter',
            args: [],
          }) as string;
        } else {
          // SimpleCAP20Token: use MAX_SUPPLY
          maxSupply = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: tokenABI as any,
            functionName: 'MAX_SUPPLY',
            args: [],
          }) as bigint;

          // SimpleCAP20Token: use getBondingCurveState
          const bondingCurveData = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: tokenABI as any,
            functionName: 'getBondingCurveState',
            args: [],
          }) as [bigint, bigint, bigint, bigint];

          [currentPrice, tokensSold, currentStep] = bondingCurveData;

          creator = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: tokenABI as any,
            functionName: 'creator',
            args: [],
          }) as string;
        }

        // Get user balance if authenticated
        if (authenticated && user?.wallet?.address) {
          userBalance = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: tokenABI as any,
            functionName: 'balanceOf',
            args: [user.wallet.address],
          }) as bigint;
        }
      } catch (error) {
        console.warn('Some token data calls failed:', error);
      }

      // Try to get stored metadata from localStorage
      let description = '';
      let imageUrl = '';
      
      try {
        const storedTokens = JSON.parse(localStorage.getItem('createdTokens') || '[]');
        const tokenData = storedTokens.find((t: any) => t.address.toLowerCase() === tokenAddress.toLowerCase());
        if (tokenData) {
          description = tokenData.description || '';
          imageUrl = tokenData.imageUrl || '';
        }
      } catch (error) {
        console.warn('Error loading stored token metadata:', error);
      }

      setTokenDetails({
        name,
        symbol,
        totalSupply: formatEther(totalSupply),
        maxSupply: formatEther(maxSupply),
        currentPrice: formatEther(currentPrice || BigInt('1000000000000000')), // 0.001 CHZ default
        tokensSold: formatEther(tokensSold),
        currentStep: currentStep.toString(),
        creator,
        userBalance: formatEther(userBalance),
        description,
        imageUrl,
      });

      console.log('✅ Token details fetched successfully');
    } catch (error) {
      console.error('Error fetching token details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch staking info
  const fetchStakingInfo = async () => {
    if (!authenticated || !user?.wallet?.address) return;

    try {
      const stakedAmount = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: SimpleCAP20TokenABI as any,
        functionName: 'getStakedAmount',
        args: [user.wallet.address],
      }) as bigint;

      const stakingStartTime = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: SimpleCAP20TokenABI as any,
        functionName: 'getStakingStartTime',
        args: [user.wallet.address],
      }) as bigint;

      const stakedAmountFormatted = formatEther(stakedAmount);
      const startTime = Number(stakingStartTime);
      
      // Calculate voting power
      const currentTime = Math.floor(Date.now() / 1000);
      const stakingDuration = currentTime - startTime;
      const stakingDays = stakingDuration / (24 * 60 * 60);
      
      let multiplier = 1;
      if (stakingDays >= 365) {
        multiplier = 5;
      } else if (stakingDays >= 90) {
        multiplier = 3 + (2 * (stakingDays - 90) / 275);
      } else if (stakingDays >= 30) {
        multiplier = 2 + (stakingDays - 30) / 60;
      } else if (stakingDays >= 1) {
        multiplier = 1 + stakingDays / 30;
      }
      
      const votingPower = parseFloat(stakedAmountFormatted) * multiplier;

      setStakingInfo({
        stakedAmount: stakedAmountFormatted,
        stakingStartTime: startTime,
        votingPower: votingPower.toFixed(2),
        isStaking: parseFloat(stakedAmountFormatted) > 0,
      });
    } catch (error) {
      console.error('Error fetching staking info:', error);
      setStakingInfo({
        stakedAmount: '0',
        stakingStartTime: 0,
        votingPower: '0',
        isStaking: false,
      });
    }
  };

  useEffect(() => {
    if (ready) {
      const initializeToken = async () => {
        console.log('🔍 Initializing token details for:', tokenAddress);
        const isFighter = await resolveVaultAddress();
        console.log('📊 Token type determined:', isFighter ? 'FighterToken' : 'SimpleCAP20Token');
        await fetchTokenDetails();
        if (authenticated) {
          await fetchStakingInfo();
        }
      };
      initializeToken();
    }
  }, [ready, authenticated, tokenAddress, user?.wallet?.address]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-fight-gold mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading token details...</p>
        </div>
      </div>
    );
  }

  if (!tokenDetails) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Token not found</p>
          <p className="text-gray-400">Unable to load token details for {tokenAddress}</p>
        </div>
      </div>
    );
  }

  const isCreator = authenticated && user?.wallet?.address?.toLowerCase() === tokenDetails.creator.toLowerCase();
  const canBuy = parseFloat(tokenDetails.totalSupply) < parseFloat(tokenDetails.maxSupply);

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="bg-card-dark border border-gray-700 rounded-2xl p-8 shadow-2xl mb-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Token Image */}
            {tokenDetails.imageUrl && (
              <div className="flex-shrink-0">
                <img 
                  src={tokenDetails.imageUrl} 
                  alt={tokenDetails.name}
                  className="w-32 h-32 lg:w-48 lg:h-48 rounded-2xl object-cover border-2 border-fight-gold"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Token Info */}
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-4xl font-black text-white">{tokenDetails.name}</h1>
                <span className="px-4 py-2 bg-gradient-to-r from-energy-green to-fight-gold text-black text-sm font-bold rounded-full">
                  {tokenDetails.symbol}
                </span>
                {isCreator && (
                  <span className="px-3 py-1 bg-gradient-to-r from-ufc-red to-electric-orange text-white text-xs font-bold rounded-full">
                    CREATOR
                  </span>
                )}
              </div>

              {tokenDetails.description && (
                <p className="text-gray-300 text-lg mb-6">{tokenDetails.description}</p>
              )}

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Current Price</p>
                  <p className="text-fight-gold font-bold text-xl">
                    {parseFloat(tokenDetails.currentPrice).toFixed(6)} CHZ
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Supply</p>
                  <p className="text-white font-semibold">
                    {parseFloat(tokenDetails.totalSupply).toLocaleString()} / {parseFloat(tokenDetails.maxSupply).toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Bonding Curve Step</p>
                  <p className="text-electric-orange font-semibold">Step {parseInt(tokenDetails.currentStep) + 1}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">Your Balance</p>
                  <p className="text-white font-semibold">
                    {parseFloat(tokenDetails.userBalance).toLocaleString()} {tokenDetails.symbol}
                  </p>
                </div>
              </div>

              {canBuy && (
                <div className="flex gap-4">
                  <button className="px-6 py-3 bg-gradient-to-r from-fight-gold to-energy-green text-black font-bold rounded-lg hover:opacity-90 transition-opacity">
                    💰 Buy Tokens
                  </button>
                  <a
                    href={`https://${currentChain.id === 88882 ? 'spicy-explorer' : 'explorer'}.chiliz.com/address/${tokenAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-gradient-to-r from-electric-orange to-neon-pink text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    🔍 View on Explorer
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-card-dark border border-gray-700 rounded-xl mb-8">
          <div className="flex flex-wrap border-b border-gray-700">
            {[
              { id: 'overview', label: '📊 Overview', desc: 'Token statistics' },
              { id: 'staking', label: '🥇 Staking', desc: 'Stake for voting power' },
              { id: 'polls', label: '📝 Manage Polls', desc: 'Create & manage polls' },
              { id: 'voting', label: '🗳️ Vote', desc: 'Participate in polls' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-6 py-4 text-center transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-fight-gold text-fight-gold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <div className="font-semibold">{tab.label}</div>
                <div className="text-xs opacity-75">{tab.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">📈 Token Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Contract Address:</span>
                    <span className="text-white font-mono text-sm">{tokenAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Creator:</span>
                    <span className="text-white font-mono text-sm">{tokenDetails.creator}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Tokens Sold:</span>
                    <span className="text-white">{parseFloat(tokenDetails.tokensSold).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Progress:</span>
                    <span className="text-white">
                      {((parseFloat(tokenDetails.totalSupply) / parseFloat(tokenDetails.maxSupply)) * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">⚡ Bonding Curve Info</h3>
                <div className="space-y-3">
                  <p className="text-gray-300">
                    This token uses a bonding curve for price discovery. As more tokens are purchased, 
                    the price automatically increases in steps.
                  </p>
                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                    <p className="text-yellow-400 text-sm">
                      <strong>Current Step:</strong> {parseInt(tokenDetails.currentStep) + 1}<br/>
                      <strong>Price:</strong> {parseFloat(tokenDetails.currentPrice).toFixed(6)} CHZ per token<br/>
                      <strong>Next Step:</strong> Price {isFighterToken ? 'doubles' : 'increases'} after {isFighterToken ? '50,000' : '1,000'} more tokens sold
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'staking' && resolvedVaultAddress && (
            <TokenStaking
              tokenAddress={tokenAddress}
              vaultAddress={resolvedVaultAddress}
              tokenName={tokenDetails.name}
              tokenSymbol={tokenDetails.symbol}
              userBalance={tokenDetails.userBalance}
            />
          )}

          {activeTab === 'staking' && !resolvedVaultAddress && (
            <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">🥇 Staking & Voting</h3>
              <p className="text-gray-400">No vault found for this token. Staking is not available.</p>
            </div>
          )}

          {activeTab === 'polls' && resolvedVaultAddress && (
            <PollCreator
              tokenAddress={tokenAddress}
              vaultAddress={resolvedVaultAddress}
              tokenName={tokenDetails.name}
              tokenSymbol={tokenDetails.symbol}
              isCreator={isCreator}
            />
          )}

          {activeTab === 'polls' && !resolvedVaultAddress && (
            <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">🗳️ Community Polls</h3>
              <p className="text-gray-400">No vault found for this token. Poll creation is not available.</p>
            </div>
          )}

          {activeTab === 'voting' && resolvedVaultAddress && (
            <VotingInterface
              tokenAddress={tokenAddress}
              vaultAddress={resolvedVaultAddress}
              tokenName={tokenDetails.name}
              tokenSymbol={tokenDetails.symbol}
              userStakingInfo={stakingInfo || undefined}
            />
          )}

          {activeTab === 'voting' && !resolvedVaultAddress && (
            <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-3">🗳️ Active Polls</h3>
              <p className="text-gray-400">No vault found for this token. Voting is not available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}