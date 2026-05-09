import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet || typeof wallet !== "string") return NextResponse.json({ error: "wallet required" }, { status: 400 });

  // tier_expires unix timestamp from on-chain (optional) — used to split earned vs locked
  const expiresParam = searchParams.get("expires");
  const expiresAt = expiresParam && parseInt(expiresParam) > 0
    ? new Date(parseInt(expiresParam) * 1000)
    : null;

  try {
    // Earned income: paid while subscription was active
    const earnedRows = expiresAt
      ? (await db.query(
          `SELECT level, COALESCE(SUM(amount_usdc), 0) AS total
           FROM referral_payments
           WHERE referrer_wallet = $1 AND created_at <= $2
           GROUP BY level`,
          [wallet, expiresAt]
        )).rows
      : (await db.query(
          `SELECT level, COALESCE(SUM(amount_usdc), 0) AS total
           FROM referral_payments
           WHERE referrer_wallet = $1
           GROUP BY level`,
          [wallet]
        )).rows;

    const byLevel: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const r of earnedRows) byLevel[r.level] = Number(r.total);

    // Locked income: would have earned while subscription was expired
    let locked = 0;
    if (expiresAt) {
      const lockedRes = await db.query(
        `SELECT COALESCE(SUM(amount_usdc), 0) AS total
         FROM referral_payments
         WHERE referrer_wallet = $1 AND created_at > $2`,
        [wallet, expiresAt]
      );
      locked = Number(lockedRes.rows[0]?.total ?? 0);
    }

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
      locked,
      recent: recentRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
