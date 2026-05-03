/**
 * One-time devnet setup: creates mock USDC mint, vault ATA, ecosystem fund ATA.
 * Run from the app/ directory so it can use app/node_modules:
 *
 *   cd app && node ../scripts/setup-devnet.js
 *
 * Prerequisites:
 *   - solana-keygen new (default keypair at ~/.config/solana/id.json, funded with devnet SOL)
 *   - solana airdrop 2  (if balance is low)
 *
 * Output: env vars to add to secrets/credentials.env and rebuild the Docker image.
 */

const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { createMint, getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const { readFileSync } = require("fs");
const { homedir } = require("os");

const PROGRAM_ID = new PublicKey("8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep");
const ECOSYSTEM_FUND = new PublicKey("CkiiA1BETdpSbt76PChhnKVzXxLjJXT99yA4yfRtT88c");
const RPC_URL =
  "https://devnet.helius-rpc.com/?api-key=bb310470-cf7c-42a5-80af-60fe93a6784b";

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  // Load default Solana keypair (pays account-creation fees)
  const keyPath = `${homedir()}/.config/solana/id.json`;
  const payer = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(keyPath, "utf8")))
  );
  console.log("Payer:", payer.publicKey.toBase58());

  const balance = await connection.getBalance(payer.publicKey);
  console.log("Balance:", balance / 1e9, "SOL");
  if (balance < 0.05 * 1e9) {
    throw new Error("Insufficient SOL — run: solana airdrop 2");
  }

  // 1. Generate a dedicated mint authority keypair
  const mintAuthority = Keypair.generate();
  console.log("\nMint authority (new):", mintAuthority.publicKey.toBase58());

  // 2. Create mock USDC mint (6 decimals)
  console.log("Creating mock USDC mint...");
  const mint = await createMint(
    connection,
    payer,                        // fee payer
    mintAuthority.publicKey,      // mint authority
    mintAuthority.publicKey,      // freeze authority (same for simplicity)
    6
  );
  console.log("Mock USDC Mint:", mint.toBase58());

  // 3. Derive vault PDA
  const [vaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault")],
    PROGRAM_ID
  );
  console.log("Vault PDA:", vaultPDA.toBase58());

  // 4. Create vault ATA (allowOwnerOffCurve = true because vault is a PDA)
  console.log("Creating vault token account...");
  const vaultATA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    vaultPDA,
    true
  );
  console.log("Vault Token Account:", vaultATA.address.toBase58());

  // 5. Create ecosystem fund ATA
  console.log("Creating ecosystem fund token account...");
  const ecosystemATA = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mint,
    ECOSYSTEM_FUND
  );
  console.log("Ecosystem Fund Token Account:", ecosystemATA.address.toBase58());

  // Encode mint authority secret key as base64 for credentials.env
  const mintAuthorityBase64 = Buffer.from(mintAuthority.secretKey).toString("base64");

  console.log("\n============================================================");
  console.log("=== Add these lines to secrets/credentials.env           ===");
  console.log("============================================================");
  console.log(`NEXT_PUBLIC_USDC_MINT=${mint.toBase58()}`);
  console.log(`MOCK_USDC_MINT=${mint.toBase58()}`);
  console.log(`MOCK_USDC_MINT_AUTHORITY=${mintAuthorityBase64}`);
  console.log("\n============================================================");
  console.log("=== Rebuild Docker image with this extra --build-arg     ===");
  console.log("============================================================");
  console.log(`--build-arg NEXT_PUBLIC_USDC_MINT=${mint.toBase58()}`);
  console.log("\n=== Full rebuild command (run from repo root in WSL) ===");
  console.log(
    `docker buildx build --platform linux/arm64 \\
  --build-arg NEXT_PUBLIC_PRIVY_APP_ID=cmoofvdt4008o0cjps5l8nvnu \\
  --build-arg NEXT_PUBLIC_USDC_MINT=${mint.toBase58()} \\
  -t maxshchuplov/code-eternal-app:latest --push ./app`
  );
  console.log("\n=== Update VM .env then pull and restart ===");
  console.log(
    `ssh root@128.140.0.118 'cd /opt/code-eternal && docker compose -f docker/docker-compose.yml pull app && docker compose -f docker/docker-compose.yml up -d app'`
  );
}

main().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
