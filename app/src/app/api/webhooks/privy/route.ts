import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const signature = req.headers.get("privy-signature") ?? "";
  const secret = process.env.PRIVY_WEBHOOK_SECRET;

  if (!secret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });

  if (!signature || !verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type: string = event.type ?? "";

  if (type === "user.created" || type === "user.authenticated") {
    const user = event.data?.user;
    if (!user) return NextResponse.json({ ok: true });

    const wallet = user.linked_accounts?.find(
      (a: any) => a.type === "wallet" && a.chain_type === "solana"
    );
    const email =
      user.linked_accounts?.find((a: any) => a.type === "email")?.address ??
      user.linked_accounts?.find((a: any) => a.type === "google_oauth")?.email ??
      null;

    if (wallet?.address) {
      try {
        await db.query(
          `INSERT INTO users (wallet, email, ref_code, created_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (wallet) DO UPDATE SET
             email = COALESCE(EXCLUDED.email, users.email)`,
          [wallet.address, email, nanoid(8)]
        );
      } catch (err: any) {
        console.error("privy webhook db error:", err.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
