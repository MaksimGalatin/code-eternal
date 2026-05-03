import dotenv from "dotenv";
dotenv.config();

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import express from "express";
import { logger } from "./utils/logger";
import { generateAndDeploy } from "./utils/arweave";
import { db } from "./utils/db";
import { updateSiteUrlOnChain } from "./utils/solana";

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-1" });
const QUEUE_URL = process.env.SQS_QUEUE_URL!;
const PORT = process.env.PORT || 3002;

// ─── Health check ─────────────────────────────────────────────────
const app = express();
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "site-gen", timestamp: new Date().toISOString() });
});
app.listen(PORT, () => logger.info(`site-gen listening on port ${PORT}`));

// ─── SQS consumer loop ────────────────────────────────────────────
async function pollQueue() {
  logger.info("Starting SQS consumer...");

  while (true) {
    try {
      const response = await sqsClient.send(
        new ReceiveMessageCommand({
          QueueUrl: QUEUE_URL,
          MaxNumberOfMessages: 1,  // one at a time — Arweave upload is slow
          WaitTimeSeconds: 20,     // long polling — saves money
          VisibilityTimeout: 120,  // 2 minutes to process
        })
      );

      if (!response.Messages?.length) continue;

      const message = response.Messages[0];
      const job = JSON.parse(message.Body!);

      logger.info(`Processing job: ${job.jobId} for wallet: ${job.wallet}`);

      try {
        // 1. Generate HTML and deploy to Arweave
        const arweaveUrl = await generateAndDeploy(job);

        // 2. Write URL on-chain via Anchor instruction
        await updateSiteUrlOnChain(job.wallet, arweaveUrl);

        // 3. Update status in DB
        await db.query(
          `UPDATE site_generation_jobs
           SET status = 'done', arweave_url = $1, completed_at = NOW()
           WHERE id = $2`,
          [arweaveUrl, job.jobId]
        );

        logger.info(`Site ready: ${arweaveUrl} for ${job.wallet}`);

        // 4. Delete message from queue — success
        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle!,
          })
        );
      } catch (err) {
        logger.error(`Generation error for job ${job.jobId}:`, err);

        // Update status in DB
        await db.query(
          `UPDATE site_generation_jobs
           SET status = 'error', error_message = $1
           WHERE id = $2`,
          [String(err), job.jobId]
        );

        // Do NOT delete from SQS → visibility timeout expires → SQS retries
        // After 3 attempts SQS moves to DLQ automatically
      }
    } catch (err) {
      logger.error("SQS poll error:", err);
      await sleep(5000); // pause before retry on network error
    }
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

pollQueue().catch((err) => {
  logger.error("Fatal:", err);
  process.exit(1);
});
