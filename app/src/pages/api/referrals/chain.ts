import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { PublicKey } from "@solana/web3.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  const { wallet } = req.query as { wallet?: string };
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  try { new PublicKey(wallet); } catch { return res.status(400).json({ error: "invalid wallet" }); }

  // Walk up referrer chain up to 3 levels
  const result = await db.query(
    `SELECT
       u1.wallet                          AS ref1,
       u2.wallet                          AS ref2,
       u3.wallet                          AS ref3
     FROM users u0
     LEFT JOIN users u1 ON u1.id = u0.referrer_id
     LEFT JOIN users u2 ON u2.id = u1.referrer_id
     LEFT JOIN users u3 ON u3.id = u2.referrer_id
     WHERE u0.wallet = $1`,
    [wallet]
  );

  if (result.rows.length === 0) {
    return res.json({ ref1: null, ref2: null, ref3: null });
  }

  const { ref1, ref2, ref3 } = result.rows[0];
  res.json({ ref1: ref1 ?? null, ref2: ref2 ?? null, ref3: ref3 ?? null });
}
