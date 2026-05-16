'use client';
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useCreateWallet } from "@privy-io/react-auth/solana";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { useLang, t } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import GamesArena from "@/components/GamesArena";
import DaoTab from "@/components/DaoTab";
import MetricsTab from "@/components/MetricsTab";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const USDC_MINT_STR = process.env.NEXT_PUBLIC_USDC_MINT;
const PROGRAM_ID_STR = process.env.NEXT_PUBLIC_PROGRAM_ID!

const TIERS = [
  { id: 1, nameKey: "tier.spark" as const,    price: 15,   color: "#7C3AED", rgb: "124,58,237",  icon: "⚡" },
  { id: 2, nameKey: "tier.archives" as const, price: 100,  color: "#D4A24C", rgb: "212,162,76",  icon: "🏛️" },
  { id: 3, nameKey: "tier.dna" as const,      price: 1000, color: "#10B981", rgb: "16,185,129",  icon: "🧬" },
];
const TIER_COLOR: Record<number, string> = { 1: "#7C3AED", 2: "#D4A24C", 3: "#10B981" };

type SiteStatus  = { status: "none"|"pending"|"done"|"error"; arweaveUrl?: string|null; tier: number; regenCount?: number; regenLimit?: number };
type Income      = { l1: number; l2: number; l3: number; total: number; locked: number; recent: any[] };
type Overview    = { burnedUsdc: number; burnTxs: number; activeMembers: number; sitesCreated: number };
type Contributor = { rank: number; wallet: string; displayName: string|null; tier: number; tierName: string; amountUsdc: number };
type RecentTxn   = { wallet: string; tier: number; tierName: string; amount: number; txSig: string; status: string; createdAt: string };
type Tab = "cabinet"|"alfa"|"games"|"dao"|"site"|"contract"|"metrics";

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

const TABS: { id: Tab; labelKey: string; icon: React.ReactElement }[] = [
  { id: "cabinet",  labelKey: "tab.cabinet",  icon: <IWallet /> },
  { id: "alfa",     labelKey: "tab.aifa",     icon: <IBrain /> },
  { id: "games",    labelKey: "tab.games",    icon: <IGamepad /> },
  { id: "dao",      labelKey: "tab.dao",      icon: <IVote /> },
  { id: "site",     labelKey: "tab.site",     icon: <IGlobe /> },
  { id: "contract", labelKey: "tab.contract", icon: <IFileCode /> },
  { id: "metrics",  labelKey: "tab.metrics",  icon: <ITrending /> },
];

const INIT_ALFA_MSGS: { from: "bot"|"user"; text: string }[] = [
  { from: "bot",  text: "Welcome to the Family! I'm AIfa — your eternal AI companion. Ask me anything about CODE ETERNAL, $CODE token, Arweave sites, or referrals! 🌌" },
  { from: "user", text: "Tell me about yourself." },
  { from: "bot",  text: "I'm AIfa, your digital companion in the CODE ETERNAL ecosystem on Solana. I help Guardians explore eternal sites, earn $CODE through Think-to-Earn, and navigate the referral system! 💫" },
  { from: "user", text: "What is CODE ETERNAL?" },
  { from: "bot",  text: "CODE ETERNAL is your eternal digital citadel on Solana! 🌌 Create an indestructible site on Arweave that cannot be deleted, earn $CODE through Think-to-Earn, and build generational wealth through the referral system. Your first step into eternity awaits! 🚀" },
];


function CabinetPage() {
  const router = useRouter();
  const { user, logout, authenticated, ready, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const wallet = wallets[0];
  const { lang } = useLang();

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
  // AIfa chat
  const [alfaMsgs,        setAlfaMsgs]        = useState(INIT_ALFA_MSGS);
  const [alfaLoading,     setAlfaLoading]     = useState(false);
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
        if (r.status === 409 && err.error === "username_taken") {
          setUsernameErr(t("site.usernameTaken", lang));
        } else {
          setSiteError(t("site.errorFailed", lang));
        }
        return;
      }
      setSiteStatus({ status: "pending", tier: currentTier });
      setActiveTab("cabinet");
    } catch {
      setSiteError(t("site.errorNetwork", lang));
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
        <header className="app-header" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 24px", borderBottom: "1px solid rgb(26,26,46)",
          background: "rgba(10,10,15,0.8)", backdropFilter: "blur(10px)",
          position: "sticky", top: 0, zIndex: 100,
        }}>
          {/* Left: logo + tier badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <a href="https://aifa.digital/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
              <span style={{ color: "rgb(124,58,237)" }}><IFlame /></span>
              <span style={{ fontWeight: 700, fontSize: "18px", color: "rgb(124,58,237)" }}>CODE ETERNAL</span>
            </a>
            {tierObj ? (
              <span style={{ fontSize: "12px", padding: "2px 10px", borderRadius: "99px", background: `rgba(${tierObj.rgb},0.12)`, color: tierObj.color, border: `1px solid rgba(${tierObj.rgb},0.3)` }}>
                {tierObj.icon} {t(tierObj.nameKey, lang)}
              </span>
            ) : (
              <span style={{ fontSize: "12px", padding: "2px 10px", borderRadius: "99px", background: "rgba(42,42,58,0.5)", color: "rgb(139,139,158)" }}>
                {t("tier.none", lang)}
              </span>
            )}
          </div>

          {/* Right: lang, balances, email, wallet, logout */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <LangSwitcher />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "12px", fontFamily: "monospace", color: "rgb(16,185,129)" }}>
                  ${usdcBalance === null ? "..." : fmtUsd(usdcBalance)} USDC
                </div>
                <div style={{ fontSize: "12px", fontFamily: "monospace", color: "rgb(124,58,237)" }}>$0 CODE</div>
              </div>
            </div>
            {email && (
              <span className="hdr-hide-mobile" style={{ fontSize: "12px", color: "rgb(139,139,158)" }}>{email}</span>
            )}
            {wallet && (
              <span className="hdr-hide-mobile" style={{ fontSize: "12px", fontFamily: "monospace", padding: "4px 8px", borderRadius: "6px", background: "rgb(19,19,28)", color: "rgb(6,182,212)" }}>
                {shortWallet(wallet.address)}
              </span>
            )}
            {myRefCode && (
              <button className="copy-btn hdr-hide-mobile" onClick={copyRef} style={{ padding: "5px 10px", fontSize: "11px" }}>
                <ICopy /> {copied ? t("cabinet.income.copied", lang) : `ref:${myRefCode}`}
              </button>
            )}
            <button onClick={logout} title={t("header.logout", lang)} style={{ padding: "8px", borderRadius: "8px", background: "rgb(19,19,28)", border: "none", cursor: "pointer", display: "flex", color: "rgb(139,139,158)" }}>
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
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#f85149" }}>{t("cabinet.expiry.title", lang)}</span>
                <span style={{ fontSize: "12px", color: "rgb(139,139,158)", marginLeft: "8px" }}>{t("cabinet.expiry.desc", lang)}</span>
              </div>
            </div>
            <button
              onClick={() => router.push(`/cabinet/buy?tier=${currentTier || 1}`)}
              style={{ padding: "6px 16px", borderRadius: "8px", background: "linear-gradient(135deg,#f85149,#c0392b)", border: "none", color: "white", fontSize: "12px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              {t("cabinet.expiry.cta", lang)}
            </button>
          </div>
        )}

        {/* ── Tab bar ────────────────────────────────────────────────────── */}
        <div className="tab-bar" style={{ display: "flex", gap: "8px", padding: "16px 24px", overflowX: "auto", scrollbarWidth: "none" as any, background: "transparent", position: "relative", zIndex: 10 }}>
          {TABS.map(tab => {
            const locked = false;
            return (
              <button
                key={tab.id}
                className={`nav-tab${activeTab === tab.id ? " nav-tab-active" : ""}${locked ? " nav-tab-locked" : ""}`}
                onClick={() => !locked && setActiveTab(tab.id)}
              >
                {tab.icon}
                <span className="nav-tab-label">{t(tab.labelKey as any, lang)}</span>
              </button>
            );
          })}
        </div>

        {/* ── Page content ───────────────────────────────────────────────── */}
        <div className="page-content" style={{ padding: "0 24px 32px", position: "relative", zIndex: 10 }}>

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
                    <div style={{ fontSize: "10px", color: "rgb(107,114,128)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1.2px" }}>{t("cabinet.site.label", lang)}</div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: siteStatus.status === "done" ? "#10B981" : siteStatus.status === "error" ? "#f85149" : "#a78bfa" }}>
                      {siteStatus.status === "done" ? t("cabinet.site.live", lang) : siteStatus.status === "error" ? t("cabinet.site.failed", lang) : t("cabinet.site.generating", lang)}
                    </div>
                  </div>
                  {siteStatus.status === "done" && siteStatus.arweaveUrl && (
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                      {(siteStatus as any).username && (
                        <a href={`https://${(siteStatus as any).username}.codeofdigitaleternity.com`} target="_blank" rel="noopener noreferrer"
                          style={{ background: "linear-gradient(135deg,#7C3AED,#5B21B6)", color: "white", padding: "8px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
                          {t("cabinet.site.openPassport", lang)}
                        </a>
                      )}
                      <a href={siteStatus.arweaveUrl} target="_blank" rel="noopener noreferrer"
                        style={{ background: "linear-gradient(135deg,#10B981,#059669)", color: "white", padding: "8px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
                        {t("cabinet.site.viewArweave", lang)}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Stat cards */}
              <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
                {[
                  { labelKey: "cabinet.stats.burned",  val: overview ? fmtNum(Math.round(overview.burnedUsdc)) : "—", color: "#fb923c", borderColor: "rgba(251,146,60,0.25)", icon: "🔥" },
                  { labelKey: "cabinet.stats.members", val: overview ? fmtNum(overview.activeMembers) : "—",           color: "#a78bfa", borderColor: "rgba(124,58,237,0.25)", icon: "👥" },
                  { labelKey: "cabinet.stats.sites",   val: overview ? fmtNum(overview.sitesCreated) : "—",            color: "#10B981", borderColor: "rgba(16,185,129,0.25)", icon: "🌐" },
                ].map(s => (
                  <div key={s.labelKey} className="glass-panel" style={{ flex: "1", padding: "20px 24px", borderColor: s.borderColor, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {s.icon} {t(s.labelKey as any, lang)}
                    </div>
                    <div style={{ fontSize: "30px", fontWeight: 900, color: s.color, letterSpacing: "-0.5px" }}>{s.val}</div>
                  </div>
                ))}
              </div>

              {/* Two columns: Income + Plan */}
              <div className="main-cols-flex">

                {/* Income */}
                <div className="glass-panel" style={{ flex: "1 1 55%", padding: "24px" }}>
                  <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                    {t("cabinet.income.title", lang)}
                  </div>
                  <div style={{ fontSize: "36px", fontWeight: 900, color: "rgb(232,232,240)", letterSpacing: "-1px", marginBottom: "4px" }}>
                    ${income ? fmtUsd(income.total) : "0.00"}
                  </div>
                  <div style={{ fontSize: "12px", color: "rgb(107,114,128)", marginBottom: income?.locked ? "12px" : "24px" }}>{t("cabinet.income.earned", lang)}</div>
                  {(income?.locked ?? 0) > 0 && (
                    <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "10px", background: "rgba(248,81,73,0.06)", border: "1px solid rgba(248,81,73,0.2)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                      <div>
                        <div style={{ fontSize: "13px", fontWeight: 700, color: "#f85149" }}>🔒 ${fmtUsd(income!.locked)} {t("cabinet.income.locked", lang)}</div>
                        <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginTop: "2px" }}>{t("cabinet.income.lockedHint", lang)}</div>
                      </div>
                      <button
                        onClick={() => router.push(`/cabinet/buy?tier=${currentTier || 1}`)}
                        style={{ padding: "5px 12px", borderRadius: "8px", background: "rgba(248,81,73,0.15)", border: "1px solid rgba(248,81,73,0.3)", color: "#f85149", fontSize: "11px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                        {t("cabinet.income.renew", lang)}
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
                        <ICopy /> {copied ? t("cabinet.income.copied", lang) : t("cabinet.income.copyLink", lang)}
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
                        <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{t("cabinet.plan.title", lang)}</div>
                        <div style={{ background: `rgba(${ct.rgb},0.08)`, border: `1px solid rgba(${ct.rgb},0.25)`, borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <span style={{ fontSize: "28px" }}>{ct.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "17px", fontWeight: 800, color: ct.color }}>{t(ct.nameKey, lang)}</div>
                              <div style={{ fontSize: "11px", color: isExpired ? "#f85149" : "rgb(107,114,128)", marginTop: "2px" }}>
                                {isExpired ? `${t("cabinet.plan.expiredOn", lang)} ${expiryDate}` : expiryDate ? `${t("cabinet.plan.activeUntil", lang)} ${expiryDate}` : t("cabinet.plan.active", lang)}
                              </div>
                            </div>
                            {isExpired ? (
                              <span style={{ fontSize: "11px", background: "rgba(248,81,73,0.15)", color: "#f85149", padding: "4px 10px", borderRadius: "20px", fontWeight: 700 }}>{t("cabinet.plan.expired", lang)}</span>
                            ) : daysLeft > 0 ? (
                              <span style={{ fontSize: "11px", background: `rgba(${ct.rgb},0.15)`, color: ct.color, padding: "4px 10px", borderRadius: "20px", fontWeight: 700 }}>{daysLeft}{t("cabinet.plan.daysLeft", lang)}</span>
                            ) : (
                              <span style={{ fontSize: "11px", background: `rgba(${ct.rgb},0.15)`, color: ct.color, padding: "4px 10px", borderRadius: "20px", fontWeight: 700 }}>{t("cabinet.plan.active", lang)}</span>
                            )}
                          </div>
                        </div>
                        {upgrades.length > 0 && (
                          <>
                            <div style={{ fontSize: "10px", color: "rgb(107,114,128)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>{t("cabinet.plan.upgrade", lang)}</div>
                            {upgrades.map(ut => (
                              <div key={ut.id} className="tier-row" onClick={() => router.push(`/cabinet/buy?tier=${ut.id}`)}>
                                <span style={{ fontSize: "20px" }}>{ut.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: "14px", fontWeight: 700, color: ut.color }}>{t(ut.nameKey, lang)}</div>
                                </div>
                                <div style={{ fontSize: "17px", fontWeight: 900, color: ut.color }}>${ut.price.toLocaleString()}</div>
                                <div style={{ color: "rgb(42,42,58)", fontSize: "18px" }}>›</div>
                              </div>
                            ))}
                          </>
                        )}
                        {upgrades.length === 0 && !isExpired && (
                          <div style={{ textAlign: "center", color: "rgb(107,114,128)", fontSize: "12px", padding: "12px 0" }}>
                            🧬
                          </div>
                        )}
                        {isExpired && (
                          <div
                            className="tier-row"
                            onClick={() => router.push(`/cabinet/buy?tier=${currentTier}`)}
                            style={{ borderColor: "rgba(248,81,73,0.3)", background: "rgba(248,81,73,0.05)" }}>
                            <span style={{ fontSize: "20px" }}>🔄</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "14px", fontWeight: 700, color: "#f85149" }}>{t("cabinet.income.renew", lang)} {t(ct.nameKey, lang)}</div>
                            </div>
                            <div style={{ fontSize: "17px", fontWeight: 900, color: "#f85149" }}>${ct.price.toLocaleString()}</div>
                            <div style={{ color: "rgb(42,42,58)", fontSize: "18px" }}>›</div>
                          </div>
                        )}
                      </>
                    );
                  })() : (
                    <>
                      <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "20px", textTransform: "uppercase", letterSpacing: "0.8px" }}>{t("cabinet.tiers.title", lang)}</div>
                      {TIERS.map(tier => (
                        <div key={tier.id} className="tier-row" onClick={() => router.push(`/cabinet/buy?tier=${tier.id}`)}>
                          <span style={{ fontSize: "22px" }}>{tier.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: 700, color: tier.color }}>{t(tier.nameKey, lang)}</div>
                          </div>
                          <div style={{ fontSize: "18px", fontWeight: 900, color: tier.color }}>${tier.price.toLocaleString()}</div>
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
                  🛡️ {t("cabinet.txns.title", lang)}
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
                            {tx.status === "done" ? t("cabinet.txns.confirmed", lang) : tx.status === "error" ? t("cabinet.txns.error", lang) : t("cabinet.txns.pending", lang)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* cNFT Passport + Top Guardians */}
              <div className="main-cols" style={{ display: "grid", gridTemplateColumns: "40fr 55fr", gap: "16px", marginBottom: "20px" }}>

                {/* cNFT Guardian Passport */}
                <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100%" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(139,139,158)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    🛡️ cNFT Guardian Passport
                  </div>
                  <div
                    className="glass-panel"
                    onClick={() => setNftFlipped(f => !f)}
                    style={{ padding: "24px", cursor: "pointer", position: "relative", overflow: "hidden", borderColor: tierObj ? `rgba(${tierObj.rgb},0.3)` : "rgba(42,42,58,0.8)" }}
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
                            🔗 {t(tierObj.nameKey, lang)}
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
                          🏆 Tier: <span style={{ color: tierObj?.color ?? "rgb(139,139,158)", fontWeight: 600 }}>{tierObj ? t(tierObj.nameKey, lang) : t("tier.none", lang)}</span>
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
                <div style={{ display: "grid", gridTemplateRows: "auto 1fr", height: "100%" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(232,232,240)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    🔥 Top Guardians of Eternity
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {contributors.length === 0 ? (
                    <div className="glass-panel" style={{ padding: "32px", textAlign: "center", color: "rgb(107,114,128)", fontSize: "13px" }}>
                      No guardians yet — be the first!
                    </div>
                  ) : (
                    <>
                      {/* Medal podium */}
                      <div style={{ display: "flex", gap: "10px" }}>
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
              </div>

              {/* Footer */}
              <div style={{ textAlign: "center", borderTop: "1px solid rgba(42,42,58,0.5)", paddingTop: "24px" }}>
                <a href={`https://explorer.solana.com/address/${PROGRAM_ID_STR}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "rgb(167,139,250)", fontSize: "12px", textDecoration: "none", border: "1px solid rgba(124,58,237,0.2)", borderRadius: "20px", padding: "6px 16px" }}>
                  🔍 Smart Contract: {PROGRAM_ID_STR.slice(0,8)}…{PROGRAM_ID_STR.slice(-4)} — Solana Explorer
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
                <button onClick={() => setActiveTab("cabinet")} style={{ background: "none", border: "none", color: "rgb(107,114,128)", cursor: "pointer", fontSize: "20px", lineHeight: 1, padding: "10px", minWidth: "44px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "20px" }}>✦</span>
                    <span style={{ fontSize: "20px", fontWeight: 800, color: "rgb(232,232,240)" }}>{t("site.title", lang)}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "2px" }}>
                    {tierObj && <span style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>{t(tierObj.nameKey, lang)} — ${tierObj.price}</span>}
                    {currentTier > 0 && regenLimit > 0 && (
                      <span style={{ fontSize: "12px", padding: "1px 8px", borderRadius: "99px", background: regenLimitReached ? "rgba(239,68,68,0.1)" : "rgba(124,58,237,0.12)", color: regenLimitReached ? "#ef4444" : "rgb(167,139,250)", border: `1px solid ${regenLimitReached ? "rgba(239,68,68,0.3)" : "rgba(124,58,237,0.3)"}` }}>
                        {regenCount}/{regenLimit} {t("site.updatesThisPeriod", lang)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {currentTier === 0 ? (
                <div className="glass-panel site-empty-panel" style={{ padding: "48px", textAlign: "center" }}>
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
                        <span>👤</span> {t("site.username", lang)} <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <div style={{ display: "flex", background: "rgb(19,19,28)", border: `1px solid ${usernameErr ? "#ef4444" : "rgb(42,42,58)"}`, borderRadius: "10px", overflow: "hidden", transition: "border-color 0.15s" }}>
                        <input id="site-username" type="text" value={siteUsername}
                          onChange={e => {
                            const raw = e.target.value;
                            const filtered = raw.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
                            setSiteUsername(filtered);
                            setUsernameErr(filtered.length < raw.length ? t("site.latinOnly", lang) : "");
                          }}
                          placeholder="yourname"
                          style={{ flex: 1, minWidth: 0, background: "none", border: "none", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none" }} />
                        <span className="username-suffix">.codeofdigitaleternity.com</span>
                      </div>
                      {usernameErr && <div style={{ fontSize: "11px", color: "#ef4444", marginTop: "4px" }}>{usernameErr}</div>}
                    </div>

                    {/* Display name */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <span>✏️</span> {t("site.displayName", lang)} <span style={{ color: "#ef4444" }}>*</span>
                      </label>
                      <input value={siteDisplayName} onChange={e => setSiteDisplayName(e.target.value)}
                        placeholder="Your name"
                        style={{ width: "100%", background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", borderRadius: "10px", padding: "11px 14px", color: "rgb(232,232,240)", fontSize: "14px", fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box" }} />
                    </div>

                    {/* Bio */}
                    <div style={{ marginBottom: "20px" }}>
                      <label style={{ fontSize: "12px", color: "rgb(107,114,128)", display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                        <span>📝</span> {t("site.bio", lang)}
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
                        <span>⚡</span> {t("site.manifesto", lang)}
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
                        <span>🖼️</span> {t("site.avatar", lang)}
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
                    <div className="social-grid">
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
                      {isExpired ? `🔒 ${t("cabinet.expiry.title", lang)}` : regenLimitReached ? `${t("site.limitReached", lang)} (${regenCount}/${regenLimit})` : siteCreating ? t("site.submitting", lang) : `🌐 ${t("site.submit", lang)}`}
                    </button>
                    {siteError && (
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#ef4444", textAlign: "center" }}>{siteError}</div>
                    )}
                    <div style={{ marginTop: "10px", fontSize: "11px", color: "rgb(107,114,128)", textAlign: "center" }}>
                      {currentTier === 0 ? t("site.noTier", lang) : regenLimitReached ? `${regenCount}/${regenLimit} ${t("site.updatesUsed", lang)}` : `${regenCount}/${regenLimit} ${t("site.updatesUsed", lang)} · ${t("site.permanent", lang)}`}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="glass-panel" style={{ flex: "1 1 360px", padding: "20px" }}>
                    <div style={{ fontSize: "12px", color: "rgb(107,114,128)", marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span>🖥️</span> {t("site.preview", lang)}
                    </div>
                    <div style={{ background: "rgb(13,13,20)", borderRadius: "12px", overflow: "hidden", border: "1px solid rgb(26,26,40)" }}>
                      {/* Mac dots */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderBottom: "1px solid rgb(26,26,40)" }}>
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ef4444" }} />
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#f59e0b" }} />
                        <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10B981" }} />
                        <span style={{ fontSize: "11px", color: "rgb(107,114,128)", marginLeft: "6px" }}>{siteUsername || "username"}.codeofdigitaleternity.com</span>
                      </div>
                      {/* Preview content — passport style */}
                      {(() => {
                        const tc  = tierObj?.color ?? "#7C3AED";
                        const tr  = tierObj?.rgb   ?? "124,58,237";
                        const addr = wallet?.address ?? "";
                        const passId = addr ? `CE-${addr.slice(0,8).toUpperCase()}` : "CE---------";
                        // 7×7 symmetric identicon matching generateIdenticon() in arweave.ts
                        const IC=7, IP=2, IR=7, ICOLS=4;
                        const IW=7*IC+IP*2;
                        const iRects: {x:number,y:number}[] = [];
                        for(let row=0;row<IR;row++) for(let col=0;col<ICOLS;col++){
                          const idx=(row*ICOLS+col)%Math.max(addr.length,1);
                          if(addr.length>0&&addr.charCodeAt(idx)%2===0){
                            iRects.push({x:IP+col*IC,y:IP+row*IC});
                            if(col<3) iRects.push({x:IP+(6-col)*IC,y:IP+row*IC});
                          }
                        }
                        // QR placeholder grid
                        const QR_ON=new Set([0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,36,37,38,39,40,41,42,43,44,47,48,10,11,17,18,24,25,31,32,45,46]);
                        const fLabel: React.CSSProperties = {fontSize:"6px",color:"rgba(255,255,255,0.28)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:"1px"};
                        const fVal: React.CSSProperties   = {fontSize:"9px",color:"rgba(232,232,240,0.75)",wordBreak:"break-word"};
                        const fValAcc: React.CSSProperties= {fontSize:"9px",color:tc,fontFamily:"monospace",wordBreak:"break-word"};
                        return (<>
                          {/* ── Header ── */}
                          <div style={{padding:"8px 12px",background:`linear-gradient(135deg,rgba(${tr},0.1),transparent)`,borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"4px"}}>
                            <div style={{display:"flex",flexDirection:"column",gap:"1px"}}>
                              <span style={{fontSize:"6px",color:"rgba(255,255,255,0.38)",letterSpacing:"0.18em",textTransform:"uppercase"}}>Solana Blockchain</span>
                              <span style={{fontSize:"11px",fontWeight:800,letterSpacing:"0.12em",color:tc}}>Code Eternal</span>
                            </div>
                            <svg width="30" height="30" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="23" cy="23" r="22" stroke={tc} strokeOpacity="0.28" strokeWidth="1"/>
                              <circle cx="23" cy="23" r="16.5" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                              <polygon points="23,9 26.4,18.9 37,18.9 28.3,24.9 31.7,34.8 23,28.8 14.3,34.8 17.7,24.9 9,18.9 19.6,18.9" fill={tc} fillOpacity="0.13" stroke={tc} strokeOpacity="0.38" strokeWidth="0.6"/>
                            </svg>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"1px"}}>
                              <span style={{fontSize:"6px",color:"rgba(255,255,255,0.25)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Document Type</span>
                              <span style={{fontSize:"8px",fontWeight:700,color:"rgba(232,232,240,0.65)",letterSpacing:"0.06em"}}>Digital Passport</span>
                              <span style={{fontSize:"7px",color:tc,letterSpacing:"0.05em"}}>{tierObj ? t(tierObj.nameKey, lang) : "—"}</span>
                            </div>
                          </div>

                          {/* ── Identity ── */}
                          <div style={{padding:"10px 12px",display:"flex",gap:"10px",alignItems:"flex-start",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                            {/* Photo zone */}
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"4px",flexShrink:0}}>
                              <div style={{width:"52px",height:"64px",borderRadius:"4px",background:"rgba(0,0,0,0.4)",border:`1px solid rgba(${tr},0.35)`,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"}}>
                                {avatarDataUrl
                                  ? <img src={avatarDataUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                                  : <span style={{fontSize:"18px",color:tc,opacity:0.7}}>◆</span>
                                }
                              </div>
                              <div style={{display:"flex",alignItems:"center",gap:"2px",background:"rgba(16,185,129,0.12)",borderRadius:"8px",padding:"1px 5px"}}>
                                <div style={{width:"3px",height:"3px",borderRadius:"50%",background:"#10B981"}}/>
                                <span style={{fontSize:"5px",color:"#10B981",fontWeight:700,letterSpacing:"0.1em"}}>VERIFIED</span>
                              </div>
                            </div>
                            {/* Fields grid */}
                            <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px 8px"}}>
                              <div style={{gridColumn:"span 2"}}>
                                <div style={fLabel}>Full Name</div>
                                <div style={{fontSize:"12px",fontWeight:700,color:"rgba(232,232,240,0.92)",wordBreak:"break-word"}}>{siteDisplayName||<span style={{color:"rgba(255,255,255,0.12)"}}>Your Name</span>}</div>
                              </div>
                              <div>
                                <div style={fLabel}>Passport ID</div>
                                <div style={fValAcc}>{passId}</div>
                              </div>
                              <div>
                                <div style={fLabel}>Issue Date</div>
                                <div style={fVal}>{new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</div>
                              </div>
                              <div>
                                <div style={fLabel}>Network</div>
                                <div style={fVal}>Solana</div>
                              </div>
                              <div>
                                <div style={fLabel}>Storage</div>
                                <div style={fVal}>Arweave ∞</div>
                              </div>
                              {siteUsername&&<div style={{gridColumn:"span 2"}}>
                                <div style={fLabel}>Digital Identity</div>
                                <div style={fValAcc}>🌐 {siteUsername}.codeofdigitaleternity.com</div>
                              </div>}
                              {siteTelegram&&<div style={{gridColumn:"span 2"}}>
                                <div style={fLabel}>Telegram</div>
                                <div style={fVal}>📱 {siteTelegram.startsWith("+")?"Telegram":`@${siteTelegram}`}</div>
                              </div>}
                              {siteTwitter&&<div style={{gridColumn:"span 2"}}>
                                <div style={fLabel}>Twitter / X</div>
                                <div style={fVal}>𝕏 @{siteTwitter}</div>
                              </div>}
                              {siteWebUrl&&<div style={{gridColumn:"span 2"}}>
                                <div style={fLabel}>Website</div>
                                <div style={{...fVal,wordBreak:"break-all"}}>🌐 {siteWebUrl}</div>
                              </div>}
                            </div>
                          </div>

                          {/* ── Crypto strip ── */}
                          <div style={{padding:"8px 12px",background:"rgba(0,0,0,0.15)",borderBottom:"1px solid rgba(255,255,255,0.05)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"6px"}}>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
                              <svg width={IW} height={IW} viewBox={`0 0 ${IW} ${IW}`} xmlns="http://www.w3.org/2000/svg" style={{display:"block"}}>
                                {iRects.map((r,i)=><rect key={i} x={r.x} y={r.y} width={IC-1} height={IC-1} rx="1" fill={tc} opacity="0.75"/>)}
                              </svg>
                              <span style={{fontSize:"5px",color:"rgba(255,255,255,0.18)",letterSpacing:"0.22em",textTransform:"uppercase"}}>Wallet Print</span>
                            </div>
                            <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"4px"}}>
                              <div style={{opacity:0.6}}>
                                <svg width="36" height="27" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <rect x="1" y="1" width="46" height="34" rx="5" stroke={tc} strokeOpacity="0.4" strokeWidth="1"/>
                                  <rect x="6" y="6" width="36" height="24" rx="3" stroke={tc} strokeOpacity="0.25" strokeWidth="0.8"/>
                                  <line x1="16" y1="1" x2="16" y2="6" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="24" y1="1" x2="24" y2="6" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="32" y1="1" x2="32" y2="6" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="16" y1="30" x2="16" y2="35" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="24" y1="30" x2="24" y2="35" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="32" y1="30" x2="32" y2="35" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="1" y1="12" x2="6" y2="12" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="1" y1="18" x2="6" y2="18" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="1" y1="24" x2="6" y2="24" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="42" y1="12" x2="47" y2="12" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="42" y1="18" x2="47" y2="18" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <line x1="42" y1="24" x2="47" y2="24" stroke={tc} strokeOpacity="0.35" strokeWidth="1"/>
                                  <rect x="13" y="10" width="22" height="16" rx="2" fill={tc} fillOpacity="0.08" stroke={tc} strokeOpacity="0.2" strokeWidth="0.6"/>
                                  <line x1="18" y1="10" x2="18" y2="26" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                                  <line x1="24" y1="10" x2="24" y2="26" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                                  <line x1="30" y1="10" x2="30" y2="26" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                                  <line x1="13" y1="15" x2="35" y2="15" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                                  <line x1="13" y1="21" x2="35" y2="21" stroke={tc} strokeOpacity="0.15" strokeWidth="0.6"/>
                                </svg>
                              </div>
                              <span style={{fontSize:"6px",color:"rgba(255,255,255,0.22)",letterSpacing:"0.16em",textTransform:"uppercase"}}>Solana Pay</span>
                            </div>
                            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:"3px"}}>
                              <div style={{padding:"4px",background:"#0D0D1A",borderRadius:"5px",border:"1px solid rgba(255,255,255,0.08)"}}>
                                <div style={{width:"49px",height:"49px",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"1px"}}>
                                  {Array.from({length:49}).map((_,i)=>(
                                    <div key={i} style={{background:QR_ON.has(i)?tc:"transparent",borderRadius:"1px"}}/>
                                  ))}
                                </div>
                              </div>
                              <span style={{fontSize:"5px",color:"rgba(255,255,255,0.18)",letterSpacing:"0.22em",textTransform:"uppercase",textAlign:"center"}}>Scan to Send</span>
                            </div>
                          </div>

                          {/* ── Content ── */}
                          {(siteBio||siteManifesto)&&(
                            <div style={{padding:"8px 12px",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                              {siteBio&&<div style={{marginBottom:siteManifesto?"6px":0,background:"rgba(255,255,255,0.03)",borderRadius:"6px",padding:"6px 8px"}}>
                                <div style={{fontSize:"6px",color:"rgba(255,255,255,0.28)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"3px"}}>About</div>
                                <div style={{fontSize:"9px",color:"rgba(232,232,240,0.65)",lineHeight:1.5,wordBreak:"break-word"}}>{siteBio}</div>
                              </div>}
                              {siteManifesto&&<div style={{background:"rgba(255,255,255,0.03)",borderRadius:"6px",padding:"6px 8px"}}>
                                <div style={{fontSize:"6px",color:"rgba(255,255,255,0.28)",letterSpacing:"0.14em",textTransform:"uppercase",marginBottom:"3px"}}>Manifesto</div>
                                <div style={{fontSize:"9px",color:"rgba(232,232,240,0.55)",lineHeight:1.5,fontStyle:"italic",wordBreak:"break-word"}}>"{siteManifesto}"</div>
                              </div>}
                            </div>
                          )}

                          {/* ── MRZ / Blockchain Proof ── */}
                          <div style={{padding:"7px 12px",background:"rgba(0,0,0,0.28)",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
                            <div style={{fontSize:"6px",color:"rgba(255,255,255,0.22)",letterSpacing:"0.2em",textTransform:"uppercase",marginBottom:"4px",paddingBottom:"3px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>Blockchain Proof</div>
                            <div style={{fontSize:"7px",fontFamily:"monospace",letterSpacing:"0.04em",lineHeight:1.8}}>
                              <div style={{display:"flex",gap:"6px"}}><span style={{color:"rgba(255,255,255,0.28)",flexShrink:0}}>WALLET</span><span style={{wordBreak:"break-all",color:"rgba(232,232,240,0.45)"}}>{addr||"—"}</span></div>
                            </div>
                          </div>

                          {/* ── Footer ── */}
                          <div style={{padding:"6px 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <div style={{display:"flex",alignItems:"center",gap:"4px"}}>
                              <div style={{width:"4px",height:"4px",borderRadius:"50%",background:"#10B981"}}/>
                              <span style={{fontSize:"8px",color:"rgba(255,255,255,0.18)"}}>Stored permanently on Arweave</span>
                            </div>
                            <span style={{fontSize:"8px",color:"rgba(255,255,255,0.12)",letterSpacing:"0.08em"}}>2026</span>
                          </div>
                        </>);
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════ METRICS TAB ══════════ */}
          {activeTab === "metrics" && <MetricsTab recentTxns={recentTxns} />}

          {/* ══════════ GAMES TAB ══════════ */}
          {activeTab === "games" && <GamesArena wallet={wallet?.address} />}

          {/* ══════════ DAO TAB ══════════ */}
          {activeTab === "dao" && <DaoTab />}

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
                  <div style={{ fontSize: "13px", fontFamily: "monospace", color: "#06B6D4", wordBreak: "break-all" }}>{PROGRAM_ID_STR}</div>
                </div>
                <a href={`https://explorer.solana.com/address/${PROGRAM_ID_STR}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
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

export default dynamic(() => Promise.resolve({ default: CabinetPage }), { ssr: false });
