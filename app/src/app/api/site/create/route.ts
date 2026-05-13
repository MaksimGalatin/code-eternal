import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { db } from "@/lib/db";
import { privyServer } from "@/lib/privy";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { PublicKey } from "@solana/web3.js";

const REGEN_LIMIT: Record<number, number> = { 1: 1, 2: 5, 3: 10 };

const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "support", "help", "mail", "email", "blog", "api",
  "www", "app", "web", "login", "logout", "register", "signup", "account",
  "about", "contact", "home", "index", "root", "system", "mod", "moderator",
  "staff", "team", "official", "info", "news", "media", "press", "billing",
  "security", "privacy", "legal", "terms", "tos", "faq", "docs", "status",
  "null", "undefined", "test", "demo", "dev", "staging", "prod", "cdn",
]);

const SITE_GEN_URL = process.env.SITE_GEN_URL || "http://site-gen:3002";
const SITE_GEN_SECRET = process.env.SITE_GEN_SECRET;

const MAX = { displayName: 60, bio: 2000, manifesto: 500, telegram: 32, twitter: 15, website: 256 };
const AVATAR_MAX_LEN = 120_000;
const AVATAR_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const TWITTER_RE = /^[A-Za-z0-9_]{1,15}$/;
const TELEGRAM_RE = /^[A-Za-z0-9_]{5,32}$/;
const TELEGRAM_INVITE_RE = /^\+[A-Za-z0-9_-]{10,}$/;
const WEBSITE_RE = /^https:\/\/[^\s]{1,200}$/;

export async function POST(req: Request) {
  // Verify Privy auth token — ensures caller owns the wallet they claim
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let authenticatedWallet: string;
  try {
    const claims = await privyServer.verifyAuthToken(token);
    // Privy 3.x: getUser accepts userId string (backward-compat) or { idToken } object
    const privyUser = await privyServer.getUser(claims.userId);
    const solanaAcct = (privyUser.linkedAccounts as any[]).find(
      (a: any) =>
        a.type === "wallet" &&
        (a.chainType === "solana" || a.chain_type === "solana") &&
        (a.walletClientType === "privy" || a.wallet_client_type === "privy")
    );
    if (!solanaAcct?.address) {
      return NextResponse.json({ error: "no solana wallet linked" }, { status: 403 });
    }
    authenticatedWallet = solanaAcct.address as string;
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { wallet, displayName, username, bio, manifesto, telegram, twitter, website, avatarDataUrl } = body as {
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

  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });
  try { new PublicKey(wallet); } catch { return NextResponse.json({ error: "invalid wallet" }, { status: 400 }); }

  // Wallet in body must match the authenticated Privy user's wallet
  if (wallet !== authenticatedWallet) {
    return NextResponse.json({ error: "wallet mismatch" }, { status: 403 });
  }

  if (displayName && displayName.length > MAX.displayName)
    return NextResponse.json({ error: `displayName max ${MAX.displayName} chars` }, { status: 400 });
  if (bio && bio.length > MAX.bio)
    return NextResponse.json({ error: `bio max ${MAX.bio} chars` }, { status: 400 });
  if (manifesto && manifesto.length > MAX.manifesto)
    return NextResponse.json({ error: `manifesto max ${MAX.manifesto} chars` }, { status: 400 });
  const telegramClean = telegram
    ?.replace(/^https?:\/\/(t\.me|telegram\.me)\//i, "")
    .replace(/^@/, "")
    .split("?")[0].replace(/\/$/, "");
  if (telegramClean && !TELEGRAM_RE.test(telegramClean) && !TELEGRAM_INVITE_RE.test(telegramClean))
    return NextResponse.json({ error: "invalid telegram handle" }, { status: 400 });
  const twitterClean = twitter
    ?.replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//i, "")
    .replace(/^@/, "")
    .split("?")[0].split("/")[0];
  if (twitterClean && !TWITTER_RE.test(twitterClean))
    return NextResponse.json({ error: "invalid twitter handle" }, { status: 400 });
  if (website && !WEBSITE_RE.test(website))
    return NextResponse.json({ error: "invalid website URL" }, { status: 400 });
  if (avatarDataUrl) {
    if (!AVATAR_RE.test(avatarDataUrl))
      return NextResponse.json({ error: "invalid avatar: must be jpeg/png/gif/webp data URL" }, { status: 400 });
    if (avatarDataUrl.length > AVATAR_MAX_LEN)
      return NextResponse.json({ error: "avatar too large (max ~90 KB)" }, { status: 400 });
  }

  const client = await db.connect();
  try {
    const userRow = await client.query(
      "SELECT tier, tier_expires, created_at FROM users WHERE wallet = $1",
      [wallet]
    );
    if (!userRow.rows[0] || userRow.rows[0].tier === 0) {
      return NextResponse.json({ error: "No active subscription" }, { status: 403 });
    }

    const tier: number = userRow.rows[0].tier;
    const tierExpires: number = parseInt(userRow.rows[0].tier_expires ?? "0", 10);
    const registeredAt: Date = userRow.rows[0].created_at;

    // Check username availability before any regen-limit accounting so a taken
    // username never costs the user one of their limited site-creation attempts.
    if (username) {
      const usernameLower = username.toLowerCase();
      if (RESERVED_USERNAMES.has(usernameLower)) {
        return NextResponse.json({ error: "username_taken" }, { status: 409 });
      }
      const taken = await client.query(
        "SELECT 1 FROM users WHERE username = $1 AND wallet != $2 LIMIT 1",
        [usernameLower, wallet]
      );
      if (taken.rows.length > 0) {
        return NextResponse.json({ error: "username_taken" }, { status: 409 });
      }
    }

    const limit = REGEN_LIMIT[tier] ?? 1;
    const periodStart = tierExpires > 0 ? tierExpires - 30 * 86400 : 0;
    const regenRes = await client.query(
      `SELECT COUNT(*) FROM site_generation_jobs
       WHERE wallet = $1
         AND tx_signature LIKE 'ui-regen-%'
         AND created_at > to_timestamp($2::bigint)`,
      [wallet, periodStart]
    );
    const regenCount = parseInt(regenRes.rows[0].count, 10);
    if (regenCount >= limit) {
      return NextResponse.json(
        { error: `Site update limit reached (${regenCount}/${limit} this subscription period). Renew your subscription to reset the counter.` },
        { status: 429 }
      );
    }

    await client.query(
      `UPDATE users SET
        display_name = COALESCE($1, display_name),
        username = COALESCE($2, username),
        site_bio = COALESCE($3, site_bio),
        site_manifesto = COALESCE($4, site_manifesto),
        site_telegram = COALESCE($5, site_telegram),
        site_twitter = COALESCE($6, site_twitter),
        site_website = COALESCE($7, site_website)
       WHERE wallet = $8`,
      [
        displayName || null,
        username ? username.toLowerCase() : null,
        bio || null,
        manifesto || null,
        telegramClean || null,
        twitterClean || null,
        website || null,
        wallet,
      ]
    );

    const jobRow = await client.query(
      "SELECT tx_signature FROM site_generation_jobs WHERE wallet = $1 ORDER BY created_at DESC LIMIT 1",
      [wallet]
    );
    const originalTxSig = jobRow.rows[0]?.tx_signature ?? "unknown";
    const regenTxSig = `ui-regen-${wallet.slice(0, 8)}-${Date.now()}`;

    // Rate limit only counts actual dispatches — not validation failures or auth errors
    const retryAfter = rateLimit(getIp(req), 20, 10 * 60 * 1000);
    if (retryAfter !== null) {
      const mins = Math.ceil(retryAfter / 60);
      return NextResponse.json(
        { error: `Too many requests. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.` },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const insertResult = await client.query(
      `INSERT INTO site_generation_jobs (wallet, tier, tx_signature, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW())
       RETURNING id`,
      [wallet, tier, regenTxSig]
    );
    const jobId = insertResult.rows[0].id;

    const siteGenHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (SITE_GEN_SECRET) siteGenHeaders["Authorization"] = `Bearer ${SITE_GEN_SECRET}`;
    const siteGenPayload = JSON.stringify({
      jobId, wallet, tier,
      txSignature: originalTxSig,
      timestamp: Math.floor(registeredAt.getTime() / 1000),
      displayName: displayName || undefined,
      username: username || undefined,
      bio: bio || undefined,
      manifesto: manifesto || undefined,
      telegram: telegramClean || undefined,
      twitter: twitterClean || undefined,
      website: website || undefined,
      avatarDataUrl: avatarDataUrl || undefined,
    });

    // waitUntil keeps the Vercel function alive until site-gen dispatch completes,
    // preventing the "stuck pending" bug where fire-and-forget was killed on response.
    waitUntil((async () => {
      const MAX_RETRIES = 3;
      for (let i = 0; i < MAX_RETRIES; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, i * 2000));
        try {
          const r = await fetch(`${SITE_GEN_URL}/jobs`, { method: "POST", headers: siteGenHeaders, body: siteGenPayload });
          if (r.ok) { console.log(`site-gen dispatch ok (attempt ${i + 1})`); return; }
          console.error(`site-gen dispatch attempt ${i + 1} failed: HTTP ${r.status}`);
        } catch (err) {
          console.error(`site-gen dispatch attempt ${i + 1} error:`, err);
        }
      }
      await db.query("UPDATE site_generation_jobs SET status='error', error_message=$1 WHERE id=$2",
        ["site-gen unreachable", jobId]);
    })());

    return NextResponse.json({ jobId });
  } catch (err: any) {
    if (err.code === "23505" && err.constraint?.includes("username")) {
      return NextResponse.json({ error: "username_taken" }, { status: 409 });
    }
    console.error("site/create error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  } finally {
    client.release();
  }
}
