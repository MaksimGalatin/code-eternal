'use client';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, Suspense } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useCreateWallet, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import bs58 from "bs58";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { IDL } from "@/idl/code_eternal_router";
import { useLang, t, type TranslationKey } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";

const TIERS: Record<number, { nameKey: TranslationKey; price: number; amount: number; color: string; rgb: string }> = {
  1: { nameKey: "tier.spark",    price: 15,   amount: 15_000_000,    color: "#7C3AED", rgb: "124,58,237" },
  2: { nameKey: "tier.archives", price: 100,  amount: 100_000_000,   color: "#D4A24C", rgb: "212,162,76" },
  3: { nameKey: "tier.dna",      price: 1000, amount: 1_000_000_000, color: "#10B981", rgb: "16,185,129" },
};

const TIER_BENEFIT_KEYS: Record<number, TranslationKey[]> = {
  1: ["buy.benefit.pdf", "buy.benefit.referral", "buy.benefit.aifa30"],
  2: ["buy.benefit.fromSpark", "buy.benefit.arweave", "buy.benefit.cnft", "buy.benefit.aifa90"],
  3: ["buy.benefit.fromArchives", "buy.benefit.voice", "buy.benefit.avatar3d", "buy.benefit.aifa365", "buy.benefit.vip"],
};

const DIST = [
  { icon: "🔥", label: "Burn",      pct: 15, color: "#f97316" },
  { icon: "💫", label: "Ecosystem", pct: 5,  color: "#7C3AED" },
  { icon: "🔗", label: "Referrals", pct: 15, color: "#10B981" },
  { icon: "🏦", label: "Vault",     pct: 65, color: "#D4A24C" },
];

const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "11111111111111111111111111111111"
);
const RPC_URL      = process.env.NEXT_PUBLIC_RPC_URL!;
const USDC_MINT_STR = process.env.NEXT_PUBLIC_USDC_MINT;
const ECOSYSTEM_FUND_WALLET = new PublicKey("CkiiA1BETdpSbt76PChhnKVzXxLjJXT99yA4yfRtT88c");

type Step = "loading" | "ready" | "airdropping" | "registering" | "paying" | "success" | "error";

const STEP_LABEL_KEYS: TranslationKey[] = ["buy.step.funding", "buy.step.registering", "buy.step.payment"];
const STEP_IDS: Step[]                  = ["airdropping", "registering", "paying"];

function shortAddr(a: string) { return `${a.slice(0, 4)}...${a.slice(-4)}`; }

function BuyPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const wallet = wallets[0];
  const { lang } = useLang();

  useEffect(() => {
    if (ready && authenticated && wallets.length === 0) createWallet().catch(() => {});
  }, [ready, authenticated, wallets.length]);

  const payingRef   = useRef(false);
  const [step, setStep]       = useState<Step>("ready");
  const [balance, setBalance] = useState<number>(0);
  const [tier, setTier]       = useState<typeof TIERS[number] | null>(null);
  const [tierId, setTierId]   = useState<number>(0);
  const [txSig, setTxSig]     = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => { if (ready && !authenticated) router.push("/"); }, [ready, authenticated, router]);

  useEffect(() => {
    const id = Number(searchParams.get("tier") ?? "0");
    if (![1, 2, 3].includes(id)) { router.replace("/cabinet"); return; }
    setTierId(id);
    setTier(TIERS[id] ?? null);
  }, [searchParams, router]);

  useEffect(() => { if (wallet && USDC_MINT_STR) loadBalance(); }, [wallet]);

  async function loadBalance() {
    if (!wallet || !USDC_MINT_STR) return;
    setStep("loading");
    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const payer = new PublicKey(wallet.address);
      const mint  = new PublicKey(USDC_MINT_STR);
      const ata   = await getAssociatedTokenAddress(mint, payer);
      try {
        const info = await connection.getTokenAccountBalance(ata);
        setBalance(info.value.uiAmount ?? 0);
      } catch { setBalance(0); }
    } catch { setBalance(0); }
    setStep("ready");
  }

  async function handlePay() {
    const currentTierId = Number(searchParams.get("tier") ?? "0");
    if (!wallet || !USDC_MINT_STR || !tier || !currentTierId) return;
    if (payingRef.current) return;
    payingRef.current = true;
    setErrorMsg("");

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const payer      = new PublicKey(wallet.address);
      const usdcMint   = new PublicKey(USDC_MINT_STR);

      const solBalance = await connection.getBalance(payer);
      const needsUsdc  = balance < tier.price;
      if (needsUsdc || solBalance < 50_000) {
        setStep("airdropping");
        const res  = await fetch("/api/devnet/airdrop-usdc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: wallet.address }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Airdrop failed");
        for (let i = 0; i < 20; i++) {
          const bal = await connection.getBalance(payer, "finalized");
          if (bal >= 5_000_000) break;
          await new Promise(r => setTimeout(r, 1000));
        }
        await new Promise(r => setTimeout(r, 5000));
        await loadBalance();
      }

      const provider = new AnchorProvider(
        connection,
        { publicKey: payer, signTransaction: async (tx: any) => tx, signAllTransactions: async (txs: any[]) => txs },
        { commitment: "confirmed" }
      );
      const program = new Program({ ...IDL, address: PROGRAM_ID.toBase58() }, provider);

      const [userStatePDA] = PublicKey.findProgramAddressSync([Buffer.from("user"), payer.toBuffer()], PROGRAM_ID);
      const [vaultPDA]     = PublicKey.findProgramAddressSync([Buffer.from("vault")], PROGRAM_ID);

      const vaultTokenAccount         = await getAssociatedTokenAddress(usdcMint, vaultPDA, true);
      const ecosystemFundTokenAccount  = await getAssociatedTokenAddress(usdcMint, ECOSYSTEM_FUND_WALLET);
      const payerTokenAccount          = await getAssociatedTokenAddress(usdcMint, payer);

      // Fetch DB referral chain as fallback for new users
      const refRes = await fetch(`/api/referrals/chain?wallet=${wallet.address}`);
      const { ref1: dbRef1, ref2: dbRef2, ref3: dbRef3 } = await refRes.json();

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

      setStep("registering");
      // Check on-chain registration; if already registered, derive the referral chain
      // from on-chain state to stay in sync with what the contract enforces.
      let needsRegister = false;
      let ref1: string | null = dbRef1;
      let ref2: string | null = dbRef2;
      let ref3: string | null = dbRef3;

      try {
        const onChain: any = await (program.account as any).userState.fetch(userStatePDA);
        // Already registered — use on-chain referrer chain (contract validates against this)
        ref1 = onChain.referrer ? onChain.referrer.toBase58() : null;
        ref2 = null;
        ref3 = null;
        if (ref1) {
          try {
            const r1Pda = PublicKey.findProgramAddressSync([Buffer.from("user"), new PublicKey(ref1).toBuffer()], PROGRAM_ID)[0];
            const r1: any = await (program.account as any).userState.fetch(r1Pda);
            ref2 = r1.referrer ? r1.referrer.toBase58() : null;
          } catch { /* ref2 stays null */ }
        }
        if (ref2) {
          try {
            const r2Pda = PublicKey.findProgramAddressSync([Buffer.from("user"), new PublicKey(ref2).toBuffer()], PROGRAM_ID)[0];
            const r2: any = await (program.account as any).userState.fetch(r2Pda);
            ref3 = r2.referrer ? r2.referrer.toBase58() : null;
          } catch { /* ref3 stays null */ }
        }
      } catch {
        needsRegister = true;
        // Keep DB-derived refs — they become the on-chain referrer chain via registerUser below
      }

      const ref1TokenAccount = ref1 ? await getAssociatedTokenAddress(usdcMint, new PublicKey(ref1)) : payerTokenAccount;
      const ref2TokenAccount = ref2 ? await getAssociatedTokenAddress(usdcMint, new PublicKey(ref2)) : payerTokenAccount;
      const ref3TokenAccount = ref3 ? await getAssociatedTokenAddress(usdcMint, new PublicKey(ref3)) : payerTokenAccount;

      const ref1StatePda = ref1
        ? PublicKey.findProgramAddressSync([Buffer.from("user"), new PublicKey(ref1).toBuffer()], PROGRAM_ID)[0]
        : null;
      const ref2StatePda = ref2
        ? PublicKey.findProgramAddressSync([Buffer.from("user"), new PublicKey(ref2).toBuffer()], PROGRAM_ID)[0]
        : null;
      const ref3StatePda = ref3
        ? PublicKey.findProgramAddressSync([Buffer.from("user"), new PublicKey(ref3).toBuffer()], PROGRAM_ID)[0]
        : null;

      if (needsRegister) {
        const registerTx = await program.methods.registerUser(ref1 ? new PublicKey(ref1) : null)
          .accounts({ payer, userState: userStatePDA, systemProgram: SystemProgram.programId })
          .transaction();
        registerTx.recentBlockhash = blockhash;
        registerTx.feePayer        = payer;
        const registerResult = await signAndSendTransaction({
          transaction: registerTx.serialize({ requireAllSignatures: false }),
          wallet,
          chain: "solana:devnet",
        });
        const registerSig = bs58.encode(registerResult.signature);
        await connection.confirmTransaction({ signature: registerSig, blockhash, lastValidBlockHeight }, "confirmed");
      }

      const { blockhash: payBlockhash, lastValidBlockHeight: payLVBH } = await connection.getLatestBlockhash("confirmed");

      setStep("paying");
      const payTx = await program.methods.processPayment(
        new BN(tier.amount), currentTierId,
        ref1 ? new PublicKey(ref1) : null,
        ref2 ? new PublicKey(ref2) : null,
        ref3 ? new PublicKey(ref3) : null
      ).accounts({
        payer, userState: userStatePDA, payerTokenAccount, vault: vaultPDA, vaultTokenAccount,
        ecosystemFundTokenAccount, ref1TokenAccount, ref2TokenAccount, ref3TokenAccount,
        paymentMint: usdcMint, tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
      }).remainingAccounts([
        ...(ref1StatePda ? [{ pubkey: ref1StatePda, isWritable: false, isSigner: false }] : []),
        ...(ref2StatePda ? [{ pubkey: ref2StatePda, isWritable: false, isSigner: false }] : []),
        ...(ref3StatePda ? [{ pubkey: ref3StatePda, isWritable: false, isSigner: false }] : []),
      ]).transaction();
      payTx.recentBlockhash = payBlockhash;
      payTx.feePayer        = payer;
      const payResult = await signAndSendTransaction({
        transaction: payTx.serialize({ requireAllSignatures: false }),
        wallet,
        chain: "solana:devnet",
      });
      const sig = bs58.encode(payResult.signature);
      const confirmation = await connection.confirmTransaction({ signature: sig, blockhash: payBlockhash, lastValidBlockHeight: payLVBH }, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      setTxSig(sig);
      setStep("success");
    } catch (e: any) {
      console.error("Payment error:", e);
      try {
        const c2 = new Connection(RPC_URL, "confirmed");
        const p2 = new PublicKey(wallet.address);
        const [pda] = PublicKey.findProgramAddressSync([Buffer.from("user"), p2.toBuffer()], PROGRAM_ID);
        const prov2 = new AnchorProvider(c2, { publicKey: p2, signTransaction: async (t: any) => t, signAllTransactions: async (t: any[]) => t }, {});
        const prog2 = new Program({ ...IDL, address: PROGRAM_ID.toBase58() }, prov2);
        const state: any = await (prog2.account as any).userState.fetch(pda);
        if (state.tier >= currentTierId) { setStep("success"); return; }
      } catch {}
      setErrorMsg(e.message ?? "Transaction failed");
      setStep("error");
    } finally {
      payingRef.current = false;
    }
  }

  const walletReady    = !!wallet;
  const isProcessing   = ["loading", "airdropping", "registering", "paying"].includes(step);
  const canPay         = walletReady && !isProcessing && step !== "success" && !!tier && !!USDC_MINT_STR;
  const currentStepIdx = STEP_IDS.indexOf(step);
  const progressPct    = step === "airdropping" ? 15 : step === "registering" ? 50 : step === "paying" ? 85 : 0;

  const btnLabel = !walletReady           ? t("buy.preparing", lang)
                 : step === "loading"     ? t("buy.loadingBalance", lang)
                 : step === "airdropping" ? t("buy.funding", lang)
                 : step === "registering" ? t("buy.registering", lang)
                 : step === "paying"      ? t("buy.processing", lang)
                 : `${t("buy.confirm", lang)}${tier?.price}`;

  if (!ready || !authenticated) return null;
  if (!tier) return (
    <div style={S.page}><p style={{ color: "#6B6B7E" }}>{t("buy.loadingBalance", lang)}</p></div>
  );

  return (
    <>
      <div style={S.page}>
        <div style={{ position: "absolute", top: "20px", right: "20px" }}>
          <LangSwitcher />
        </div>

        {/* Back link */}
        <div style={{ width: "100%", maxWidth: "480px", marginBottom: "16px" }}>
          <button onClick={() => router.push("/cabinet")} style={S.backLink}>
            {t("buy.back", lang)}
          </button>
        </div>

        {step === "success" ? (
          /* ── Success ── */
          <div style={{ ...S.card, maxWidth: "480px", width: "100%", textAlign: "center" }}>
            <div style={S.cardHeader}>
              <span style={{ fontSize: "28px" }}>✅</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px" }}>{t("buy.success.title", lang)}</div>
                <div style={{ fontSize: "12px", opacity: 0.7 }}>{t("buy.success.sub", lang)}</div>
              </div>
            </div>
            <div style={{ padding: "28px 24px" }}>
              <div style={{ fontSize: "48px", fontWeight: 900, color: tier.color, marginBottom: "4px" }}>{t(tier.nameKey, lang)}</div>
              <div style={{ color: "#8B8B9E", fontSize: "14px", marginBottom: "24px" }}>{t("buy.success.access", lang)}</div>
              {txSig && (
                <div style={{ background: "rgba(10,10,20,0.5)", border: "1px solid rgba(42,42,58,0.6)", borderRadius: "8px", padding: "12px", marginBottom: "20px", textAlign: "left" }}>
                  <div style={{ fontSize: "10px", color: "#6B6B7E", marginBottom: "4px" }}>TRANSACTION</div>
                  <div style={{ fontSize: "11px", fontFamily: "monospace", wordBreak: "break-all", color: "#A0A0B8" }}>{txSig}</div>
                </div>
              )}
              <button onClick={() => router.push("/cabinet")} style={{ ...S.confirmBtn, background: "#10B981", boxShadow: "0 0 24px rgba(16,185,129,0.3)" }}>
                {t("buy.success.cabinet", lang)}
              </button>
            </div>
          </div>
        ) : (
          /* ── Payment card ── */
          <div style={{ ...S.card, maxWidth: "480px", width: "100%" }}>

            {/* Card header */}
            <div style={S.cardHeader}>
              <span style={{ fontSize: "24px" }}>💎</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "16px" }}>{t("buy.title", lang)}</div>
                <div style={{ fontSize: "12px", opacity: 0.7 }}>{t("buy.subtitle", lang)}</div>
              </div>
            </div>

            {/* Card body */}
            <div style={{ padding: "24px" }}>

              {/* Tier badge + name + price */}
              <div style={{ marginBottom: "16px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 10px", borderRadius: "20px", background: `rgba(${tier.rgb},0.15)`, color: tier.color, border: `1px solid rgba(${tier.rgb},0.3)` }}>
                  Tier {tierId}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                <div style={{ fontSize: "24px", fontWeight: 800, color: "rgb(232,232,240)" }}>{t(tier.nameKey, lang)}</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "32px", fontWeight: 900, color: tier.color, lineHeight: 1 }}>${tier.price}</div>
                  <div style={{ fontSize: "11px", color: "#6B6B7E", marginTop: "2px" }}>USDC on Solana</div>
                </div>
              </div>

              {/* Benefits */}
              <div style={{ marginBottom: "20px" }}>
                {TIER_BENEFIT_KEYS[tierId]?.map(key => (
                  <div key={key} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                    <span style={{ color: tier.color, fontWeight: 700, fontSize: "14px" }}>✓</span>
                    <span style={{ fontSize: "13px", color: "rgb(200,200,215)" }}>{t(key, lang)}</span>
                  </div>
                ))}
              </div>

              {/* Fund distribution */}
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", color: "#6B6B7E", letterSpacing: "1px", fontWeight: 600, marginBottom: "8px" }}>
                  {t("buy.distribution", lang).toUpperCase()}
                </div>
                <div style={{ display: "flex", height: "8px", borderRadius: "4px", overflow: "hidden", gap: "2px", marginBottom: "8px" }}>
                  {DIST.map(d => (
                    <div key={d.label} style={{ width: `${d.pct}%`, background: d.color, borderRadius: "2px" }} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: "16px" }}>
                  {DIST.map(d => (
                    <span key={d.label} style={{ fontSize: "11px", color: "#8B8B9E" }}>
                      {d.icon} {d.pct}%
                    </span>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(42,42,58,0.6)", marginBottom: "20px" }} />

              {/* Wallet row */}
              {wallet && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(10,10,20,0.4)", border: "1px solid rgba(42,42,58,0.5)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "#6B6B7E", marginBottom: "2px" }}>{t("buy.wallet", lang)}</div>
                    <div style={{ fontSize: "12px", fontFamily: "monospace", color: "#06B6D4" }}>{shortAddr(wallet.address)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "10px", color: "#6B6B7E", marginBottom: "2px" }}>{t("buy.balance", lang)}</div>
                    <div style={{ fontSize: "16px", fontWeight: 700, color: step === "loading" ? "#6B6B7E" : balance >= tier.price ? "#10B981" : "#EF4444" }}>
                      {step === "loading" ? "···" : `$${balance.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              )}

              {/* No mint warning */}
              {!USDC_MINT_STR && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", color: "#EF4444", fontSize: "12px" }}>
                  USDC mint not configured — run scripts/setup-devnet.js first.
                </div>
              )}

              {/* Progress steps */}
              {isProcessing && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    {STEP_IDS.map((s, i) => {
                      const done   = i < currentStepIdx;
                      const active = s === step;
                      return (
                        <div key={s} style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ width: "26px", height: "26px", borderRadius: "50%", margin: "0 auto 4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, transition: "all 0.3s", background: done ? "#10B981" : active ? tier.color : "rgba(42,42,58,0.8)", boxShadow: active ? `0 0 10px rgba(${tier.rgb},0.5)` : "none", color: done || active ? "#fff" : "#4a4a5e" }}>
                            {done ? "✓" : i + 1}
                          </div>
                          <div style={{ fontSize: "10px", color: active ? "#E8E8F0" : "#4a4a5e", fontWeight: active ? 600 : 400 }}>{t(STEP_LABEL_KEYS[i], lang)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ height: "3px", background: "rgba(42,42,58,0.8)", borderRadius: "2px" }}>
                    <div style={{ height: "100%", borderRadius: "2px", background: tier.color, width: `${progressPct}%`, transition: "width 0.5s ease", boxShadow: `0 0 6px rgba(${tier.rgb},0.4)` }} />
                  </div>
                </div>
              )}

              {/* Error */}
              {(step === "error" || errorMsg) && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", color: "#EF4444", fontSize: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>{errorMsg}</span>
                  <button onClick={() => { setStep("ready"); setErrorMsg(""); }} style={{ background: "none", border: "none", color: "#8B8B9E", cursor: "pointer", fontSize: "12px", textDecoration: "underline", marginLeft: "8px" }}>
                    {t("buy.tryAgain", lang)}
                  </button>
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handlePay}
                disabled={!canPay}
                style={{ ...S.confirmBtn, background: canPay ? `linear-gradient(135deg, ${tier.color}, rgba(${tier.rgb},0.7))` : "rgba(42,42,58,0.6)", boxShadow: canPay ? `0 0 24px rgba(${tier.rgb},0.3)` : "none", opacity: canPay ? 1 : 0.55, cursor: canPay ? "pointer" : "not-allowed", color: canPay ? "#fff" : "#6B6B7E" }}
              >
                {btnLabel}
              </button>

              <p style={{ textAlign: "center", fontSize: "11px", color: "#3a3a50", marginTop: "14px" }}>
                {t("buy.devnet", lang)}
              </p>
            </div>
          </div>
        )}


      </div>

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0A0A0F; }`}</style>
    </>
  );
}

const S = {
  page: {
    background: "#0A0A0F",
    minHeight: "100vh",
    color: "#E8E8F0",
    fontFamily: "'Inter', system-ui, sans-serif",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px",
  } as React.CSSProperties,

  backLink: {
    background: "none",
    border: "none",
    color: "#8B8B9E",
    cursor: "pointer",
    fontSize: "13px",
    padding: 0,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  } as React.CSSProperties,

  card: {
    background: "rgba(13,13,24,0.8)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(42,42,58,0.8)",
    borderRadius: "16px",
    overflow: "hidden" as const,
  } as React.CSSProperties,

  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "20px 24px",
    background: "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(109,40,217,0.15))",
    borderBottom: "1px solid rgba(124,58,237,0.2)",
    color: "rgb(232,232,240)",
  } as React.CSSProperties,

  confirmBtn: {
    width: "100%",
    border: "none",
    borderRadius: "10px",
    padding: "15px 0",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.2s, box-shadow 0.2s",
    letterSpacing: "0.02em",
  } as React.CSSProperties,

  alfaBtn: {
    marginTop: "20px",
    background: "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2))",
    border: "1px solid rgba(124,58,237,0.35)",
    borderRadius: "24px",
    padding: "12px 28px",
    color: "rgb(232,232,240)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  } as React.CSSProperties,
};

function BuyPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0A0A0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6B6B7E", fontFamily: "Inter,sans-serif" }}>...</div>}>
      <BuyPageInner />
    </Suspense>
  );
}

export default dynamic(() => Promise.resolve({ default: BuyPage }), { ssr: false });
