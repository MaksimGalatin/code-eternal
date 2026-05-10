import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const TIER_AMOUNT: Record<number, number> = { 1: 15, 2: 100, 3: 1000 };
const TIER_NAME: Record<number, string>   = { 1: "Spark", 2: "Family Archives", 3: "Digital DNA" };

export async function GET() {
  try {
    const { rows } = await db.query(
      `SELECT wallet, tier, tx_signature, status, created_at
       FROM site_generation_jobs
       WHERE tx_signature NOT LIKE 'ui-regen-%'
       ORDER BY created_at DESC
       LIMIT 10`
    );
    const txns = rows.map(r => ({
      wallet:    r.wallet as string,
      tier:      r.tier as number,
      tierName:  TIER_NAME[r.tier as number] ?? "Unknown",
      amount:    TIER_AMOUNT[r.tier as number] ?? 0,
      txSig:     r.tx_signature as string,
      status:    r.status as string,
      createdAt: r.created_at as string,
    }));
    return NextResponse.json({ txns }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
