import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const { rows } = await db.query(
      "SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS txs FROM burn_events"
    );
    const totalRaw = Number(rows[0].total);
    const txs = Number(rows[0].txs);
    // burn_events.amount stored in USDC base units (6 decimals)
    res.json({ totalUsdc: totalRaw / 1_000_000, txs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
