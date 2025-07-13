'use client';

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';

interface Token {
  name: string;
  symbol: string;
  address: string;
  balance: string;
}

export default function TokenList() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const { authenticated, user } = usePrivy();

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      // Fetch tokens from tatum.io
      async function fetchTokens() {
        try {
          const address = user.wallet.address;
          const apiKey = process.env.NEXT_PUBLIC_TATUM_API_KEY;

          if (!apiKey) {
            console.error('Tatum API key is not set');
            return;
          }

          const response = await fetch(`https://api.tatum.io/v3/blockchain/ethereum/address/${address}/tokens`, {
            headers: {
              'x-api-key': apiKey,
            },
          });

          if (!response.ok) {
            throw new Error('Failed to fetch tokens');
          }

          const data = await response.json();
          const tokens: Token[] = data.map((token: any) => ({
            name: token.name,
            symbol: token.symbol,
            address: token.contractAddress,
            balance: token.balance,
          }));

          setTokens(tokens);
        } catch (error) {
          console.error('Error fetching tokens:', error);
        }
      }

      fetchTokens();
    }
  }, [authenticated, user]);

  if (!authenticated) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold text-white mb-4">Browse Tokens</h2>
        <p className="text-gray-300">Please connect your wallet to view tokens.</p>
      </div>
    );
  }

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Browse Tokens</h1>
      {tokens.length === 0 ? (
        <p className="text-gray-300">No tokens found in your wallet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-card-dark border border-gray-700">
            <thead>
              <tr>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-300">Name</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-300">Symbol</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-300">Address</th>
                <th className="py-2 px-4 text-left text-sm font-medium text-gray-300">Balance</th>
              </tr>
            </thead>
            <tbody>
              {tokens.map((token, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-2 px-4 text-sm text-gray-300">{token.name}</td>
                  <td className="py-2 px-4 text-sm text-gray-300">{token.symbol}</td>
                  <td className="py-2 px-4 text-sm text-gray-300">{token.address}</td>
                  <td className="py-2 px-4 text-sm text-gray-300">{token.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}