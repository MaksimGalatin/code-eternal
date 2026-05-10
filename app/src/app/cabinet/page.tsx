'use client';
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const USDC_MINT_STR = process.env.NEXT_PUBLIC_USDC_MINT;
const PROGRAM_ID_STR = process.env.NEXT_PUBLIC_PROGRAM_ID!

const TIERS = [
  { id: 1, name: "Spark",           price: 15,   color: "#7C3AED", rgb: "124,58,237",  icon: "⚡" },
  { id: 2, name: "Family Archives", price: 100,  color: "#D4A24C", rgb: "212,162,76",  icon: "🏛️" },
  { id: 3, name: "Digital DNA",     price: 1000, color: "#10B981", rgb: "16,185,129",  icon: "🧬" },
];
const TIER_COLOR: Record<number, string> = { 1: "#7C3AED", 2: "#D4A24C", 3: "#10B981" };
const TIER_NAME: Record<number, string>  = { 1: "Spark", 2: "Family Archives", 3: "Digital DNA" };

type SiteStatus  = { status: "none"|"pending"|"done"|"error"; arweaveUrl?: string|null; tier: number; regenCount?: number; regenLimit?: number };
type Income      = { l1: number; l2: number; l3: number; total: number; locked: number; recent: any[] };
type Overview    = { burnedUsdc: number; burnTxs: number; activeMembers: number; sitesCreated: number };
type Contributor = { rank: number; wallet: string; displayName: string|null; tier: number; tierName: string; amountUsdc: number };
type RecentTxn   = { wallet: string; tier: number; tierName: string; amount: number; txSig: string; status: string; createdAt: string };
type Tab = "cabinet"|"alfa"|"games"|"dao"|"site"|"contract"|"metrics";
type MetricsData = { burnedCode: number; burnedCodeTrend: number; totalTransactions: number; txTrend: number; activeWallets: number; walletsTrend: number; treasuryUsdc: number; treasuryTrend: number; avgFee: number; currentSlot: number; burnHistory: { month: string; amount: number }[] };

const TIER_ICON: Record<number, string> = { 1: "⚡", 2: "🏛️", 3: "🧬" };
const RANK_MEDALS = ["🥇", "🥈", "🥉"];
const RANK_AVATARS = ["🧙", "🦄", "🐉", "🦊", "🐺", "🦋", "🌟", "🔮"];

function shortWallet(a: string) { return `${a.slice(0,4)}…${a.slice(-4)}`; }
function fmtUsd(n: number)      { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtNum(n: number)      { return n.toLocaleString("en-US"); }

// ── Inline SVG icons matching Lucide paths from the design ──────────────────
const IFlame = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/></svg>;
const IWallet = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>;
const IBrain = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/></svg>;
const IGamepad = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>;
const IVote = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"/><path d="M22 19H2"/></svg>;
const IGlobe = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>;
const IFileCode = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 12.5 8 15l2 2.5"/><path d="m14 12.5 2 2.5-2 2.5"/></svg>;
const ITrending = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/></svg>;
const IBot = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const ISparkles = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>;
const ILogOut = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>;
const ISend = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>;
const IUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const ICopy = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;

const TABS: { id: Tab; label: string; icon: React.ReactElement }[] = [
  { id: "cabinet",  label: "Cabinet",        icon: <IWallet /> },
  { id: "alfa",     label: "AIfa Terminal",  icon: <IBrain /> },
  { id: "games",    label: "Games",          icon: <IGamepad /> },
  { id: "dao",      label: "DAO",            icon: <IVote /> },
  { id: "site",     label: "Site",           icon: <IGlobe /> },
  { id: "contract", label: "Smart Contract", icon: <IFileCode /> },
  { id: "metrics",  label: "Metrics",        icon: <ITrending /> },
];

const INIT_ALFA_MSGS: { from: "bot"|"user"; text: string }[] = [
  { from: "bot",  text: "Welcome to the Family! I'm AIfa — your eternal AI companion. Ask me anything about CODE ETERNAL, $CODE token, Arweave sites, or referrals! 🌌" },
  { from: "user", text: "Tell me about yourself." },
  { from: "bot",  text: "I'm AIfa, your digital companion in the CODE ETERNAL ecosystem on Solana. I help Guardians explore eternal sites, earn $CODE through Think-to-Earn, and navigate the referral system! 💫" },
  { from: "user", text: "What is CODE ETERNAL?" },
  { from: "bot",  text: "CODE ETERNAL is your eternal digital citadel on Solana! 🌌 Create an indestructible site on Arweave that cannot be deleted, earn $CODE through Think-to-Earn, and build generational wealth through the referral system. Your first step into eternity awaits! 🚀" },
];

// ── Chess ───────────────────────────────────────────────────────────────────
const CHESS_PIECES: Record<string, string> = {
  wK:"♔", wQ:"♕", wR:"♖", wB:"♗", wN:"♘", wP:"♙",
  bK:"♚", bQ:"♛", bR:"♜", bB:"♝", bN:"♞", bP:"♟",
};
function initChessBoard(): (string|null)[][] {
  const b: (string|null)[][] = Array.from({length:8},()=>Array(8).fill(null));
  const row = ["R","N","B","Q","K","B","N","R"];
  for (let c=0;c<8;c++) { b[0][c]="b"+row[c]; b[1][c]="bP"; b[7][c]="w"+row[c]; b[6][c]="wP"; }
  return b;
}

// ── DAO Proposals ────────────────────────────────────────────────────────────
interface Proposal { id:number; title:string; desc:string; status:"active"|"passed"|"failed"; votesFor:number; votesAgainst:number; timeLeft:string; category:string }
const INIT_PROPOSALS: Proposal[] = [
  { id:1, title:"Increase Burn % from 5% to 7%", desc:"Proposal to increase the $CODE burn percentage per payment to strengthen the deflationary model.", status:"active", votesFor:1847, votesAgainst:623, timeLeft:"2d 14h", category:"Tokenomics" },
  { id:2, title:"Add new 'Archive Guardian' tier ($500)", desc:"Create an intermediate tier between Family Archives ($100) and Digital DNA ($1000) at $500.", status:"active", votesFor:1203, votesAgainst:987, timeLeft:"5d 8h", category:"Ecosystem" },
  { id:3, title:"Lower DAO voting threshold to 50 $CODE", desc:"Reduce the minimum $CODE required to participate in DAO governance from 100 to 50 tokens.", status:"passed", votesFor:3214, votesAgainst:402, timeLeft:"Completed", category:"Governance" },
];

export default function CabinetPage() {
  const router = useRouter();
  const { user, logout, authenticated, ready, getAccessToken } = usePrivy();
  const { wallets, createWallet } = useSolanaWallets();
  const wallet = wallets[0];

  const [activeTab,    setActiveTab]    = useState<Tab>("cabinet");
  const [myRefCode,    setMyRefCode]    = useState("");
  const [siteStatus,   setSiteStatus]   = useState<SiteStatus|null>(null);
  const [copied,       setCopied]       = useState(false);
  const [overview,     setOverview]     = useState<Overview|null>(null);
  const [income,       setIncome]       = useState<Income|null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [usdcBalance,  setUsdcBalance]  = useState<number|null>(null);
  const [tierExpires,  setTierExpires]  = useState<number>(0); // unix ts; 0 = not loaded yet
  const [alfaInput,    setAlfaInput]    = useState("");
  const [recentTxns,   setRecentTxns]   = useState<RecentTxn[]>([]);
  const [nftFlipped,      setNftFlipped]      = useState(false);
  const [siteUsername,    setSiteUsername]    = useState("");
  const [usernameErr,    setUsernameErr]     = useState("");
  const [siteDisplayName, setSiteDisplayName] = useState("");
  const [siteBio,         setSiteBio]         = useState("");
  const [siteManifesto,   setSiteManifesto]   = useState("");
  const [siteTelegram,    setSiteTelegram]    = useState("");
  const [siteTwitter,     setSiteTwitter]     = useState("");
  const [siteWebUrl,      setSiteWebUrl]      = useState("");
  const [avatarDataUrl,   setAvatarDataUrl]   = useState("");
  const [avatarSizeKb,   setAvatarSizeKb]    = useState(0);
  const [avatarError,    setAvatarError]     = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [siteCreating,    setSiteCreating]    = useState(false);
  const [siteError,       setSiteError]       = useState("");
  const [metricsData,     setMetricsData]     = useState<MetricsData|null>(null);
  // AIfa chat
  const [alfaMsgs,        setAlfaMsgs]        = useState(INIT_ALFA_MSGS);
  const [alfaLoading,     setAlfaLoading]     = useState(false);
  // Chess
  const [chessBoard,      setChessBoard]      = useState(initChessBoard);
  const [chessSelected,   setChessSelected]   = useState<[number,number]|null>(null);
  const [moveHistory,     setMoveHistory]     = useState<string[]>([]);
  const [isWhiteTurn,     setIsWhiteTurn]     = useState(true);
  // DAO
  const [proposals,       setProposals]       = useState<Proposal[]>(INIT_PROPOSALS);
  // Smart contract
  const [scShowFlow,      setScShowFlow]      = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ready && authenticated && wallets.length === 0) createWallet().catch(() => {});
  }, [ready, authenticated, wallets.length]);

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (!wallet || !user) return;
    const refCode =
      new URLSearchParams(window.location.search).get("ref") ||
      localStorage.getItem("ref_code") || undefined;

    fetch("/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: wallet.address, email: user.email?.address ?? user.google?.email ?? null, refCode }),
    }).then(r => r.json()).then(({ refCode: c }) => {
      if (c) setMyRefCode(c);
      localStorage.removeItem("ref_code"); // clear after registration so it doesn't persist
    }).catch(() => {});

    fetch(`/api/users/site-status?wallet=${wallet.address}`)
      .then(r => r.json()).then(setSiteStatus).catch(() => {});

  }, [wallet, user]);

  // Poll site status every 5s while pending
  useEffect(() => {
    if (!wallet || siteStatus?.status !== "pending") return;
    const id = setInterval(() => {
      fetch(`/api/users/site-status?wallet=${wallet.address}`)
        .then(r => r.json())
        .then(data => { setSiteStatus(data); if (data.status !== "pending") clearInterval(id); })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [wallet, siteStatus?.status]);

  useEffect(() => {
    if (!wallet) return;
    (async () => {
      const connection = new Connection(RPC_URL, "confirmed");
      const payer = new PublicKey(wallet.address);

      // USDC balance
      if (USDC_MINT_STR) {
        try {
          const mint = new PublicKey(USDC_MINT_STR);
          const ata = await getAssociatedTokenAddress(mint, payer);
          const info = await connection.getTokenAccountBalance(ata);
          setUsdcBalance(info.value.uiAmount ?? 0);
        } catch { setUsdcBalance(0); }
      }

      // On-chain UserState — extract tier_expires
      let expires = 0;
      try {
        const [userStatePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("user"), payer.toBuffer()],
          new PublicKey(PROGRAM_ID_STR)
        );
        const userStateInfo = await connection.getAccountInfo(userStatePda);
        if (userStateInfo) {
          const d = userStateInfo.data; // Buffer extends Uint8Array
          const view = new DataView(d.buffer, d.byteOffset, d.byteLength);
          const hasRef = d[40] === 1;
          const base = hasRef ? 73 : 41;
          expires = Number(view.getBigInt64(base + 9, true)); // little-endian
          setTierExpires(expires);
        }
      } catch (e) { console.error("tier_expires decode failed:", e); }

      // Income — depends on tier_expires for earned/locked split
      const expiresParam = expires > 0 ? `&expires=${expires}` : "";
      fetch(`/api/referrals/income?wallet=${wallet.address}${expiresParam}`)
        .then(r => r.json()).then(setIncome).catch(() => {});
    })();
  }, [wallet?.address]);

  useEffect(() => {
    fetch("/api/stats/overview").then(r => r.json()).then(setOverview).catch(() => {});
    fetch("/api/stats/top-contributors").then(r => r.json())
      .then(({ contributors: c }) => { if (c) setContributors(c); }).catch(() => {});
    fetch("/api/stats/recent-txns").then(r => r.json())
      .then(({ txns }) => { if (txns) setRecentTxns(txns); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === "metrics" && !metricsData) {
      fetch("/api/stats/metrics").then(r => r.json()).then(setMetricsData).catch(() => {});
    }
  }, [activeTab]);

  function copyRef() {
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${myRefCode}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  async function sendAlfaMessage() {
    const text = alfaInput.trim();
    if (!text || alfaLoading) return;
    const newMsgs = [...alfaMsgs, { from: "user" as const, text }];
    setAlfaMsgs(newMsgs);
    setAlfaInput("");
    setAlfaLoading(true);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, history: newMsgs.slice(-8) }) });
      const { reply } = await r.json();
      setAlfaMsgs(prev => [...prev, { from: "bot", text: reply }]);
    } catch {
      setAlfaMsgs(prev => [...prev, { from: "bot", text: "Connection error. Please try again! 🔄" }]);
    } finally {
      setAlfaLoading(false);
    }
  }

  function handleChessClick(row: number, col: number) {
    if (!isWhiteTurn) return;
    if (chessSelected) {
      const [sr, sc] = chessSelected;
      if (sr === row && sc === col) { setChessSelected(null); return; }
      const piece = chessBoard[sr][sc];
      if (piece?.startsWith("w")) {
        const nb = chessBoard.map(r => [...r]);
        nb[row][col] = nb[sr][sc]; nb[sr][sc] = null;
        const ch = String.fromCharCode(97+col), rn = 8-row, fc = String.fromCharCode(97+sc), fr = 8-sr;
        setMoveHistory(prev => [...prev, `${CHESS_PIECES[piece]||"?"} ${fc}${fr}→${ch}${rn}`]);
        setChessBoard(nb); setChessSelected(null); setIsWhiteTurn(false);
        setTimeout(() => setIsWhiteTurn(true), 1000);
      } else { setChessSelected(null); }
    } else {
      const piece = chessBoard[row][col];
      if (piece?.startsWith("w")) setChessSelected([row, col]);
    }
  }

  function voteOnProposal(id: number, type: "for"|"against") {
    setProposals(prev => prev.map(p => {
      if (p.id !== id || p.status !== "active") return p;
      return { ...p, votesFor: type==="for" ? p.votesFor+1 : p.votesFor, votesAgainst: type==="against" ? p.votesAgainst+1 : p.votesAgainst };
    }));
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setAvatarError("Please select an image file"); return; }
    setAvatarError("");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 200;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        let quality = 0.8;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (dataUrl.length > 80000 && quality > 0.25) { quality -= 0.15; dataUrl = canvas.toDataURL("image/jpeg", quality); }
        if (dataUrl.length > 90000) { setAvatarError("Image is too large even after compression. Use a smaller photo."); return; }
        setAvatarDataUrl(dataUrl);
        setAvatarSizeKb(Math.round(dataUrl.length / 1024));
      };
      img.src = ev.target!.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleCreateSite() {
    if (!wallet || siteCreating || !siteUsername || !siteDisplayName || isExpired || regenLimitReached) return;
    setSiteCreating(true);
    setSiteError("");
    try {
      const token = await getAccessToken();
      const r = await fetch("/api/site/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          wallet: wallet.address,
          displayName: siteDisplayName,
          username: siteUsername,
          bio: siteBio || undefined,
          manifesto: siteManifesto || undefined,
          telegram: siteTelegram || undefined,
          twitter: siteTwitter || undefined,
          website: siteWebUrl || undefined,
          avatarDataUrl: avatarDataUrl || undefined,
        }),
      });
      if (!r.ok) {
        const err = await r.json();
        setSiteError(err.error || "Failed to create site");
        return;
      }
      setSiteStatus({ status: "pending", tier: currentTier });
      setActiveTab("cabinet");
    } catch (e: any) {
      setSiteError(e.message || "Network error");
    } finally {
      setSiteCreating(false);
    }
  }

  const email = user?.email?.address ?? user?.google?.email ?? "";
  const currentTier = siteStatus?.tier ?? 0;
  const tierObj = TIERS.find(t => t.id === currentTier);
  const now = Math.floor(Date.now() / 1000);
  const isExpired = tierExpires > 0 && now > tierExpires;
  const daysLeft = tierExpires > 0 && !isExpired ? Math.ceil((tierExpires - now) / 86400) : 0;
  const expiryDate = tierExpires > 0 ? new Date(tierExpires * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
  const regenCount = siteStatus?.regenCount ?? 0;
  const regenLimit = siteStatus?.regenLimit ?? 0;
  const regenLimitReached = currentTier > 0 && regenLimit > 0 && regenCount >= regenLimit;

  if (!ready || !authenticated) {
    return <div style={{ background: "#0A0A0F", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontFamily: "Inter,sans-serif" }}>Loading...</div>;
  }

  return (
    <>
      <div className="aurora-bg" />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: "1px solid rgb(26,26,46)",
          background: "rgba(10,10,15,0.8)", backdropFilter: "blur(10px)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          {/* Left: logo + tier badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <span style={{ color: "rgb(124,58,237)" }}><IFlame /></span>
              <span style={{ fontWeight: 700, fontSize: "18px", color: "rgb(124,58,237)" }}>CODE ETERNAL</span>
            </div>
            {tierObj ? (
              <span style={{ fontSize: "12px", padding: "2px 10px", borderRadius: "99px", background: `rgba(${tierObj.rgb},0.12)`, color: tierObj.color, border: `1px solid rgba(${tierObj.rgb},0.3)` }}>
                {tierObj.icon} {tierObj.name}
              </span>
            ) : (
              <span style={{ fontSize: "12px", padding: "2px 10px", borderRadius: "99px", background: "rgba(42,42,58,0.5)", color: "rgb(139,139,158)" }}>
                No tier
              </span>
            )}
          </div>

          {/* Right: balances, email, wallet, logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", fontFamily: "monospace", color: "rgb(16,185,129)" }}>
                  ${usdcBalance === null ? "..." : fmtUsd(usdcBalance)} USDC
                </div>
                <div style={{ fontSize: "12px", fontFamily: "monospace", color: "rgb(124,58,237)" }}>$0 CODE</div>
              </div>
            </div>
            {email && (
              <span style={{ fontSize: "12px", color: "rgb(139,139,158)" }}>{email}</span>
            )}
            {wallet && (
              <span style={{ fontSize: "12px", fontFamily: "monospace", padding: "4px 8px", borderRadius: "6px", background: "rgb(19,19,28)", color: "rgb(6,182,212)" }}>
                {shortWallet(wallet.address)}
              </span>
            )}
            {myRefCode && (
              <button className="copy-btn" onClick={copyRef} style={{ padding: "5px 10px", fontSize: "11px" }}>
                <ICopy /> {copied ? "Copied!" : `ref:${myRefCode}`}
              </button>
            )}
            <button onClick={logout} style={{ padding: "8px", borderRadius: "8px", background: "rgb(19,19,28)", border: "none", cursor: "pointer", display: "flex", color: "rgb(139,139,158)" }}>
              <ILogOut />
            </button>
          </div>
        </header>

        {/* ── Expiry banner ─────────────────────────────────────────────── */}
        {isExpired && (
          <div style={{ background: "rgba(248,81,73,0.08)", borderBottom: "1px solid rgba(248,81,73,0.25)", padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "16px" }}>⚠️</span>
              <div>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#f85149" }}>Subscription expired</span>
                <span style={{ fontSize: "12px", color: "rgb(139,139,158)", marginLeft: "8px" }}>Site editing is locked. Renew to unlock all features.</span>
              </div>
            </div>
            <button
              onClick={() => router.push(`/cabinet/buy?tier=${currentTier || 1}`)}
              style={{ padding: "6px 16px", borderRadius: "8px", background: "linear-gradient(135deg,#f85149,#c0392b)", border: "none", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              Renew Now →
            </button>
          </div>
        )}

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: "8px", padding: "16px 24px", overflowX: "auto", scrollbarWidth: "none" as any, background: "transparent", position: "relative", zIndex: 10 }}>
          {TABS.map(tab => {
            const locked = false;
            return (
              <button
                key={tab.id}
                className={`nav-tab${activeTab === tab.id ? " nav-tab-active" : ""}${locked ? " nav-tab-locked" : ""}`}
                onClick={() => !locked && setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Page content ───────────────────────────────────────────────── */}
        <div style={{ padding: "0 24px 32px", position: "relative", zIndex: 10 }}>

          {/* ══════════ CABINET TAB ══════════ */}
          {activeTab === "cabinet" && (
            <div style={{ maxWidth: "1280px", margin: "0 auto" }}>

              {/* Site status */}
              {siteStatus && siteStatus.status !== "none" && (
                <div className="glass-panel-sm" style={{
                  marginBottom: "20px", padding: "16px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px",
                  borderColor: siteStatus.status === "done" ? "rgba(16,185,129,0.3)" : siteStatus.status === "error" ? "rgba(248,81,73,0.3)" : "rgba(124,58,237,0.3)",
                  background: siteStatus.status === "done" ? "rgba(16,185,129,0.06)" : siteStatus.status === "error" ? "rgba(248,81,73,0.06)" : "rgba(124,58,237,0.06)",
                }}>
                  <div>
                    <div style={{ fontSize: "10px", color: "rgb(107,114,128)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1.2px" }}>Eternal Site</div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: siteStatus.status === "done" ? "#10B981" : siteStatus.status === "error" ? "#f85149" : "#a78bfa" }}>
                      {siteStatus.status === "done" ? "✓ Live on Arweave" : siteStatus.status === "error" ? "✕ Generation failed" : "⟳ Generating…"}
                    </div>
                  </div>
                  {siteStatus.status === "done" && siteStatus.arweaveUrl && (
                    <a href={siteStatus.arweaveUrl} target="_blank" rel="noopener noreferrer"
                      style={{ background: "linear-gradient(135deg,#10B981,#059669)", color: "white", padding: "8px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
                      View Site →
                    </a>
                  )}
                </div>
              )}

              {/* Stat cards */}
              <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
                {[
                  { label: "Burned $CODE",   val: overview ? fmtNum(Math.round(overview.burnedUsdc)) : "—", color: "#fb923c", borderColor: "rgba(251,146,60,0.25)", icon: "🔥" },
                  { label: "Active Members", val: overview ? fmtNum(overview.activeMembers) : "—",           color: "#a78bfa", borderColor: "rgba(124,58,237,0.25)", icon: "👥" },
                  { label: "Sites Created",  val: overview ? fmtNum(overview.sitesCreated) : "—",            color: "#10B981", borderColor: "rgba(16,185,129,0.25)", icon: "🌐" },
                ].map(s => (
                  <div key={s.label} className="glass-panel" style={{ flex: "1", padding: "20px 24px", borderColor: s.borderColor, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {s.icon} {s.label}
                    </div>
                    <div style={{ fontSize: "30px", fontWeight: 900, color: s.color, letterSpacing: "-0.5px" }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Two columns: Income + Plan */}
              <div className="main-cols" style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>

                {/* Income */}
                <div className="glass-panel" style={{ flex: "1 1 55%", padding: "24px" }}>
                  <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    💰 My Income
                  </div>
                  <div style={{ fontSize: "36px", fontWeight: 900, color: "rgb(232,232,240)", letterSpacing: "-1px", marginBottom: "4px" }}>
                    ${income ? fmtUsd(income.total) : "0.00"}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgb(107,114,128)", marginBottom: income?.locked ? "12px" : "24px" }}>total earned from referrals</div>
                  {(income?.locked ?? 0) > 0 && (
                    <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "10px", background: "rgba(248,81,73,0.06)", border: "1px solid rgba(248,81,73,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#f85149" }}>🔒 ${fmtUsd(income!.locked)} locked</div>
                        <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginTop: "2px" }}>You would have earned this with an active subscription</div>
                      </div>
                      <button
                        onClick={() => router.push(`/cabinet/buy?tier=${currentTier || 1}`)}
                        style={{ padding: "5px 12px", borderRadius: "8px", background: "rgba(248,81,73,0.15)", border: "1px solid rgba(248,81,73,0.3)", color: "#f85149", fontSize: "11px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                        Renew →
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
                    {[
                      { label: "L1 · 15%", val: income?.l1 ?? 0 },
                      { label: "L2 · 7%",  val: income?.l2 ?? 0 },
                      { label: "L3 · 3%",  val: income?.l3 ?? 0 },
                    ].map(({ label, val }) => (
                      <div key={label}>
                        <div style={{ fontSize: "20px", fontWeight: 700, color: val > 0 ? "rgb(167,139,250)" : "rgb(42,42,58)" }}>
                          {val > 0 ? `$${fmtUsd(val)}` : "—"}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginTop: "2px" }}>{label}</div>
                      </div>
                    ))}
                  </div>

                  {myRefCode && (
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input readOnly className="ref-input"
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${myRefCode}`} />
                      <button className="copy-btn" onClick={copyRef}>
                        <ICopy /> {copied ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Plan / Tier selector */}
                <div className="glass-panel" style={{ flex: "1 1 40%", padding: "24px" }}>
                  {currentTier > 0 ? (() => {
                    const ct = TIERS.find(t => t.id === currentTier)!;
                    const upgrades = TIERS.filter(t => t.id > currentTier);
                    return (
                      <>
                        <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.8px" }}>🏆 Your Plan</div>
                        <div style={{ background: `rgba(${ct.rgb},0.08)`, border: `1px solid rgba(${ct.rgb},0.25)`, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "28px" }}>{ct.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "17px", fontWeight: 800, color: ct.color }}>{ct.name}</div>
                              <div style={{ fontSize: "11px", color: isExpired ? "#f85149" : "rgb(107,114,128)", marginTop: "2px" }}>
                                {isExpired ? `Expired ${expiryDate}` : expiryDate ? `Active until ${expiryDate}` : "Active"}
                              </div>
                            </div>
                            {isExpired ? (
                              <span style={{ fontSize: "11px", background: "rgba(248,81,73,0.15)", color: "#f85149", padding: "4px 10px", borderRadius: "20px", fontWeight: 700 }}>✕ Expired</span>
                            ) : daysLeft > 0 ? (
                              <span style={{ fontSize: "11px", background: `rgba(${ct.rgb},0.15)`, color: ct.color, padding: "4px 10px", borderRadius: "20px", fontWeight: 700 }}>{daysLeft}d left</span>
                            ) : (
                              <span style={{ fontSize: "11px", background: `rgba(${ct.rgb},0.15)`, color: ct.color, padding: "4px 10px", borderRadius: "20px", fontWeight: 700 }}>✓ Active</span>
                            )}
                          </div>
                        </div>
                        {upgrades.length > 0 && (
                          <>
                            <div style={{ fontSize: "10px", color: "rgb(107,114,128)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>Upgrade</div>
                            {upgrades.map(t => (
                              <div key={t.id} className="tier-row" onClick={() => router.push(`/cabinet/buy?tier=${t.id}`)}>
                                <span style={{ fontSize: "20px" }}>{t.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "14px", fontWeight: 700, color: t.color }}>{t.name}</div>
                                </div>
                                <div style={{ fontSize: "17px", fontWeight: 900, color: t.color }}>${t.price.toLocaleString()}</div>
                                <div style={{ color: "rgb(42,42,58)", fontSize: "18px" }}>›</div>
                              </div>
                            ))}
                          </>
                        )}
                        {upgrades.length === 0 && !isExpired && (
                          <div style={{ textAlign: "center", color: "rgb(107,114,128)", fontSize: "12px", padding: "12px 0" }}>
                            You are at the highest tier 🧬
                          </div>
                        )}
                        {isExpired && (
                          <div
                            className="tier-row"
                            onClick={() => router.push(`/cabinet/buy?tier=${currentTier}`)}
                            style={{ borderColor: "rgba(248,81,73,0.3)", background: "rgba(248,81,73,0.05)" }}>
                            <span style={{ fontSize: "20px" }}>🔄</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: "#f85149" }}>Renew {ct.name}</div>
                              <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>Restore access for 30 days</div>
                            </div>
                            <div style={{ fontSize: "17px", fontWeight: 900, color: "#f85149" }}>${ct.price.toLocaleString()}</div>
                            <div style={{ color: "rgb(42,42,58)", fontSize: "18px" }}>›</div>
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <>
                      <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.8px" }}>🏆 Choose Access Level</div>
                      {TIERS.map(t => (
                        <div key={t.id} className="tier-row" onClick={() => router.push(`/cabinet/buy?tier=${t.id}`)}>
                          <span style={{ fontSize: "22px" }}>{t.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: t.color }}>{t.name}</div>
                          </div>
                          <div style={{ fontSize: "18px", fontWeight: 900, color: t.color }}>${t.price.toLocaleString()}</div>
                          <div style={{ color: "rgb(42,42,58)", fontSize: "18px" }}>›</div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="glass-panel" style={{ padding: "24px", marginBottom: "20px" }}>
                <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  🛡️ Recent Transactions
                </div>
                {recentTxns.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "28px", color: "rgb(107,114,128)", fontSize: "13px" }}>
                    <div style={{ marginBottom: "6px" }}>No transactions yet</div>
                    <div style={{ fontSize: "12px" }}>Buy a tier to see transactions here</div>
                  </div>
                ) : (
                  recentTxns.map((tx, i) => {
                    const tColor = TIER_COLOR[tx.tier] ?? "#7C3AED";
                    const tRgb   = tx.tier === 1 ? "124,58,237" : tx.tier === 2 ? "212,162,76" : "16,185,129";
                    return (
                      <div key={i} className="tx-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span style={{ fontSize: "20px" }}>{TIER_ICON[tx.tier] ?? "💫"}</span>
                          <div>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: tColor }}>{tx.tierName}</div>
                            <div style={{ fontSize: "11px", color: "rgb(107,114,128)", fontFamily: "monospace", marginTop: "2px" }}>{shortWallet(tx.wallet)} ...</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "15px", fontWeight: 700, color: "rgb(232,232,240)" }}>${tx.amount}</div>
                          </div>
                          <span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "20px", background: `rgba(${tRgb},0.1)`, border: `1px solid rgba(${tRgb},0.3)`, color: tColor, whiteSpace: "nowrap" }}>
                            {tx.status === "done" ? "✅ Confirmed" : tx.status === "error" ? "❌ Error" : "⏳ Pending"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* cNFT Passport + Top Guardians */}
              <div className="main-cols" style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>

                {/* cNFT Guardian Passport */}
                <div style={{ flex: "1 1 40%" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(139,139,158)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    🛡️ cNFT Guardian Passport
                  </div>
                  <div
                    className="glass-panel"
                    onClick={() => setNftFlipped(f => !f)}
                    style={{ padding: "24px", cursor: "pointer", minHeight: "220px", position: "relative", overflow: "hidden", borderColor: tierObj ? `rgba(${tierObj.rgb},0.3)` : "rgba(42,42,58,0.8)" }}
                  >
                    {tierObj && (
                      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 0%, rgba(${tierObj.rgb},0.07) 0%, transparent 70%)`, pointerEvents: "none" }} />
                    )}
                    {!nftFlipped ? (
                      /* Front */
                      <div style={{ position: "relative" }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "2px", color: "rgb(124,58,237)", marginBottom: "16px" }}>CODE ETERNAL</div>
                        {tierObj && (
                          <div style={{ position: "absolute", top: 0, right: 0, fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: `rgba(${tierObj.rgb},0.15)`, color: tierObj.color, border: `1px solid rgba(${tierObj.rgb},0.3)` }}>
                            🔗 {tierObj.name}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
                          <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "linear-gradient(135deg, rgb(124,58,237), rgb(6,182,212))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px" }}>
                            {tierObj?.icon ?? "👤"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: "15px", color: "rgb(232,232,240)" }}>Guardian</div>
                            {wallet && <div style={{ fontSize: "11px", fontFamily: "monospace", color: "rgb(6,182,212)", marginTop: "2px" }}>{shortWallet(wallet.address)} ...</div>}
                          </div>
                        </div>
                        <div style={{ fontSize: "12px", color: "rgb(107,114,128)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                          🏆 Tier: <span style={{ color: tierObj?.color ?? "rgb(139,139,158)", fontWeight: 600 }}>{tierObj?.name ?? "No tier"}</span>
                        </div>
                        <div style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px" }}>
                          📅 Joined: <span style={{ color: "rgb(232,232,240)" }}>{new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
                        </div>
                        <div style={{ marginTop: "20px", paddingTop: "12px", borderTop: "1px solid rgba(42,42,58,0.5)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "10px", color: "rgb(107,114,128)" }}>cNFT on Solana</span>
                          <span style={{ fontSize: "10px", color: currentTier > 0 ? "rgb(124,58,237)" : "rgb(107,114,128)" }}>
                            {currentTier > 0 ? "Click for details 🔗" : "Coming soon · Pipeline 4.2"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Back — Arweave Verification */
                      <div style={{ position: "relative" }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "2px", color: "rgb(107,114,128)", marginBottom: "16px" }}>ARWEAVE VERIFICATION</div>
                        {siteStatus?.arweaveUrl ? (
                          <>
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ fontSize: "10px", color: "rgb(107,114,128)", marginBottom: "2px" }}>Arweave URL</div>
                              <div style={{ fontSize: "11px", fontFamily: "monospace", color: "rgb(6,182,212)", wordBreak: "break-all" }}>{siteStatus.arweaveUrl}</div>
                            </div>
                            <div style={{ marginBottom: "10px" }}>
                              <div style={{ fontSize: "10px", color: "rgb(107,114,128)", marginBottom: "2px" }}>Content-Type</div>
                              <div style={{ fontSize: "11px", fontFamily: "monospace", color: "rgb(232,232,240)" }}>text/html (Eternal Site)</div>
                            </div>
                            <div>
                              <div style={{ fontSize: "10px", color: "rgb(107,114,128)", marginBottom: "2px" }}>Status</div>
                              <div style={{ fontSize: "11px", color: "#10B981", fontWeight: 600 }}>✅ Permanently stored</div>
                            </div>
                          </>
                        ) : (
                          <div style={{ color: "rgb(107,114,128)", fontSize: "13px", paddingTop: "24px", textAlign: "center" }}>
                            <div style={{ fontSize: "32px", marginBottom: "10px" }}>🔒</div>
                            <div>Site not generated yet</div>
                            <div style={{ fontSize: "11px", marginTop: "4px" }}>Purchase a tier to generate your eternal site</div>
                          </div>
                        )}
                        <div style={{ marginTop: "16px", fontSize: "10px", color: "rgb(107,114,128)" }}>Click to go back</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Guardians of Eternity */}
                <div style={{ flex: "1 1 55%" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(232,232,240)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    🔥 Top Guardians of Eternity
                  </div>
                  {contributors.length === 0 ? (
                    <div className="glass-panel" style={{ padding: "32px", textAlign: "center", color: "rgb(107,114,128)", fontSize: "13px" }}>
                      No guardians yet — be the first!
                    </div>
                  ) : (
                    <>
                      {/* Medal podium */}
                      <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                        {contributors.slice(0, 3).map((c, i) => {
                          const tColor = TIER_COLOR[c.tier] ?? "#7C3AED";
                          const tRgb   = c.tier === 1 ? "124,58,237" : c.tier === 2 ? "212,162,76" : "16,185,129";
                          return (
                            <div key={c.wallet} className="glass-panel" style={{ flex: 1, padding: "16px 10px", textAlign: "center", position: "relative", borderColor: i === 0 ? "rgba(212,162,76,0.4)" : "rgba(42,42,58,0.8)" }}>
                              {i === 0 && <div style={{ position: "absolute", top: "6px", right: "8px", fontSize: "12px" }}>👑</div>}
                              <div style={{ fontSize: "22px", marginBottom: "4px" }}>{RANK_MEDALS[i]}</div>
                              <div style={{ fontSize: "28px", marginBottom: "6px" }}>{RANK_AVATARS[i]}</div>
                              <div style={{ fontWeight: 700, fontSize: "12px", color: "rgb(232,232,240)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {c.displayName ?? shortWallet(c.wallet)}
                              </div>
                              <div style={{ fontSize: "13px", fontWeight: 900, color: "#fb923c" }}>{fmtNum(Math.round(c.amountUsdc * 100))}</div>
                              <div style={{ fontSize: "9px", color: "rgb(107,114,128)" }}>$CODE</div>
                              <span style={{ display: "inline-block", marginTop: "6px", fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: `rgba(${tRgb},0.12)`, color: tColor, border: `1px solid rgba(${tRgb},0.3)` }}>
                                {c.tierName}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {/* List */}
                      {contributors.length > 3 && (
                        <div className="glass-panel" style={{ padding: "4px 0" }}>
                          {contributors.slice(3).map((c, i) => {
                            const tColor = TIER_COLOR[c.tier] ?? "#7C3AED";
                            const tRgb   = c.tier === 1 ? "124,58,237" : c.tier === 2 ? "212,162,76" : "16,185,129";
                            return (
                              <div key={c.wallet} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", borderBottom: "1px solid rgba(42,42,58,0.4)" }}>
                                <span style={{ color: "rgb(107,114,128)", fontWeight: 700, fontSize: "12px", width: "20px" }}>#{i + 4}</span>
                                <span style={{ fontSize: "18px" }}>{RANK_AVATARS[(i + 3) % RANK_AVATARS.length]}</span>
                                <span style={{ flex: 1, fontSize: "13px", color: "rgb(232,232,240)", fontWeight: 500 }}>{c.displayName ?? shortWallet(c.wallet)}</span>
                                <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "10px", background: `rgba(${tRgb},0.1)`, color: tColor, border: `1px solid rgba(${tRgb},0.3)` }}>
                                  {c.tierName}
                                </span>
                                <span style={{ fontWeight: 700, color: "#fb923c", fontSize: "13px" }}>{fmtNum(Math.round(c.amountUsdc * 100))} <span style={{ fontSize: "10px", color: "rgb(107,114,128)" }}>$CODE</span></span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div style={{ textAlign: "center", borderTop: "1px solid rgba(42,42,58,0.5)", paddingTop: "24px" }}>
                <a href="https://explorer.solana.com/address/8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep?cluster=devnet"
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "rgb(167,139,250)", fontSize: "12px", textDecoration: "none", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "20px", padding: "6px 16px" }}>
                  🔍 Smart Contract: 8rzMmrC6…GAep — Solana Explorer
                </a>
                <p style={{ color: "rgb(42,42,58)", fontSize: "11px", marginTop: "12px", letterSpacing: "0.5px" }}>
                  Solana devnet · mock USDC · Arweave permanent storage
                </p>
              </div>
            </div>
          )}

          {/* ══════════ ALFA TERMINAL TAB ══════════ */}
          {activeTab === "alfa" && (
            <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
              <div className="glass-panel" style={{ borderRadius: "16px", overflow: "hidden", height: "calc(100vh - 180px)", display: "flex", flexDirection: "column" }}>

                {/* Chat header */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderBottom: "1px solid rgb(42,42,58)", background: "rgba(10,10,15,0.8)", backdropFilter: "blur(10px)", flexShrink: 0 }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, rgb(124,58,237), rgb(6,182,212))", flexShrink: 0 }}>
                    <span style={{ color: "white" }}><IBot /></span>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "rgb(232,232,240)" }}>AIfa — Hello.</div>
                    <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>Online</div>
                  </div>
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "8px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                      <span style={{ color: "rgb(124,58,237)" }}><IBrain /></span>
                      <span style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 700, color: "rgb(124,58,237)" }}>13</span>
                      <span style={{ fontSize: "10px", color: "rgb(107,114,128)" }}>memories</span>
                    </div>
                    <span style={{ color: "rgb(124,58,237)" }}><ISparkles /></span>
                  </div>
                </div>

                {/* Think-to-Earn progress bar */}
                <div style={{ padding: "8px 16px", background: "rgba(10,10,15,0.6)", borderBottom: "1px solid rgb(26,26,46)", flexShrink: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "rgb(124,58,237)" }}>🧠 Think-to-Earn</span>
                    <span style={{ fontSize: "10px", color: "rgb(107,114,128)" }}>13/25 — next milestone</span>
                  </div>
                  <div style={{ width: "100%", height: "6px", borderRadius: "99px", overflow: "hidden", background: "rgb(26,26,46)" }}>
                    <div style={{ height: "100%", borderRadius: "99px", background: "linear-gradient(90deg, rgb(124,58,237), rgb(6,182,212))", width: "52%" }} />
                  </div>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  {alfaMsgs.map((msg, i) => (
                    <div key={i} style={{ display: "flex", gap: "10px", justifyContent: msg.from === "user" ? "flex-end" : "flex-start" }}>
                      {msg.from === "bot" && (
                        <div className="msg-avatar-bot"><span style={{ color: "white" }}><IBot /></span></div>
                      )}
                      <div className={msg.from === "bot" ? "msg-bot" : "msg-user"} style={{ whiteSpace: "pre-line" }}>{msg.text}</div>
                      {msg.from === "user" && (
                        <div className="msg-avatar-user"><span style={{ color: "rgb(232,232,240)" }}><IUser /></span></div>
                      )}
                    </div>
                  ))}
                  {alfaLoading && (
                    <div style={{ display: "flex", gap: "10px" }}>
                      <div className="msg-avatar-bot"><span style={{ color: "white" }}><IBot /></span></div>
                      <div className="msg-bot" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        {[0,1,2].map(i => <div key={i} style={{ width:"8px", height:"8px", borderRadius:"50%", background:"#7C3AED", animation:`bounce 1s ${i*0.15}s infinite` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{ padding: "12px 16px", borderTop: "1px solid rgb(42,42,58)", background: "rgba(10,10,15,0.9)", backdropFilter: "blur(10px)", flexShrink: 0 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <input
                      className="alfa-input"
                      placeholder="Share a memory to earn $CODE…"
                      value={alfaInput}
                      onChange={e => setAlfaInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) sendAlfaMessage(); }}
                      disabled={alfaLoading}
                    />
                    <button
                      onClick={sendAlfaMessage}
                      disabled={alfaLoading || !alfaInput.trim()}
                      style={{ width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: alfaInput && !alfaLoading ? "linear-gradient(135deg,rgb(124,58,237),rgb(109,40,217))" : "rgb(42,42,58)", border: "none", cursor: alfaInput && !alfaLoading ? "pointer" : "default", color: "white", flexShrink: 0, transition: "background 0.15s" }}
                    >
                      <ISend />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ SITE TAB ══════════ */}
          {activeTab === "site" && (
            <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
                <button onClick={() => setActiveTab("cabinet")} style={{ background: "none", border: "none", color: "rgb(107,114,128)", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "2px" }}>←</button>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>✦</span>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "rgb(232,232,240)" }}>Create Eternal Site</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                    {tierObj && <span style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>{tierObj.name} — ${tierObj.price}</span>}
                    {currentTier > 0 && regenLimit > 0 && (
                      <span style={{ fontSize: "12px", padding: "1px 8px", borderRadius: "99px", background: regenLimitReached ? "rgba(239,68,68,0.1)" : "rgba(124,58,237,0.12)", color: regenLimitReached ? "#ef4444" : "rgb(167,139,250)", border: `1px solid ${regenLimitReached ? "rgba(239,68,68,0.3)" : "rgba(124,58,237,0.3)"}` }}>
                        {regenCount}/{regenLimit} updates this period
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {currentTier === 0 ? (
                <div className="glass-panel" style={{ padding: "48px", textAlign: "center" }}>
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>🏛️</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "rgb(232,232,240)", marginBottom: "8px" }}>Family Archives tier required</div>
                  <div style={{ fontSize: "13px", color: "rgb(107,114,128)", marginBottom: "24px" }}>Purchase a tier to create your eternal site on Arweave</div>
                  <button onClick={() => setActiveTab("cabinet")} style={{ background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "white", border: "none", borderRadius: "10px", padding: "12px 28px", fontSize: "14px", fontWeight: 700, cursor: "pointer" }}>
                    Choose a Tier →
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "20px", alignItems: "flex-start", flexWrap: "wrap" }}>
                  {/* Form */}
                  <div className="glass-panel" style={{ flex: "1 1 480px", padding: "28px" }}>
                    {/* Username */}
                    <div style={{ marginBottom: "20px" }}>
                      <label htmlFor="site-username" style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <span>👤</span> Username <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div style={{ display: "flex", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "10px", overflow: "hidden" }}>
                        <input id="site-username" type="text" value={siteUsername}
                          onChange={e => {
                            const raw = e.target.value;
                            const filtered = raw.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
                            setSiteUsername(filtered);
                            setUsernameErr(filtered.length < raw.length ? "Latin characters only: a–z, 0–9, _ and –" : "");
                          }}
                          placeholder="yourname"
                          style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none" }} />
                        <span style={{ flexShrink: 0, padding: "11px 14px", color: "rgb(107,114,128)", fontSize: "13px", borderLeft: "1px solid rgb(42,42,58)", whiteSpace: "nowrap" }}>.aifa.digital</span>
                      </div>
                      {usernameErr && <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{usernameErr}</div>}
                    </div>

                    {/* Display name */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <span>✏️</span> Display Name <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input value={siteDisplayName} onChange={e => setSiteDisplayName(e.target.value)}
                        placeholder="Your name"
                        style={{ width: "100%", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "10px", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box" }} />
                    </div>

                    {/* Bio */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <span>📝</span> About Me
                      </label>
                      <textarea value={siteBio} onChange={e => setSiteBio(e.target.value.slice(0,2000))}
                        placeholder="Tell the world about yourself..."
                        rows={4}
                        style={{ width: "100%", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "10px", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
                      <div style={{ textAlign: "right", fontSize: "11px", color: "rgb(107,114,128)", marginTop: "4px" }}>{siteBio.length}/2000</div>
                    </div>

                    {/* Manifesto */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <span>⚡</span> Manifesto / Life Motto
                      </label>
                      <textarea value={siteManifesto} onChange={e => setSiteManifesto(e.target.value.slice(0,500))}
                        placeholder="Your life philosophy, your eternal words..."
                        rows={3}
                        style={{ width: "100%", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "10px", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }} />
                      <div style={{ textAlign: "right", fontSize: "11px", color: "rgb(107,114,128)", marginTop: "4px" }}>{siteManifesto.length}/500</div>
                    </div>

                    {/* Avatar upload */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <span>🖼️</span> Avatar
                      </label>
                      <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarFile} />
                      <div onClick={() => avatarInputRef.current?.click()}
                        style={{ background: "rgb(19,19,28)", border: `1px dashed ${avatarDataUrl ? "rgb(124,58,237)" : "rgb(42,42,58)"}`, borderRadius: "10px", padding: "16px", textAlign: "center", cursor: "pointer", transition: "border-color 0.15s" }}>
                        {avatarDataUrl ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "center" }}>
                            <img src={avatarDataUrl} alt="avatar" style={{ width: "64px", height: "64px", borderRadius: "50%", objectFit: "cover", border: "2px solid rgb(124,58,237)" }} />
                            <div style={{ textAlign: "left" }}>
                              <div style={{ fontSize: "13px", color: "rgb(232,232,240)" }}>Avatar selected</div>
                              <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginTop: "2px" }}>{avatarSizeKb} KB · Click to change</div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: "24px", marginBottom: "6px" }}>📤</div>
                            <div style={{ fontSize: "13px", color: "rgb(107,114,128)" }}>Click to upload avatar</div>
                            <div style={{ fontSize: "11px", color: "rgb(42,42,58)", marginTop: "4px" }}>JPG, PNG — auto-compressed to fit free Arweave tier</div>
                          </>
                        )}
                      </div>
                      {avatarError && <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{avatarError}</div>}
                    </div>

                    {/* Social links */}
                    <div style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                      {[
                        { icon: "📱", label: "Telegram", value: siteTelegram, setter: setSiteTelegram, placeholder: "username" },
                        { icon: "𝕏", label: "Twitter", value: siteTwitter, setter: setSiteTwitter, placeholder: "handle" },
                        { icon: "🌐", label: "Website", value: siteWebUrl, setter: setSiteWebUrl, placeholder: "https://..." },
                      ].map(({ icon, label, value, setter, placeholder }) => (
                        <div key={label}>
                          <label style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
                            {icon} {label}
                          </label>
                          <input value={value} onChange={e => setter(e.target.value)}
                            placeholder={placeholder}
                            style={{ width: "100%", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "8px", padding: "9px 10px", color: "rgb(232,232,240)", fontSize: "13px", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box" }} />
                        </div>
                      ))}
                    </div>

                    <button
                      disabled={!siteUsername || !siteDisplayName || siteCreating || currentTier === 0 || isExpired || regenLimitReached}
                      onClick={handleCreateSite}
                      style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "none", cursor: (siteUsername && siteDisplayName && !siteCreating && currentTier > 0 && !isExpired && !regenLimitReached) ? "pointer" : "not-allowed", fontWeight: 700, fontSize: "15px", fontFamily: "Inter,sans-serif", background: isExpired || regenLimitReached ? "rgb(42,42,58)" : (siteUsername && siteDisplayName && !siteCreating && currentTier > 0) ? "linear-gradient(135deg,#7C3AED,#6D28D9)" : "rgb(42,42,58)", color: isExpired ? "#f85149" : regenLimitReached ? "#ef4444" : "white", transition: "all 0.15s", opacity: siteCreating ? 0.7 : 1 }}
                    >
                      {isExpired ? "🔒 Subscription expired — Renew to edit site" : regenLimitReached ? `🔒 Update limit reached (${regenCount}/${regenLimit}) — Renew to reset` : siteCreating ? "⏳ Generating..." : "🌐 Create Eternal Site"}
                    </button>
                    {siteError && (
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#ef4444", textAlign: "center" }}>{siteError}</div>
                    )}
                    <div style={{ marginTop: "10px", fontSize: "11px", color: "rgb(107,114,128)", textAlign: "center" }}>
                      {currentTier === 0 ? "Purchase a tier to activate site creation" : regenLimitReached ? `${regenCount}/${regenLimit} updates used this subscription period` : `${regenCount}/${regenLimit} updates used · Your site is permanently saved on Arweave`}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="glass-panel" style={{ flex: "1 1 360px", padding: "20px" }}>
                    <div style={{ fontSize: "12px", color: "rgb(107,114,128)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>🖥️</span> Live Preview
                    </div>
                    <div style={{ background: "rgb(13,13,20)", borderRadius: "12px", overflow: "hidden", border: "1px solid rgb(26,26,40)" }}>
                      {/* Mac dots */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderBottom: "1px solid rgb(26,26,40)" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }} />
                        <span style={{ fontSize: "11px", color: "rgb(107,114,128)", marginLeft: "6px" }}>{siteUsername || "username"}.aifa.digital</span>
                      </div>
                      {/* Preview content */}
                      <div style={{ padding: "24px", minHeight: "300px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", overflow: "hidden", wordBreak: "break-word" }}>
                        {/* Avatar */}
                        <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg,#7C3AED,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", marginBottom: "14px" }}>
                          {tierObj?.icon ?? "👤"}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "18px", color: "rgb(232,232,240)", marginBottom: "4px" }}>
                          {siteDisplayName || <span style={{ color: "rgb(42,42,58)" }}>Your Name</span>}
                        </div>
                        <div style={{ fontSize: "12px", color: "#7C3AED", marginBottom: "12px" }}>
                          @{siteUsername || <span style={{ color: "rgb(42,42,58)" }}>username</span>}
                        </div>
                        {siteBio && (
                          <div style={{ fontSize: "12px", color: "rgb(139,139,158)", marginBottom: "12px", maxWidth: "260px", lineHeight: 1.5 }}>{siteBio}</div>
                        )}
                        {siteManifesto && (
                          <div style={{ fontSize: "11px", color: "rgb(107,114,128)", fontStyle: "italic", maxWidth: "260px", marginBottom: "12px" }}>"{siteManifesto}"</div>
                        )}
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
                          {siteTelegram && <span style={{ fontSize: "11px", background: "rgba(124,58,237,0.15)", color: "#7C3AED", padding: "3px 8px", borderRadius: "20px" }}>📱 {siteTelegram}</span>}
                          {siteTwitter && <span style={{ fontSize: "11px", background: "rgba(124,58,237,0.15)", color: "#7C3AED", padding: "3px 8px", borderRadius: "20px" }}>𝕏 {siteTwitter}</span>}
                          {siteWebUrl && <span style={{ fontSize: "11px", background: "rgba(124,58,237,0.15)", color: "#7C3AED", padding: "3px 8px", borderRadius: "20px" }}>🌐 site</span>}
                        </div>
                      </div>
                      <div style={{ borderTop: "1px solid rgb(26,26,40)", padding: "10px 14px", textAlign: "center", fontSize: "10px", color: "rgb(42,42,58)", letterSpacing: "1px" }}>
                        CODE ETERNAL — Your site lives forever
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ METRICS TAB ══════════ */}
          {activeTab === "metrics" && (() => {
            const M = metricsData;
            const DIST_PIE = [
              { label: "Treasury",    pct: 65, color: "#3B82F6", desc: "65% into DAO treasury" },
              { label: "L1 Referral", pct: 15, color: "#7C3AED", desc: "15% referral L1" },
              { label: "L2 Referral", pct:  7, color: "#06B6D4", desc: "7% referral L2" },
              { label: "L3 Referral", pct:  3, color: "#10B981", desc: "3% referral L3" },
              { label: "Ecosystem",   pct:  5, color: "#D4A24C", desc: "5% ecosystem fund" },
              { label: "Burn",        pct:  5, color: "#ef4444", desc: "5% burned forever" },
            ];

            // Build SVG donut
            const r = 70, cx = 100, cy = 100, sw = 28;
            const circ = 2 * Math.PI * r;
            let cumPct = 0;
            const donutSlices = DIST_PIE.map((seg) => {
              const dash = (seg.pct / 100) * circ;
              const gap  = circ - dash;
              const rot  = (cumPct / 100) * 360 - 90;
              cumPct += seg.pct;
              return { ...seg, dash, gap, rot };
            });

            // Sparkline
            const hist = M?.burnHistory ?? Array.from({length:12},(_,i)=>({month:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],amount:0}));
            const maxH = Math.max(...hist.map(h=>h.amount), 1);
            const W = 600, H = 80;
            const sparkPts = hist.map((h,i) => {
              const x = (i/(hist.length-1))*W;
              const y = H - (h.amount/maxH)*H*0.85 - 4;
              return `${x},${y}`;
            }).join(" ");
            const fillPts = `0,${H} ${sparkPts} ${W},${H}`;

            const STAT_CARDS = [
              { icon: "🔥", label: "Burned $CODE", val: M ? `${(M.burnedCode/1000000).toFixed(3).replace(/\.?0+$/,"")} M` : "—", trend: M?.burnedCodeTrend, color: "#fb923c", desc: "Permanently removed from circulation" },
              { icon: "⚡", label: "Total Transactions", val: M ? M.totalTransactions.toString() : "—", trend: M?.txTrend, color: "#818cf8", desc: "On Solana blockchain" },
              { icon: "👥", label: "Active Wallets (24h)", val: M ? M.activeWallets.toString() : "—", trend: M?.walletsTrend, color: "#06b6d4", desc: "Unique addresses" },
              { icon: "🏦", label: "Treasury Balance", val: M ? `$${M.treasuryUsdc.toLocaleString()}` : "—", trend: M?.treasuryTrend, color: "#D4A24C", desc: "USDC in DAO treasury" },
              { icon: "💎", label: "Avg Fee", val: M ? `${M.avgFee}` : "—", trend: undefined, color: "#a78bfa", desc: "SOL per transaction" },
              { icon: "📡", label: "Current Slot", val: M ? `#${M.currentSlot}` : "—", trend: undefined, color: "#38bdf8", desc: "Epoch 0" },
            ];

            return (
              <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
                {/* Page header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "22px" }}>📊</span>
                      <span style={{ fontSize: "20px", fontWeight: 800, color: "rgb(232,232,240)" }}>On-chain Metrics</span>
                    </div>
                    <div style={{ fontSize: "12px", color: "rgb(107,114,128)", marginTop: "4px" }}>Real-time data from Solana blockchain</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 14px", borderRadius: "20px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
                    <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#10B981" }} />
                    <span style={{ fontSize: "12px", color: "#10B981", fontWeight: 600 }}>Devnet Live</span>
                  </div>
                </div>

                {/* Stat cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))", gap: "14px", marginBottom: "24px" }}>
                  {STAT_CARDS.map(s => (
                    <div key={s.label} className="glass-panel" style={{ padding: "18px 20px" }}>
                      <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                        {s.icon} {s.label}
                      </div>
                      <div style={{ fontSize: "26px", fontWeight: 900, color: s.color, letterSpacing: "-0.5px", marginBottom: "6px" }}>{s.val}</div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>{s.desc}</div>
                        {s.trend !== undefined && (
                          <span style={{ fontSize: "11px", color: "#10B981", fontWeight: 600, whiteSpace: "nowrap" }}>+{s.trend}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Charts row */}
                <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
                  {/* Burn sparkline */}
                  <div className="glass-panel" style={{ flex: "1 1 480px", padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ color: "#fb923c" }}>🔥</span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "rgb(232,232,240)" }}>$CODE Burning</span>
                      </div>
                      <span style={{ fontSize: "11px", color: "rgb(107,114,128)", padding: "3px 10px", borderRadius: "20px", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)" }}>Last 12 months</span>
                    </div>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "80px", display: "block" }}>
                      <defs>
                        <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={fillPts} fill="url(#burnGrad)" />
                      <polyline points={sparkPts} fill="none" stroke="#7C3AED" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                      {hist.filter((_,i)=>i%2===0).map(h => (
                        <span key={h.month} style={{ fontSize: "10px", color: "rgb(107,114,128)" }}>{h.month}</span>
                      ))}
                    </div>
                    <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>Total burned this year</span>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "#fb923c" }}>
                        {M ? `${hist.reduce((a,h)=>a+h.amount,0).toLocaleString("en-US",{maximumFractionDigits:0})} $CODE` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Distribution donut */}
                  <div className="glass-panel" style={{ flex: "1 1 360px", padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
                      <span style={{ color: "#7C3AED" }}>💫</span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "rgb(232,232,240)" }}>Payment Distribution</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                      <svg viewBox="0 0 200 200" style={{ width: "160px", height: "160px", flexShrink: 0 }}>
                        {donutSlices.map((seg, i) => (
                          <circle key={i} cx={cx} cy={cy} r={r}
                            fill="none" stroke={seg.color} strokeWidth={sw}
                            strokeDasharray={`${seg.dash} ${seg.gap}`}
                            transform={`rotate(${seg.rot} ${cx} ${cy})`} />
                        ))}
                        <text x={cx} y={cy - 8} textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="Inter,sans-serif">65%</text>
                        <text x={cx} y={cy + 8} textAnchor="middle" fill="rgb(107,114,128)" fontSize="9" fontFamily="Inter,sans-serif">Vault</text>
                      </svg>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
                        {DIST_PIE.map(seg => (
                          <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
                            <span style={{ fontSize: "12px", color: "rgb(139,139,158)", flex: 1 }}>{seg.label}</span>
                            <span style={{ fontSize: "12px", fontWeight: 700, color: seg.color }}>{seg.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live events */}
                <div className="glass-panel" style={{ padding: "24px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontSize: "18px" }}>⚡</span>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "rgb(232,232,240)" }}>Real-time Events</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "3px 10px", borderRadius: "20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", animation: "pulse 1.5s infinite" }} />
                      <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>LIVE</span>
                    </div>
                  </div>
                  {recentTxns.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "28px", color: "rgb(107,114,128)", fontSize: "13px" }}>
                      No events yet — be the first Guardian!
                    </div>
                  ) : (
                    recentTxns.map((tx, i) => {
                      const tColor = TIER_COLOR[tx.tier] ?? "#7C3AED";
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 0", borderBottom: i < recentTxns.length - 1 ? "1px solid rgba(42,42,58,0.5)" : "none" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                            🔥
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(232,232,240)" }}>
                              Burn $CODE
                              <span style={{ marginLeft: "8px", fontSize: "12px", fontWeight: 400, color: tColor }}>({tx.tierName})</span>
                            </div>
                            <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginTop: "2px", fontFamily: "monospace" }}>
                              {shortWallet(tx.wallet)} · {new Date(tx.createdAt).toLocaleTimeString("en-US")}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: "#fb923c" }}>
                              {Math.round(tx.amount * 5 * 100).toLocaleString()} $CODE
                            </div>
                            <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>5% of ${tx.amount}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* ══════════ GAMES TAB ══════════ */}
          {activeTab === "games" && (
            <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IGamepad />
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "rgb(232,232,240)" }}>Game Arena</div>
                  <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>Play chess against AIfa — your AI companion</div>
                </div>
              </div>

              {/* Bot message */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                <div className="msg-avatar-bot"><span style={{ color: "white" }}><IBot /></span></div>
                <div className="msg-bot">Your move, Guardian! You play as White. ♔</div>
              </div>

              {/* Score bar */}
              <div className="glass-panel-sm" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "32px", padding: "12px 24px", marginBottom: "16px" }}>
                <span style={{ fontWeight: 700, fontSize: "16px", color: "#7C3AED" }}>0 W</span>
                <span style={{ fontWeight: 600, color: "rgb(232,232,240)" }}>{isWhiteTurn ? "White to move" : "Black to move…"}</span>
                <span style={{ fontWeight: 700, fontSize: "16px", color: "#10B981" }}>0 L</span>
              </div>

              {/* Chess board */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
                <div className="glass-panel" style={{ padding: "12px", display: "inline-block" }}>
                  {chessBoard.map((row, r) => (
                    <div key={r} style={{ display: "flex" }}>
                      {row.map((piece, c) => {
                        const isDark = (r + c) % 2 === 1;
                        const isSelected = chessSelected && chessSelected[0]===r && chessSelected[1]===c;
                        return (
                          <button key={c} onClick={() => handleChessClick(r, c)}
                            style={{ width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", border: "none", cursor: "pointer", background: isSelected ? "rgba(124,58,237,0.35)" : isDark ? "rgba(30,27,75,0.7)" : "rgba(49,46,129,0.4)", outline: isSelected ? "2px solid #7C3AED" : "none", transition: "background 0.12s" }}>
                            {piece && (
                              <span style={{ color: piece.startsWith("w") ? "white" : "#06B6D4", textShadow: piece.startsWith("w") ? "0 0 4px rgba(255,255,255,0.4)" : "0 0 4px rgba(6,182,212,0.4)" }}>
                                {CHESS_PIECES[piece] || ""}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Move history + reset */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div className="glass-panel" style={{ padding: "16px" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(232,232,240)", marginBottom: "10px" }}>📜 Move History</div>
                  <div style={{ maxHeight: "120px", overflowY: "auto" }}>
                    {moveHistory.length === 0 ? (
                      <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>No moves yet</div>
                    ) : moveHistory.map((m, i) => (
                      <div key={i} style={{ display: "flex", gap: "8px", fontSize: "13px", marginBottom: "2px" }}>
                        <span style={{ color: "rgb(107,114,128)", fontSize: "11px", width: "20px" }}>{i+1}.</span>
                        <span style={{ color: "rgb(232,232,240)" }}>{m}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
                  <button onClick={() => { setChessBoard(initChessBoard()); setChessSelected(null); setMoveHistory([]); setIsWhiteTurn(true); }}
                    style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", color: "#7C3AED", padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                    ↺ New Game
                  </button>
                  <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>Start a new match</div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════ DAO TAB ══════════ */}
          {activeTab === "dao" && (
            <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IVote />
                  </div>
                  <div>
                    <div style={{ fontSize: "18px", fontWeight: 700, color: "rgb(232,232,240)" }}>DAO Governance</div>
                    <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>Vote on the future of CODE ETERNAL</div>
                  </div>
                </div>
                <button style={{ display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "white", border: "none", borderRadius: "12px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                  + Create Proposal
                </button>
              </div>

              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", marginBottom: "20px" }}>
                {[
                  { val: proposals.length, label: "Proposals", icon: "📊", color: "#7C3AED" },
                  { val: proposals.filter(p=>p.status==="active").length, label: "Active", icon: "🟢", color: "#10B981" },
                  { val: proposals.reduce((a,p)=>a+p.votesFor+p.votesAgainst,0).toLocaleString(), label: "Total Votes", icon: "🗳️", color: "#06B6D4" },
                ].map(s => (
                  <div key={s.label} className="glass-panel" style={{ padding: "16px", textAlign: "center" }}>
                    <div style={{ fontSize: "24px", marginBottom: "4px" }}>{s.icon}</div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: s.color }}>{s.val}</div>
                    <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Proposals */}
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {proposals.map(p => {
                  const total = p.votesFor + p.votesAgainst;
                  const forPct = total > 0 ? (p.votesFor / total) * 100 : 0;
                  const catColor = p.category === "Tokenomics" ? "#F59E0B" : p.category === "Ecosystem" ? "#06B6D4" : "#7C3AED";
                  return (
                    <div key={p.id} className="glass-panel" style={{ padding: "20px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: `rgba(0,0,0,0.3)`, color: catColor, border: `1px solid ${catColor}30` }}>{p.category}</span>
                            {p.status === "active" && <span style={{ fontSize: "11px", color: "#10B981", display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#10B981", display:"inline-block" }} />Active</span>}
                            {p.status === "passed" && <span style={{ fontSize: "11px", color: "#10B981" }}>✓ Passed</span>}
                          </div>
                          <div style={{ fontSize: "15px", fontWeight: 700, color: "rgb(232,232,240)" }}>{p.title}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "13px", color: "rgb(139,139,158)", marginBottom: "14px" }}>{p.desc}</div>
                      {/* Progress bar */}
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", color: "#10B981", fontWeight: 600 }}>For {p.votesFor.toLocaleString()}</span>
                          <span style={{ fontSize: "12px", color: "#ef4444", fontWeight: 600 }}>Against {p.votesAgainst.toLocaleString()}</span>
                        </div>
                        <div style={{ height: "8px", borderRadius: "99px", overflow: "hidden", background: "#ef4444", display: "flex" }}>
                          <div style={{ background: "#10B981", width: `${forPct}%`, transition: "width 0.3s" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                          <span style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>{forPct.toFixed(1)}%</span>
                          <span style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>⏱ {p.timeLeft}</span>
                        </div>
                      </div>
                      {p.status === "active" && (
                        <div style={{ display: "flex", gap: "10px" }}>
                          <button onClick={() => voteOnProposal(p.id, "for")}
                            style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#10B981", padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                            👍 For
                          </button>
                          <button onClick={() => voteOnProposal(p.id, "against")}
                            style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#ef4444", padding: "8px 16px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                            👎 Against
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══════════ SMART CONTRACT TAB ══════════ */}
          {activeTab === "contract" && (
            <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IFileCode />
                </div>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "rgb(232,232,240)" }}>Smart Contract</div>
                  <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>Anchor Framework · Solana Devnet</div>
                </div>
              </div>

              {/* Program ID */}
              <div className="glass-panel-sm" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 18px", marginBottom: "20px" }}>
                <span style={{ fontSize: "18px" }}>🔑</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "2px" }}>Program ID</div>
                  <div style={{ fontSize: "13px", fontFamily: "monospace", color: "#06B6D4", wordBreak: "break-all" }}>8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep</div>
                </div>
                <a href="https://explorer.solana.com/address/8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep?cluster=devnet" target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: "11px", color: "#7C3AED", textDecoration: "none", whiteSpace: "nowrap" }}>
                  View →
                </a>
              </div>

              {/* Payment distribution */}
              <div className="glass-panel" style={{ padding: "24px", marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "rgb(232,232,240)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  🔀 Payment Distribution Visualization
                </div>
                <button onClick={() => setScShowFlow(f => !f)}
                  style={{ width: "100%", background: "linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.15))", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: "16px", fontFamily: "Inter,sans-serif" }}>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "rgb(232,232,240)" }}>💲 User Payment $USDC → Smart Contract</span>
                  <span style={{ color: "#7C3AED", transform: scShowFlow ? "rotate(90deg)" : "none", transition: "transform 0.2s", fontSize: "18px" }}>›</span>
                </button>
                {scShowFlow && (
                  <>
                    <div style={{ height: "12px", borderRadius: "99px", overflow: "hidden", display: "flex", marginBottom: "16px" }}>
                      {[{w:"5%",c:"#ef4444"},{w:"5%",c:"#F59E0B"},{w:"15%",c:"#7C3AED"},{w:"7%",c:"#8B5CF6"},{w:"3%",c:"#06B6D4"},{w:"65%",c:"#10B981"}].map((s,i)=>(
                        <div key={i} style={{ width:s.w, background:s.c, height:"100%" }} />
                      ))}
                    </div>
                    <div className="glass-panel-sm" style={{ padding: "12px 16px" }}>
                      {[
                        { label:"Burn (permanent destruction)", pct:5, icon:"🔥", color:"#ef4444", bg:"rgba(239,68,68,0.1)" },
                        { label:"Ecosystem Fund",               pct:5, icon:"💫", color:"#F59E0B", bg:"rgba(245,158,11,0.1)" },
                        { label:"L1 Referral",                  pct:15,icon:"🔗", color:"#7C3AED", bg:"rgba(124,58,237,0.1)" },
                        { label:"L2 Referral",                  pct:7, icon:"🔗", color:"#8B5CF6", bg:"rgba(139,92,246,0.1)" },
                        { label:"L3 Referral",                  pct:3, icon:"🔗", color:"#06B6D4", bg:"rgba(6,182,212,0.1)" },
                        { label:"Treasury (DAO Vault)",         pct:65,icon:"🏦", color:"#10B981", bg:"rgba(16,185,129,0.1)" },
                      ].map(d => (
                        <div key={d.label} style={{ display:"flex", alignItems:"center", gap:"10px", padding:"8px 0", borderBottom:"1px solid rgba(42,42,58,0.4)" }}>
                          <div style={{ width:"28px", height:"28px", borderRadius:"8px", background:d.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"14px" }}>{d.icon}</div>
                          <span style={{ flex:1, fontSize:"13px", color:"rgb(232,232,240)" }}>{d.label}</span>
                          <span style={{ fontSize:"14px", fontWeight:800, color:d.color }}>{d.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Account architecture */}
              <div className="glass-panel" style={{ padding: "24px", marginBottom: "20px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "rgb(232,232,240)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  🏗️ UserState PDA
                </div>
                <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "14px", fontFamily: "monospace" }}>
                  Seeds: [&quot;user&quot;, wallet_pubkey] · 172 bytes · owner: {PROGRAM_ID_STR.slice(0,8)}…
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "8px" }}>
                  {[
                    { name:"owner",            val:"Pubkey",            c:"#7C3AED", note:"user wallet" },
                    { name:"referrer",         val:"Option<Pubkey>",    c:"#06B6D4", note:"who referred" },
                    { name:"tier",             val:"u8  0|1|2|3",       c:"#10B981", note:"Spark/Archives/DNA" },
                    { name:"registered_at",    val:"i64  unix ts",      c:"#F59E0B", note:"registration time" },
                    { name:"tier_expires",     val:"i64  unix ts",      c:"#f472b6", note:"30-day subscription" },
                    { name:"memory_score",     val:"u64",               c:"#06B6D4", note:"Think-to-Earn pts" },
                    { name:"arweave_url",      val:"[u8; 64]",          c:"#7C3AED", note:"Arweave TX ID" },
                    { name:"site_status",      val:"u8  0|1|2",         c:"#10B981", note:"pending/ready/error" },
                    { name:"last_site_update", val:"i64  unix ts",      c:"#F59E0B", note:"60s cooldown" },
                    { name:"bump",             val:"u8",                c:"rgb(139,139,158)", note:"PDA bump seed" },
                  ].map(f => (
                    <div key={f.name} style={{ background:"rgba(10,10,15,0.5)", border:"1px solid rgba(42,42,58,0.6)", borderRadius:"8px", padding:"10px 12px", display:"flex", flexDirection:"column", gap:"3px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:"12px", fontFamily:"monospace", color:f.c, fontWeight:700 }}>{f.name}</span>
                        <span style={{ fontSize:"11px", fontFamily:"monospace", color:"rgb(107,114,128)" }}>{f.val}</span>
                      </div>
                      <span style={{ fontSize:"10px", color:"rgba(139,139,158,0.7)" }}>{f.note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: "rgb(232,232,240)", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  ⚡ Instructions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {[
                    { ix:"register_user",    caller:"User wallet",    color:"#7C3AED", desc:"Creates UserState PDA. Stores referrer. Tier starts at 0 until payment." },
                    { ix:"process_payment",  caller:"User wallet",    color:"#10B981", desc:"Distributes USDC atomically: 5% burn · 5% ecosystem · 15/7/3% referrals (→ vault if expired, → burn if absent) · 65% treasury. Sets tier_expires = now + 30 days." },
                    { ix:"update_site_url",  caller:"Backend keypair",color:"#F59E0B", desc:"Writes 43-char Arweave TX ID + site status to UserState. 60s cooldown enforced on-chain. Signer must match hardcoded BACKEND_AUTHORITY." },
                    { ix:"award_memory",     caller:"Backend keypair",color:"#06B6D4", desc:"Oracle adds memory_score points (Think-to-Earn / Proof-of-Memory). Score is permanent and cumulative." },
                  ].map(r => (
                    <div key={r.ix} style={{ background:"rgba(10,10,15,0.5)", border:"1px solid rgba(42,42,58,0.6)", borderRadius:"10px", padding:"14px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"6px", flexWrap:"wrap" }}>
                        <span style={{ fontSize:"13px", fontFamily:"monospace", fontWeight:700, color:r.color }}>{r.ix}</span>
                        <span style={{ fontSize:"10px", background:`rgba(42,42,58,0.8)`, color:"rgb(139,139,158)", padding:"2px 8px", borderRadius:"20px" }}>{r.caller}</span>
                      </div>
                      <div style={{ fontSize:"12px", color:"rgb(139,139,158)", lineHeight:1.5 }}>{r.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
