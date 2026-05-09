import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/lib/db";
import { PublicKey } from "@solana/web3.js";

export const config = { api: { bodyParser: { sizeLimit: "200kb" } } };

const SITE_GEN_URL = process.env.SITE_GEN_URL || "http://site-gen:3002";
const SITE_GEN_SECRET = process.env.SITE_GEN_SECRET;

const MAX = { displayName: 60, bio: 2000, manifesto: 500, telegram: 32, twitter: 15, website: 256 };
const AVATAR_MAX_LEN = 120_000; // ~90 KB base64
const AVATAR_RE = /^data:image\/(jpeg|png|gif|webp);base64,[A-Za-z0-9+/]+=*$/;
const TWITTER_RE = /^[A-Za-z0-9_]{1,15}$/;
const TELEGRAM_RE = /^[A-Za-z0-9_]{5,32}$/;
const WEBSITE_RE = /^https?:\/\/[^\s]{1,200}$/;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { wallet, displayName, username, bio, manifesto, telegram, twitter, website, avatarDataUrl } = req.body as {
    wallet?: string;
    displayName?: string;
    username?: string;
    bio?: string;
    manifesto?: string;
    telegram?: string;
    twitter?: string;
    website?: string;
    avatarDataUrl?: string;
  };

  if (!wallet) return res.status(400).json({ error: "wallet required" });
  try { new PublicKey(wallet); } catch { return res.status(400).json({ error: "invalid wallet" }); }

  // Input length limits
  if (displayName && displayName.length > MAX.displayName)
    return res.status(400).json({ error: `displayName max ${MAX.displayName} chars` });
  if (bio && bio.length > MAX.bio)
    return res.status(400).json({ error: `bio max ${MAX.bio} chars` });
  if (manifesto && manifesto.length > MAX.manifesto)
    return res.status(400).json({ error: `manifesto max ${MAX.manifesto} chars` });
  if (telegram && !TELEGRAM_RE.test(telegram))
    return res.status(400).json({ error: "invalid telegram handle" });
  if (twitter && !TWITTER_RE.test(twitter))
    return res.status(400).json({ error: "invalid twitter handle" });
  if (website && !WEBSITE_RE.test(website))
    return res.status(400).json({ error: "invalid website URL" });
  if (avatarDataUrl) {
    if (!AVATAR_RE.test(avatarDataUrl))
      return res.status(400).json({ error: "invalid avatar: must be jpeg/png/gif/webp data URL" });
    if (avatarDataUrl.length > AVATAR_MAX_LEN)
      return res.status(400).json({ error: "avatar too large (max ~90 KB)" });
  }

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
      headers: {
        "Content-Type": "application/json",
        ...(SITE_GEN_SECRET ? { "Authorization": `Bearer ${SITE_GEN_SECRET}` } : {}),
      },
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
        avatarDataUrl: avatarDataUrl || undefined,
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
