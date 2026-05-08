import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";

export const config = { api: { bodyParser: false } };

async function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers["privy-signature"] as string;
  const secret = process.env.PRIVY_WEBHOOK_SECRET;

  if (!secret) return res.status(500).json({ error: "Webhook secret not configured" });

  if (!signature || !verifySignature(rawBody, signature, secret)) {
    return res.status(401).json({ error: "Invalid signature" });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  const type: string = event.type ?? "";

  // Register user in DB on first login
  if (type === "user.created" || type === "user.authenticated") {
    const user = event.data?.user;
    if (!user) return res.status(200).json({ ok: true });

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

  res.status(200).json({ ok: true });
}
