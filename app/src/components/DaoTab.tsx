'use client';
import React, { memo, useState } from "react";

interface Proposal { id:number; title:string; desc:string; status:"active"|"passed"|"failed"; votesFor:number; votesAgainst:number; timeLeft:string; category:string }

const INIT_PROPOSALS: Proposal[] = [
  { id:1, title:"Increase Burn % from 5% to 7%", desc:"Proposal to increase the $CODE burn percentage per payment to strengthen the deflationary model.", status:"active", votesFor:1847, votesAgainst:623, timeLeft:"2d 14h", category:"Tokenomics" },
  { id:2, title:"Add new 'Archive Guardian' tier ($500)", desc:"Create an intermediate tier between Family Archives ($100) and Digital DNA ($1000) at $500.", status:"active", votesFor:1203, votesAgainst:987, timeLeft:"5d 8h", category:"Ecosystem" },
  { id:3, title:"Lower DAO voting threshold to 50 $CODE", desc:"Reduce the minimum $CODE required to participate in DAO governance from 100 to 50 tokens.", status:"passed", votesFor:3214, votesAgainst:402, timeLeft:"Completed", category:"Governance" },
];

const IVote = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"/><path d="M22 19H2"/></svg>;

function DaoTab() {
  const [proposals, setProposals] = useState<Proposal[]>(INIT_PROPOSALS);

  function voteOnProposal(id: number, type: "for"|"against") {
    setProposals(prev => prev.map(p => {
      if (p.id !== id || p.status !== "active") return p;
      return { ...p, votesFor: type==="for" ? p.votesFor+1 : p.votesFor, votesAgainst: type==="against" ? p.votesAgainst+1 : p.votesAgainst };
    }));
  }

  return (
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: "12px", marginBottom: "20px" }}>
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
                    <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "20px", background: "rgba(0,0,0,0.3)", color: catColor, border: `1px solid ${catColor}30` }}>{p.category}</span>
                    {p.status === "active" && <span style={{ fontSize: "11px", color: "#10B981", display: "flex", alignItems: "center", gap: "4px" }}><span style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#10B981", display:"inline-block" }} />Active</span>}
                    {p.status === "passed" && <span style={{ fontSize: "11px", color: "#10B981" }}>✓ Passed</span>}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 700, color: "rgb(232,232,240)" }}>{p.title}</div>
                </div>
              </div>
              <div style={{ fontSize: "13px", color: "rgb(139,139,158)", marginBottom: "14px" }}>{p.desc}</div>
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
  );
}

export default memo(DaoTab);
