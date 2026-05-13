import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { rows } = await db.query(
      "SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS txs FROM burn_events"
    );
    const totalRaw = Number(rows[0].total);
    const txs = Number(rows[0].txs);
    return NextResponse.json({ totalUsdc: totalRaw / 1_000_000, txs }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } });
  } catch (err) {
    console.error("burned error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
