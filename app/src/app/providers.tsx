'use client';

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { useMemo } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const RPC_HTTP = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const RPC_WS   = RPC_HTTP.replace(/^https/, "wss").replace(/^http:/, "ws:");

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
        solana: {
          rpcs: {
            "solana:devnet": {
              rpc: createSolanaRpc(RPC_HTTP),
              rpcSubscriptions: createSolanaRpcSubscriptions(RPC_WS),
            },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
