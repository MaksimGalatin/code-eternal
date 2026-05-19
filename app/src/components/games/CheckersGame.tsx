'use client';
import React, { useState, useRef } from "react";
import { t, type Lang } from "@/lib/i18n";
import { useIsMobile, genId, GAME_TOKENS } from "./types";

// ─── Checkers — Board logic ────────────────────────────────────────────────────
// Red = player (moves up, dec row), Black = AI (moves down, inc row)
// Kings can move both directions. Mandatory jumps enforced globally.
type CheckerPiece = null | "r" | "R" | "b" | "B";
type CheckersBoard = CheckerPiece[][];

function initCheckers(): CheckersBoard {
  const b: CheckersBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = "b";
  for (let r = 5; r < 8; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 1) b[r][c] = "r";
  return b;
}

// A move represents a complete chain: piece moves from (fr,fc) to (tr,tc), removing all captured pieces.
interface CheckerMove { fr: number; fc: number; tr: number; tc: number; captures: [number, number][]; }

// Build all complete jump chains from (startR, startC) using DFS.
// Captured pieces are marked null on the temporary board so the same piece can't be re-jumped.
// Chain stops when no further jumps are available or a man lands on the king row (becomes king).
function buildCompleteJumpChains(b: CheckersBoard, startR: number, startC: number): CheckerMove[] {
  const piece = b[startR][startC];
  if (!piece) return [];

  const results: CheckerMove[] = [];

  function dfs(board: CheckersBoard, r: number, c: number, captured: [number, number][]) {
    const p = board[r][c];
    if (!p) return;
    const isRed  = p === "r" || p === "R";
    const isKing = p === "R" || p === "B";
    const dirs: [number, number][] = [];
    if (isRed  || isKing) dirs.push([-1, -1], [-1, 1]);
    if (!isRed || isKing) dirs.push([ 1, -1], [ 1, 1]);

    let hasJump = false;
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
      const neighbor = board[nr][nc];
      if (!neighbor) continue;
      const isEnemy = isRed ? (neighbor === "b" || neighbor === "B") : (neighbor === "r" || neighbor === "R");
      if (!isEnemy) continue;
      const jr = nr + dr, jc = nc + dc;
      if (jr < 0 || jr > 7 || jc < 0 || jc > 7) continue;
      if (board[jr][jc] !== null) continue;

      hasJump = true;
      const newCaptures: [number, number][] = [...captured, [nr, nc]];

      // Apply this single hop on a temp board
      const nb = board.map(row => [...row]) as CheckersBoard;
      nb[jr][jc] = nb[r][c];
      nb[r][c]   = null;
      nb[nr][nc] = null; // remove immediately so it can't be jumped again

      // King promotion mid-chain stops the chain (standard rules)
      const becameKing = (nb[jr][jc] === "r" && jr === 0) || (nb[jr][jc] === "b" && jr === 7);
      if (becameKing) {
        if (nb[jr][jc] === "r") nb[jr][jc] = "R";
        else                    nb[jr][jc] = "B";
        results.push({ fr: startR, fc: startC, tr: jr, tc: jc, captures: newCaptures });
      } else {
        dfs(nb, jr, jc, newCaptures);
      }
    }

    // If no further jumps found and we already captured at least one piece → terminal chain
    if (!hasJump && captured.length > 0) {
      results.push({ fr: startR, fc: startC, tr: r, tc: c, captures: captured });
    }
  }

  dfs(b, startR, startC, []);
  return results;
}

function getSimpleCheckerMoves(b: CheckersBoard, r: number, c: number): CheckerMove[] {
  const p = b[r][c]; if (!p) return [];
  const isRed  = p === "r" || p === "R";
  const isKing = p === "R" || p === "B";
  const dirs: [number, number][] = [];
  if (isRed  || isKing) dirs.push([-1, -1], [-1, 1]);
  if (!isRed || isKing) dirs.push([ 1, -1], [ 1, 1]);
  const moves: CheckerMove[] = [];
  for (const [dr, dc] of dirs) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7 && b[nr][nc] === null)
      moves.push({ fr: r, fc: c, tr: nr, tc: nc, captures: [] });
  }
  return moves;
}

// Returns complete jump chains if any exist (mandatory), else simple moves.
function allCheckerMoves(b: CheckersBoard, color: "r" | "b"): CheckerMove[] {
  const jumps: CheckerMove[] = [];
  const simple: CheckerMove[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]; if (!p) continue;
    const isColor = color === "r" ? (p === "r" || p === "R") : (p === "b" || p === "B");
    if (!isColor) continue;
    const chains = buildCompleteJumpChains(b, r, c);
    if (chains.length) jumps.push(...chains);
    else               simple.push(...getSimpleCheckerMoves(b, r, c));
  }
  return jumps.length ? jumps : simple;
}

// Apply a complete chain move atomically.
function applyCheckerMove(b: CheckersBoard, m: CheckerMove): CheckersBoard {
  const nb = b.map(row => [...row]) as CheckersBoard;
  nb[m.tr][m.tc] = nb[m.fr][m.fc];
  nb[m.fr][m.fc] = null;
  for (const [cr, cc] of m.captures) nb[cr][cc] = null;
  // King promotion at final destination (mid-chain promotions already handled in chain builder)
  if (nb[m.tr][m.tc] === "r" && m.tr === 0) nb[m.tr][m.tc] = "R";
  if (nb[m.tr][m.tc] === "b" && m.tr === 7) nb[m.tr][m.tc] = "B";
  return nb;
}

// ─── Checkers evaluation ──────────────────────────────────────────────────────
function evalCheckers(b: CheckersBoard): number {
  let score = 0, bCount = 0, rCount = 0;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const p = b[r][c]; if (!p) continue;
    // Material + advancement
    if      (p === "b") { score += 100 + r * 6;      bCount++; }
    else if (p === "B") { score += 260;               bCount++; } // king worth ~2.5 men
    else if (p === "r") { score -= 100 + (7 - r) * 6; rCount++; }
    else if (p === "R") { score -= 260;               rCount++; }
    // Center control (d4-e4 zone)
    if (r >= 2 && r <= 5 && c >= 2 && c <= 5) {
      score += (p === "b" || p === "B") ? 12 : -12;
    }
    // Avoid edges (restricted mobility)
    if (c === 0 || c === 7) {
      score += (p === "b" || p === "B") ? -10 : 10;
    }
    // Back row defense bonus (uncrowned pieces on home row block promotions)
    if (p === "b" && r === 0) score += 15;
    if (p === "r" && r === 7) score -= 15;
  }
  // Endgame: outnumbering bonus
  if (bCount > rCount + 1) score += 60;
  if (rCount > bCount + 1) score -= 60;
  return score;
}

// ─── Checkers minimax (depth 5, alpha-beta) ───────────────────────────────────
function checkersMinimax(b: CheckersBoard, depth: number, alpha: number, beta: number, blackTurn: boolean): number {
  const bm = allCheckerMoves(b, "b"), rm = allCheckerMoves(b, "r");
  if (!bm.length) return -6_000; // black has no moves → red wins
  if (!rm.length) return  6_000; // red has no moves → black wins
  if (depth === 0) return evalCheckers(b);
  const moves = blackTurn ? bm : rm;
  // Sort: captures first for better pruning
  moves.sort((a, c) => c.captures.length - a.captures.length);
  if (blackTurn) {
    let v = -Infinity;
    for (const m of moves) {
      v = Math.max(v, checkersMinimax(applyCheckerMove(b, m), depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, v); if (beta <= alpha) break;
    }
    return v;
  } else {
    let v = Infinity;
    for (const m of moves) {
      v = Math.min(v, checkersMinimax(applyCheckerMove(b, m), depth - 1, alpha, beta, true));
      beta = Math.min(beta, v); if (beta <= alpha) break;
    }
    return v;
  }
}

function bestCheckerAiMove(b: CheckersBoard): CheckerMove | null {
  const moves = allCheckerMoves(b, "b");
  if (!moves.length) return null;
  moves.sort((a, c) => c.captures.length - a.captures.length);
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    const score = checkersMinimax(applyCheckerMove(b, m), 4, -Infinity, Infinity, false);
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

// ─── Checkers Component ───────────────────────────────────────────────────────
export function CheckersGame({
  lang, showLB, setShowLB, onWin,
}: {
  lang: Lang; showLB: boolean; setShowLB: (v: boolean | ((p: boolean) => boolean)) => void;
  onWin: (tokens: number, sid: string) => void;
}) {
  const mobile     = useIsMobile();
  const cell       = mobile ? 38 : 52;
  const piece      = mobile ? 26 : 36;
  const sessionId  = useRef(genId());
  const rewarded   = useRef(false);
  const aiLocked   = useRef(false);

  const [board,      setBoard]      = useState(initCheckers);
  const [selected,   setSelected]   = useState<[number, number] | null>(null);
  const [validMoves, setValidMoves] = useState<CheckerMove[]>([]);
  const [turn,       setTurn]       = useState<"r" | "b">("r");
  const [status,     setStatus]     = useState<"playing" | "red_wins" | "black_wins">("playing");

  // All moves available to red (used to enforce mandatory-jump highlighting)
  const allRed = allCheckerMoves(board, "r");
  const mandatoryJumps = allRed.filter(m => m.captures.length > 0);

  function handleClick(r: number, c: number) {
    if (status !== "playing" || turn !== "r" || aiLocked.current) return;
    const p = board[r][c];

    if (selected) {
      const mv = validMoves.find(m => m.tr === r && m.tc === c);
      if (mv) {
        const nb = applyCheckerMove(board, mv);
        setBoard(nb); setSelected(null); setValidMoves([]);
        // Check win
        if (!allCheckerMoves(nb, "b").length) {
          setStatus("red_wins");
          if (!rewarded.current) { rewarded.current = true; onWin(GAME_TOKENS.checkers, sessionId.current); }
          return;
        }
        // AI turn
        setTurn("b"); aiLocked.current = true;
        setTimeout(() => {
          setBoard(prev => {
            const pick = bestCheckerAiMove(prev);
            if (!pick) { setStatus("red_wins"); aiLocked.current = false; return prev; }
            const nb2 = applyCheckerMove(prev, pick);
            if (!allCheckerMoves(nb2, "r").length) setStatus("black_wins");
            aiLocked.current = false;
            return nb2;
          });
          setTurn("r");
        }, 400);
        return;
      }
      // Clicked on own piece → re-select
      if (p && (p === "r" || p === "R")) {
        const pool = mandatoryJumps.length ? mandatoryJumps : allRed;
        const moves = pool.filter(m => m.fr === r && m.fc === c);
        setSelected([r, c]); setValidMoves(moves);
        return;
      }
      setSelected(null); setValidMoves([]);
    } else {
      if (p && (p === "r" || p === "R")) {
        const pool  = mandatoryJumps.length ? mandatoryJumps : allRed;
        const moves = pool.filter(m => m.fr === r && m.fc === c);
        setSelected([r, c]); setValidMoves(moves);
      }
    }
  }

  function reset() {
    setBoard(initCheckers()); setSelected(null); setValidMoves([]); setTurn("r");
    setStatus("playing"); aiLocked.current = false;
    sessionId.current = genId(); rewarded.current = false;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
      <div className="glass-panel-sm" style={{ padding: "10px 32px", textAlign: "center" }}>
        {status === "red_wins"   && <span style={{ fontWeight: 700, color: "#10B981", fontSize: "16px" }}>{t("games.win", lang)}</span>}
        {status === "black_wins" && <span style={{ fontWeight: 700, color: "#ef4444", fontSize: "16px" }}>{t("games.lose", lang)}</span>}
        {status === "playing"    && <span style={{ fontWeight: 600, color: "rgb(232,232,240)", fontSize: "15px" }}>
          {turn === "r" ? t("games.checkers.yourTurn", lang) : t("games.thinking", lang)}
        </span>}
        {status === "playing" && mandatoryJumps.length > 0 && turn === "r" && (
          <span style={{ marginLeft: "8px", fontSize: "11px", color: "#f97316" }}>⚠ Jump required</span>
        )}
      </div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
        <div className="glass-panel" style={{ padding: "10px", display: "inline-block" }}>
          {board.map((row, r) => (
            <div key={r} style={{ display: "flex" }}>
              {row.map((sq, c) => {
                const isDark    = (r + c) % 2 === 1;
                const isSel     = selected?.[0] === r && selected?.[1] === c;
                const isTarget  = validMoves.some(m => m.tr === r && m.tc === c);
                // Dim pieces that are forced to jump but not selected
                const isForcedPiece = mandatoryJumps.length > 0 && turn === "r"
                  && (sq === "r" || sq === "R")
                  && !mandatoryJumps.some(m => m.fr === r && m.fc === c);
                return (
                  <button key={c} onClick={() => handleClick(r, c)} style={{
                    width: `${cell}px`, height: `${cell}px`, display: "flex", alignItems: "center",
                    justifyContent: "center", border: "none", cursor: "pointer",
                    background: isSel    ? "rgba(124,58,237,0.4)"
                              : isTarget ? "rgba(16,185,129,0.25)"
                              : isDark   ? "rgba(20,18,60,0.85)"
                              :            "rgba(60,50,120,0.35)",
                    outline: isSel ? "2px solid #7C3AED" : isTarget ? "2px solid #10B981" : "none",
                    opacity: isForcedPiece ? 0.4 : 1,
                    transition: "background 0.1s, opacity 0.1s",
                  }}>
                    {sq && (
                      <div style={{
                        width: `${piece}px`, height: `${piece}px`, borderRadius: "50%",
                        background: (sq === "r" || sq === "R") ? "#dc2626" : "#1e1b4b",
                        border: (sq === "r" || sq === "R") ? "2px solid #f87171" : "2px solid #60a5fa",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: mobile ? "12px" : "15px", boxShadow: "0 2px 4px rgba(0,0,0,0.4)",
                        color: (sq === "R" || sq === "B") ? "rgba(255,255,255,0.9)" : "transparent",
                      }}>
                        {(sq === "R" || sq === "B") ? "♛" : ""}
                      </div>
                    )}
                    {isTarget && !sq && (
                      <div style={{ width: "12px", height: "12px", borderRadius: "50%",
                        background: "rgba(16,185,129,0.7)", pointerEvents: "none" }} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>
          <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%",
            background: "#dc2626", border: "1px solid #f87171", marginRight: "4px", verticalAlign: "middle" }} />
          {t("games.checkers.youLabel", lang)}&nbsp;&nbsp;
          <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%",
            background: "#1e1b4b", border: "1px solid #60a5fa", marginRight: "4px", verticalAlign: "middle" }} />
          {t("games.checkers.aifaLabel", lang)}
        </div>
        <button onClick={reset} style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)",
          color: "#7C3AED", padding: "8px 18px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
          cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
          {t("games.newGame", lang)}
        </button>
        <button onClick={() => setShowLB(v => !v)} style={{ background: "transparent", border: "none",
          color: showLB ? "#D4A24C" : "rgb(107,114,128)", fontSize: "12px", cursor: "pointer",
          fontFamily: "Inter,sans-serif", textDecoration: "underline" }}>
          {t("games.leaderboard.toggle", lang)}
        </button>
      </div>
    </div>
  );
}
