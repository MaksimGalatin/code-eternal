'use client';
import React, { useState, useRef } from "react";
import { t, type Lang } from "@/lib/i18n";
import { useIsMobile, genId, GAME_TOKENS } from "./types";

// ─── Tic-Tac-Toe ──────────────────────────────────────────────────────────────
type TTTBoard = (null | "X" | "O")[];

function tttWinner(b: TTTBoard): null | "X" | "O" | "draw" {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a, bb, c] of lines) { if (b[a] && b[a] === b[bb] && b[a] === b[c]) return b[a] as "X" | "O"; }
  if (b.every(x => x !== null)) return "draw";
  return null;
}

function tttMinimax(b: TTTBoard, isO: boolean, alpha: number, beta: number): number {
  const w = tttWinner(b);
  if (w === "O") return 10; if (w === "X") return -10; if (w === "draw") return 0;
  if (isO) {
    let v = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== null) continue;
      const nb = [...b] as TTTBoard; nb[i] = "O";
      v = Math.max(v, tttMinimax(nb, false, alpha, beta));
      alpha = Math.max(alpha, v); if (beta <= alpha) break;
    }
    return v;
  } else {
    let v = Infinity;
    for (let i = 0; i < 9; i++) {
      if (b[i] !== null) continue;
      const nb = [...b] as TTTBoard; nb[i] = "X";
      v = Math.min(v, tttMinimax(nb, true, alpha, beta));
      beta = Math.min(beta, v); if (beta <= alpha) break;
    }
    return v;
  }
}

function tttBestMove(b: TTTBoard): number {
  let best = -Infinity, idx = 0;
  // Center preference for first move (pure strategy)
  if (b[4] === null) return 4;
  b.forEach((cell, i) => {
    if (cell !== null) return;
    const nb = [...b] as TTTBoard; nb[i] = "O";
    const s = tttMinimax(nb, false, -Infinity, Infinity);
    if (s > best) { best = s; idx = i; }
  });
  return idx;
}

export function TicTacToe({
  lang, showLB, setShowLB, onWin,
}: {
  lang: Lang; showLB: boolean; setShowLB: (v: boolean | ((p: boolean) => boolean)) => void;
  onWin: (tokens: number, sid: string) => void;
}) {
  const mobile    = useIsMobile();
  const cell      = mobile ? 72 : 80;
  const sessionId = useRef(genId());
  const rewarded  = useRef(false);
  const aiLocked  = useRef(false);
  const [board, setBoard] = useState<TTTBoard>(Array(9).fill(null));
  const [xTurn, setXTurn] = useState(true);
  const winner = tttWinner(board);

  function handleClick(i: number) {
    if (board[i] !== null || winner || !xTurn || aiLocked.current) return;
    const nb = [...board] as TTTBoard; nb[i] = "X";
    const w = tttWinner(nb);
    setBoard(nb); setXTurn(false);
    if (w === "X" && !rewarded.current) { rewarded.current = true; onWin(GAME_TOKENS.ttt, sessionId.current); }
    if (!w) {
      aiLocked.current = true;
      setTimeout(() => {
        setBoard(prev => {
          if (tttWinner(prev)) { aiLocked.current = false; return prev; }
          const nb2 = [...prev] as TTTBoard; nb2[tttBestMove(nb2)] = "O";
          aiLocked.current = false;
          return nb2;
        });
        setXTurn(true);
      }, 280);
    }
  }

  function reset() {
    setBoard(Array(9).fill(null)); setXTurn(true);
    sessionId.current = genId(); rewarded.current = false; aiLocked.current = false;
  }

  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const winLine = lines.find(([a, b, c]) => board[a] !== null && board[a] === board[b] && board[a] === board[c]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
      <div className="glass-panel-sm" style={{ padding: "10px 32px", textAlign: "center" }}>
        {winner === "X"    && <span style={{ fontWeight: 700, color: "#10B981", fontSize: "16px" }}>{t("games.win", lang)}</span>}
        {winner === "O"    && <span style={{ fontWeight: 700, color: "#ef4444", fontSize: "16px" }}>{t("games.lose", lang)}</span>}
        {winner === "draw" && <span style={{ fontWeight: 700, color: "#D4A24C", fontSize: "16px" }}>{t("games.draw", lang)}</span>}
        {!winner && <span style={{ fontWeight: 600, color: "rgb(232,232,240)", fontSize: "15px" }}>
          {xTurn ? t("games.ttt.yourTurn", lang) : t("games.thinking", lang)}
        </span>}
      </div>
      <div className="glass-panel" style={{ padding: "16px", display: "inline-block" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(3,${cell}px)`, gridTemplateRows: `repeat(3,${cell}px)`, gap: "4px" }}>
          {board.map((sq, i) => {
            const isWin = winLine?.includes(i);
            return (
              <button key={i} onClick={() => handleClick(i)} style={{
                width: `${cell}px`, height: `${cell}px`, display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: mobile ? "28px" : "36px", fontWeight: 700,
                border: "1px solid rgba(124,58,237,0.2)", borderRadius: "8px",
                cursor: sq !== null || winner ? "default" : "pointer",
                background: isWin ? "rgba(124,58,237,0.2)" : "rgba(15,15,25,0.6)",
                color: sq === "X" ? "#10B981" : sq === "O" ? "#ef4444" : "transparent",
                transition: "background 0.1s", fontFamily: "Inter,sans-serif",
              }}>{sq || "·"}</button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <button onClick={reset} style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)",
          color: "#7C3AED", padding: "10px 24px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
          cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
          {t("games.newGame", lang)}
        </button>
        <button onClick={() => setShowLB(v => !v)} style={{ background: "transparent", border: "none",
          color: showLB ? "#D4A24C" : "rgb(107,114,128)", fontSize: "12px", cursor: "pointer",
          fontFamily: "Inter,sans-serif", textDecoration: "underline" }}>
          {t("games.leaderboard.toggle", lang)}
        </button>
      </div>
      <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>{t("games.ttt.label", lang)}</div>
    </div>
  );
}
