/**
 * Creates vault ATAs for prod + dev programs using existing USDC mint.
 * Run after devnet resets that wipe token accounts but keep the mint.
 *
 *   cd app && HELIUS_RPC_URL='...' node scripts/init-vault-atas.js
 *
 * Safe to re-run: getOrCreateAssociatedTokenAccount is idempotent.
 */

const { Connection, Keypair, PublicKey } = require("@solana/web3.js");
const { getOrCreateAssociatedTokenAccount } = require("@solana/spl-token");
const { readFileSync } = require("fs");
const { homedir } = require("os");

const USDC_MINT = new PublicKey("5f76mcT9Cgo8oRfWDnsHnZjj9ZqvjcqaXPcrEMEbQsy5");
const ECOSYSTEM_FUND = new PublicKey("CkiiA1BETdpSbt76PChhnKVzXxLjJXT99yA4yfRtT88c");
const PROD_PROGRAM_ID = new PublicKey("8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep");
const DEV_PROGRAM_ID  = new PublicKey("6EPLCgJA7RQ999rAVntjHSJnWzozPGGkcinZgYt15JXQ");

const RPC_URL =
  process.env.HELIUS_RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://api.devnet.solana.com";

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");

  const keyPath = `${homedir()}/.config/solana/id.json`;
  const payer = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(keyPath, "utf8")))
  );
  console.log("Payer:", payer.publicKey.toBase58());

  const balance = await connection.getBalance(payer.publicKey);
  console.log("Balance:", (balance / 1e9).toFixed(4), "SOL");
  if (balance < 0.01 * 1e9) {
    throw new Error("Insufficient SOL — run: solana airdrop 2 --url devnet");
  }

  const [prodVaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault")], PROD_PROGRAM_ID);
  const [devVaultPda]  = PublicKey.findProgramAddressSync([Buffer.from("vault")], DEV_PROGRAM_ID);

  console.log("\nProd vault PDA:", prodVaultPda.toBase58());
  console.log("Dev  vault PDA:", devVaultPda.toBase58());

  console.log("\nCreating/verifying prod vault ATA...");
  const prodVaultAta = await getOrCreateAssociatedTokenAccount(
    connection, payer, USDC_MINT, prodVaultPda, true
  );
  console.log("Prod vault ATA:", prodVaultAta.address.toBase58(), "✅");

  console.log("Creating/verifying dev vault ATA...");
  const devVaultAta = await getOrCreateAssociatedTokenAccount(
    connection, payer, USDC_MINT, devVaultPda, true
  );
  console.log("Dev  vault ATA:", devVaultAta.address.toBase58(), "✅");

  console.log("Creating/verifying ecosystem fund ATA...");
  const ecosystemAta = await getOrCreateAssociatedTokenAccount(
    connection, payer, USDC_MINT, ECOSYSTEM_FUND
  );
  console.log("Ecosystem ATA:", ecosystemAta.address.toBase58(), "✅");

  console.log("\n=== All token accounts ready ===");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});
