import type { AppProps } from "next/app";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { useMemo } from "react";
import "@/styles/globals.css";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const SOLANA_RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

export default function App({ Component, pageProps }: AppProps) {
  const solanaConnectors = useMemo(() => toSolanaWalletConnectors(), []);

  if (!PRIVY_APP_ID) {
    return <Component {...pageProps} />;
  }

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#7C3AED",
          logo: "https://codeofdigitaleternity.com/logo.png",
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
      <Component {...pageProps} />
    </PrivyProvider>
  );
}
