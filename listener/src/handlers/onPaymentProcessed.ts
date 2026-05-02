import { PublicKey } from "@solana/web3.js";
import { logger } from "../utils/logger";
import { db } from "../utils/db";

export interface PaymentEvent {
  signature: string;
  wallet: string;
  tier: number;
  amountUsdc: number;
  burnAmount: number;
  timestamp: number;
}

const VALID_TIERS = new Set([1, 2, 3]);

function validateEvent(event: any): PaymentEvent {
  const wallet = event.wallet || event.accounts?.[0];
  const signature = event.signature;
  const tier = Number(event.tier);

  if (!signature || typeof signature !== "string" || signature.length < 32) {
    throw new Error(`Invalid signature: ${signature}`);
  }

  try {
    new PublicKey(wallet);
  } catch {
    throw new Error(`Invalid wallet address: ${wallet}`);
  }

  if (!VALID_TIERS.has(tier)) {
    throw new Error(`Invalid tier: ${tier} — must be 1, 2, or 3`);
  }

  return {
    signature,
    wallet,
    tier,
    amountUsdc: Number(event.amountUsdc) || 0,
    burnAmount: Number(event.burnAmount) || 0,
    timestamp: Number(event.timestamp) || Math.floor(Date.now() / 1000),
  };
}

export async function handlePaymentProcessed(event: any): Promise<void> {
  const payment = validateEvent(event);
  const jobId = `job_${payment.signature}_${Date.now()}`;

  logger.info(`Processing payment: wallet=${payment.wallet} tier=${payment.tier}`);

  await db.query(
    `INSERT INTO site_generation_jobs (id, wallet, tier, tx_signature, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())
     ON CONFLICT (tx_signature) DO NOTHING`,
    [jobId, payment.wallet, payment.tier, payment.signature]
  );

  const message = {
    jobId,
    wallet: payment.wallet,
    tier: payment.tier,
    txSignature: payment.signature,
    burnAmount: payment.burnAmount,
    timestamp: payment.timestamp,
  };

  const siteGenUrl = process.env.SITE_GEN_URL || "http://site-gen:3002";

  const res = await fetch(`${siteGenUrl}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    throw new Error(`site-gen rejected job: ${res.status} ${await res.text()}`);
  }

  logger.info(`Job ${jobId} dispatched to site-gen for wallet: ${payment.wallet}`);
}
