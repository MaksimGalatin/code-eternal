import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { PublicKey } from "@solana/web3.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { wallet } = req.query as { wallet?: string };
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  try { new PublicKey(wallet); } catch { return res.status(400).json({ error: "invalid wallet" }); }

  const result = await db.query(
    `SELECT j.status, j.tx_signature, j.arweave_url, u.tier, u.display_name
     FROM site_generation_jobs j
     JOIN users u ON u.wallet = j.wallet
     WHERE j.wallet = $1
     ORDER BY j.created_at DESC
     LIMIT 1`,
    [wallet]
  );

  if (result.rows.length === 0) {
    return res.json({ status: "none", tier: 0 });
  }

  const { status, tx_signature, arweave_url, tier, display_name } = result.rows[0];
  res.json({
    status,
    txSignature: tx_signature,
    arweaveUrl: arweave_url ?? null,
    tier,
    displayName: display_name,
  });
}
