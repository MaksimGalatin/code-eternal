import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL!;
const USDC_MINT_STR = process.env.NEXT_PUBLIC_USDC_MINT;

const TIERS = [
  { id: 1, name: "Spark",           price: 15,   color: "#7C3AED", rgb: "124,58,237",  icon: "⚡", features: 4 },
  { id: 2, name: "Family Archives", price: 100,  color: "#D4A24C", rgb: "212,162,76",  icon: "🏛️", features: 5 },
  { id: 3, name: "Digital DNA",     price: 1000, color: "#10B981", rgb: "16,185,129",  icon: "🧬", features: 6 },
];

const TIER_COLOR: Record<number, string> = { 1: "#7C3AED", 2: "#D4A24C", 3: "#10B981" };
const TIER_NAME: Record<number, string>  = { 1: "Spark", 2: "Family Archives", 3: "Digital DNA" };

type SiteStatus = { status: "none"|"pending"|"done"|"error"; arweaveUrl?: string|null; tier: number };
type Income     = { l1: number; l2: number; l3: number; total: number; recent: any[] };
type Overview   = { burnedUsdc: number; burnTxs: number; activeMembers: number; sitesCreated: number };
type Contributor= { rank: number; wallet: string; displayName: string|null; tier: number; tierName: string; amountUsdc: number };

const AVATAR = ["🧙", "🦄", "🐉", "🦊", "🤖", "👾", "🧬", "🦁", "🌙", "⚡"];
function avatarFor(wallet: string) { return AVATAR[parseInt(wallet.slice(-2), 16) % AVATAR.length]; }
function shortWallet(a: string)    { return `${a.slice(0,4)}…${a.slice(-4)}`; }
function fmtUsd(n: number)         { return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function fmtNum(n: number)         { return n.toLocaleString("en-US"); }

export default function CabinetPage() {
  const router = useRouter();
  const { user, logout, authenticated, ready } = usePrivy();
  const { wallets, createWallet } = useSolanaWallets();
  const wallet = wallets[0];

  const [myRefCode,    setMyRefCode]    = useState("");
  const [siteStatus,   setSiteStatus]   = useState<SiteStatus|null>(null);
  const [copied,       setCopied]       = useState(false);
  const [overview,     setOverview]     = useState<Overview|null>(null);
  const [income,       setIncome]       = useState<Income|null>(null);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [usdcBalance,  setUsdcBalance]  = useState<number|null>(null);

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
    }).then(r => r.json()).then(({ refCode: c }) => { if (c) setMyRefCode(c); }).catch(() => {});

    fetch(`/api/users/site-status?wallet=${wallet.address}`)
      .then(r => r.json()).then(setSiteStatus).catch(() => {});

    fetch(`/api/referrals/income?wallet=${wallet.address}`)
      .then(r => r.json()).then(setIncome).catch(() => {});
  }, [wallet, user]);

  useEffect(() => {
    if (!wallet || !USDC_MINT_STR) return;
    (async () => {
      try {
        const connection = new Connection(RPC_URL, "confirmed");
        const payer = new PublicKey(wallet.address);
        const mint = new PublicKey(USDC_MINT_STR);
        const ata = await getAssociatedTokenAddress(mint, payer);
        const info = await connection.getTokenAccountBalance(ata);
        setUsdcBalance(info.value.uiAmount ?? 0);
      } catch {
        setUsdcBalance(0);
      }
    })();
  }, [wallet]);

  useEffect(() => {
    fetch("/api/stats/overview").then(r => r.json()).then(setOverview).catch(() => {});
    fetch("/api/stats/top-contributors").then(r => r.json())
      .then(({ contributors: c }) => { if (c) setContributors(c); }).catch(() => {});
  }, []);

  function copyRef() {
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${myRefCode}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  const email = user?.email?.address ?? user?.google?.email ?? "";

  if (!ready || !authenticated) {
    return <div style={{ background: "#0d1117", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#6e7681", fontFamily: "Inter,sans-serif" }}>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Cabinet — CODE ETERNAL</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Inter, system-ui, sans-serif; background: #0d1117; color: #e6edf3; overflow-x: hidden; }

          .nav-tab {
            display: inline-flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;
            cursor: pointer; color: #8b949e; border: none; background: transparent;
            font-family: Inter, sans-serif; transition: color 0.15s, background 0.15s;
          }
          .nav-tab:hover  { color: #e6edf3; background: rgba(255,255,255,0.06); }
          .nav-tab.active { color: #e6edf3; background: rgba(124,58,237,0.18); }

          .stat-card {
            flex: 1; background: #161b22; border: 1px solid #21262d;
            border-radius: 12px; padding: 20px 24px; min-width: 0;
            transition: border-color 0.2s;
          }
          .stat-card:hover { border-color: #30363d; }

          .panel {
            background: #161b22; border: 1px solid #21262d;
            border-radius: 12px; padding: 24px;
          }

          .tier-row {
            display: flex; align-items: center; gap: 14px;
            padding: 14px 16px; border-radius: 10px; cursor: pointer;
            transition: background 0.15s; text-decoration: none;
            border: 1px solid transparent;
          }
          .tier-row:hover { background: rgba(255,255,255,0.04); border-color: #30363d; }
          .tier-row + .tier-row { margin-top: 8px; }

          .contributor-card {
            flex: 0 0 calc(33.33% - 12px);
            background: #161b22; border: 1px solid #21262d;
            border-radius: 12px; padding: 24px 16px; text-align: center;
            position: relative; overflow: hidden;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .contributor-card::before {
            content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px;
            background: linear-gradient(90deg, transparent, var(--tc, #7C3AED), transparent);
          }
          .contributor-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.4); }

          .rank-crown { position: absolute; top: -2px; right: 12px; font-size: 18px; }

          .copy-btn {
            background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.4);
            color: #9b74f0; border-radius: 6px; padding: 6px 12px; font-size: 12px;
            cursor: pointer; font-family: Inter, sans-serif; white-space: nowrap;
            transition: background 0.15s;
          }
          .copy-btn:hover { background: rgba(124,58,237,0.35); }

          .ref-input {
            flex: 1; background: #0d1117; border: 1px solid #21262d;
            border-radius: 6px; padding: 8px 12px; color: #8b949e;
            font-size: 12px; font-family: monospace; min-width: 0;
            outline: none;
          }

          .tx-empty { text-align: center; padding: 32px; color: #484f58; font-size: 13px; }

          .tx-row {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 0; border-bottom: 1px solid #21262d; font-size: 13px;
          }
          .tx-row:last-child { border-bottom: none; }

          .badge {
            display: inline-block; border-radius: 20px; padding: 3px 10px;
            font-size: 11px; font-weight: 600;
          }

          @media (max-width: 900px) {
            .main-cols { flex-direction: column !important; }
            .contributor-card { flex: 0 0 100%; }
          }
        `}</style>
      </Head>

      {/* Top nav bar */}
      <nav style={{ background: "#161b22", borderBottom: "1px solid #21262d", padding: "0 24px", display: "flex", alignItems: "center", gap: "8px", height: "52px", position: "sticky", top: 0, zIndex: 100 }}>
        <span style={{ fontSize: "15px", fontWeight: 900, background: "linear-gradient(90deg,#9b74f0,#c4b5fd)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginRight: "16px", flexShrink: 0 }}>
          🔮 CODE ETERNAL
        </span>
        <button className="nav-tab active">🗂️ Cabinet</button>
        <button className="nav-tab" style={{ color: "#484f58", cursor: "default" }}>🤖 Alfa Terminal</button>
        <button className="nav-tab" style={{ color: "#484f58", cursor: "default" }}>🏛️ DAO</button>
        <button className="nav-tab" style={{ color: "#484f58", cursor: "default" }}>📜 Smart Contract</button>
        <button className="nav-tab" style={{ color: "#484f58", cursor: "default" }}>📊 Metrics</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ textAlign: "right", lineHeight: 1.2 }}>
            <div style={{ fontSize: "12px", color: "#e6edf3", fontWeight: 600 }}>
              {usdcBalance === null ? "..." : `$${fmtUsd(usdcBalance)} USDC`}
            </div>
            <div style={{ fontSize: "10px", color: "#484f58" }}>$0 CODE</div>
          </div>
          {email && <span style={{ color: "#8b949e", fontSize: "12px" }}>{email}</span>}
          {wallet && <span style={{ color: "#484f58", fontSize: "11px", fontFamily: "monospace" }}>{shortWallet(wallet.address)}</span>}
          {myRefCode && (
            <button className="copy-btn" onClick={copyRef} style={{ fontSize: "11px" }}>
              {copied ? "Copied!" : `ref: ${myRefCode}`}
            </button>
          )}
          <button onClick={logout} style={{ background: "transparent", border: "none", color: "#8b949e", cursor: "pointer", fontSize: "16px" }} title="Logout">↪</button>
        </div>
      </nav>

      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "32px 24px" }}>

        {/* Welcome */}
        <div style={{ marginBottom: "28px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px" }}>Welcome, Guardian! 👋</h1>
          <p style={{ color: "#8b949e", fontSize: "14px" }}>Choose a tier to activate Alfa and start earning</p>
        </div>

        {/* 3 stat counters */}
        <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
          <div className="stat-card" style={{ borderColor: "rgba(251,146,60,0.3)" }}>
            <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              🔥 <span>Burned $CODE</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#fb923c", letterSpacing: "-0.5px" }}>
              {overview ? fmtNum(Math.round(overview.burnedUsdc)) : "—"}
            </div>
          </div>
          <div className="stat-card" style={{ borderColor: "rgba(124,58,237,0.3)" }}>
            <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              👥 <span>Active Members</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#9b74f0", letterSpacing: "-0.5px" }}>
              {overview ? fmtNum(overview.activeMembers) : "—"}
            </div>
          </div>
          <div className="stat-card" style={{ borderColor: "rgba(16,185,129,0.3)" }}>
            <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
              🌐 <span>Sites Created</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 900, color: "#10B981", letterSpacing: "-0.5px" }}>
              {overview ? fmtNum(overview.sitesCreated) : "—"}
            </div>
          </div>
        </div>

        {/* Site status (if applicable) */}
        {siteStatus && siteStatus.status !== "none" && (
          <div style={{ marginBottom: "24px", background: siteStatus.status === "done" ? "rgba(16,185,129,0.08)" : "rgba(124,58,237,0.06)", border: `1px solid ${siteStatus.status === "done" ? "rgba(16,185,129,0.3)" : "rgba(124,58,237,0.2)"}`, borderRadius: "12px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#8b949e", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "1px" }}>Eternal Site</div>
              <div style={{ fontWeight: 700, color: siteStatus.status === "done" ? "#10B981" : siteStatus.status === "error" ? "#f85149" : "#9b74f0" }}>
                {siteStatus.status === "done" ? "✓ Live on Arweave" : siteStatus.status === "error" ? "✕ Generation failed" : "⟳ Generating…"}
              </div>
            </div>
            {siteStatus.status === "done" && siteStatus.arweaveUrl && (
              <a href={siteStatus.arweaveUrl} target="_blank" rel="noopener noreferrer" style={{ background: "#10B981", color: "white", padding: "8px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "13px", fontWeight: 700 }}>
                View Site →
              </a>
            )}
          </div>
        )}

        {/* Main two-column layout */}
        <div className="main-cols" style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>

          {/* LEFT — My Income */}
          <div className="panel" style={{ flex: "1 1 55%" }}>
            <div style={{ fontSize: "13px", color: "#8b949e", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
              💰 <span style={{ fontWeight: 600 }}>My Income</span>
            </div>

            <div style={{ marginBottom: "4px", fontSize: "32px", fontWeight: 900, color: "#e6edf3" }}>
              ${income ? fmtUsd(income.total) : "0.00"}
            </div>
            <div style={{ fontSize: "12px", color: "#8b949e", marginBottom: "20px" }}>total earned</div>

            <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
              {[
                { label: "L1 (15%)", val: income?.l1 ?? 0 },
                { label: "L2 (7%)",  val: income?.l2 ?? 0 },
                { label: "L3 (3%)",  val: income?.l3 ?? 0 },
              ].map(({ label, val }) => (
                <div key={label}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: val > 0 ? "#9b74f0" : "#484f58" }}>
                    {val > 0 ? `$${fmtUsd(val)}` : "0"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#8b949e" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Referral link */}
            {myRefCode && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  readOnly
                  className="ref-input"
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${myRefCode}`}
                />
                <button className="copy-btn" onClick={copyRef}>
                  {copied ? "✓ Copied" : "📋 Copy"}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT — Current plan or choose tier */}
          <div className="panel" style={{ flex: "1 1 40%" }}>
            {siteStatus && siteStatus.tier > 0 ? (() => {
              const currentTier = TIERS.find(t => t.id === siteStatus.tier)!;
              const upgradeTiers = TIERS.filter(t => t.id > siteStatus.tier);
              return (
                <>
                  <div style={{ fontSize: "13px", color: "#8b949e", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                    🏆 <span style={{ fontWeight: 600 }}>Your Plan</span>
                  </div>
                  <div style={{ background: `rgba(${currentTier.rgb},0.08)`, border: `1px solid rgba(${currentTier.rgb},0.3)`, borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "24px" }}>{currentTier.icon}</span>
                      <div>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: currentTier.color }}>{currentTier.name}</div>
                        <div style={{ fontSize: "11px", color: "#8b949e" }}>{currentTier.features} features · Active</div>
                      </div>
                      <div style={{ marginLeft: "auto", fontSize: "11px", background: `rgba(${currentTier.rgb},0.15)`, color: currentTier.color, padding: "3px 10px", borderRadius: "20px", fontWeight: 700 }}>
                        ✓ Active
                      </div>
                    </div>
                  </div>
                  {upgradeTiers.length > 0 && (
                    <>
                      <div style={{ fontSize: "11px", color: "#484f58", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "1px" }}>Upgrade</div>
                      {upgradeTiers.map((t) => (
                        <div key={t.id} className="tier-row" onClick={() => router.push(`/cabinet/buy?tier=${t.id}`)}>
                          <span style={{ fontSize: "18px", width: "28px", textAlign: "center" }}>{t.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "13px", fontWeight: 700, color: t.color }}>{t.name}</div>
                            <div style={{ fontSize: "11px", color: "#8b949e" }}>{t.features} features</div>
                          </div>
                          <div style={{ fontSize: "16px", fontWeight: 900, color: t.color }}>${t.price.toLocaleString()}</div>
                          <div style={{ color: "#484f58", fontSize: "16px" }}>›</div>
                        </div>
                      ))}
                    </>
                  )}
                  {upgradeTiers.length === 0 && (
                    <div style={{ textAlign: "center", color: "#484f58", fontSize: "12px", padding: "8px 0" }}>
                      You are at the highest tier 🧬
                    </div>
                  )}
                </>
              );
            })() : (
              <>
                <div style={{ fontSize: "13px", color: "#8b949e", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
                  🏆 <span style={{ fontWeight: 600 }}>Choose Access Level</span>
                </div>
                {TIERS.map((t) => (
                  <div key={t.id} className="tier-row" onClick={() => router.push(`/cabinet/buy?tier=${t.id}`)}>
                    <span style={{ fontSize: "20px", width: "32px", textAlign: "center" }}>{t.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: t.color }}>{t.name}</div>
                      <div style={{ fontSize: "11px", color: "#8b949e" }}>{t.features} features</div>
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 900, color: t.color }}>${t.price.toLocaleString()}</div>
                    <div style={{ color: "#484f58", fontSize: "18px" }}>›</div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="panel" style={{ marginBottom: "24px" }}>
          <div style={{ fontSize: "13px", color: "#8b949e", marginBottom: "20px", display: "flex", alignItems: "center", gap: "6px" }}>
            🛡️ <span style={{ fontWeight: 600 }}>Recent Transactions</span>
          </div>

          {!income || income.recent.length === 0 ? (
            <div className="tx-empty">
              <div style={{ marginBottom: "6px" }}>No transactions yet</div>
              <div style={{ fontSize: "12px" }}>Buy a tier to see transactions</div>
            </div>
          ) : (
            income.recent.map((tx: any, i: number) => (
              <div key={i} className="tx-row">
                <div>
                  <div style={{ color: "#e6edf3", fontFamily: "monospace" }}>{shortWallet(tx.payer_wallet)}</div>
                  <div style={{ fontSize: "11px", color: "#8b949e" }}>Level {tx.level} referral · {TIER_NAME[tx.tier] ?? "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#9b74f0", fontWeight: 700 }}>+${Number(tx.amount_usdc).toFixed(2)}</div>
                  <div style={{ fontSize: "11px", color: "#484f58" }}>{new Date(tx.created_at).toLocaleDateString()}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Top Contributors */}
        {contributors.length > 0 && (
          <div>
            <div style={{ fontSize: "13px", color: "#8b949e", marginBottom: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
              🔥 🏆 <span style={{ fontWeight: 600, color: "#e6edf3" }}>Top Guardians of Eternity</span>
            </div>

            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {contributors.slice(0, 3).map((c, i) => {
                const tColor = TIER_COLOR[c.tier] ?? "#7C3AED";
                const medal = ["👑", "🥈", "🥉"][i];
                return (
                  <div key={c.wallet} className="contributor-card" style={{ ["--tc" as any]: tColor }}>
                    {i === 0 && <div className="rank-crown">👑</div>}
                    <div style={{ fontSize: "36px", marginBottom: "10px" }}>{avatarFor(c.wallet)}</div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "#e6edf3", marginBottom: "4px" }}>
                      {c.displayName ?? shortWallet(c.wallet)}
                    </div>
                    <div style={{ fontSize: "20px", fontWeight: 900, color: "#fb923c", marginBottom: "2px" }}>
                      {fmtNum(c.amountUsdc)} <span style={{ fontSize: "14px" }}>🔥</span>
                    </div>
                    <div style={{ marginTop: "12px" }}>
                      <span className="badge" style={{ background: `rgba(${c.tier === 1 ? "124,58,237" : c.tier === 2 ? "212,162,76" : "16,185,129"},0.15)`, border: `1px solid ${tColor}50`, color: tColor }}>
                        {c.tierName}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Remaining as compact rows */}
              {contributors.length > 3 && (
                <div style={{ flex: "1 1 100%", background: "#161b22", border: "1px solid #21262d", borderRadius: "12px", padding: "8px 0" }}>
                  {contributors.slice(3).map((c) => {
                    const tColor = TIER_COLOR[c.tier] ?? "#7C3AED";
                    return (
                      <div key={c.wallet} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "10px 20px", borderBottom: "1px solid #21262d" }}>
                        <span style={{ color: "#484f58", fontWeight: 700, width: "24px", textAlign: "center" }}>#{c.rank}</span>
                        <span style={{ fontSize: "18px" }}>{avatarFor(c.wallet)}</span>
                        <span style={{ flex: 1, fontSize: "13px", color: "#c9d1d9", fontFamily: "monospace" }}>{c.displayName ?? shortWallet(c.wallet)}</span>
                        <span className="badge" style={{ background: `rgba(${c.tier === 1 ? "124,58,237" : c.tier === 2 ? "212,162,76" : "16,185,129"},0.12)`, border: `1px solid ${tColor}40`, color: tColor }}>
                          {c.tierName}
                        </span>
                        <span style={{ fontWeight: 700, color: "#fb923c", fontSize: "13px" }}>${fmtNum(c.amountUsdc)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: "48px", borderTop: "1px solid #21262d", paddingTop: "24px" }}>
          <a
            href={`https://explorer.solana.com/address/8rzMmrC6UH5gCringWk1NsRXtfWkrfjz91tT5dmEGAep?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", color: "#9b74f0", fontSize: "12px", textDecoration: "none", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "20px", padding: "6px 16px", transition: "border-color 0.2s" }}
          >
            🔍 Smart Contract: 8rzMmrC6…GAep — View on Solana Explorer
          </a>
          <p style={{ color: "#30363d", fontSize: "11px", marginTop: "12px", letterSpacing: "0.5px" }}>
            Solana devnet · mock USDC · Arweave permanent storage
          </p>
        </div>
      </div>
    </>
  );
}
