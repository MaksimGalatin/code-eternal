'use client';
import React, { useState } from "react";

// ── Inline SVG icon ──────────────────────────────────────────────────────────
const IFileCode = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 12.5 8 15l2 2.5"/><path d="m14 12.5 2 2.5-2 2.5"/></svg>;

export interface ContractTabProps {
  programIdStr: string;
  lang: string;
}

export default function ContractTab({ programIdStr }: ContractTabProps) {
  const [scShowFlow, setScShowFlow] = useState(false);

  return (
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
          <div style={{ fontSize: "13px", fontFamily: "monospace", color: "#06B6D4", wordBreak: "break-all" }}>{programIdStr}</div>
        </div>
        <a href={`https://explorer.solana.com/address/${programIdStr}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
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
          Seeds: [&quot;user&quot;, wallet_pubkey] · 172 bytes · owner: {programIdStr.slice(0,8)}…
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
  );
}
