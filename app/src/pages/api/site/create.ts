import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { PublicKey } from "@solana/web3.js";

const SITE_GEN_URL = process.env.SITE_GEN_URL || "http://site-gen:3002";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { wallet, displayName, username, bio, manifesto, telegram, twitter, website } = req.body as {
    wallet?: string;
    displayName?: string;
    username?: string;
    bio?: string;
    manifesto?: string;
    telegram?: string;
    twitter?: string;
    website?: string;
  };

  if (!wallet) return res.status(400).json({ error: "wallet required" });
  try { new PublicKey(wallet); } catch { return res.status(400).json({ error: "invalid wallet" }); }

  const client = await db.connect();
  try {
    // Check user has active subscription
    const userRow = await client.query(
      "SELECT tier, created_at FROM users WHERE wallet = $1",
      [wallet]
    );
    if (!userRow.rows[0] || userRow.rows[0].tier === 0) {
      return res.status(403).json({ error: "No active subscription" });
    }

    const tier: number = userRow.rows[0].tier;
    const registeredAt: Date = userRow.rows[0].created_at;

    // Update display_name if provided
    if (displayName) {
      await client.query(
        "UPDATE users SET display_name = $1 WHERE wallet = $2",
        [displayName, wallet]
      );
    }

    // Get most recent payment tx_signature for template metadata
    const jobRow = await client.query(
      "SELECT tx_signature FROM site_generation_jobs WHERE wallet = $1 ORDER BY created_at DESC LIMIT 1",
      [wallet]
    );
    const originalTxSig = jobRow.rows[0]?.tx_signature ?? "unknown";

    // Unique tx_signature for this regeneration job
    const regenTxSig = `ui-regen-${wallet.slice(0, 8)}-${Date.now()}`;

    // Insert job row
    const insertResult = await client.query(
      `INSERT INTO site_generation_jobs (wallet, tier, tx_signature, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING id`,
      [wallet, tier, regenTxSig]
    );
    const jobId = insertResult.rows[0].id;

    // Dispatch to site-gen (fire-and-forget — site-gen acks immediately)
    fetch(`${SITE_GEN_URL}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        wallet,
        tier,
        txSignature: originalTxSig,
        timestamp: Math.floor(registeredAt.getTime() / 1000),
        displayName: displayName || undefined,
        username: username || undefined,
        bio: bio || undefined,
        manifesto: manifesto || undefined,
        telegram: telegram || undefined,
        twitter: twitter || undefined,
        website: website || undefined,
      }),
    }).catch(err => console.error("site-gen dispatch error:", err));

    res.json({ jobId });
  } catch (err) {
    console.error("site/create error:", err);
    res.status(500).json({ error: "internal error" });
  } finally {
    client.release();
  }
}
