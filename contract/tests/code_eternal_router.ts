import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection } from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";
// ─── Constants ──────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const IDL = JSON.parse(fs.readFileSync(path.join(__dirname, "../../app/site-gen/idl/code_eternal_router.json"), "utf8"));
const PROGRAM_ID = new PublicKey("8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep");
const ECOSYSTEM_FUND_WALLET = new PublicKey("CkiiA1BETdpSbt76PChhnKVzXxLjJXT99yA4yfRtT88c");

// Tier 1 = $15 USDC (6 decimals)
const TIER_1 = new anchor.BN(15_000_000);

// Expected BPS amounts for Tier 1 ($15 × each %)
const VAULT_AMT = BigInt(9_750_000);  // 65%
const ECO_AMT   = BigInt(750_000);    // 5%
const REF1_AMT  = BigInt(2_250_000);  // 15%
const REF2_AMT  = BigInt(1_050_000);  // 7%
const REF3_AMT  = BigInt(450_000);    // 3%

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadBackendKeypair(): Keypair {
  if (process.env.BACKEND_PRIVATE_KEY) {
    return Keypair.fromSecretKey(Buffer.from(process.env.BACKEND_PRIVATE_KEY, "base64"));
  }
  const env = fs.readFileSync(
    path.join(__dirname, "../../secrets/credentials.env"),
    "utf8"
  );
  const m = env.match(/^BACKEND_PRIVATE_KEY=(.+)$/m);
  if (!m) throw new Error("BACKEND_PRIVATE_KEY not found in credentials.env");
  return Keypair.fromSecretKey(Buffer.from(m[1].trim(), "base64"));
}

async function confirm(conn: Connection, sig: string) {
  const bh = await conn.getLatestBlockhash();
  await conn.confirmTransaction({ signature: sig, ...bh }, "confirmed");
}

/**
 * Decode UserState from raw account bytes.
 * Layout (matches Rust struct + Anchor discriminator):
 *   [0..8]   discriminator
 *   [8..40]  owner Pubkey
 *   [40]     referrer Option flag (0=None, 1=Some)
 *   [41..73] referrer Pubkey (only if flag=1)
 *   [base+0]        tier u8
 *   [base+1..+9]    registered_at i64
 *   [base+9..+17]   tier_expires i64
 *   [base+17..+25]  memory_score u64
 *   [base+25..+89]  arweave_url [u8;64]
 *   [base+89]       site_status u8
 *   [base+90..+98]  last_site_update i64
 *   [base+98]       bump u8
 */
function decodeUserState(data: Buffer) {
  const hasReferrer = data[40] === 1;
  const base = hasReferrer ? 73 : 41;
  return {
    owner:          new PublicKey(data.slice(8, 40)),
    referrer:       hasReferrer ? new PublicKey(data.slice(41, 73)) : null,
    tier:           data[base],
    tierExpires:    data.readBigInt64LE(base + 9),
    memoryScore:    data.readBigUInt64LE(base + 17),
    arweaveUrl:     data.slice(base + 25, base + 89),
    siteStatus:     data[base + 89],
    lastSiteUpdate: data.readBigInt64LE(base + 90),
    bump:           data[base + 98],
  };
}

async function fetchUserState(conn: Connection, pda: PublicKey, retries = 6, delayMs = 500) {
  for (let i = 0; i < retries; i++) {
    const info = await conn.getAccountInfo(pda, "confirmed");
    if (info) return decodeUserState(Buffer.from(info.data));
    if (i < retries - 1) await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`UserState not found at ${pda} after ${retries} attempts`);
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("code_eternal_router", () => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new Program(IDL, provider) as any;
  const wallet  = provider.wallet as anchor.Wallet;
  const conn    = provider.connection;

  // Shared across all tests
  let usdcMint: PublicKey;
  let vaultPda: PublicKey;
  let vaultTokenAccount: PublicKey;
  let ecosystemFundTokenAccount: PublicKey;
  let backendKeypair: Keypair;

  // Main test payer (registers user in test 1, pays in test 3)
  let payer: Keypair;
  let payerTokenAccount: PublicKey;
  let payerStatePda: PublicKey;

  // Referral accounts (keypairs only — their ATAs created in test 4)
  let ref1: Keypair, ref2: Keypair, ref3: Keypair;

  before(async () => {
    try {
      backendKeypair = loadBackendKeypair();
    } catch {
      console.warn("BACKEND_PRIVATE_KEY not available — update_site_url tests will be skipped");
    }
    payer = Keypair.generate();
    ref1  = Keypair.generate();
    ref2  = Keypair.generate();
    ref3  = Keypair.generate();

    [payerStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), payer.publicKey.toBuffer()],
      PROGRAM_ID
    );

    // Fund payer with SOL for gas
    await confirm(conn, await conn.requestAirdrop(payer.publicKey, 2e9));

    // Fresh mock USDC mint — we hold mint authority (mirrors devnet setup)
    usdcMint = await createMint(conn, wallet.payer, wallet.publicKey, null, 6);

    // Payer token account — mint $2000 for all test runs
    const payerAta = await getOrCreateAssociatedTokenAccount(
      conn, wallet.payer, usdcMint, payer.publicKey
    );
    payerTokenAccount = payerAta.address;
    await mintTo(conn, wallet.payer, usdcMint, payerTokenAccount, wallet.publicKey, 2_000_000_000);

    // Vault PDA + its USDC ATA
    [vaultPda] = PublicKey.findProgramAddressSync([Buffer.from("vault")], PROGRAM_ID);
    const vaultAta = await getOrCreateAssociatedTokenAccount(
      conn, wallet.payer, usdcMint, vaultPda, true  // allowOwnerOffCurve = PDA
    );
    vaultTokenAccount = vaultAta.address;

    // Ecosystem fund USDC ATA
    const ecoAta = await getOrCreateAssociatedTokenAccount(
      conn, wallet.payer, usdcMint, ECOSYSTEM_FUND_WALLET
    );
    ecosystemFundTokenAccount = ecoAta.address;
  });

  // ─── register_user ─────────────────────────────────────────────────────────

  it("register_user: creates UserState with tier=0, no referrer", async () => {
    await program.methods
      .registerUser(null)
      .accounts({
        payer:         payer.publicKey,
        userState:     payerStatePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    const state = await fetchUserState(conn, payerStatePda);
    expect(state.owner.toString()).to.equal(payer.publicKey.toString());
    expect(state.tier).to.equal(0);
    expect(state.referrer).to.be.null;
    expect(state.memoryScore).to.equal(0n);
  });

  it("register_user: rejects self-referral", async () => {
    const u = Keypair.generate();
    await confirm(conn, await conn.requestAirdrop(u.publicKey, 1e9));
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), u.publicKey.toBuffer()], PROGRAM_ID
    );

    try {
      await program.methods
        .registerUser(u.publicKey)
        .accounts({ payer: u.publicKey, userState: pda, systemProgram: SystemProgram.programId })
        .signers([u])
        .rpc();
      expect.fail("Expected SelfReferral error");
    } catch (e: any) {
      expect(e.message).to.include("SelfReferral");
    }
  });

  // ─── process_payment ───────────────────────────────────────────────────────

  it("process_payment Tier1, no referrals: vault=65%, eco=5%, burn=30%, tier updated", async () => {
    const vaultBefore = (await getAccount(conn, vaultTokenAccount)).amount;
    const ecoBefore   = (await getAccount(conn, ecosystemFundTokenAccount)).amount;
    const payerBefore = (await getAccount(conn, payerTokenAccount)).amount;

    await program.methods
      .processPayment(TIER_1, 1, null, null, null)
      .accounts({
        payer:                      payer.publicKey,
        userState:                  payerStatePda,
        payerTokenAccount:          payerTokenAccount,
        vault:                      vaultPda,
        vaultTokenAccount:          vaultTokenAccount,
        ecosystemFundTokenAccount:  ecosystemFundTokenAccount,
        ref1TokenAccount:           payerTokenAccount,
        ref2TokenAccount:           payerTokenAccount,
        ref3TokenAccount:           payerTokenAccount,
        paymentMint:                usdcMint,
        tokenProgram:               TOKEN_PROGRAM_ID,
        associatedTokenProgram:     ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:              SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    await new Promise(r => setTimeout(r, 1000));
    const vaultDelta = (await getAccount(conn, vaultTokenAccount)).amount - vaultBefore;
    const ecoDelta   = (await getAccount(conn, ecosystemFundTokenAccount)).amount - ecoBefore;
    const payerDelta = payerBefore - (await getAccount(conn, payerTokenAccount)).amount;

    expect(vaultDelta).to.equal(VAULT_AMT);           // 9,750,000
    expect(ecoDelta).to.equal(ECO_AMT);                // 750,000
    expect(payerDelta).to.equal(BigInt(15_000_000));   // full $15 debited (refs + burn go elsewhere)

    const state = await fetchUserState(conn, payerStatePda);
    expect(state.tier).to.equal(1);
    expect(state.tierExpires > 0n).to.be.true; // should be ~now + 30 days
  });

  it("process_payment Tier1, 3 referrals: vault=65%, ref1=15%, ref2=7%, ref3=3%, burn=5%", async () => {
    // Fund ref1/ref2/ref3 with SOL so they can pay PDA rent
    await confirm(conn, await conn.requestAirdrop(ref1.publicKey, 2e9));
    await confirm(conn, await conn.requestAirdrop(ref2.publicKey, 2e9));
    await confirm(conn, await conn.requestAirdrop(ref3.publicKey, 2e9));

    // Derive UserState PDAs for ref1/ref2/ref3
    const [ref1Pda] = PublicKey.findProgramAddressSync([Buffer.from("user"), ref1.publicKey.toBuffer()], PROGRAM_ID);
    const [ref2Pda] = PublicKey.findProgramAddressSync([Buffer.from("user"), ref2.publicKey.toBuffer()], PROGRAM_ID);
    const [ref3Pda] = PublicKey.findProgramAddressSync([Buffer.from("user"), ref3.publicKey.toBuffer()], PROGRAM_ID);

    // Register the chain: ref3 ← ref2 ← ref1 ← payer2
    await program.methods.registerUser(null)
      .accounts({ payer: ref3.publicKey, userState: ref3Pda, systemProgram: SystemProgram.programId })
      .signers([ref3]).rpc();
    await program.methods.registerUser(ref3.publicKey)
      .accounts({ payer: ref2.publicKey, userState: ref2Pda, systemProgram: SystemProgram.programId })
      .signers([ref2]).rpc();
    await program.methods.registerUser(ref2.publicKey)
      .accounts({ payer: ref1.publicKey, userState: ref1Pda, systemProgram: SystemProgram.programId })
      .signers([ref1]).rpc();

    // Fresh payer2 — registered with ref1 as referrer
    const payer2 = Keypair.generate();
    await confirm(conn, await conn.requestAirdrop(payer2.publicKey, 2e9));
    const payer2Ata = await getOrCreateAssociatedTokenAccount(conn, wallet.payer, usdcMint, payer2.publicKey);
    await mintTo(conn, wallet.payer, usdcMint, payer2Ata.address, wallet.publicKey, 2_000_000_000);
    const [payer2Pda] = PublicKey.findProgramAddressSync([Buffer.from("user"), payer2.publicKey.toBuffer()], PROGRAM_ID);
    await program.methods.registerUser(ref1.publicKey)
      .accounts({ payer: payer2.publicKey, userState: payer2Pda, systemProgram: SystemProgram.programId })
      .signers([payer2]).rpc();

    // Create referral ATAs (token accounts owned by ref1/ref2/ref3 wallets)
    const r1Ata = await getOrCreateAssociatedTokenAccount(conn, wallet.payer, usdcMint, ref1.publicKey);
    const r2Ata = await getOrCreateAssociatedTokenAccount(conn, wallet.payer, usdcMint, ref2.publicKey);
    const r3Ata = await getOrCreateAssociatedTokenAccount(conn, wallet.payer, usdcMint, ref3.publicKey);

    const r1Before    = (await getAccount(conn, r1Ata.address)).amount;
    const r2Before    = (await getAccount(conn, r2Ata.address)).amount;
    const r3Before    = (await getAccount(conn, r3Ata.address)).amount;
    const vaultBefore = (await getAccount(conn, vaultTokenAccount)).amount;

    await program.methods
      .processPayment(TIER_1, 1, ref1.publicKey, ref2.publicKey, ref3.publicKey)
      .accounts({
        payer:                      payer2.publicKey,
        userState:                  payer2Pda,
        payerTokenAccount:          payer2Ata.address,
        vault:                      vaultPda,
        vaultTokenAccount:          vaultTokenAccount,
        ecosystemFundTokenAccount:  ecosystemFundTokenAccount,
        ref1TokenAccount:           r1Ata.address,
        ref2TokenAccount:           r2Ata.address,
        ref3TokenAccount:           r3Ata.address,
        paymentMint:                usdcMint,
        tokenProgram:               TOKEN_PROGRAM_ID,
        associatedTokenProgram:     ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram:              SystemProgram.programId,
      })
      // ref1_state and ref2_state passed as remaining accounts for on-chain chain validation
      .remainingAccounts([
        { pubkey: ref1Pda, isWritable: false, isSigner: false },
        { pubkey: ref2Pda, isWritable: false, isSigner: false },
      ])
      .signers([payer2])
      .rpc();

    expect((await getAccount(conn, r1Ata.address)).amount - r1Before).to.equal(REF1_AMT);
    expect((await getAccount(conn, r2Ata.address)).amount - r2Before).to.equal(REF2_AMT);
    expect((await getAccount(conn, r3Ata.address)).amount - r3Before).to.equal(REF3_AMT);
    expect((await getAccount(conn, vaultTokenAccount)).amount - vaultBefore).to.equal(VAULT_AMT);
  });

  // ─── update_site_url ───────────────────────────────────────────────────────

  it("update_site_url: backend sets arweave URL and site_status=1", async function() {
    if (!backendKeypair) return this.skip();
    const TX_ID = "SomeArweaveTxId1234567890abcdefghijklm"; // ≤43 chars
    const arweaveUrl = new Uint8Array(64);
    arweaveUrl.set(Buffer.from(TX_ID));

    await program.methods
      .updateSiteUrl(Array.from(arweaveUrl), 1)
      .accounts({
        backendAuthority: backendKeypair.publicKey,
        userState:        payerStatePda,
        userWallet:       payer.publicKey,
      })
      .signers([backendKeypair])
      .rpc();

    await new Promise(r => setTimeout(r, 1000));
    const state = await fetchUserState(conn, payerStatePda);
    expect(state.siteStatus).to.equal(1);
    expect(
      Buffer.from(state.arweaveUrl).toString("utf8").replace(/\0+$/, "")
    ).to.equal(TX_ID);
  });

  it("update_site_url: rejects unauthorized signer", async function() {
    if (!backendKeypair) return this.skip();
    const bad = Keypair.generate();
    await confirm(conn, await conn.requestAirdrop(bad.publicKey, 1e9));

    try {
      await program.methods
        .updateSiteUrl(Array.from(new Uint8Array(64)), 1)
        .accounts({
          backendAuthority: bad.publicKey,
          userState:        payerStatePda,
          userWallet:       payer.publicKey,
        })
        .signers([bad])
        .rpc();
      expect.fail("Expected UnauthorizedBackend error");
    } catch (e: any) {
      expect(e.message).to.include("UnauthorizedBackend");
    }
  });
});
