'use client';
import React from "react";

// ── Inline SVG icons ────────────────────────────────────────────────────────
const IBot = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
const IBrain = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 18V5"/><path d="M15 13a4.17 4.17 0 0 1-3-4 4.17 4.17 0 0 1-3 4"/><path d="M17.598 6.5A3 3 0 1 0 12 5a3 3 0 1 0-5.598 1.5"/><path d="M17.997 5.125a4 4 0 0 1 2.526 5.77"/><path d="M18 18a4 4 0 0 0 2-7.464"/><path d="M19.967 17.483A4 4 0 1 1 12 18a4 4 0 1 1-7.967-.517"/><path d="M6 18a4 4 0 0 1-2-7.464"/><path d="M6.003 5.125a4 4 0 0 0-2.526 5.77"/></svg>;
const ISparkles = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/></svg>;
const ISend = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/></svg>;
const IUser = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;

export interface AlfaTabProps {
  msgs: { from: "bot" | "user"; text: string }[];
  loading: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  lang: string;
}

export default function AlfaTab({ msgs, loading, input, onInputChange, onSend, messagesEndRef }: AlfaTabProps) {
  return (
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
          {msgs.map((msg, i) => (
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
          {loading && (
            <div style={{ display: "flex", gap: "10px" }}>
              <div className="msg-avatar-bot"><span style={{ color: "white" }}><IBot /></span></div>
              <div className="msg-bot" style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#7C3AED", animation: `bounce 1s ${i * 0.15}s infinite` }} />)}
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
              value={input}
              onChange={e => onInputChange(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) onSend(); }}
              disabled={loading}
            />
            <button
              onClick={onSend}
              disabled={loading || !input.trim()}
              style={{ width: "44px", height: "44px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", background: input && !loading ? "linear-gradient(135deg,rgb(124,58,237),rgb(109,40,217))" : "rgb(42,42,58)", border: "none", cursor: input && !loading ? "pointer" : "default", color: "white", flexShrink: 0, transition: "background 0.15s" }}
            >
              <ISend />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
