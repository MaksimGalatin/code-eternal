import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import { rateLimit, getIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  if (!rateLimit(getIp(req), 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "";
  if (rpcUrl.includes("mainnet-beta") || rpcUrl.includes("mainnet.helius")) {
    return NextResponse.json({ error: "Not available on mainnet" }, { status: 403 });
  }

  const body = await req.json();
  const { wallet } = body as { wallet?: string };
  if (!wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  let recipient: PublicKey;
  try {
    recipient = new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "invalid wallet" }, { status: 400 });
  }

  const mintStr = process.env.MOCK_USDC_MINT;
  const mintAuthorityStr = process.env.MOCK_USDC_MINT_AUTHORITY;

  if (!mintStr || !mintAuthorityStr) {
    return NextResponse.json({ error: "Devnet USDC not configured — run scripts/setup-devnet.js" }, { status: 500 });
  }

  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL!, "confirmed");
    const mintAuthority = Keypair.fromSecretKey(Buffer.from(mintAuthorityStr, "base64"));
    const mint = new PublicKey(mintStr);

    const solBalance = await connection.getBalance(recipient);
    if (solBalance < 0.005 * 1e9) {
      const solTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: mintAuthority.publicKey,
          toPubkey: recipient,
          lamports: 5_000_000,
        })
      );
      await sendAndConfirmTransaction(connection, solTx, [mintAuthority], { commitment: "confirmed" });
    }

    const ata = await getOrCreateAssociatedTokenAccount(connection, mintAuthority, mint, recipient);
    await mintTo(connection, mintAuthority, mint, ata.address, mintAuthority, 10_000_000_000);

    return NextResponse.json({ success: true, amount: 10000 });
  } catch (err: any) {
    console.error("airdrop-usdc error:", err);
    return NextResponse.json({ error: "airdrop failed" }, { status: 500 });
  }
}
