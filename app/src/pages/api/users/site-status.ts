import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { PublicKey } from "@solana/web3.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { wallet } = req.query as { wallet?: string };
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  try { new PublicKey(wallet); } catch { return res.status(400).json({ error: "invalid wallet" }); }

  // Always fetch user tier from users table (even if no job exists yet)
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
    return res.json({ status: "none", tier: userTier, displayName });
  }

  const { status, tx_signature, arweave_url } = jobRes.rows[0];
  res.json({
    status,
    txSignature: tx_signature,
    arweaveUrl: arweave_url ?? null,
    tier: userTier,
    displayName,
  });
}
