import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { IDL } from "@/idl/code_eternal_router";

const TIERS: Record<number, { name: string; price: number; amount: number; color: string }> = {
  1: { name: "Spark", price: 15, amount: 15_000_000, color: "#7C3AED" },
  2: { name: "Family Archives", price: 100, amount: 100_000_000, color: "#D4A24C" },
  3: { name: "Digital DNA", price: 1000, amount: 1_000_000_000, color: "#10B981" },
};

const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!);
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const USDC_MINT_STR = process.env.NEXT_PUBLIC_USDC_MINT;
const ECOSYSTEM_FUND_WALLET = new PublicKey("CkiiA1BETdpSbt76PChhnKVzXxLjJXT99yA4yfRtT88c");

type Step =
  | "loading"
  | "ready"
  | "airdropping"
  | "registering"
  | "paying"
  | "success"
  | "error";

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function BuyPage() {
  const router = useRouter();
  const { authenticated, ready } = usePrivy();
  const { wallets } = useSolanaWallets();
  const wallet = wallets[0];

  const tierId = Number(router.query.tier);
  const tier = TIERS[tierId];

  const [step, setStep] = useState<Step>("loading");
  const [balance, setBalance] = useState<number>(0);
  const [txSig, setTxSig] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (wallet && USDC_MINT_STR) loadBalance();
  }, [wallet]);

  async function loadBalance() {
    if (!wallet || !USDC_MINT_STR) return;
    setStep("loading");
    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const payer = new PublicKey(wallet.address);
      const mint = new PublicKey(USDC_MINT_STR);
      const ata = await getAssociatedTokenAddress(mint, payer);
      try {
        const info = await connection.getTokenAccountBalance(ata);
        setBalance(info.value.uiAmount ?? 0);
      } catch {
        setBalance(0);
      }
    } catch {
      setBalance(0);
    }
    setStep("ready");
  }

  async function handleAirdrop() {
    if (!wallet) return;
    setErrorMsg("");
    setStep("airdropping");
    try {
      const res = await fetch("/api/devnet/airdrop-usdc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: wallet.address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Airdrop failed");
      await loadBalance();
    } catch (e: any) {
      setErrorMsg(e.message ?? "Airdrop failed");
      setStep("error");
    }
  }

  async function handlePay() {
    if (!wallet || !USDC_MINT_STR || !tier) return;
    setErrorMsg("");

    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const payer = new PublicKey(wallet.address);
      const usdcMint = new PublicKey(USDC_MINT_STR);

      // Wrap Privy wallet into Anchor-compatible wallet interface
      const anchorWallet = {
        publicKey: payer,
        signTransaction: <T extends Transaction | VersionedTransaction>(tx: T) =>
          wallet.signTransaction(tx as Transaction) as Promise<T>,
        signAllTransactions: <T extends Transaction | VersionedTransaction>(txs: T[]) =>
          wallet.signAllTransactions(txs as Transaction[]) as Promise<T[]>,
      };
      const provider = new AnchorProvider(connection, anchorWallet as any, {
        commitment: "confirmed",
      });
      const program = new Program(IDL, provider);

      // Derive PDAs
      const [userStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("user"), payer.toBuffer()],
        PROGRAM_ID
      );
      const [vaultPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault")],
        PROGRAM_ID
      );

      // Derive ATAs
      const vaultTokenAccount = await getAssociatedTokenAddress(usdcMint, vaultPDA, true);
      const ecosystemFundTokenAccount = await getAssociatedTokenAddress(
        usdcMint,
        ECOSYSTEM_FUND_WALLET
      );
      const payerTokenAccount = await getAssociatedTokenAddress(usdcMint, payer);

      // Fetch referral chain from DB
      const refRes = await fetch(`/api/referrals/chain?wallet=${wallet.address}`);
      const { ref1, ref2, ref3 } = await refRes.json();

      const ref1TokenAccount = ref1
        ? await getAssociatedTokenAddress(usdcMint, new PublicKey(ref1))
        : SystemProgram.programId;
      const ref2TokenAccount = ref2
        ? await getAssociatedTokenAddress(usdcMint, new PublicKey(ref2))
        : SystemProgram.programId;
      const ref3TokenAccount = ref3
        ? await getAssociatedTokenAddress(usdcMint, new PublicKey(ref3))
        : SystemProgram.programId;

      // Register user on-chain if UserState PDA doesn't exist yet
      setStep("registering");
      let needsRegister = false;
      try {
        await program.account.userState.fetch(userStatePDA);
      } catch {
        needsRegister = true;
      }
      if (needsRegister) {
        await program.methods
          .registerUser(null)
          .accounts({
            payer,
            userState: userStatePDA,
            systemProgram: SystemProgram.programId,
          })
          .rpc();
      }

      // Call process_payment
      setStep("paying");
      const sig = await program.methods
        .processPayment(
          new BN(tier.amount),
          tierId,
          ref1 ? new PublicKey(ref1) : null,
          ref2 ? new PublicKey(ref2) : null,
          ref3 ? new PublicKey(ref3) : null
        )
        .accounts({
          payer,
          userState: userStatePDA,
          payerTokenAccount,
          vault: vaultPDA,
          vaultTokenAccount,
          ecosystemFundTokenAccount,
          ref1TokenAccount,
          ref2TokenAccount,
          ref3TokenAccount,
          paymentMint: usdcMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setTxSig(sig);
      setStep("success");
    } catch (e: any) {
      console.error("Payment error:", e);
      setErrorMsg(e.message ?? "Transaction failed");
      setStep("error");
    }
  }

  const isProcessing = ["loading", "airdropping", "registering", "paying"].includes(step);
  const canPay =
    !isProcessing &&
    step !== "success" &&
    !!USDC_MINT_STR &&
    balance >= (tier?.price ?? Infinity);

  if (!ready || !authenticated) return null;

  if (!tier) {
    return (
      <div style={centeredPage}>
        <span style={{ color: "#8B8B9E" }}>Invalid tier. </span>
        <button onClick={() => router.push("/cabinet")} style={linkBtn}>
          Back to cabinet
        </button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Buy {tier.name} — CODE ETERNAL</title>
      </Head>
      <div style={centeredPage}>
        <div style={{ maxWidth: "480px", width: "100%" }}>
          {/* Header */}
          <h1 style={{ color: "#7C3AED", marginBottom: "4px", fontSize: "22px" }}>
            CODE ETERNAL
          </h1>
          <button onClick={() => router.push("/cabinet")} style={linkBtn}>
            ← Back
          </button>

          {/* Success state */}
          {step === "success" ? (
            <div
              style={{
                background: "#13131C",
                border: "2px solid #10B981",
                borderRadius: "12px",
                padding: "40px 32px",
                textAlign: "center",
                marginTop: "24px",
              }}
            >
              <div style={{ fontSize: "52px", marginBottom: "12px" }}>✓</div>
              <h2 style={{ color: "#10B981", marginBottom: "8px" }}>Payment successful!</h2>
              <p style={{ color: "#8B8B9E", fontSize: "14px", marginBottom: "24px" }}>
                {tier.name} access activated. Your eternal site is being generated.
              </p>
              {txSig && (
                <p
                  style={{
                    color: "#6B6B7E",
                    fontSize: "11px",
                    wordBreak: "break-all",
                    marginBottom: "24px",
                    fontFamily: "monospace",
                  }}
                >
                  TX: {txSig}
                </p>
              )}
              <button
                onClick={() => router.push("/cabinet")}
                style={{ ...primaryBtn, background: "#10B981" }}
              >
                Back to Cabinet
              </button>
            </div>
          ) : (
            <div
              style={{
                background: "#13131C",
                border: `2px solid ${tier.color}`,
                borderRadius: "12px",
                padding: "32px",
                marginTop: "24px",
              }}
            >
              {/* Tier info */}
              <div style={{ marginBottom: "24px" }}>
                <div
                  style={{ fontSize: "36px", fontWeight: "bold", color: tier.color }}
                >
                  ${tier.price}
                </div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#E8E8F0" }}>
                  {tier.name}
                </div>
              </div>

              {/* Wallet + balance */}
              {wallet && (
                <div
                  style={{
                    background: "#0A0A0F",
                    borderRadius: "8px",
                    padding: "16px",
                    marginBottom: "20px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ color: "#8B8B9E", fontSize: "12px", marginBottom: "2px" }}>
                        Wallet
                      </div>
                      <div style={{ fontSize: "13px", fontFamily: "monospace" }}>
                        {shortAddr(wallet.address)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#8B8B9E", fontSize: "12px", marginBottom: "2px" }}>
                        USDC balance
                      </div>
                      <div
                        style={{
                          fontSize: "18px",
                          fontWeight: "bold",
                          color:
                            step === "loading"
                              ? "#8B8B9E"
                              : balance >= tier.price
                              ? "#10B981"
                              : "#EF4444",
                        }}
                      >
                        {step === "loading" ? "..." : `$${balance.toFixed(2)}`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* No mint configured warning */}
              {!USDC_MINT_STR && (
                <div
                  style={{
                    background: "#1a0d0d",
                    border: "1px solid #EF4444",
                    borderRadius: "6px",
                    padding: "10px 14px",
                    marginBottom: "16px",
                    color: "#EF4444",
                    fontSize: "13px",
                  }}
                >
                  USDC mint not configured. Run scripts/setup-devnet.js first.
                </div>
              )}

              {/* Airdrop button — shown when balance is insufficient */}
              {USDC_MINT_STR && balance < tier.price && step !== "loading" && (
                <button
                  onClick={handleAirdrop}
                  disabled={step === "airdropping"}
                  style={{
                    ...secondaryBtn,
                    width: "100%",
                    marginBottom: "12px",
                    opacity: step === "airdropping" ? 0.5 : 1,
                    cursor: step === "airdropping" ? "not-allowed" : "pointer",
                  }}
                >
                  {step === "airdropping"
                    ? "Getting test USDC..."
                    : `Get test USDC (devnet)`}
                </button>
              )}

              {/* Pay button */}
              <button
                onClick={handlePay}
                disabled={!canPay}
                style={{
                  ...primaryBtn,
                  width: "100%",
                  background: canPay ? tier.color : "#2a2a3a",
                  opacity: canPay ? 1 : 0.5,
                  cursor: canPay ? "pointer" : "not-allowed",
                }}
              >
                {step === "registering"
                  ? "Registering on-chain..."
                  : step === "paying"
                  ? "Processing payment..."
                  : `Pay $${tier.price}`}
              </button>

              {/* Error */}
              {(step === "error" || errorMsg) && (
                <div
                  style={{
                    color: "#EF4444",
                    fontSize: "13px",
                    marginTop: "14px",
                    wordBreak: "break-word",
                    lineHeight: "1.5",
                  }}
                >
                  {errorMsg}
                  <button
                    onClick={() => { setStep("ready"); setErrorMsg(""); }}
                    style={{ ...linkBtn, marginLeft: "8px" }}
                  >
                    Try again
                  </button>
                </div>
              )}

              <p
                style={{
                  color: "#4a4a5e",
                  fontSize: "12px",
                  marginTop: "20px",
                  textAlign: "center",
                }}
              >
                Solana devnet · mock USDC
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const centeredPage: React.CSSProperties = {
  background: "#0A0A0F",
  minHeight: "100vh",
  padding: "40px 20px",
  color: "#E8E8F0",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const primaryBtn: React.CSSProperties = {
  background: "#7C3AED",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "14px 0",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  background: "transparent",
  color: "#7C3AED",
  border: "1px solid #7C3AED",
  borderRadius: "8px",
  padding: "12px 0",
  fontSize: "14px",
};

const linkBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#8B8B9E",
  cursor: "pointer",
  padding: 0,
  fontSize: "13px",
};
