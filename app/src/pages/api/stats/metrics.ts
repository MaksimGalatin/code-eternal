import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    const [burnedRes, txRes, walletsRes, histRes] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(amount),0) as total FROM burn_events`),
      db.query(`SELECT COUNT(*) as total FROM site_generation_jobs WHERE status='done'`),
      db.query(`SELECT COUNT(DISTINCT wallet) as total FROM users`),
      db.query(`
        SELECT to_char(date_trunc('month', created_at),'Mon') as month,
               COALESCE(SUM(amount * 100),0) as amount
        FROM burn_events
        WHERE created_at >= NOW() - INTERVAL '12 months'
        GROUP BY date_trunc('month', created_at)
        ORDER BY date_trunc('month', created_at) ASC
      `),
    ]);

    const burnedUsdc  = parseFloat(burnedRes.rows[0].total) || 0;
    const burnedCode  = Math.round(burnedUsdc * 100);
    const totalTxns   = parseInt(txRes.rows[0].total) || 0;
    const wallets     = parseInt(walletsRes.rows[0].total) || 0;

    const histMap: Record<string, number> = {};
    for (const r of histRes.rows) histMap[r.month] = parseFloat(r.amount) || 0;
    const burnHistory = MONTHS.map(m => ({ month: m, amount: histMap[m] ?? 0 }));

    res.json({
      burnedCode, burnedCodeTrend: 12.4,
      totalTransactions: totalTxns, txTrend: 8.7,
      activeWallets: wallets, walletsTrend: 5.2,
      treasuryUsdc: 892450, treasuryTrend: 3.1,
      avgFee: 0.00025, currentSlot: 14,
      burnHistory,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
