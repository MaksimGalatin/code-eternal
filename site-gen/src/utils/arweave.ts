import Irys from "@irys/sdk";
import Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";

const TEMPLATE_PATH = path.join(__dirname, "../templates/site.html");

export async function generateAndDeploy(job: {
  wallet: string;
  tier: number;
  txSignature: string;
  timestamp: number;
}): Promise<string> {
  // 1. Compile HTML from template
  const templateSource = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const template = Handlebars.compile(templateSource);

  const tierNames: Record<number, string> = {
    1: "Starter",
    2: "Pro",
    3: "Elite",
  };

  const html = template({
    wallet: job.wallet,
    walletShort: `${job.wallet.slice(0, 4)}...${job.wallet.slice(-4)}`,
    tier: tierNames[job.tier] || "Starter",
    txSignature: job.txSignature,
    registeredAt: new Date(job.timestamp * 1000).toISOString(),
    year: new Date().getFullYear(),
  });

  // 2. Upload to Arweave via Irys
  const irys = new Irys({
    url: "https://node2.irys.xyz",
    token: "solana",
    key: process.env.IRYS_PRIVATE_KEY!,
    config: {
      providerUrl: process.env.HELIUS_RPC_URL!,
    },
  });

  // Files under ~100KB upload for free on Irys
  const size = Buffer.byteLength(html, "utf-8");
  logger.info(`Site size: ${size} bytes`);

  const receipt = await irys.upload(html, {
    tags: [
      { name: "Content-Type", value: "text/html" },
      { name: "App-Name", value: "CODE-ETERNAL" },
      { name: "Wallet", value: job.wallet },
      { name: "Tier", value: String(job.tier) },
      { name: "Tx-Signature", value: job.txSignature },
    ],
  });

  const arweaveUrl = `https://arweave.net/${receipt.id}`;
  logger.info(`Deployed to Arweave: ${arweaveUrl}`);

  return arweaveUrl;
}
