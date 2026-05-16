import { useEffect, useState, useCallback } from "react";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { Program, AnchorProvider, web3 } from "@coral-xyz/anchor";
import type { Idl } from "@coral-xyz/anchor";
import { IDL, fetchUserStateAccount, type UserState } from "@/idl/code_eternal_router";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep"
);

export const DEVNET_USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ?? "5f76mcT9Cgo8oRfWDnsHnZjj9ZqvjcqaXPcrEMEbQsy5"
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
          {
            publicKey: pubkey,
            signTransaction: async (tx) => tx,
            signAllTransactions: async (txs) => txs,
          },
          { commitment: "confirmed" }
        );
        const program = new Program({ ...IDL, address: PROGRAM_ID.toBase58() } as Idl, provider);
        const raw = await fetchUserStateAccount(program, userStatePda);
        userState = {
          owner: raw.owner.toBase58(),
          referrer: raw.referrer ? raw.referrer.toBase58() : null,
          tier: raw.tier,
          registered_at: raw.registered_at.toNumber(),
          tier_expires: raw.tier_expires.toNumber(),
          memory_score: raw.memory_score.toNumber(),
          arweave_url: raw.arweave_url,
          site_status: raw.site_status,
          bump: raw.bump,
        };
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
