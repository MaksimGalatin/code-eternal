import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CodeEternalRouter } from "../target/types/code_eternal_router";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import { expect } from "chai";

describe("code_eternal_router", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.CodeEternalRouter as Program<CodeEternalRouter>;

  let usdcMint: PublicKey;
  let payer: Keypair;
  let payerTokenAccount: PublicKey;
  let ref1: Keypair;
  let ref2: Keypair;
  let ref3: Keypair;

  const TIER_1_AMOUNT = new anchor.BN(10_000_000); // $10 USDC

  before(async () => {
    payer = Keypair.generate();
    ref1 = Keypair.generate();
    ref2 = Keypair.generate();
    ref3 = Keypair.generate();

    // Airdrop SOL for tests
    await provider.connection.requestAirdrop(payer.publicKey, 2e9);
    await new Promise(r => setTimeout(r, 1000));

    // Create mock USDC mint
    usdcMint = await createMint(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      provider.wallet.publicKey,
      null,
      6 // 6 decimals like real USDC
    );

    // Create token accounts
    payerTokenAccount = await createAssociatedTokenAccount(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      usdcMint,
      payer.publicKey
    );

    // Mint $100 USDC for tests
    await mintTo(
      provider.connection,
      (provider.wallet as anchor.Wallet).payer,
      usdcMint,
      payerTokenAccount,
      provider.wallet.publicKey,
      100_000_000 // $100
    );
  });

  // ─── register_user ───────────────────────────────────────────────

  it("Registers a new user without a referral", async () => {
    const [userStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), payer.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .registerUser(null)
      .accounts({
        payer: payer.publicKey,
        userState: userStatePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer])
      .rpc();

    const state = await program.account.userState.fetch(userStatePda);
    expect(state.owner.toString()).to.equal(payer.publicKey.toString());
    expect(state.tier).to.equal(0); // tier starts at 0, set during process_payment
    expect(state.referrer).to.be.null;
    expect(state.memoryScore.toNumber()).to.equal(0);
    console.log("✅ register_user: OK");
  });

  it("Rejects self-referral", async () => {
    const newUser = Keypair.generate();
    await provider.connection.requestAirdrop(newUser.publicKey, 1e9);
    await new Promise(r => setTimeout(r, 500));

    const [userStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), newUser.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .registerUser(newUser.publicKey) // referrer = self
        .accounts({
          payer: newUser.publicKey,
          userState: userStatePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([newUser])
        .rpc();
      expect.fail("Expected SelfReferral error");
    } catch (e: any) {
      expect(e.message).to.include("SelfReferral");
      console.log("✅ self-referral rejected: OK");
    }
  });

  // ─── process_payment ─────────────────────────────────────────────

  it("Processes Tier 1 ($10) payment without referrals — maximum burn", async () => {
    // TODO: implement after vault PDA and referral token accounts are set up
    // This test verifies 65% goes to vault and 35% goes to burn_amount in event
    console.log("⏳ process_payment test: TODO — requires vault setup");
  });

  it("Processes Tier 1 ($10) payment with three referrals — minimum burn", async () => {
    console.log("⏳ process_payment with refs: TODO — requires ref token accounts");
  });
});
