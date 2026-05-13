'use client';
import React, { memo, useEffect, useState } from "react";

type MetricsData = { burnedCode: number; burnedCodeTrend: number; totalTransactions: number; txTrend: number; activeWallets: number; walletsTrend: number; treasuryUsdc: number; treasuryTrend: number; avgFee: number; currentSlot: number; burnHistory: { month: string; amount: number }[] };
type RecentTxn   = { wallet: string; tier: number; tierName: string; amount: number; txSig: string; status: string; createdAt: string };

const TIER_COLOR: Record<number, string> = { 1: "#7C3AED", 2: "#D4A24C", 3: "#10B981" };
const DIST_PIE = [
  { label: "Treasury",    pct: 65, color: "#3B82F6" },
  { label: "L1 Referral", pct: 15, color: "#7C3AED" },
  { label: "L2 Referral", pct:  7, color: "#06B6D4" },
  { label: "L3 Referral", pct:  3, color: "#10B981" },
  { label: "Ecosystem",   pct:  5, color: "#D4A24C" },
  { label: "Burn",        pct:  5, color: "#ef4444" },
];

function shortWallet(a: string) { return `${a.slice(0,4)}…${a.slice(-4)}`; }

const r = 70, cx = 100, cy = 100, sw = 28;
const circ = 2 * Math.PI * r;
let cum = 0;
const donutSlices = DIST_PIE.map(seg => {
  const dash = (seg.pct / 100) * circ;
  const gap  = circ - dash;
  const rot  = (cum / 100) * 360 - 90;
  cum += seg.pct;
  return { ...seg, dash, gap, rot };
});

interface Props { recentTxns: RecentTxn[] }

function MetricsTab({ recentTxns }: Props) {
  const [M, setM] = useState<MetricsData|null>(null);

  useEffect(() => {
    fetch("/api/stats/metrics").then(r => r.json()).then(setM).catch(() => {});
  }, []);

  const hist = M?.burnHistory ?? Array.from({length:12},(_,i)=>({month:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i],amount:0}));
  const maxH = Math.max(...hist.map(h=>h.amount), 1);
  const W = 600, H = 80;
  const sparkPts = hist.map((h,i) => `${(i/(hist.length-1))*W},${H-(h.amount/maxH)*H*0.85-4}`).join(" ");
  const fillPts = `0,${H} ${sparkPts} ${W},${H}`;

  const STAT_CARDS = [
    { icon: "🔥", label: "Burned $CODE",         val: M ? `${(M.burnedCode/1000000).toFixed(3).replace(/\.?0+$/,"")} M` : "—", trend: M?.burnedCodeTrend,    color: "#fb923c", desc: "Permanently removed from circulation" },
    { icon: "⚡", label: "Total Transactions",    val: M ? M.totalTransactions.toString() : "—",                              trend: M?.txTrend,              color: "#818cf8", desc: "On Solana blockchain" },
    { icon: "👥", label: "Active Wallets (24h)",  val: M ? M.activeWallets.toString() : "—",                                  trend: M?.walletsTrend,         color: "#06b6d4", desc: "Unique addresses" },
    { icon: "🏦", label: "Treasury Balance",      val: M ? `$${M.treasuryUsdc.toLocaleString()}` : "—",                       trend: M?.treasuryTrend,        color: "#D4A24C", desc: "USDC in DAO treasury" },
    { icon: "💎", label: "Avg Fee",               val: M ? `${M.avgFee}` : "—",                                               trend: undefined,               color: "#a78bfa", desc: "SOL per transaction" },
    { icon: "📡", label: "Current Slot",          val: M ? `#${M.currentSlot}` : "—",                                         trend: undefined,               color: "#38bdf8", desc: "Epoch 0" },
  ];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: "14px", marginBottom: "24px" }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} className="glass-panel" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "11px", color: "rgb(107,114,128)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: "26px", fontWeight: 900, color: s.color, letterSpacing: "-0.5px", marginBottom: "6px" }}>{s.val}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>{s.desc}</div>
              {s.trend !== undefined && <span style={{ fontSize: "11px", color: "#10B981", fontWeight: 600, whiteSpace: "nowrap" }}>+{s.trend}%</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
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
              <text x={cx} y={cy-8} textAnchor="middle" fill="white" fontSize="15" fontWeight="900" fontFamily="Inter,sans-serif">65%</text>
              <text x={cx} y={cy+8} textAnchor="middle" fill="rgb(107,114,128)" fontSize="9" fontFamily="Inter,sans-serif">Vault</text>
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
        ) : recentTxns.map((tx, i) => {
          const tColor = TIER_COLOR[tx.tier] ?? "#7C3AED";
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 0", borderBottom: i < recentTxns.length - 1 ? "1px solid rgba(42,42,58,0.5)" : "none" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>🔥</div>
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
                <div style={{ fontSize: "14px", fontWeight: 700, color: "#fb923c" }}>{Math.round(tx.amount * 5 * 100).toLocaleString()} $CODE</div>
                <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>5% of ${tx.amount}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(MetricsTab);
