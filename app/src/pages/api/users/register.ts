import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import { PublicKey } from "@solana/web3.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { wallet, email, refCode } = req.body as {
    wallet?: string;
    email?: string;
    refCode?: string;
  };

  if (!wallet) return res.status(400).json({ error: "wallet required" });
  try { new PublicKey(wallet); } catch { return res.status(400).json({ error: "invalid wallet" }); }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ error: "invalid email" });

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // Resolve referrer
    let referrerId: number | null = null;
    if (refCode) {
      const ref = await client.query(
        "SELECT id FROM users WHERE ref_code = $1",
        [refCode]
      );
      if (ref.rows.length > 0) referrerId = ref.rows[0].id;
    }

    // Upsert user
    const result = await client.query(
      `INSERT INTO users (wallet, email, ref_code, referrer_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (wallet) DO UPDATE
         SET email = COALESCE(EXCLUDED.email, users.email)
       RETURNING id, ref_code`,
      [wallet, email ?? null, nanoid(12), referrerId]
    );

    await client.query("COMMIT");
    res.json({ refCode: result.rows[0].ref_code });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("register error", err);
    res.status(500).json({ error: "internal error" });
  } finally {
    client.release();
  }
}
