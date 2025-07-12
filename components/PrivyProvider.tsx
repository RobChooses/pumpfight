'use client';

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import { chiliz, spicy } from 'viem/chains';

export default function PrivyProvider({ children }: { children: React.ReactNode }) {
    return(
      <BasePrivyProvider
        appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
        config={{
          defaultChain: chiliz,
          supportedChains: [chiliz, spicy],
          embeddedWallets: {
            createOnLogin: "all-users",
          }
        }}
      >
        {children}
      </BasePrivyProvider>
    )
}