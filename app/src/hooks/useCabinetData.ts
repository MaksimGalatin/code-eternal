'use client';
import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import type { User } from "@privy-io/react-auth";
import type { WalletWithMetadata } from "@privy-io/react-auth";

type ConnectedWallet = WalletWithMetadata;
import type { SiteStatus } from "@/types/cabinet";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const USDC_MINT_STR = process.env.NEXT_PUBLIC_USDC_MINT;
const PROGRAM_ID_STR = process.env.NEXT_PUBLIC_PROGRAM_ID!;

export type IncomePayment = { level: number; amount_usdc: number; created_at: string; payer_wallet: string };
export type Income       = { l1: number; l2: number; l3: number; total: number; locked: number; recent: IncomePayment[] };
export type Overview     = { burnedUsdc: number; burnTxs: number; activeMembers: number; sitesCreated: number };
export type Contributor  = { rank: number; wallet: string; displayName: string | null; tier: number; tierName: string; amountUsdc: number };
export type RecentTxn    = { wallet: string; tier: number; tierName: string; amount: number; txSig: string; status: string; createdAt: string };

export interface CabinetData {
  myRefCode: string;
  siteStatus: SiteStatus | null;
  setSiteStatus: (s: SiteStatus | null) => void;
  overview: Overview | null;
  income: Income | null;
  contributors: Contributor[];
  usdcBalance: number | null;
  tierExpires: number;
  recentTxns: RecentTxn[];
}

export function useCabinetData(
  wallet: ConnectedWallet | undefined,
  user: User | null,
): CabinetData {
  const [myRefCode,    setMyRefCode]    = useState("");
  const [siteStatus,   setSiteStatus]   = useState<SiteStatus | null>(null);
  const [overview,     setOverview]     = useState<Overview | null>(null);
  const [income,       setIncome]       = useState<Income | null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [usdcBalance,  setUsdcBalance]  = useState<number | null>(null);
  const [tierExpires,  setTierExpires]  = useState<number>(0);
  const [recentTxns,   setRecentTxns]   = useState<RecentTxn[]>([]);

  // Register user + initial site-status fetch
  useEffect(() => {
    if (!wallet || !user) return;
    const refCode =
      new URLSearchParams(window.location.search).get("ref") ||
      localStorage.getItem("ref_code") || undefined;

    fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: wallet.address,
        email: user.email?.address ?? user.google?.email ?? null,
        refCode,
      }),
    })
      .then(r => r.json())
      .then(({ refCode: c }) => {
        if (c) setMyRefCode(c);
        localStorage.removeItem("ref_code");
      })
      .catch((e) => console.error("register failed:", e));

    fetch(`/api/users/site-status?wallet=${wallet.address}`)
      .then(r => r.json())
      .then(setSiteStatus)
      .catch((e) => console.error("site-status failed:", e));
  }, [wallet, user]);

  // Poll site status while pending — max 36 attempts (3 min), then stop
  useEffect(() => {
    if (!wallet || siteStatus?.status !== "pending") return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      fetch(`/api/users/site-status?wallet=${wallet.address}`)
        .then(r => r.json())
        .then(data => {
          setSiteStatus(data);
          if (data.status !== "pending" || attempts >= 36) clearInterval(id);
        })
        .catch(() => { if (attempts >= 36) clearInterval(id); });
    }, 5000);
    return () => clearInterval(id);
  }, [wallet, siteStatus?.status]);

  // USDC balance + tier_expires + income
  useEffect(() => {
    if (!wallet) return;
    (async () => {
      const connection = new Connection(RPC_URL, "confirmed");
      const payer = new PublicKey(wallet.address);

      if (USDC_MINT_STR) {
        try {
          const mint = new PublicKey(USDC_MINT_STR);
          const ata = await getAssociatedTokenAddress(mint, payer);
          const info = await connection.getTokenAccountBalance(ata);
          setUsdcBalance(info.value.uiAmount ?? 0);
        } catch { setUsdcBalance(0); }
      }

      let expires = 0;
      try {
        const [userStatePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), payer.toBuffer()],
          new PublicKey(PROGRAM_ID_STR)
        );
        const userStateInfo = await connection.getAccountInfo(userStatePda);
        if (userStateInfo) {
          const d = userStateInfo.data;
          const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
          const hasRef = d[40] === 1;
          const base = hasRef ? 73 : 41;
          expires = Number(view.getBigInt64(base + 9, true));
          setTierExpires(expires);
        }
      } catch (e) { console.error("tier_expires decode failed:", e); }

      const expiresParam = expires > 0 ? `&expires=${expires}` : "";
      fetch(`/api/referrals/income?wallet=${wallet.address}${expiresParam}`)
        .then(r => r.json())
        .then(setIncome)
        .catch(() => {});
    })();
  }, [wallet?.address]);

  // Global stats (no wallet dependency)
  useEffect(() => {
    fetch("/api/stats/overview").then(r => r.json()).then(setOverview).catch(() => {});
    fetch("/api/stats/top-contributors").then(r => r.json())
      .then(({ contributors: c }) => { if (c) setContributors(c); }).catch(() => {});
    fetch("/api/stats/recent-txns").then(r => r.json())
      .then(({ txns }) => { if (txns) setRecentTxns(txns); }).catch(() => {});
  }, []);

  return {
    myRefCode,
    siteStatus,
    setSiteStatus,
    overview,
    income,
    contributors,
    usdcBalance,
    tierExpires,
    recentTxns,
  };
}
