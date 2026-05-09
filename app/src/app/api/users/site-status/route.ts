import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PublicKey } from "@solana/web3.js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  try { new PublicKey(wallet); } catch { return NextResponse.json({ error: "invalid wallet" }, { status: 400 }); }

  const userRes = await db.query(
    "SELECT tier, display_name FROM users WHERE wallet = $1",
    [wallet]
  );
  const userTier: number = userRes.rows[0]?.tier ?? 0;
  const displayName: string | null = userRes.rows[0]?.display_name ?? null;

  const jobRes = await db.query(
    `SELECT status, tx_signature, arweave_url
     FROM site_generation_jobs
     WHERE wallet = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [wallet]
  );

  if (jobRes.rows.length === 0) {
    return NextResponse.json({ status: "none", tier: userTier, displayName });
  }

  const { status, tx_signature, arweave_url } = jobRes.rows[0];
  return NextResponse.json({
    status,
    txSignature: tx_signature,
    arweaveUrl: arweave_url ?? null,
    tier: userTier,
    displayName,
  });
}
