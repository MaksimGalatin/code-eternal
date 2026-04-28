import type { AppProps } from "next/app";
import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import "@/styles/globals.css";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const SOLANA_RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

const solanaConnectors = toSolanaWalletConnectors();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#7C3AED",
          logo: "https://codeofdigitaleternity.com/logo.png",
        },
        loginMethods: ["google", "email", "wallet"],
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
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
