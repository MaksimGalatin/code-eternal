import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet || typeof wallet !== "string") return NextResponse.json({ error: "wallet required" }, { status: 400 });

  const expiresParam = searchParams.get("expires");
  const expiresTs = expiresParam && parseInt(expiresParam) > 0 ? parseInt(expiresParam) : null;

  try {
    // Single query: aggregate earned/locked by level + fetch recent rows
    const [aggRes, recentRes] = await Promise.all([
      db.query(
        `SELECT
           level,
           COALESCE(SUM(CASE WHEN ($2::bigint IS NULL OR EXTRACT(EPOCH FROM created_at) <= $2::bigint) THEN amount_usdc ELSE 0 END), 0) AS earned,
           COALESCE(SUM(CASE WHEN $2::bigint IS NOT NULL AND EXTRACT(EPOCH FROM created_at) > $2::bigint  THEN amount_usdc ELSE 0 END), 0) AS locked
         FROM referral_payments
         WHERE referrer_wallet = $1
         GROUP BY level`,
        [wallet, expiresTs]
      ),
      db.query(
        `SELECT payer_wallet, level, amount_usdc, tier, tx_hash, created_at
         FROM referral_payments
         WHERE referrer_wallet = $1
         ORDER BY created_at DESC LIMIT 10`,
        [wallet]
      ),
    ]);

    const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    let locked = 0;
    for (const r of aggRes.rows) {
      byLevel[r.level] = Number(r.earned);
      locked += Number(r.locked);
    }

    return NextResponse.json({
      l1: byLevel[1],
      l2: byLevel[2],
      l3: byLevel[3],
      total: byLevel[1] + byLevel[2] + byLevel[3],
      locked,
      recent: recentRes.rows,
    });
  } catch (err) {
    console.error("referrals/income error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
