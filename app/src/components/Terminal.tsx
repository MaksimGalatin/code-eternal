import React, { useState, useEffect } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { TIER_NAMES, SITE_STATUS } from "@/idl/code_eternal_router";
import { useUserState } from "@/hooks/useUserState";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

function shortAddr(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function Line({ label, value, color = "text-terminal-green" }: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex gap-2">
      <span className="text-terminal-dim w-28 shrink-0">&gt; {label}:</span>
      <span className={color}>{value}</span>
    </div>
  );
}

function Separator() {
  return <div className="text-terminal-muted">{"─".repeat(48)}</div>;
}

export default function Terminal() {
  const { login, logout, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [blink, setBlink] = useState(true);

  const solanaWallet = wallets.find(
    (w) => w.type === "solana" || (w as { chainType?: string }).chainType === "solana"
  );
  const walletAddress = solanaWallet?.address ?? null;

  const { info, loading, refetch } = useUserState(walletAddress);

  // cursor blink
  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 500);
    return () => clearInterval(t);
  }, []);

  async function signTestTx() {
    if (!solanaWallet || !walletAddress) return;
    setTxStatus("SIGNING...");
    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const pubkey = new PublicKey(walletAddress);
      const { blockhash } = await connection.getLatestBlockhash();

      const tx = new Transaction();
      tx.recentBlockhash = blockhash;
      tx.feePayer = pubkey;
      // self-transfer 0 lamports — valid no-op tx
      tx.add(
        SystemProgram.transfer({ fromPubkey: pubkey, toPubkey: pubkey, lamports: 0 })
      );

      const signed = await solanaWallet.signTransaction(tx as Parameters<typeof solanaWallet.signTransaction>[0]);
      const sig = await connection.sendRawTransaction((signed as Transaction).serialize());
      setTxStatus(`OK: ${sig.slice(0, 8)}...`);
      setTimeout(() => setTxStatus(null), 5000);
    } catch (e) {
      setTxStatus(`ERR: ${e instanceof Error ? e.message.slice(0, 40) : "unknown"}`);
      setTimeout(() => setTxStatus(null), 5000);
    }
  }

  const arweaveUrl = info?.userState
    ? String.fromCharCode(...info.userState.arweave_url.filter((b) => b !== 0))
    : null;

  return (
    <div className="min-h-screen bg-terminal-bg text-terminal-green font-mono p-6 md:p-10">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <pre className="text-terminal-green text-xs md:text-sm leading-tight mb-6 select-none">
{`
  ██████╗ ██████╗ ██████╗ ███████╗    ███████╗████████╗███████╗██████╗ ███╗   ██╗ █████╗ ██╗
 ██╔════╝██╔═══██╗██╔══██╗██╔════╝    ██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗  ██║██╔══██╗██║
 ██║     ██║   ██║██║  ██║█████╗      █████╗     ██║   █████╗  ██████╔╝██╔██╗ ██║███████║██║
 ██║     ██║   ██║██║  ██║██╔══╝      ██╔══╝     ██║   ██╔══╝  ██╔══██╗██║╚██╗██║██╔══██║██║
 ╚██████╗╚██████╔╝██████╔╝███████╗    ███████╗   ██║   ███████╗██║  ██║██║ ╚████║██║  ██║███████╗
  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝    ╚══════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝`}
        </pre>

        <div className="text-terminal-dim text-xs mb-1">YOUR MEMORY LIVES FOREVER — PROOF OF SOUL ON SOLANA</div>
        <div className="text-terminal-muted text-xs mb-6">NETWORK: DEVNET | PROGRAM: 8rzMmrC...AEep</div>

        <Separator />

        {/* Status block */}
        <div className="my-4 space-y-1 text-sm">
          {!authenticated ? (
            <>
              <Line label="STATUS" value="NOT CONNECTED" color="text-terminal-amber" />
              <Line label="AUTH" value="AWAITING LOGIN" color="text-terminal-dim" />
            </>
          ) : (
            <>
              <Line label="STATUS" value="CONNECTED" color="text-terminal-green" />
              <Line label="AUTH" value={user?.email?.address ?? user?.google?.email ?? "PRIVY USER"} />
              <Line label="WALLET" value={walletAddress ? shortAddr(walletAddress) : "GENERATING..."} />
              {loading ? (
                <Line label="CHAIN" value="FETCHING..." color="text-terminal-dim" />
              ) : info ? (
                <>
                  <Line label="SOL" value={`${info.solBalance.toFixed(4)} SOL`} />
                  <Line label="USDC" value={`${info.usdcBalance.toFixed(2)} USDC`} />
                  <Separator />
                  <Line label="TIER" value={TIER_NAMES[info.userState?.tier ?? 0]} color={info.isRegistered ? "text-terminal-cyan" : "text-terminal-amber"} />
                  {info.isRegistered && info.userState && (
                    <>
                      <Line label="SITE" value={SITE_STATUS[info.userState.site_status]} color={info.userState.site_status === 1 ? "text-terminal-green" : "text-terminal-amber"} />
                      {arweaveUrl && (
                        <Line label="ARWEAVE" value={arweaveUrl} color="text-terminal-cyan" />
                      )}
                      <Line label="MEMORY" value={`${info.userState.memory_score} pts`} />
                    </>
                  )}
                </>
              ) : null}

              {txStatus && (
                <>
                  <Separator />
                  <Line label="TX" value={txStatus} color={txStatus.startsWith("OK") ? "text-terminal-green" : "text-terminal-amber"} />
                </>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* Prompt line */}
        <div className="mt-4 text-sm">
          <span className="text-terminal-dim">root@code-eternal:~$ </span>
          <span className={blink ? "opacity-100" : "opacity-0"}>█</span>
        </div>

        {/* Action buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {!authenticated ? (
            <>
              <TerminalButton onClick={() => login({ loginMethods: ["google"] })}>
                LOGIN:GOOGLE
              </TerminalButton>
              <TerminalButton onClick={() => login({ loginMethods: ["email"] })}>
                LOGIN:EMAIL
              </TerminalButton>
            </>
          ) : (
            <>
              {walletAddress && !loading && (
                <>
                  <TerminalButton onClick={signTestTx}>
                    SIGN TEST TX
                  </TerminalButton>
                  <TerminalButton onClick={refetch}>
                    REFRESH
                  </TerminalButton>
                </>
              )}
              <TerminalButton onClick={logout} danger>
                LOGOUT
              </TerminalButton>
            </>
          )}
        </div>

        <div className="mt-10 text-terminal-muted text-xs">
          [CODE ETERNAL v0.1.0] [SOLANA DEVNET] [ANCHOR 0.30.1]
        </div>
      </div>
    </div>
  );
}

function TerminalButton({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-mono border transition-colors
        ${danger
          ? "border-terminal-red text-terminal-red hover:bg-terminal-red hover:text-terminal-bg"
          : "border-terminal-green text-terminal-green hover:bg-terminal-green hover:text-terminal-bg"
        }
      `}
    >
      [{children}]
    </button>
  );
}
