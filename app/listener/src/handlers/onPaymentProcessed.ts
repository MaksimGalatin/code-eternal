import { Connection, PublicKey } from "@solana/web3.js";
import { logger } from "../utils/logger";
import { db } from "../utils/db";

const PROGRAM_ID = process.env.PROGRAM_ID!;
const RPC_URL = process.env.HELIUS_RPC_URL!;

const TIER_AMOUNTS_USDC: Record<number, number> = { 1: 15, 2: 100, 3: 1000 };
const REF_BPS = [1500, 700, 300];
const BASE_BURN_BPS = 500;

// Decode tier from on-chain UserState account data.
// Layout after 8-byte discriminator:
//   [8..40]  owner: Pubkey
//   [40]     referrer option flag (0=None, 1=Some)
//   [41..73] referrer pubkey (only if flag=1)
//   [41|73]  tier: u8
function decodeTier(data: Buffer): number {
  const referrerFlag = data[40];
  const tierOffset = 40 + 1 + (referrerFlag === 1 ? 32 : 0);
  return data[tierOffset];
}

async function fetchUserTier(walletAddress: string): Promise<number | null> {
  const connection = new Connection(RPC_URL, "confirmed");
  const userWallet = new PublicKey(walletAddress);
  const [userStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), userWallet.toBuffer()],
    new PublicKey(PROGRAM_ID)
  );

  // Helius webhook fires fast — RPC may not have propagated state yet. Retry with backoff.
  const delays = [0, 2000, 4000, 8000, 15000];
  for (const delay of delays) {
    if (delay > 0) await new Promise(r => setTimeout(r, delay));
    const accountInfo = await connection.getAccountInfo(userStatePDA);
    if (!accountInfo) continue;
    const tier = decodeTier(accountInfo.data);
    if ([1, 2, 3].includes(tier)) return tier;
    logger.warn(`fetchUserTier: tier=${tier} not valid yet for ${walletAddress}, retrying...`);
  }
  return null;
}

async function getReferralChain(
  wallet: string
): Promise<{ ref1: string | null; ref2: string | null; ref3: string | null }> {
  const result = await db.query(
    `SELECT u1.wallet AS ref1, u2.wallet AS ref2, u3.wallet AS ref3
     FROM users u0
     LEFT JOIN users u1 ON u1.id = u0.referrer_id
     LEFT JOIN users u2 ON u2.id = u1.referrer_id
     LEFT JOIN users u3 ON u3.id = u2.referrer_id
     WHERE u0.wallet = $1`,
    [wallet]
  );
  return result.rows[0] ?? { ref1: null, ref2: null, ref3: null };
}

async function sendConfirmationEmail(
  wallet: string,
  tier: number,
  txSig: string,
  amountUsdc: number
): Promise<void> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    logger.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }

  const userResult = await db.query(
    "SELECT email, display_name FROM users WHERE wallet = $1",
    [wallet]
  );
  const user = userResult.rows[0];
  if (!user?.email) {
    logger.warn(`No email on file for ${wallet}, skipping email`);
    return;
  }

  const tierNames: Record<number, string> = { 1: "Spark", 2: "Family Archives", 3: "Digital DNA" };
  const tierName = tierNames[tier] ?? "Unknown";
  const displayName = user.display_name || `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);

    await resend.emails.send({
      from: "CODE ETERNAL <noreply@codeofdigitaleternity.com>",
      to: user.email,
      subject: `${tierName} access activated — CODE ETERNAL`,
      html: `<!DOCTYPE html>
<html>
<body style="background:#0A0A0F;color:#E8E8F0;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto">
  <h1 style="color:#7C3AED;margin-bottom:4px">CODE ETERNAL</h1>
  <p style="color:#8B8B9E;margin-top:0">Eternal digital identity on Solana + Arweave</p>
  <hr style="border-color:#1a1a2e;margin:24px 0"/>
  <h2 style="color:#10B981">✓ Payment confirmed</h2>
  <p>Hello, <strong>${displayName}</strong>.</p>
  <p>Your <strong style="color:#7C3AED">${tierName}</strong> access has been activated.</p>
  <table style="width:100%;border-collapse:collapse;margin:20px 0">
    <tr>
      <td style="color:#8B8B9E;padding:8px 0;border-bottom:1px solid #1a1a2e">Amount</td>
      <td style="text-align:right;padding:8px 0;border-bottom:1px solid #1a1a2e"><strong>$${amountUsdc} USDC</strong></td>
    </tr>
    <tr>
      <td style="color:#8B8B9E;padding:8px 0;border-bottom:1px solid #1a1a2e">Tier</td>
      <td style="text-align:right;padding:8px 0;border-bottom:1px solid #1a1a2e"><strong>${tierName}</strong></td>
    </tr>
    <tr>
      <td style="color:#8B8B9E;padding:8px 0">Wallet</td>
      <td style="text-align:right;padding:8px 0;font-family:monospace;font-size:12px">${wallet}</td>
    </tr>
  </table>
  <p>Your eternal site is being generated and will appear in your cabinet shortly.</p>
  <a href="https://app.codeofdigitaleternity.com/cabinet"
     style="display:inline-block;background:#7C3AED;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
    Open Cabinet
  </a>
  <hr style="border-color:#1a1a2e;margin:24px 0"/>
  <p style="color:#4a4a5e;font-size:11px;font-family:monospace">
    TX: ${txSig}<br/>
    Solana Devnet · mock USDC
  </p>
</body>
</html>`,
    });

    logger.info(`Confirmation email sent to ${user.email}`);
  } catch (err) {
    logger.error("Failed to send confirmation email:", err);
    // Non-fatal
  }
}

export async function handlePaymentProcessed(rawEvent: any): Promise<void> {
  // Support both Helius enhanced transaction format (production) and
  // WebSocket format (development: { signature, tx })
  const signature: string = rawEvent.signature;
  const payerWallet: string = rawEvent.feePayer ?? rawEvent.tx?.transaction?.message?.accountKeys?.[0]?.pubkey;

  if (!signature || !payerWallet) {
    logger.warn("Cannot extract signature or payer from event, skipping");
    return;
  }

  logger.info(`Handling PaymentProcessed: sig=${signature} payer=${payerWallet}`);

  // Deduplicate — skip if we already processed this transaction
  const existing = await db.query(
    "SELECT id FROM site_generation_jobs WHERE tx_signature = $1",
    [signature]
  );
  if (existing.rows.length > 0) {
    logger.info(`Transaction ${signature} already processed, skipping`);
    return;
  }

  // Get tier from on-chain UserState (updated atomically by the contract)
  const tier = await fetchUserTier(payerWallet);
  if (!tier) {
    logger.error(`Could not determine tier for ${payerWallet} from on-chain state`);
    return;
  }

  const totalUsdc = TIER_AMOUNTS_USDC[tier];
  const refs = await getReferralChain(payerWallet);
  const refWallets = [refs.ref1, refs.ref2, refs.ref3];

  // Compute burn (base 5% + any empty referral slots)
  let burnBps = BASE_BURN_BPS;
  for (let i = 0; i < 3; i++) {
    if (!refWallets[i]) burnBps += REF_BPS[i];
  }
  const burnAmount = (totalUsdc * burnBps) / 10000;

  const client = await db.connect();
  let jobId: number;
  try {
    await client.query("BEGIN");

    // Update user tier
    await client.query("UPDATE users SET tier = $1 WHERE wallet = $2", [tier, payerWallet]);

    // Record burn
    await client.query(
      `INSERT INTO burn_events (amount, tx_hash, created_at)
       VALUES ($1, $2, NOW()) ON CONFLICT (tx_hash) DO NOTHING`,
      [burnAmount, signature]
    );

    // Record referral payments
    for (let i = 0; i < 3; i++) {
      if (refWallets[i]) {
        const refAmountUsdc = (totalUsdc * REF_BPS[i]) / 10000;
        await client.query(
          `INSERT INTO referral_payments (payer_wallet, referrer_wallet, level, amount_usdc, tx_hash, tier, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [payerWallet, refWallets[i], i + 1, refAmountUsdc, signature, tier]
        );
      }
    }

    // Create site generation job — id is SERIAL, let DB auto-assign
    const jobRes = await client.query(
      `INSERT INTO site_generation_jobs (wallet, tier, tx_signature, status, created_at)
       VALUES ($1, $2, $3, 'pending', NOW()) RETURNING id`,
      [payerWallet, tier, signature]
    );
    jobId = jobRes.rows[0].id;

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("DB error processing payment:", err);
    throw err;
  } finally {
    client.release();
  }

  logger.info(
    `Recorded: wallet=${payerWallet} tier=${tier} burn=${burnAmount} USDC ` +
    `refs=${refWallets.filter(Boolean).length} jobId=${jobId}`
  );

  // Send confirmation email (non-fatal)
  await sendConfirmationEmail(payerWallet, tier, signature, totalUsdc);

  // Dispatch to site-gen with exponential-backoff retry
  const siteGenUrl = process.env.SITE_GEN_URL || "http://site-gen:3002";
  const siteGenSecret = process.env.SITE_GEN_SECRET;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (siteGenSecret) headers["Authorization"] = `Bearer ${siteGenSecret}`;
  const payload = JSON.stringify({ jobId, wallet: payerWallet, tier, txSignature: signature, burnAmount, timestamp: Math.floor(Date.now() / 1000) });

  const MAX_ATTEMPTS = 4;
  const DELAYS_MS = [0, 2000, 4000, 8000];
  let dispatched = false;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (DELAYS_MS[attempt] > 0) await new Promise(r => setTimeout(r, DELAYS_MS[attempt]));
    try {
      const res = await fetch(`${siteGenUrl}/jobs`, { method: "POST", headers, body: payload });
      if (res.ok) {
        logger.info(`Job ${jobId} dispatched to site-gen (attempt ${attempt + 1})`);
        dispatched = true;
        break;
      }
      logger.warn(`site-gen rejected job ${jobId} (attempt ${attempt + 1}): HTTP ${res.status}`);
    } catch (err) {
      logger.warn(`site-gen unreachable for job ${jobId} (attempt ${attempt + 1}):`, err);
    }
  }

  if (!dispatched) {
    logger.error(`All ${MAX_ATTEMPTS} dispatch attempts failed for job ${jobId} — marking as error`);
    await db.query(
      "UPDATE site_generation_jobs SET status='error', error_message=$1 WHERE id=$2",
      ["site-gen unreachable after all retry attempts", jobId]
    );
  }
}
