import { useEffect, useState, useCallback } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { IDL, type UserState } from "@/idl/code_eternal_router";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep"
);

// Devnet USDC mint (mock — same one used in contract tests)
export const DEVNET_USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export type WalletInfo = {
  solBalance: number;
  usdcBalance: number;
  userState: UserState | null;
  isRegistered: boolean;
};

export function useUserState(walletAddress: string | null) {
  const [info, setInfo] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    setError(null);

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const pubkey = new PublicKey(walletAddress);

      const [solLamports, usdcAta] = await Promise.all([
        connection.getBalance(pubkey),
        getAssociatedTokenAddress(DEVNET_USDC_MINT, pubkey).catch(() => null),
      ]);

      let usdcBalance = 0;
      if (usdcAta) {
        try {
          const tokenAcc = await connection.getTokenAccountBalance(usdcAta);
          usdcBalance = tokenAcc.value.uiAmount ?? 0;
        } catch {
          // no token account yet
        }
      }

      // Read UserState PDA
      const [userStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), pubkey.toBytes()],
        PROGRAM_ID
      );

      let userState: UserState | null = null;
      try {
        const provider = new AnchorProvider(
          connection,
          // read-only dummy wallet — we only need to fetch accounts
          {
            publicKey: pubkey,
            signTransaction: async (tx) => tx,
            signAllTransactions: async (txs) => txs,
          },
          { commitment: "confirmed" }
        );
        const program = new Program(IDL as Idl, provider);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userState = (await (program.account as any).userState.fetch(
          userStatePda
        )) as UserState;
      } catch {
        // account doesn't exist yet — user not registered
      }

      setInfo({
        solBalance: solLamports / LAMPORTS_PER_SOL,
        usdcBalance,
        userState,
        isRegistered: userState !== null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch on-chain data");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { info, loading, error, refetch: fetch };
}
