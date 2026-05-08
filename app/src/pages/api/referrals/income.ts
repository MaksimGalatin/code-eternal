import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const { wallet } = req.query;
  if (!wallet || typeof wallet !== "string") return res.status(400).json({ error: "wallet required" });

  try {
    const { rows } = await db.query(
      `SELECT level, COALESCE(SUM(amount_usdc), 0) AS total
       FROM referral_payments
       WHERE referrer_wallet = $1
       GROUP BY level`,
      [wallet]
    );

    const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const r of rows) byLevel[r.level] = Number(r.total);

    const recentRes = await db.query(
      `SELECT payer_wallet, level, amount_usdc, tier, tx_hash, created_at
       FROM referral_payments
       WHERE referrer_wallet = $1
       ORDER BY created_at DESC LIMIT 10`,
      [wallet]
    );

    res.json({
      l1: byLevel[1],
      l2: byLevel[2],
      l3: byLevel[3],
      total: byLevel[1] + byLevel[2] + byLevel[3],
      recent: recentRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
