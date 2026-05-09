import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [burnRes, usersRes, sitesRes] = await Promise.all([
      db.query("SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS txs FROM burn_events"),
      db.query("SELECT COUNT(*) AS cnt FROM users WHERE tier > 0"),
      db.query("SELECT COUNT(*) AS cnt FROM site_generation_jobs WHERE status = 'done'"),
    ]);
    return NextResponse.json({
      burnedUsdc: Number(burnRes.rows[0].total),
      burnTxs: Number(burnRes.rows[0].txs),
      activeMembers: Number(usersRes.rows[0].cnt),
      sitesCreated: Number(sitesRes.rows[0].cnt),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
