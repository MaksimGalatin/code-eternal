import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { logger } from "./utils/logger";
import { generateAndDeploy } from "./utils/arweave";
import { db } from "./utils/db";
import { updateSiteUrlOnChain } from "./utils/solana";

const PORT = process.env.PORT || 3002;

const app = express();
app.use(express.json({ limit: "200kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "site-gen", timestamp: new Date().toISOString() });
});

// Job queue — listener POSTs here instead of SQS
app.post("/jobs", async (req, res) => {
  const secret = process.env.SITE_GEN_SECRET;
  if (!secret) {
    logger.error("SITE_GEN_SECRET not configured — rejecting request");
    return res.status(500).json({ error: "Service misconfigured" });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const job = req.body;

  if (!job?.jobId || !job?.wallet || !job?.tier) {
    return res.status(400).json({ error: "Missing required fields: jobId, wallet, tier" });
  }

  // Acknowledge immediately — processing is async
  res.json({ accepted: true, jobId: job.jobId });

  processJob(job).catch((err) => {
    logger.error(`Unhandled error in job ${job.jobId}:`, err);
  });
});

async function processJob(job: any) {
  logger.info(`Processing job: ${job.jobId} for wallet: ${job.wallet}`);

  try {
    // Fetch display_name so the template can show it
    const userRow = await db.query(
      "SELECT display_name FROM users WHERE wallet = $1",
      [job.wallet]
    );
    const displayName = userRow.rows[0]?.display_name ?? undefined;

    const arweaveUrl = await generateAndDeploy({ ...job, displayName });

    await updateSiteUrlOnChain(job.wallet, arweaveUrl);

    await db.query(
      `UPDATE site_generation_jobs
       SET status = 'done', arweave_url = $1, completed_at = NOW()
       WHERE id = $2`,
      [arweaveUrl, job.jobId]
    );

    logger.info(`Site ready: ${arweaveUrl} for ${job.wallet}`);
  } catch (err) {
    logger.error(`Generation error for job ${job.jobId}:`, err);

    await db.query(
      `UPDATE site_generation_jobs
       SET status = 'error', error_message = $1
       WHERE id = $2`,
      [String(err), job.jobId]
    );
  }
}

app.listen(PORT, () => logger.info(`site-gen listening on port ${PORT}`));
