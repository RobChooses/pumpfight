'use client';

import { usePrivy } from "@privy-io/react-auth";

export default function WalletConnectButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  const handleConnect = () => {
    console.log('🔗 Wallet connect button clicked');
    console.log('🔍 Ready:', ready, 'Authenticated:', authenticated);

    if (authenticated) {
      console.log('👋 Logging out...');
      logout();
    } else {
      console.log('🚀 Logging in...');
      login();
    }
  };

  if (!ready) {
    return (
      <div className="px-6 py-2 bg-gray-600 text-white font-bold rounded-lg animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <button
      className="px-8 py-3 bg-gradient-to-r from-ufc-red to-electric-orange text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
      onClick={handleConnect}
    >
      {authenticated ? "Disconnect" : "Connect Wallet"}
    </button>
  );
}