import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PublicKey } from "@solana/web3.js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  try { new PublicKey(wallet); } catch { return NextResponse.json({ error: "invalid wallet" }, { status: 400 }); }

  try {
    const result = await db.query(
      `SELECT
         u1.wallet                          AS ref1,
         u2.wallet                          AS ref2,
         u3.wallet                          AS ref3
       FROM users u0
       LEFT JOIN users u1 ON u1.id = u0.referrer_id
       LEFT JOIN users u2 ON u2.id = u1.referrer_id
       LEFT JOIN users u3 ON u3.id = u2.referrer_id
       WHERE u0.wallet = $1`,
      [wallet]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ ref1: null, ref2: null, ref3: null });
    }

    const { ref1, ref2, ref3 } = result.rows[0];
    return NextResponse.json({ ref1: ref1 ?? null, ref2: ref2 ?? null, ref3: ref3 ?? null });
  } catch (err) {
    console.error("referrals/chain error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
