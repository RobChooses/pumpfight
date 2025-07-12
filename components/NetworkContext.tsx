'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { chiliz, spicy } from 'viem/chains';
import { Chain } from 'viem';

interface NetworkContextType {
  currentChain: Chain;
  isTestnet: boolean;
  switchNetwork: () => Promise<void>;
  switching: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: ReactNode }) {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [isTestnet, setIsTestnet] = useState(false);
  const [switching, setSwitching] = useState(false);

  const currentChain = isTestnet ? spicy : chiliz;

  const switchNetwork = async () => {
    console.log('🔄 Switch network requested. Current isTestnet:', isTestnet);
    
    if (!authenticated || switching || wallets.length === 0) {
      console.log('❌ Cannot switch: authenticated =', authenticated, 'switching =', switching, 'wallets =', wallets.length);
      return;
    }

    setSwitching(true);
    try {
      const targetChain = isTestnet ? chiliz : spicy;
      const wallet = wallets[0];
      
      console.log('🎯 Switching to:', targetChain.name, 'ID:', targetChain.id);
      
      if (wallet.switchChain) {
        await wallet.switchChain(targetChain.id);
        setIsTestnet(!isTestnet);
        console.log('✅ Network switch successful');
      } else {
        console.error('❌ Wallet does not support chain switching');
      }
    } catch (error) {
      console.error('❌ Failed to switch network:', error);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <NetworkContext.Provider value={{
      currentChain,
      isTestnet,
      switchNetwork,
      switching
    }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}