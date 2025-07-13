'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, http, custom, formatEther, parseEther } from 'viem';
import SimpleCAP20TokenABI from '@/lib/abis/SimpleCAP20TokenV3.json';
import FighterVaultABI from '@/lib/abis/FighterVault.json';
import { useNetwork } from './NetworkContext';

interface StakingInfo {
  stakedAmount: string;
  stakingStartTime: number;
  votingPower: string;
  isStaking: boolean;
}

interface TokenStakingProps {
  tokenAddress: string;
  vaultAddress: string;
  tokenName: string;
  tokenSymbol: string;
  userBalance?: string;
}

export default function TokenStaking({ tokenAddress, vaultAddress, tokenName, tokenSymbol, userBalance }: TokenStakingProps) {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { currentChain } = useNetwork();
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(),
  });

  // Calculate voting power based on staking duration and amount
  const calculateVotingPower = (stakedAmount: string, stakingStartTime: number): string => {
    if (!stakedAmount || stakedAmount === '0' || stakingStartTime === 0) return '0';
    
    const currentTime = Math.floor(Date.now() / 1000);
    const stakingDuration = currentTime - stakingStartTime; // seconds
    const stakingDays = stakingDuration / (24 * 60 * 60); // convert to days
    
    // Base voting power = staked amount
    // Multiplier increases with time: 1x at 0 days, 2x at 30 days, 3x at 90 days, 5x at 365 days
    let multiplier = 1;
    if (stakingDays >= 365) {
      multiplier = 5;
    } else if (stakingDays >= 90) {
      multiplier = 3 + (2 * (stakingDays - 90) / 275); // Linear interpolation from 3x to 5x
    } else if (stakingDays >= 30) {
      multiplier = 2 + (stakingDays - 30) / 60; // Linear interpolation from 2x to 3x
    } else if (stakingDays >= 1) {
      multiplier = 1 + stakingDays / 30; // Linear interpolation from 1x to 2x
    }
    
    const baseAmount = parseFloat(stakedAmount);
    const votingPower = baseAmount * multiplier;
    
    return votingPower.toFixed(2);
  };

  // Fetch user's staking information
  const fetchStakingInfo = async () => {
    if (!authenticated || !user?.wallet?.address || !vaultAddress) return;
    
    setLoading(true);
    try {
      // Get staking info from FighterVault
      const stakeData = await publicClient.readContract({
        address: vaultAddress as `0x${string}`,
        abi: FighterVaultABI as any,
        functionName: 'stakes',
        args: [user.wallet.address],
      }) as [bigint, bigint, bigint, bigint]; // [amount, stakingTime, lastClaimTime, tier]

      const [stakedAmount, stakingTime, lastClaimTime, tier] = stakeData;
      const stakedAmountFormatted = formatEther(stakedAmount);
      const startTime = Number(stakingTime);
      const votingPower = calculateVotingPower(stakedAmountFormatted, startTime);

      setStakingInfo({
        stakedAmount: stakedAmountFormatted,
        stakingStartTime: startTime,
        votingPower,
        isStaking: parseFloat(stakedAmountFormatted) > 0,
      });

      console.log('📊 Staking info from vault:', {
        vaultAddress,
        stakedAmount: stakedAmountFormatted,
        stakingStartTime: startTime,
        votingPower,
        tier: tier.toString(),
      });
    } catch (error) {
      console.error('Error fetching staking info from vault:', error);
      // Set default values if calls fail
      setStakingInfo({
        stakedAmount: '0',
        stakingStartTime: 0,
        votingPower: '0',
        isStaking: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Stake tokens
  const stakeTokens = async () => {
    if (!authenticated || !user?.wallet?.address || !stakeAmount || !vaultAddress) {
      alert('Please connect wallet and enter stake amount');
      return;
    }

    if (parseFloat(stakeAmount) <= 0) {
      alert('Please enter a valid stake amount');
      return;
    }

    setIsStaking(true);
    try {
      const userWallet = wallets.find(w => w.address === user?.wallet?.address);
      if (!userWallet) {
        throw new Error('Authenticated wallet not found');
      }

      const provider = await userWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom(provider),
      });

      const amount = parseEther(stakeAmount);

      // First approve the vault to spend tokens
      const approveHash = await walletClient.writeContract({
        address: tokenAddress as `0x${string}`,
        abi: SimpleCAP20TokenABI as any,
        functionName: 'approve',
        args: [vaultAddress, amount],
        account: user.wallet.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash: approveHash });
      console.log('✅ Token approval confirmed');

      // Then stake in the vault
      const stakeHash = await walletClient.writeContract({
        address: vaultAddress as `0x${string}`,
        abi: FighterVaultABI as any,
        functionName: 'stake',
        args: [amount],
        account: user.wallet.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash: stakeHash });
      alert(`Successfully staked ${stakeAmount} ${tokenSymbol}!`);
      
      setStakeAmount('');
      await fetchStakingInfo(); // Refresh staking info
    } catch (error) {
      console.error('Error staking tokens:', error);
      alert('Failed to stake tokens. Check console for details.');
    } finally {
      setIsStaking(false);
    }
  };

  // Unstake tokens
  const unstakeTokens = async () => {
    if (!authenticated || !user?.wallet?.address || !stakingInfo || !vaultAddress) {
      alert('Please connect wallet');
      return;
    }

    if (!stakingInfo.isStaking) {
      alert('No tokens currently staked');
      return;
    }

    const confirm = window.confirm(`Unstake all ${stakingInfo.stakedAmount} ${tokenSymbol}? This will reset your voting power.`);
    if (!confirm) return;

    setIsUnstaking(true);
    try {
      const userWallet = wallets.find(w => w.address === user?.wallet?.address);
      if (!userWallet) {
        throw new Error('Authenticated wallet not found');
      }

      const provider = await userWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom(provider),
      });

      const amount = parseEther(stakingInfo.stakedAmount);

      const hash = await walletClient.writeContract({
        address: vaultAddress as `0x${string}`,
        abi: FighterVaultABI as any,
        functionName: 'unstake',
        args: [amount],
        account: user.wallet.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      alert(`Successfully unstaked ${stakingInfo.stakedAmount} ${tokenSymbol}!`);
      
      await fetchStakingInfo(); // Refresh staking info
    } catch (error) {
      console.error('Error unstaking tokens:', error);
      alert('Failed to unstake tokens. Check console for details.');
    } finally {
      setIsUnstaking(false);
    }
  };

  // Load staking info on component mount
  useEffect(() => {
    if (ready && authenticated) {
      fetchStakingInfo();
    }
  }, [ready, authenticated, tokenAddress, user?.wallet?.address]);

  if (!ready || !authenticated) {
    return (
      <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-3">🥇 Staking & Voting</h3>
        <p className="text-gray-400">Connect your wallet to stake tokens and participate in voting.</p>
      </div>
    );
  }

  const formatDuration = (seconds: number): string => {
    if (seconds === 0) return '0 days';
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours}h`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return `${Math.floor(seconds / 60)} minute${Math.floor(seconds / 60) !== 1 ? 's' : ''}`;
    }
  };

  const currentTime = Math.floor(Date.now() / 1000);
  const stakingDuration = stakingInfo ? currentTime - stakingInfo.stakingStartTime : 0;

  return (
    <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">🥇 Staking & Voting Power</h3>
      
      {loading ? (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fight-gold mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading staking info...</p>
        </div>
      ) : (
        <>
          {/* Current Staking Status */}
          {stakingInfo && (
            <div className="mb-6 space-y-3">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-300">Staked Amount:</span>
                    <p className="text-white font-semibold">
                      {parseFloat(stakingInfo.stakedAmount).toLocaleString()} {tokenSymbol}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-300">Voting Power:</span>
                    <p className="text-fight-gold font-bold text-lg">
                      {parseFloat(stakingInfo.votingPower).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-300">Staking Duration:</span>
                    <p className="text-white font-semibold">
                      {stakingInfo.stakingStartTime > 0 ? formatDuration(stakingDuration) : 'Not staking'}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-300">Status:</span>
                    <p className={`font-semibold ${stakingInfo.isStaking ? 'text-energy-green' : 'text-gray-400'}`}>
                      {stakingInfo.isStaking ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Voting Power Explanation */}
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-yellow-400 text-xs">
                  💡 <strong>Voting Power grows over time:</strong> 1x (start) → 2x (30 days) → 3x (90 days) → 5x (365 days)
                </p>
              </div>
            </div>
          )}

          {/* Staking Actions */}
          <div className="space-y-4">
            {/* Stake Section */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Stake Tokens
              </label>
              <div className="flex space-x-3">
                <input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  placeholder="0.0"
                  min="0"
                  step="0.001"
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-fight-gold focus:border-transparent"
                />
                <button
                  onClick={stakeTokens}
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) <= 0}
                  className="px-6 py-3 bg-gradient-to-r from-fight-gold to-energy-green text-black font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStaking ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                      Staking...
                    </div>
                  ) : (
                    'Stake'
                  )}
                </button>
              </div>
              {userBalance && (
                <p className="text-xs text-gray-400 mt-1">
                  Available: {parseFloat(userBalance).toLocaleString()} {tokenSymbol}
                </p>
              )}
            </div>

            {/* Unstake Section */}
            {stakingInfo?.isStaking && (
              <div>
                <button
                  onClick={unstakeTokens}
                  disabled={isUnstaking}
                  className="w-full px-6 py-3 bg-gradient-to-r from-ufc-red to-electric-orange text-white font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUnstaking ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Unstaking...
                    </div>
                  ) : (
                    `Unstake All (${parseFloat(stakingInfo.stakedAmount).toLocaleString()} ${tokenSymbol})`
                  )}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}