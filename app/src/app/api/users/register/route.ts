import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { PublicKey } from "@solana/web3.js";

function isValidEmail(email: string): boolean {
  const at = email.indexOf("@");
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1 && !/\s/.test(email);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { wallet, email, refCode } = body as {
    wallet?: string;
    email?: string;
    refCode?: string;
  };

  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  try { new PublicKey(wallet); } catch { return NextResponse.json({ error: "invalid wallet" }, { status: 400 }); }
  if (email && !isValidEmail(email))
    return NextResponse.json({ error: "invalid email" }, { status: 400 });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    let referrerId: number | null = null;
    if (refCode) {
      const ref = await client.query("SELECT id FROM users WHERE ref_code = $1", [refCode]);
      if (ref.rows.length > 0) referrerId = ref.rows[0].id;
    }

    const result = await client.query(
      `INSERT INTO users (wallet, email, ref_code, referrer_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wallet) DO UPDATE
         SET email       = COALESCE(EXCLUDED.email, users.email),
             referrer_id = COALESCE(users.referrer_id, EXCLUDED.referrer_id)
       RETURNING id, ref_code`,
      [wallet, email ?? null, nanoid(12), referrerId]
    );

    await client.query("COMMIT");
    return NextResponse.json({ refCode: result.rows[0].ref_code });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("register error", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  } finally {
    client.release();
  }
}
