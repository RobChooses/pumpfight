'use client';

import { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { chiliz, spicy } from 'viem/chains';
import SimpleTokenLaunchpadABI from '@/lib/abis/SimpleTokenLaunchpad.json';
import SimpleCAP20TokenABI from '@/lib/abis/SimpleCAP20Token.json';

// Use the existing ethereum type from window.d.ts

export default function SimpleTokenCreator() {
  const { ready, authenticated, user } = usePrivy();
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [lastCreatedToken, setLastCreatedToken] = useState<string>('');
  const [mintAmount, setMintAmount] = useState('1');
  const [isMinting, setIsMinting] = useState(false);

  const isTestnet = true; // For now, always use testnet
  const currentChain = isTestnet ? spicy : chiliz;
  
  const launchpadAddress = process.env.NEXT_PUBLIC_SIMPLE_LAUNCHPAD_ADDRESS as `0x${string}`;

  const publicClient = createPublicClient({
    chain: currentChain,
    transport: http(),
  });

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
      // Use window.ethereum directly (which should be the connected wallet)
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }

      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom(window.ethereum),
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
            { type: 'uint256', name: 'timestamp' }
          ]
        },
        fromBlock: receipt.blockNumber,
        toBlock: receipt.blockNumber,
      });

      if (logs.length > 0) {
        const tokenAddress = logs[0].args?.token;
        if (tokenAddress) {
          setLastCreatedToken(tokenAddress);
          alert(`Token created successfully!\nToken Address: ${tokenAddress}\nTransaction: ${hash}`);
        } else {
          setLastCreatedToken('created');
          alert(`Token created successfully!\nTransaction: ${hash}\nPlease check the transaction for the token address.`);
        }
      } else {
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
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet found');
      }
      
      const walletClient = createWalletClient({
        chain: currentChain,
        transport: custom(window.ethereum),
      });

      const amount = BigInt(mintAmount);
      const value = amount * BigInt(10**18); // 1 CHZ per token

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
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">Simple Token Creator</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Name
          </label>
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="e.g., My Token"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Token Symbol
          </label>
          <input
            type="text"
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
            placeholder="e.g., MTK"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
          <strong>Price:</strong> 1 CHZ per token<br/>
          <strong>Network:</strong> {currentChain.name}<br/>
          <strong>Chain ID:</strong> {currentChain.id}<br/>
          <strong>Contract:</strong> {launchpadAddress ? `${launchpadAddress.slice(0, 10)}...` : 'Not deployed'}
        </div>

        <button
          onClick={createToken}
          disabled={isCreating || !tokenName.trim() || !tokenSymbol.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isCreating ? 'Creating Token...' : 'Create Token'}
        </button>
      </div>

      {lastCreatedToken && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg">
          <h3 className="font-semibold text-green-800 mb-2">Token Created!</h3>
          <p className="text-sm text-green-700 break-all mb-4">
            Address: {lastCreatedToken}
          </p>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token Address (auto-filled from creation)
              </label>
              <input
                type="text"
                value={lastCreatedToken}
                onChange={(e) => setLastCreatedToken(e.target.value)}
                placeholder="0x... token contract address"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount to Mint (1 CHZ each)
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  min="1"
                  value={mintAmount}
                  onChange={(e) => setMintAmount(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  onClick={mintTokens}
                  disabled={isMinting || !mintAmount || !lastCreatedToken || lastCreatedToken === 'created'}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isMinting ? 'Minting...' : 'Mint'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}