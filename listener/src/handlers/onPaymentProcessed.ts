import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
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

export async function handlePaymentProcessed(
  event: any,
  sqsClient: SQSClient,
  queueUrl: string
): Promise<void> {
  const jobId = `job_${event.signature}_${Date.now()}`;

  // 1. Parse data from the event
  const payment: PaymentEvent = {
    signature: event.signature,
    wallet: event.wallet || event.accounts?.[0],
    tier: event.tier || 1,
    amountUsdc: event.amountUsdc || 0,
    burnAmount: event.burnAmount || 0,
    timestamp: event.timestamp || Math.floor(Date.now() / 1000),
  };

  logger.info(`Processing payment: wallet=${payment.wallet} tier=${payment.tier}`);

  // 2. Write job to DB (operational status)
  await db.query(
    `INSERT INTO site_generation_jobs (id, wallet, tier, tx_signature, status, created_at)
     VALUES ($1, $2, $3, $4, 'pending', NOW())
     ON CONFLICT (tx_signature) DO NOTHING`,
    [jobId, payment.wallet, payment.tier, payment.signature]
  );

  // 3. Send task to SQS → site-gen will pick it up
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
