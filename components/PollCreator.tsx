'use client';

import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, http, custom } from 'viem';
import FighterVaultABI from '@/lib/abis/FighterVault.json';
import { useNetwork } from './NetworkContext';

interface Poll {
  id: string;
  question: string;
  options: string[];
  creator: string;
  endTime: number;
  isActive: boolean;
  totalVotes: string;
  createdAt: number;
}

interface PollCreatorProps {
  tokenAddress: string;
  vaultAddress: string;
  tokenName: string;
  tokenSymbol: string;
  isCreator: boolean;
}

export default function PollCreator({ tokenAddress, vaultAddress, tokenName, tokenSymbol, isCreator }: PollCreatorProps) {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { currentChain } = useNetwork();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form states
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDuration, setPollDuration] = useState('7'); // days

  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(),
  });

  // Add new poll option
  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  // Remove poll option
  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  // Update poll option
  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  // Create new poll
  const createPoll = async () => {
    if (!authenticated || !user?.wallet?.address || !isCreator) {
      alert('Only token creators can create polls');
      return;
    }

    if (!pollQuestion.trim()) {
      alert('Please enter a poll question');
      return;
    }

    const validOptions = pollOptions.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert('Please provide at least 2 poll options');
      return;
    }

    if (!pollDuration || parseFloat(pollDuration) <= 0) {
      alert('Please enter a valid poll duration');
      return;
    }

    setCreating(true);
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

      const durationInSeconds = Math.floor(parseFloat(pollDuration) * 24 * 60 * 60);

      const hash = await walletClient.writeContract({
        address: vaultAddress as `0x${string}`,
        abi: FighterVaultABI as any,
        functionName: 'createVote',
        args: [pollQuestion.trim(), validOptions, durationInSeconds, 0], // minStakeRequired = 0
        account: user.wallet.address as `0x${string}`,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      alert('Poll created successfully!');
      
      // Reset form
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollDuration('7');
      setShowCreateForm(false);
      
      // Refresh polls
      await fetchPolls();
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll. Check console for details.');
    } finally {
      setCreating(false);
    }
  };

  // Fetch polls for this token
  const fetchPolls = async () => {
    setLoading(true);
    try {
      // Get vote count
      const voteCount = await publicClient.readContract({
        address: vaultAddress as `0x${string}`,
        abi: FighterVaultABI as any,
        functionName: 'voteCounter',
        args: [],
      }) as bigint;

      const fetchedPolls: Poll[] = [];
      const count = Number(voteCount);

      // Fetch each vote
      for (let i = 0; i < count; i++) {
        try {
          const voteData = await publicClient.readContract({
            address: vaultAddress as `0x${string}`,
            abi: FighterVaultABI as any,
            functionName: 'getVote',
            args: [i],
          }) as any[];

          const [topic, deadline, minStakeRequired, active] = voteData;

          // Get options for this vote
          const options: string[] = [];
          let optionIndex = 0;
          try {
            while (true) {
              const optionData = await publicClient.readContract({
                address: vaultAddress as `0x${string}`,
                abi: FighterVaultABI as any,
                functionName: 'getVoteOption',
                args: [i, optionIndex],
              }) as [string, bigint];
              
              options.push(optionData[0]);
              optionIndex++;
            }
          } catch {
            // No more options
          }

          // Calculate total votes
          let totalVotes = 0;
          for (let j = 0; j < options.length; j++) {
            try {
              const optionData = await publicClient.readContract({
                address: vaultAddress as `0x${string}`,
                abi: FighterVaultABI as any,
                functionName: 'getVoteOption',
                args: [i, j],
              }) as [string, bigint];
              totalVotes += Number(optionData[1]);
            } catch {
              break;
            }
          }

          fetchedPolls.push({
            id: i.toString(),
            question: topic,
            options,
            creator: 'Token Creator', // FighterVault doesn't store creator in vote struct
            endTime: Number(deadline),
            isActive: active,
            totalVotes: totalVotes.toString(),
            createdAt: 0, // Not available in FighterVault
          });
        } catch (error) {
          console.error(`Error fetching vote ${i}:`, error);
        }
      }

      setPolls(fetchedPolls.reverse()); // Show newest first
      console.log(`📊 Fetched ${fetchedPolls.length} polls for ${tokenName}`);
    } catch (error) {
      console.error('Error fetching polls:', error);
      setPolls([]);
    } finally {
      setLoading(false);
    }
  };

  // Load polls on component mount
  useEffect(() => {
    if (ready && authenticated) {
      fetchPolls();
    }
  }, [ready, authenticated, vaultAddress]);

  if (!ready || !authenticated) {
    return (
      <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-bold text-white mb-3">🗳️ Community Polls</h3>
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

  return (
    <div className="bg-card-dark border border-gray-700 rounded-xl p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">🗳️ Community Polls</h3>
        {isCreator && (
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-gradient-to-r from-fight-gold to-energy-green text-black font-bold rounded-lg hover:opacity-90 transition-opacity text-sm"
          >
            {showCreateForm ? 'Cancel' : '+ Create Poll'}
          </button>
        )}
      </div>

      {/* Create Poll Form */}
      {showCreateForm && isCreator && (
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4 border border-gray-600">
          <h4 className="text-lg font-semibold text-white mb-4">Create New Poll</h4>
          
          <div className="space-y-4">
            {/* Poll Question */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Poll Question *
              </label>
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="What should the team focus on next?"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-fight-gold focus:border-transparent"
              />
            </div>

            {/* Poll Options */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Poll Options * (2-6 options)
              </label>
              <div className="space-y-2">
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-fight-gold focus:border-transparent"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => removePollOption(index)}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <button
                    onClick={addPollOption}
                    className="text-sm text-fight-gold hover:text-white transition-colors"
                  >
                    + Add option
                  </button>
                )}
              </div>
            </div>

            {/* Poll Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Poll Duration (days) *
              </label>
              <input
                type="number"
                value={pollDuration}
                onChange={(e) => setPollDuration(e.target.value)}
                min="1"
                max="30"
                step="0.5"
                className="w-32 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-fight-gold focus:border-transparent"
              />
            </div>

            {/* Create Button */}
            <div className="flex space-x-3 pt-2">
              <button
                onClick={createPoll}
                disabled={creating}
                className="px-6 py-3 bg-gradient-to-r from-fight-gold to-energy-green text-black font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Poll'
                )}
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Polls List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-fight-gold mx-auto"></div>
          <p className="text-gray-400 mt-2">Loading polls...</p>
        </div>
      ) : polls.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">No polls created yet.</p>
          {isCreator && (
            <p className="text-sm text-gray-500 mt-2">
              Create the first poll to engage with your community!
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <div key={poll.id} className="bg-gray-800/30 border border-gray-600 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-white font-semibold text-lg">{poll.question}</h4>
                <div className="text-right">
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

              <div className="space-y-2 mb-3">
                {poll.options.map((option, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                    <span className="text-gray-300">{option}</span>
                    {/* Vote percentages would go here */}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-400">
                <span>Total votes: {poll.totalVotes}</span>
                <span>Created: {new Date(poll.createdAt * 1000).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}