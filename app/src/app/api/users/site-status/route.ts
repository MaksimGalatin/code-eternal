import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PublicKey } from "@solana/web3.js";

const REGEN_LIMIT: Record<number, number> = { 1: 1, 2: 5, 3: 10 };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  try { new PublicKey(wallet); } catch { return NextResponse.json({ error: "invalid wallet" }, { status: 400 }); }

  const userRes = await db.query(
    "SELECT tier, display_name, tier_expires FROM users WHERE wallet = $1",
    [wallet]
  );
  const userTier: number = userRes.rows[0]?.tier ?? 0;
  const displayName: string | null = userRes.rows[0]?.display_name ?? null;
  const tierExpires: number = parseInt(userRes.rows[0]?.tier_expires ?? "0", 10);
  // subscription period starts 30 days before expiry
  const periodStart = tierExpires > 0 ? tierExpires - 30 * 86400 : 0;

  const jobRes = await db.query(
    `SELECT status, tx_signature, arweave_url
     FROM site_generation_jobs
     WHERE wallet = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [wallet]
  );

  const regenRes = await db.query(
    `SELECT COUNT(*) FROM site_generation_jobs
     WHERE wallet = $1
       AND tx_signature LIKE 'ui-regen-%'
       AND created_at > to_timestamp($2::bigint)`,
    [wallet, periodStart]
  );
  const regenCount = parseInt(regenRes.rows[0].count, 10);
  const regenLimit = userTier > 0 ? (REGEN_LIMIT[userTier] ?? 1) : 0;

  if (jobRes.rows.length === 0) {
    return NextResponse.json({ status: "none", tier: userTier, displayName, regenCount, regenLimit });
  }

  const { status, tx_signature, arweave_url } = jobRes.rows[0];
  return NextResponse.json({
    status,
    txSignature: tx_signature,
    arweaveUrl: arweave_url ?? null,
    tier: userTier,
    displayName,
    regenCount,
    regenLimit,
  });
}
