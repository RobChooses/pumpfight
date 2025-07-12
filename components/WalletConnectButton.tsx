'use client';

import { usePrivy } from "@privy-io/react-auth";

export default function WalletConnectButton() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <div className="px-6 py-2 bg-gray-600 text-white font-bold rounded-lg animate-pulse">
        Loading...
      </div>
    );
  }

  return (
    <button
      className="px-6 py-2 bg-gradient-to-r from-ufc-red to-electric-orange text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
      onClick={() => {
        if (authenticated) {
          logout();
        } else {
          login();
        }
      }}
    >
      {authenticated ? "Disconnect" : "Connect Wallet"}
    </button>
  );
}