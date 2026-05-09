'use client';

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { useMemo } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const SOLANA_RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

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
        },
        loginMethods: ["google"],
        embeddedWallets: {
          createOnLogin: "off",
        },
        solanaClusters: [{ name: "devnet", rpcUrl: SOLANA_RPC }],
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
