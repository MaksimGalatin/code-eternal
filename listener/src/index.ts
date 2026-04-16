import dotenv from "dotenv";
dotenv.config();

import { Connection, PublicKey } from "@solana/web3.js";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import express from "express";
import { logger } from "./utils/logger";
import { handlePaymentProcessed } from "./handlers/onPaymentProcessed";

const RPC_URL = process.env.HELIUS_RPC_URL!;
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!);
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL!;
const PORT = process.env.PORT || 3001;

const connection = new Connection(RPC_URL, "confirmed");
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "us-east-1" });

// ─── Health check endpoint (for ECS Fargate health check) ─────────
const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "listener", timestamp: new Date().toISOString() });
});

// ─── Helius Webhook endpoint ──────────────────────────────────────
// Helius pushes POST when our contract emits an event
app.post("/webhook/helius", async (req, res) => {
  try {
    const events = req.body;
    logger.info(`Received ${events.length} events from Helius`);

    for (const event of events) {
      await processEvent(event);
    }

    res.json({ processed: events.length });
  } catch (err) {
    logger.error("Webhook processing error:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

async function processEvent(event: any) {
  // Helius sends parsed transaction data
  const { type, signature, accounts } = event;

  if (type === "PAYMENT_PROCESSED" || event.programId === PROGRAM_ID.toString()) {
    logger.info(`PaymentProcessed event: ${signature}`);
    await handlePaymentProcessed(event, sqsClient, SQS_QUEUE_URL);
  }
}

// ─── Fallback: WebSocket listener for local development ───────────
async function startWebSocketListener() {
  logger.info(`Connecting to Solana RPC: ${RPC_URL}`);

  connection.onLogs(
    PROGRAM_ID,
    async (logs) => {
      if (logs.logs.some(log => log.includes("PaymentProcessed"))) {
        logger.info(`PaymentProcessed via WebSocket: ${logs.signature}`);

        // Fetch full transaction for parsing
        const tx = await connection.getTransaction(logs.signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });

        if (tx) {
          await handlePaymentProcessed({ signature: logs.signature, tx }, sqsClient, SQS_QUEUE_URL);
        }
      }
    },
    "confirmed"
  );

  logger.info(`WebSocket listener started for program: ${PROGRAM_ID}`);
}

// ─── Start ────────────────────────────────────────────────────────
async function main() {
  app.listen(PORT, () => {
    logger.info(`Listener HTTP server started on port ${PORT}`);
  });

  // Production: use Helius webhooks (configured in Helius dashboard)
  // Development: use WebSocket
  if (process.env.NODE_ENV === "development") {
    await startWebSocketListener();
  } else {
    logger.info("Production mode: using Helius webhooks at /webhook/helius");
  }
}

main().catch((err) => {
  logger.error("Fatal error:", err);
  process.exit(1);
});
