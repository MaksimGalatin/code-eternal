import Irys from "@irys/sdk";
import Handlebars from "handlebars";
import * as fs from "fs";
import * as path from "path";
import QRCode from "qrcode";
import { logger } from "./logger";

const TEMPLATE_PATH = path.join(__dirname, "../templates/site.html");

function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!/^https:\/\//i.test(url)) return null;
  return url;
}

const TIER_META: Record<number, { name: string; color: string }> = {
  1: { name: "Spark", color: "#7C3AED" },
  2: { name: "Family Archives", color: "#D4A24C" },
  3: { name: "Digital DNA", color: "#10B981" },
};

const MAX_HTML_BYTES = 95000;

// 7×7 symmetric identicon from wallet address — pure inline SVG, no external deps
function generateIdenticon(wallet: string, color: string): string {
  const COLS = 4; // left half (+ center col = 7 total)
  const ROWS = 7;
  const CELL = 11;
  const PAD  = 3;
  const W    = 7 * CELL + PAD * 2;

  const rects: string[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = (row * COLS + col) % wallet.length;
      if (wallet.charCodeAt(idx) % 2 === 0) {
        const x1 = PAD + col * CELL;
        const x2 = PAD + (6 - col) * CELL; // mirror
        const y  = PAD + row * CELL;
        rects.push(`<rect x="${x1}" y="${y}" width="${CELL-1}" height="${CELL-1}" rx="2" fill="${color}" opacity="0.75"/>`);
        if (col < 3) rects.push(`<rect x="${x2}" y="${y}" width="${CELL-1}" height="${CELL-1}" rx="2" fill="${color}" opacity="0.75"/>`);
      }
    }
  }
  return `<svg width="${W}" height="${W}" viewBox="0 0 ${W} ${W}" xmlns="http://www.w3.org/2000/svg" style="display:block">${rects.join("")}</svg>`;
}

export async function generateAndDeploy(job: {
  wallet: string;
  tier: number;
  txSignature: string;
  timestamp: number;
  displayName?: string;
  username?: string;
  bio?: string;
  manifesto?: string;
  telegram?: string;
  twitter?: string;
  website?: string;
  avatarDataUrl?: string;
}): Promise<string> {
  const templateSource = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  const template = Handlebars.compile(templateSource);

  const tierMeta = TIER_META[job.tier] ?? { name: "Spark", color: "#7C3AED" };
  const walletShort = `${job.wallet.slice(0, 4)}...${job.wallet.slice(-4)}`;
  const passportId = `CE-${job.wallet.slice(0, 8).toUpperCase()}`;

  // Solana Pay QR — scan with Phantom/Solflare to send to this wallet
  const solanaPayUrl = `solana:${job.wallet}?label=${encodeURIComponent(job.displayName || walletShort)}&message=Send%20to%20CODE%20ETERNAL%20member`;
  const qrDataUrl = await QRCode.toDataURL(solanaPayUrl, {
    width: 128,
    margin: 1,
    color: { dark: tierMeta.color, light: "#0D0D1A" },
  });

  // Wallet identicon — 7×7 symmetric SVG
  const identiconSvg = generateIdenticon(job.wallet, tierMeta.color);

  const html = template({
    name: job.displayName || walletShort,
    username: job.username || null,
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
    bio: job.bio || null,
    manifesto: job.manifesto || null,
    telegram: job.telegram || null,
    telegramIsPrivate: job.telegram?.startsWith("+") ?? false,
    twitter: job.twitter || null,
    website: sanitizeUrl(job.website),
    passportId,
    qrDataUrl,
    identiconSvg,
    hasSocial: !!(job.telegram || job.twitter || job.website),
    avatarDataUrl: job.avatarDataUrl || null,
  });

  const size = Buffer.byteLength(html, "utf-8");
  logger.info(`Site size: ${size} bytes`);
  if (size > MAX_HTML_BYTES) {
    throw new Error(`Site HTML too large: ${size} bytes (max ${MAX_HTML_BYTES}). Reduce avatar or text content.`);
  }

  // 2. Upload to Arweave via Irys
  const irys = new Irys({
    url: "https://devnet.irys.xyz",
    token: "solana",
    key: process.env.IRYS_PRIVATE_KEY!,
    config: {
      providerUrl: process.env.HELIUS_RPC_URL!,
    },
  });

  const receipt = await irys.upload(html, {
    tags: [
      { name: "Content-Type", value: "text/html" },
      { name: "App-Name", value: "CODE-ETERNAL" },
      { name: "Wallet", value: job.wallet },
      { name: "Tier", value: String(job.tier) },
      { name: "Tx-Signature", value: job.txSignature ?? "" },
    ],
  });

  // Follow the Irys redirect to get the real CDN URL (devnet.irys.xyz/<id> → datasprite-cdn.com/<id>)
  let arweaveUrl = `https://devnet.irys.xyz/${receipt.id}`;
  try {
    const probe = await fetch(arweaveUrl, { method: "HEAD", redirect: "follow" });
    if (probe.url && probe.url !== arweaveUrl) {
      arweaveUrl = probe.url.replace(/\/$/, ""); // strip trailing slash
    }
  } catch {
    // keep the devnet.irys.xyz URL as fallback — it still works via redirect
  }
  logger.info(`Deployed to Arweave: ${arweaveUrl}`);

  return arweaveUrl;
}
