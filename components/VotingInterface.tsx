'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, http, custom } from 'viem';
import FighterVaultABI from '@/lib/abis/FighterVault.json';
import { useNetwork } from './NetworkContext';

interface Vote {
  pollId: string;
  optionIndex: number;
  voter: string;
  votingPower: string;
  timestamp: number;
}

interface PollWithVotes {
  id: string;
  question: string;
  options: string[];
  creator: string;
  endTime: number;
  isActive: boolean;
  totalVotes: string;
  createdAt: number;
  optionVotes: string[]; // Voting power for each option
  userVote?: number; // Which option user voted for (-1 if not voted)
  userVotingPower: string;
}

interface VotingInterfaceProps {
  tokenAddress: string;
  vaultAddress: string;
  tokenName: string;
  tokenSymbol: string;
  userStakingInfo?: {
    stakedAmount: string;
    votingPower: string;
    isStaking: boolean;
  };
}

export default function VotingInterface({ tokenAddress, vaultAddress, tokenName, tokenSymbol, userStakingInfo }: VotingInterfaceProps) {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { currentChain } = useNetwork();
  const [polls, setPolls] = useState<PollWithVotes[]>([]);
  const [loading, setLoading] = useState(false);
  const [voting, setVoting] = useState<string | null>(null); // pollId currently being voted on

  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(),
  });

  // Vote on a poll
  const vote = async (pollId: string, optionIndex: number, pollQuestion: string, optionText: string) => {
    if (!authenticated || !user?.wallet?.address) {
      alert('Please connect your wallet to vote');
      return;
    }

    if (!userStakingInfo?.isStaking || parseFloat(userStakingInfo.votingPower) === 0) {
      alert('You must stake tokens to vote. Your voting power is determined by your staked amount and staking duration.');
      return;
    }

    const confirm = window.confirm(
      `Vote for "${optionText}" in poll "${pollQuestion}"?\n\nYour voting power: ${parseFloat(userStakingInfo.votingPower).toLocaleString()}`
    );
    
    if (!confirm) return;

    setVoting(pollId);
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

      const hash = await walletClient.writeContract({
        address: vaultAddress as `0x${string}`,
        abi: FighterVaultABI as any,
        functionName: 'castVote',
        args: [parseInt(pollId), optionIndex],
        account: user.wallet.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      alert(`Vote cast successfully with ${parseFloat(userStakingInfo.votingPower).toLocaleString()} voting power!`);
      
      // Refresh polls
      await fetchPollsWithVotes();
    } catch (error) {
      console.error('Error voting:', error);
      if (error.message.includes('already voted')) {
        alert('You have already voted in this poll.');
      } else if (error.message.includes('poll ended')) {
        alert('This poll has already ended.');
      } else {
        alert('Failed to cast vote. Check console for details.');
      }
    } finally {
      setVoting(null);
    }
  };

  // Fetch polls with voting data
  const fetchPollsWithVotes = async () => {
    setLoading(true);
    try {
      // Get vote count
      const voteCount = await publicClient.readContract({
        address: vaultAddress as `0x${string}`,
        abi: FighterVaultABI as any,
        functionName: 'voteCounter',
        args: [],
      }) as bigint;

      const fetchedPolls: PollWithVotes[] = [];
      const count = Number(voteCount);

      // Fetch each vote with vote data
      for (let i = 0; i < count; i++) {
        try {
          // Get basic vote data
          const voteData = await publicClient.readContract({
            address: vaultAddress as `0x${string}`,
            abi: FighterVaultABI as any,
            functionName: 'getVote',
            args: [i],
          }) as any[];

          const [topic, deadline, minStakeRequired, active] = voteData;

          // Get options for this vote
          const options: string[] = [];
          const optionVotes: string[] = [];
          let optionIndex = 0;
          let totalVotes = 0;
          
          try {
            while (true) {
              const optionData = await publicClient.readContract({
                address: vaultAddress as `0x${string}`,
                abi: FighterVaultABI as any,
                functionName: 'getVoteOption',
                args: [i, optionIndex],
              }) as [string, bigint];
              
              options.push(optionData[0]);
              const voteCount = Number(optionData[1]);
              optionVotes.push(voteCount.toString());
              totalVotes += voteCount;
              optionIndex++;
            }
          } catch {
            // No more options
          }

          // Check if user has voted
          let userVote = -1;
          if (authenticated && user?.wallet?.address) {
            try {
              const hasVoted = await publicClient.readContract({
                address: vaultAddress as `0x${string}`,
                abi: FighterVaultABI as any,
                functionName: 'hasVoted',
                args: [i, user.wallet.address],
              }) as boolean;

              if (hasVoted) {
                // We don't have a direct way to get user's vote choice in FighterVault
                // This would need to be tracked differently
                userVote = 0; // Placeholder - indicates user has voted
              }
            } catch (error) {
              console.error(`Error checking user vote for vote ${i}:`, error);
            }
          }

          fetchedPolls.push({
            id: i.toString(),
            question: topic,
            options,
            creator: 'Token Creator',
            endTime: Number(deadline),
            isActive: active,
            totalVotes: totalVotes.toString(),
            createdAt: 0, // Not available in FighterVault
            optionVotes,
            userVote,
            userVotingPower: userStakingInfo?.votingPower || '0',
          });
        } catch (error) {
          console.error(`Error fetching poll ${i}:`, error);
        }
      }

      setPolls(fetchedPolls.reverse()); // Show newest first
      console.log(`📊 Fetched ${fetchedPolls.length} polls with voting data for ${tokenName}`);
    } catch (error) {
      console.error('Error fetching polls with votes:', error);
      setPolls([]);
    } finally {
      setLoading(false);
    }
  };

  // Load polls on component mount
  useEffect(() => {
    if (ready && authenticated) {
      fetchPollsWithVotes();
    }
  }, [ready, authenticated, vaultAddress, userStakingInfo]);

  if (!ready || !authenticated) {
    return (
      <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-3">🗳️ Active Polls</h3>
        <p className="text-gray-400">Connect your wallet to view and participate in polls.</p>
      </div>
    );
  }

  const formatTimeRemaining = (endTime: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const remaining = endTime - now;
    
    if (remaining <= 0) return 'Ended';
    
    const days = Math.floor(remaining / (24 * 60 * 60));
    const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((remaining % (60 * 60)) / 60);
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const calculatePercentage = (optionVotes: string, totalVotes: string): number => {
    const option = parseFloat(optionVotes);
    const total = parseFloat(totalVotes);
    if (total === 0) return 0;
    return (option / total) * 100;
  };

  const canVote = userStakingInfo?.isStaking && parseFloat(userStakingInfo.votingPower) > 0;

  return (
    <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">🗳️ Active Polls</h3>
        {userStakingInfo && (
          <div className="text-right">
            <p className="text-sm text-gray-300">Your Voting Power:</p>
            <p className="text-fight-gold font-bold">
              {parseFloat(userStakingInfo.votingPower).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {!canVote && (
        <div className="mb-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
          <p className="text-yellow-400 text-sm">
            💡 <strong>Stake tokens to participate:</strong> You need to stake {tokenSymbol} tokens to gain voting power.
            The longer you stake, the more voting power you earn!
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fight-gold mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading polls...</p>
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No polls available.</p>
          <p className="text-sm text-gray-500 mt-2">
            Polls will appear here when the token creator creates them.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {polls.map((poll) => {
            const totalVotingPower = parseFloat(poll.totalVotes);
            const isVoting = voting === poll.id;
            
            return (
              <div key={poll.id} className="bg-gray-800/30 border border-gray-600 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-white font-semibold text-lg pr-4">{poll.question}</h4>
                  <div className="text-right flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      poll.isActive ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'
                    }`}>
                      {poll.isActive ? 'Active' : 'Ended'}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimeRemaining(poll.endTime)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  {poll.options.map((option, index) => {
                    const optionVotingPower = parseFloat(poll.optionVotes[index] || '0');
                    const percentage = calculatePercentage(poll.optionVotes[index] || '0', poll.totalVotes);
                    const isUserVote = poll.userVote === index;
                    const canVoteForThis = canVote && poll.isActive && poll.userVote === -1;
                    
                    return (
                      <div key={index} className={`relative p-3 rounded-lg border transition-all ${
                        isUserVote 
                          ? 'border-fight-gold bg-fight-gold/10' 
                          : canVoteForThis 
                            ? 'border-gray-600 bg-gray-800 hover:border-fight-gold cursor-pointer'
                            : 'border-gray-600 bg-gray-800'
                      }`}>
                        {/* Vote button overlay */}
                        {canVoteForThis && (
                          <button
                            onClick={() => vote(poll.id, index, poll.question, option)}
                            disabled={isVoting}
                            className="absolute inset-0 w-full h-full bg-transparent hover:bg-fight-gold/5 transition-colors rounded-lg"
                          />
                        )}

                        <div className="flex justify-between items-center mb-2">
                          <span className={`font-medium ${isUserVote ? 'text-fight-gold' : 'text-white'}`}>
                            {option}
                            {isUserVote && <span className="ml-2 text-xs">✓ Your vote</span>}
                          </span>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-white">
                              {percentage.toFixed(1)}%
                            </span>
                            {canVoteForThis && !isVoting && (
                              <div className="text-xs text-fight-gold">Click to vote</div>
                            )}
                            {isVoting && (
                              <div className="text-xs text-gray-400">Voting...</div>
                            )}
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              isUserVote ? 'bg-fight-gold' : 'bg-electric-orange'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>

                        <div className="text-xs text-gray-400 mt-1">
                          {optionVotingPower.toLocaleString()} voting power
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>Total voting power: {totalVotingPower.toLocaleString()}</span>
                  <span>Created: {new Date(poll.createdAt * 1000).toLocaleDateString()}</span>
                </div>

                {poll.userVote !== -1 && (
                  <div className="mt-3 text-sm text-fight-gold">
                    ✓ You voted for: {poll.options[poll.userVote]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}