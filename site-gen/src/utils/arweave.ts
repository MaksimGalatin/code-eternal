import Irys from "@irys/sdk";
import Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";

const TEMPLATE_PATH = path.join(__dirname, "../templates/site.html");

const TIER_META: Record<number, { name: string; color: string }> = {
  1: { name: "Spark", color: "#7C3AED" },
  2: { name: "Family Archives", color: "#D4A24C" },
  3: { name: "Digital DNA", color: "#10B981" },
};

export async function generateAndDeploy(job: {
  wallet: string;
  tier: number;
  txSignature: string;
  timestamp: number;
  displayName?: string;
}): Promise<string> {
  const templateSource = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const template = Handlebars.compile(templateSource);

  const tierMeta = TIER_META[job.tier] ?? { name: "Spark", color: "#7C3AED" };
  const walletShort = `${job.wallet.slice(0, 4)}...${job.wallet.slice(-4)}`;

  const html = template({
    name: job.displayName || walletShort,
    wallet: job.wallet,
    walletShort,
    tier: tierMeta.name,
    tierColor: tierMeta.color,
    txSignature: job.txSignature,
    registeredAt: new Date(job.timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    year: new Date().getFullYear(),
  });

  // 2. Upload to Arweave via Irys
  const irys = new Irys({
    url: "https://devnet.irys.xyz",
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
      { name: "Tx-Signature", value: job.txSignature ?? "" },
    ],
  });

  const arweaveUrl = `https://devnet.irys.xyz/${receipt.id}`;
  logger.info(`Deployed to Arweave: ${arweaveUrl}`);

  return arweaveUrl;
}
