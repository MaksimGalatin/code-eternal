import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

const TIER_PRICE: Record<number, number> = { 1: 15, 2: 100, 3: 1000 };
const TIER_NAME: Record<number, string> = { 1: "Spark", 2: "Family Archives", 3: "Digital DNA" };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const { rows } = await db.query(`
      SELECT wallet, display_name, tier
      FROM users
      WHERE tier > 0
      ORDER BY tier DESC, created_at ASC
      LIMIT 10
    `);
    const contributors = rows.map((r, i) => ({
      rank: i + 1,
      wallet: r.wallet,
      displayName: r.display_name ?? null,
      tier: r.tier,
      tierName: TIER_NAME[r.tier] ?? "Unknown",
      amountUsdc: TIER_PRICE[r.tier] ?? 0,
    }));
    res.json({ contributors });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
