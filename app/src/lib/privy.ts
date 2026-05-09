import { PrivyClient } from "@privy-io/server-auth";

// Requires PRIVY_APP_SECRET env var — set it in Vercel dashboard under Settings → Environment Variables.
// Find the secret at https://dashboard.privy.io → your app → Settings → API Keys.
export const privyServer = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!,
);
