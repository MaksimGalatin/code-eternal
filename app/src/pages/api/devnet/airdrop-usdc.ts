import type { NextApiRequest, NextApiResponse } from "next";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  // Guard: devnet only
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "";
  if (rpcUrl.includes("mainnet-beta") || rpcUrl.includes("mainnet.helius")) {
    return res.status(403).json({ error: "Not available on mainnet" });
  }

  const { wallet } = req.body as { wallet?: string };
  if (!wallet) return res.status(400).json({ error: "wallet required" });

  let recipient: PublicKey;
  try {
    recipient = new PublicKey(wallet);
  } catch {
    return res.status(400).json({ error: "invalid wallet" });
  }

  const mintStr = process.env.MOCK_USDC_MINT;
  const mintAuthorityStr = process.env.MOCK_USDC_MINT_AUTHORITY;

  if (!mintStr || !mintAuthorityStr) {
    return res
      .status(500)
      .json({ error: "Devnet USDC not configured — run scripts/setup-devnet.js" });
  }

  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!, "confirmed");
    const mintAuthority = Keypair.fromSecretKey(
      Buffer.from(mintAuthorityStr, "base64")
    );
    const mint = new PublicKey(mintStr);

    // Create recipient ATA if it doesn't exist, then mint 1100 USDC
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      mintAuthority,
      mint,
      recipient
    );

    await mintTo(
      connection,
      mintAuthority,
      mint,
      ata.address,
      mintAuthority,
      1_100_000_000  // 1100 USDC (6 decimals) — enough for any tier
    );

    res.json({ success: true, amount: 1100 });
  } catch (err: any) {
    console.error("airdrop-usdc error:", err);
    res.status(500).json({ error: err.message ?? "internal error" });
  }
}
