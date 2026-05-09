#!/usr/bin/env node
// One-time script: retry update_site_url on-chain + mark job done in DB
// Usage: node scripts/retry-site-url.js

require("dotenv").config({ path: require("path").join(__dirname, "../secrets/credentials.env") });

const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");
const { Pool } = require("pg");
const path = require("path");

const WALLET = "AAefXLA3iWp7iyekpvtgZpe9q6zUGWLfxgpSCYfw7qtw";
const ARWEAVE_TX_ID = "i5be1vAMzMgAEyhkpmzWfLxu3QPRRfyMX85AdjvejSU";
const JOB_ID = 3;

async function main() {
  console.log("=== Retry update_site_url ===");
  console.log("Wallet:", WALLET);
  console.log("Arweave TX ID:", ARWEAVE_TX_ID);

  // Step 1: Call update_site_url on-chain
  const backendKey = process.env.BACKEND_PRIVATE_KEY;
  if (!backendKey) throw new Error("BACKEND_PRIVATE_KEY not set");

  const rpcUrl = process.env.HELIUS_RPC_URL;
  if (!rpcUrl) throw new Error("HELIUS_RPC_URL not set");

  const programId = new PublicKey(process.env.PROGRAM_ID || "8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep");

  const backendKeypair = Keypair.fromSecretKey(Buffer.from(backendKey, "base64"));
  console.log("Backend authority:", backendKeypair.publicKey.toBase58());

  const connection = new Connection(rpcUrl, "confirmed");
  const wallet = new anchor.Wallet(backendKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const idl = require(path.join(__dirname, "../site-gen/idl/code_eternal_router.json"));
  const program = new anchor.Program(idl, provider);

  const userWallet = new PublicKey(WALLET);
  const [userStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user"), userWallet.toBuffer()],
    programId
  );
  console.log("UserState PDA:", userStatePda.toBase58());

  const urlBytes = new Uint8Array(64);
  const encoded = new TextEncoder().encode(ARWEAVE_TX_ID.slice(0, 64));
  urlBytes.set(encoded);

  console.log("Calling update_site_url on-chain...");
  const sig = await program.methods
    .updateSiteUrl(Array.from(urlBytes), 1)
    .accounts({
      backendAuthority: backendKeypair.publicKey,
      userState: userStatePda,
      userWallet: userWallet,
    })
    .rpc();
  console.log("On-chain tx:", sig);

  // Step 2: Update DB
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  const arweaveUrl = `https://arweave.net/${ARWEAVE_TX_ID}`;
  await db.query(
    `UPDATE site_generation_jobs
     SET status = 'done', arweave_url = $1, completed_at = NOW(), error_message = NULL
     WHERE id = $2`,
    [arweaveUrl, JOB_ID]
  );
  console.log("DB updated: job", JOB_ID, "→ done,", arweaveUrl);
  await db.end();

  console.log("=== Done ===");
}

main().catch(err => { console.error(err); process.exit(1); });
