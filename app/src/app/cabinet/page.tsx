'use client';
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useCreateWallet } from "@privy-io/react-auth/solana";
import { useEffect } from "react";
import { useLang, t, type TranslationKey } from "@/lib/i18n";
import LangSwitcher from "@/components/LangSwitcher";
import GamesArena from "@/components/GamesArena";
import DaoTab from "@/components/DaoTab";
import MetricsTab from "@/components/MetricsTab";
import AlfaTab from "@/components/AlfaTab";
import ContractTab from "@/components/ContractTab";
import SiteTab from "@/components/SiteTab";
import MemoryTab from "@/components/MemoryTab";
import { useCabinetData } from "@/hooks/useCabinetData";
import { useAlfaChat } from "@/hooks/useAlfaChat";

const PROGRAM_ID_STR = process.env.NEXT_PUBLIC_PROGRAM_ID!;

const TIERS = [
  { id: 1, nameKey: "tier.spark" as const,    price: 15,   color: "#7C3AED", rgb: "124,58,237",  icon: "⚡" },
  { id: 2, nameKey: "tier.archives" as const, price: 100,  color: "#D4A24C", rgb: "212,162,76",  icon: "🏛️" },
  { id: 3, nameKey: "tier.dna" as const,      price: 1000, color: "#10B981", rgb: "16,185,129",  icon: "🧬" },
];
const TIER_COLOR: Record<number, string> = { 1: "#7C3AED", 2: "#D4A24C", 3: "#10B981" };

type Tab = "cabinet"|"alfa"|"memory"|"games"|"dao"|"site"|"contract"|"metrics";

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
const ILogOut = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>;
const ICopy = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IMemory = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/></svg>;

const TABS: { id: Tab; labelKey: TranslationKey; icon: React.ReactElement }[] = [
  { id: "cabinet",  labelKey: "tab.cabinet",  icon: <IWallet /> },
  { id: "alfa",     labelKey: "tab.aifa",     icon: <IBrain /> },
  { id: "memory",   labelKey: "tab.memory",   icon: <IMemory /> },
  { id: "games",    labelKey: "tab.games",    icon: <IGamepad /> },
  { id: "dao",      labelKey: "tab.dao",      icon: <IVote /> },
  { id: "site",     labelKey: "tab.site",     icon: <IGlobe /> },
  { id: "contract", labelKey: "tab.contract", icon: <IFileCode /> },
  { id: "metrics",  labelKey: "tab.metrics",  icon: <ITrending /> },
];

function CabinetPage() {
  const router = useRouter();
  const { user, logout, authenticated, ready, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const wallet = wallets[0];
  const { lang } = useLang();

  const [activeTab, setActiveTab] = useState<Tab>("cabinet");
  const [copied,    setCopied]    = useState(false);
  const [nftFlipped, setNftFlipped] = useState(false);

  const {
    myRefCode, siteStatus, setSiteStatus,
    overview, income, contributors,
    usdcBalance, tierExpires, recentTxns,
  } = useCabinetData(wallet, user ?? null);

  const {
    msgs: alfaMsgs, loading: alfaLoading, input: alfaInput,
    setInput: setAlfaInput, onSend: sendAlfaMessage,
    messagesEndRef, memorySessions, saving: alfaSaving, unsavedBytes,
  } = useAlfaChat(wallet?.address, getAccessToken);

  useEffect(() => {
    if (ready && authenticated && wallets.length === 0) createWallet().catch(() => {});
  }, [ready, authenticated, wallets.length]);

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  function copyRef() {
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${myRefCode}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
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
        <div className="tab-bar" style={{ display: "flex", gap: "8px", padding: "16px 24px", overflowX: "auto", scrollbarWidth: "none" as React.CSSProperties["scrollbarWidth"], background: "transparent", position: "relative", zIndex: 10 }}>
          {TABS.map(tab => {
            const locked = false;
            return (
              <button
                key={tab.id}
                className={`nav-tab${activeTab === tab.id ? " nav-tab-active" : ""}${locked ? " nav-tab-locked" : ""}`}
                onClick={() => !locked && setActiveTab(tab.id)}
              >
                {tab.icon}
                <span className="nav-tab-label">{t(tab.labelKey, lang)}</span>
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
                      {siteStatus.username && (
                        <a href={`https://${siteStatus.username}.codeofdigitaleternity.com`} target="_blank" rel="noopener noreferrer"
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
                {([
                  { labelKey: "cabinet.stats.burned"  as TranslationKey, val: overview ? fmtNum(Math.round(overview.burnedUsdc)) : "—", color: "#fb923c", borderColor: "rgba(251,146,60,0.25)", icon: "🔥" },
                  { labelKey: "cabinet.stats.members" as TranslationKey, val: overview ? fmtNum(overview.activeMembers) : "—",           color: "#a78bfa", borderColor: "rgba(124,58,237,0.25)", icon: "👥" },
                  { labelKey: "cabinet.stats.sites"   as TranslationKey, val: overview ? fmtNum(overview.sitesCreated) : "—",            color: "#10B981", borderColor: "rgba(16,185,129,0.25)", icon: "🌐" },
                ] as const).map(s => (
                  <div key={s.labelKey} className="glass-panel" style={{ flex: "1", padding: "20px 24px", borderColor: s.borderColor, minWidth: 0 }}>
                    <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {s.icon} {t(s.labelKey, lang)}
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
            <AlfaTab
              msgs={alfaMsgs}
              loading={alfaLoading}
              input={alfaInput}
              onInputChange={setAlfaInput}
              onSend={sendAlfaMessage}
              messagesEndRef={messagesEndRef}
              lang={lang}
              memorySessions={memorySessions}
              saving={alfaSaving}
              unsavedBytes={unsavedBytes}
            />
          )}

          {/* ══════════ MEMORY TAB ══════════ */}
          {activeTab === "memory" && (
            <MemoryTab wallet={wallet?.address ?? null} memoryCount={memorySessions} getAccessToken={getAccessToken} />
          )}

          {/* ══════════ SITE TAB ══════════ */}
          {activeTab === "site" && (
            <SiteTab
              wallet={wallet}
              lang={lang}
              siteStatus={siteStatus}
              tierExpires={tierExpires}
              getAccessToken={getAccessToken}
              onSuccess={(status) => { setSiteStatus(status); setActiveTab("cabinet"); }}
              onNavigateBack={() => setActiveTab("cabinet")}
            />
          )}

          {/* ══════════ METRICS TAB ══════════ */}
          {activeTab === "metrics" && <MetricsTab recentTxns={recentTxns} />}

          {/* ══════════ GAMES TAB ══════════ */}
          {activeTab === "games" && <GamesArena wallet={wallet?.address} />}

          {/* ══════════ DAO TAB ══════════ */}
          {activeTab === "dao" && <DaoTab />}

          {/* ══════════ SMART CONTRACT TAB ══════════ */}
          {activeTab === "contract" && (
            <ContractTab programIdStr={PROGRAM_ID_STR} lang={lang} />
          )}

        </div>
      </div>
    </>
  );
}

export default dynamic(() => Promise.resolve({ default: CabinetPage }), { ssr: false });
