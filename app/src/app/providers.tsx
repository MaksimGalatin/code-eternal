'use client';

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { useMemo } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

export default function Providers({ children }: { children: React.ReactNode }) {
  const solanaConnectors = useMemo(() => toSolanaWalletConnectors(), []);

  if (!PRIVY_APP_ID) return <>{children}</>;

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#7C3AED",
          logo: "https://app.codeofdigitaleternity.com/logo.png",
          walletChainType: "solana-only",
        },
        loginMethods: ["google"],
        embeddedWallets: {
          solana: {
            createOnLogin: "off",
          },
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
