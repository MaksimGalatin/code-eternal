import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
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

export async function handlePaymentProcessed(
  event: any,
  sqsClient: SQSClient,
  queueUrl: string
): Promise<void> {
  const payment = validateEvent(event);
  const jobId = `job_${payment.signature}_${Date.now()}`;

  logger.info(`Processing payment: wallet=${payment.wallet} tier=${payment.tier}`);

  // Write job to DB (operational status)
  await db.query(
    `INSERT INTO site_generation_jobs (id, wallet, tier, tx_signature, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())
     ON CONFLICT (tx_signature) DO NOTHING`,
    [jobId, payment.wallet, payment.tier, payment.signature]
  );

  // Send task to SQS → site-gen will pick it up
  const message = {
    jobId,
    wallet: payment.wallet,
    tier: payment.tier,
    txSignature: payment.signature,
    burnAmount: payment.burnAmount,
    timestamp: payment.timestamp,
  };

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
      MessageGroupId: payment.wallet,       // FIFO: one site at a time per wallet
      MessageDeduplicationId: payment.signature, // idempotency
    })
  );

  logger.info(`Job ${jobId} sent to SQS for wallet: ${payment.wallet}`);
}
