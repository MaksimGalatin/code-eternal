import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { logger } from "./logger";

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!);
const RPC_URL = process.env.HELIUS_RPC_URL!;

const IRYS_BASE_URL = process.env.IRYS_BASE_URL ?? "https://devnet.irys.xyz";
// Matches devnet.irys.xyz/<id>  OR  <node>.devnet-1.datasprite-cdn.com/<id>  OR  node2.irys.xyz/<id>
const IRYS_URL_RE = /^https:\/\/[a-z0-9.-]+\/([A-Za-z0-9_-]{30,64})\/?$/;

export async function updateSiteUrlOnChain(
  walletAddress: string,
  arweaveUrl: string
): Promise<void> {
  const match = IRYS_URL_RE.exec(arweaveUrl);
  if (!match) {
    throw new Error(`Invalid Arweave URL format: ${arweaveUrl}`);
  }
  // Store only the tx_id (43 chars) — base URL is reconstructed at read time
  arweaveUrl = match[1];

  // Convert URL to [u8; 64]
  const urlBytes = new Uint8Array(64);
  const encoded = new TextEncoder().encode(arweaveUrl.slice(0, 64));
  urlBytes.set(encoded);

  const backendKeypair = Keypair.fromSecretKey(
    Buffer.from(process.env.BACKEND_PRIVATE_KEY!, "base64")
  );

  const connection = new Connection(RPC_URL, "confirmed");
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const idl = require("../../idl/code_eternal_router.json");
  const program = new anchor.Program({ ...idl, address: PROGRAM_ID.toBase58() }, provider);

  const userWallet = new PublicKey(walletAddress);
  const [userStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), userWallet.toBuffer()],
    PROGRAM_ID
  );

  await (program.methods as any)
    .updateSiteUrl(Array.from(urlBytes), 1) // status=1 (ready)
    .accounts({
      backendAuthority: backendKeypair.publicKey,
      userState: userStatePda,
      userWallet: userWallet,
    })
    .rpc();

  logger.info(`On-chain URL updated for ${walletAddress}: ${arweaveUrl}`);
}

/** Read the arweave_url already stored on-chain for this wallet. Returns null if not set. */
export async function readOnChainArweaveUrl(walletAddress: string): Promise<string | null> {
  const connection = new Connection(RPC_URL, "confirmed");
  const userWallet = new PublicKey(walletAddress);
  const [userStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), userWallet.toBuffer()],
    PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(userStatePda);
  if (!accountInfo) return null;

  // UserState binary layout:
  // [0..7]   discriminator
  // [8..39]  owner Pubkey (32)
  // [40]     referrer Option flag
  // [41..72] referrer Pubkey (32, only if flag=1)
  // [base+0]       tier (u8)
  // [base+1..+9]   registered_at (i64, 8)
  // [base+9..+17]  tier_expires (i64, 8)
  // [base+17..+25] memory_score (u64, 8)
  // [base+25..+89] arweave_url ([u8; 64])
  const data = accountInfo.data;
  const hasReferrer = data[40] === 1;
  const base = hasReferrer ? 73 : 41;
  const urlOffset = base + 25;
  const urlBytes = data.slice(urlOffset, urlOffset + 64);
  if (urlBytes[0] === 0) return null;

  const end = urlBytes.indexOf(0);
  const txId = Buffer.from(end === -1 ? urlBytes : urlBytes.slice(0, end)).toString("utf8");
  return txId ? `${IRYS_BASE_URL}/${txId}` : null;
}
