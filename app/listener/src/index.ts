import dotenv from "dotenv";
dotenv.config();

import { timingSafeEqual } from "crypto";
import { Connection, PublicKey } from "@solana/web3.js";
import express from "express";
import { logger } from "./utils/logger";
import { handlePaymentProcessed } from "./handlers/onPaymentProcessed";

const RPC_URL = process.env.HELIUS_RPC_URL!;
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!);
const PORT = process.env.PORT || 3001;

const connection = new Connection(RPC_URL, "confirmed");

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "listener", timestamp: new Date().toISOString() });
});

const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;

app.post("/webhook/helius", async (req, res) => {
  const authHeader = req.headers["authorization"] ?? "";
  if (!HELIUS_WEBHOOK_SECRET) {
    logger.error("HELIUS_WEBHOOK_SECRET not configured — rejecting all webhook requests");
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const a = Buffer.from(authHeader);
    const b = Buffer.from(HELIUS_WEBHOOK_SECRET);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      logger.warn("Rejected unauthorized webhook request");
      return res.status(401).json({ error: "Unauthorized" });
    }
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const events = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: "Invalid payload" });
    }

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
  const { signature } = event;

  // Only process process_payment transactions — they always have USDC token transfers.
  // register_user and update_site_url have no token transfers, so we skip them.
  const programIdStr = PROGRAM_ID.toString();
  const hasOurProgram =
    event.instructions?.some((ix: any) => ix.programId === programIdStr) ||
    event.programId === programIdStr;
  const hasTokenTransfers = Array.isArray(event.tokenTransfers) && event.tokenTransfers.length > 0;

  if (hasOurProgram && hasTokenTransfers) {
    logger.info(`Our program instruction detected: ${signature}`);
    await handlePaymentProcessed(event);
  } else if (hasOurProgram) {
    logger.info(`Skipping non-payment tx (no token transfers): ${signature}`);
  }
}

async function startWebSocketListener() {
  logger.info(`Connecting to Solana RPC: ${RPC_URL}`);

  connection.onLogs(
    PROGRAM_ID,
    async (logs) => {
      if (logs.logs.some(log => log.includes("PaymentProcessed"))) {
        logger.info(`PaymentProcessed via WebSocket: ${logs.signature}`);

        const tx = await connection.getTransaction(logs.signature, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });

        if (tx) {
          await handlePaymentProcessed({ signature: logs.signature, tx });
        }
      }
    },
    "confirmed"
  );

  logger.info(`WebSocket listener started for program: ${PROGRAM_ID}`);
}

async function main() {
  app.listen(PORT, () => {
    logger.info(`Listener HTTP server started on port ${PORT}`);
  });

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
