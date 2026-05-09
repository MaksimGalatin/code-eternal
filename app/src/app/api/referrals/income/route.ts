import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet || typeof wallet !== "string") return NextResponse.json({ error: "wallet required" }, { status: 400 });

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

    return NextResponse.json({
      l1: byLevel[1],
      l2: byLevel[2],
      l3: byLevel[3],
      total: byLevel[1] + byLevel[2] + byLevel[3],
      recent: recentRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
