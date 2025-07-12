'use client';

import { usePrivy } from "@privy-io/react-auth";
import { useEffect, useState } from "react";
import { createPublicClient, http, formatEther } from "viem";
import { useNetwork } from "./NetworkContext";

export default function CHZBalance() {
  const { authenticated, user } = usePrivy();
  const { currentChain } = useNetwork();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!authenticated || !user?.wallet?.address) {
        setBalance(null);
        return;
      }

      setLoading(true);
      try {
        console.log('💰 Fetching balance for:', user.wallet.address, 'on', currentChain.name);
        
        const publicClient = createPublicClient({
          chain: currentChain,
          transport: http(),
        });

        const balanceWei = await publicClient.getBalance({
          address: user.wallet.address as `0x${string}`,
        });
        const balanceEther = formatEther(balanceWei);
        const formattedBalance = parseFloat(balanceEther).toFixed(4);
        
        console.log('💰 Balance updated:', formattedBalance, 'CHZ');
        setBalance(formattedBalance);
      } catch (error) {
        console.error("❌ Error fetching CHZ balance:", error);
        setBalance("Error");
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [authenticated, user?.wallet?.address, currentChain]);

  if (!authenticated || !user?.wallet?.address) {
    return null;
  }

  const refreshBalance = () => {
    if (authenticated && user?.wallet?.address) {
      setBalance(null);
      setLoading(true);
      // Trigger re-fetch by changing a dependency
      setTimeout(() => {
        const event = new CustomEvent('refreshBalance');
        window.dispatchEvent(event);
      }, 100);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="text-sm text-white font-medium">
        {loading ? (
          <span className="text-gray-400">Loading...</span>
        ) : (
          <span className="text-white">
            {balance} CHZ
          </span>
        )}
      </div>
      <button
        onClick={refreshBalance}
        className="text-gray-400 hover:text-white transition-colors"
        title="Refresh balance"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}