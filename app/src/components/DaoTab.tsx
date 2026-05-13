'use client';
import React, { memo, useState } from "react";

interface Proposal { id:number; title:string; desc:string; status:"active"|"passed"|"failed"; votesFor:number; votesAgainst:number; timeLeft:string; category:string }

const INIT_PROPOSALS: Proposal[] = [
  { id:1, title:"Increase Burn % from 5% to 7%", desc:"Proposal to increase the $CODE burn percentage per payment to strengthen the deflationary model.", status:"active", votesFor:1847, votesAgainst:623, timeLeft:"2d 14h", category:"Tokenomics" },
  { id:2, title:"Add new 'Archive Guardian' tier ($500)", desc:"Create an intermediate tier between Family Archives ($100) and Digital DNA ($1000) at $500.", status:"active", votesFor:1203, votesAgainst:987, timeLeft:"5d 8h", category:"Ecosystem" },
  { id:3, title:"Lower DAO voting threshold to 50 $CODE", desc:"Reduce the minimum $CODE required to participate in DAO governance from 100 to 50 tokens.", status:"passed", votesFor:3214, votesAgainst:402, timeLeft:"Completed", category:"Governance" },
];

const IVote = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4"/><path d="M5 7c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v12H5V7Z"/><path d="M22 19H2"/></svg>;

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 14px", borderRadius: "10px", fontSize: "13px",
  background: "rgb(19,19,28)", border: "1px solid rgb(42,42,58)", color: "rgb(232,232,240)",
  fontFamily: "Inter,sans-serif", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = { fontSize: "12px", color: "rgb(139,139,158)", marginBottom: "6px", display: "block" };

function ApplyForm() {
  const [form, setForm] = useState({ fio: "", contact: "", language: "", avatar_desc: "", reason: "" });
  const [state, setState] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [errMsg, setErrMsg] = useState("");

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErrMsg("");
    try {
      const res = await fetch("/api/apply-1000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setErrMsg(data.error || "Submission failed"); setState("error"); return; }
      setState("success");
    } catch {
      setErrMsg("Network error — please try again");
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "rgb(232,232,240)", marginBottom: "8px" }}>Application Received</div>
        <div style={{ fontSize: "13px", color: "rgb(107,114,128)" }}>The architects will review your application and contact you via the provided channel. Digital DNA awaits.</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div>
          <label style={labelStyle}>Full Name *</label>
          <input style={inputStyle} placeholder="Your full name" value={form.fio} onChange={e => set("fio", e.target.value)} maxLength={120} required />
        </div>
        <div>
          <label style={labelStyle}>Contact (Telegram / Email) *</label>
          <input style={inputStyle} placeholder="@username or email" value={form.contact} onChange={e => set("contact", e.target.value)} maxLength={120} required />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Language(s)</label>
        <input style={inputStyle} placeholder="e.g. English, Russian, Spanish" value={form.language} onChange={e => set("language", e.target.value)} maxLength={60} />
      </div>
      <div>
        <label style={labelStyle}>Describe your ideal avatar / digital identity</label>
        <textarea style={{ ...inputStyle, minHeight: "80px", resize: "vertical" }} placeholder="How do you see your digital self in the CODE ETERNAL universe?" value={form.avatar_desc} onChange={e => set("avatar_desc", e.target.value)} maxLength={500} />
      </div>
      <div>
        <label style={labelStyle}>Why do you want to join at the Digital DNA level? *</label>
        <textarea style={{ ...inputStyle, minHeight: "100px", resize: "vertical" }} placeholder="Tell us your story — what brings you here, what you believe in, what you want to preserve forever." value={form.reason} onChange={e => set("reason", e.target.value)} maxLength={2000} required />
      </div>
      {state === "error" && <div style={{ fontSize: "13px", color: "#ef4444" }}>{errMsg}</div>}
      <button type="submit" disabled={state === "loading"}
        style={{ alignSelf: "flex-start", background: "linear-gradient(135deg,#10B981,#059669)", color: "white", border: "none", borderRadius: "12px", padding: "12px 28px", fontSize: "14px", fontWeight: 700, cursor: state === "loading" ? "not-allowed" : "pointer", opacity: state === "loading" ? 0.7 : 1, fontFamily: "Inter,sans-serif" }}>
        {state === "loading" ? "Submitting…" : "Apply for Digital DNA — $1000"}
      </button>
    </form>
  );
}

function DaoTab() {
  const [proposals, setProposals] = useState<Proposal[]>(INIT_PROPOSALS);
  const [showApply, setShowApply] = useState(false);

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
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={() => setShowApply(v => !v)}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg,#10B981,#059669)", color: "white", border: "none", borderRadius: "12px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            🧬 Apply for $1000 Elite
          </button>
          <button style={{ display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg,#7C3AED,#6D28D9)", color: "white", border: "none", borderRadius: "12px", padding: "10px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            + Create Proposal
          </button>
        </div>
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

      {showApply && (
        <div className="glass-panel" style={{ padding: "24px", marginBottom: "20px", border: "1px solid rgba(16,185,129,0.25)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
            <span style={{ fontSize: "24px" }}>🧬</span>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "rgb(232,232,240)" }}>Apply for Digital DNA — $1000</div>
              <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>The highest tier — permanent on-chain identity, handcrafted avatar, priority community access. By application only.</div>
            </div>
          </div>
          <ApplyForm />
        </div>
      )}

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
