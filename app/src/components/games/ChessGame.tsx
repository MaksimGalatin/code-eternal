'use client';
import React, { useState, useRef } from "react";
import { Chess as ChessJS, type Square, type Move } from "chess.js";
import { t, type Lang } from "@/lib/i18n";
import { useIsMobile, genId, GAME_TOKENS } from "./types";

// ─── Chess constants ───────────────────────────────────────────────────────────
const CHESS_PIECE_VALUES: Record<string, number> = {
  p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000,
};

const CHESS_UNICODE: Record<string, Record<string, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

// Piece-square tables (from white's perspective, row 0 = rank 8)
const PST_P = [ 0,  0,  0,  0,  0,  0,  0,  0,  5, 10, 10,-20,-20, 10, 10,  5,
                5, -5,-10,  0,  0,-10, -5,  5,  0,  0,  0, 20, 20,  0,  0,  0,
                5,  5, 10, 25, 25, 10,  5,  5, 10, 10, 20, 30, 30, 20, 10, 10,
               50, 50, 50, 50, 50, 50, 50, 50,  0,  0,  0,  0,  0,  0,  0,  0];
const PST_N = [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,  0,  5,  5,  0,-20,-40,
               -30,  5, 10, 15, 15, 10,  5,-30,-30,  0, 15, 20, 20, 15,  0,-30,
               -30,  5, 15, 20, 20, 15,  5,-30,-30,  0, 10, 15, 15, 10,  0,-30,
               -40,-20,  0,  0,  0,  0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50];
const PST_B = [-20,-10,-10,-10,-10,-10,-10,-20,-10,  5,  0,  0,  0,  0,  5,-10,
               -10, 10, 10, 10, 10, 10, 10,-10,-10,  0, 10, 10, 10, 10,  0,-10,
               -10,  5,  5, 10, 10,  5,  5,-10,-10,  0,  5, 10, 10,  5,  0,-10,
               -10,  0,  0,  0,  0,  0,  0,-10,-20,-10,-10,-10,-10,-10,-10,-20];
const PST_R = [  0,  0,  0,  5,  5,  0,  0,  0, -5,  0,  0,  0,  0,  0,  0, -5,
               -5,  0,  0,  0,  0,  0,  0, -5, -5,  0,  0,  0,  0,  0,  0, -5,
               -5,  0,  0,  0,  0,  0,  0, -5, -5,  0,  0,  0,  0,  0,  0, -5,
                5, 10, 10, 10, 10, 10, 10,  5,  0,  0,  0,  0,  0,  0,  0,  0];
const PST_Q = [-20,-10,-10, -5, -5,-10,-10,-20,-10,  0,  5,  0,  0,  0,  0,-10,
               -10,  5,  5,  5,  5,  5,  0,-10,  0,  0,  5,  5,  5,  5,  0, -5,
               -5,  0,  5,  5,  5,  5,  0, -5,-10,  0,  5,  5,  5,  5,  0,-10,
               -10,  0,  0,  0,  0,  0,  0,-10,-20,-10,-10, -5, -5,-10,-10,-20];
const PST_KM = [ 20, 30, 10,  0,  0, 10, 30, 20, 20, 20,  0,  0,  0,  0, 20, 20,
                -10,-20,-20,-20,-20,-20,-20,-10,-20,-30,-30,-40,-40,-30,-30,-20,
                -30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,
                -30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30];
const PST_KE = [ -50,-30,-30,-30,-30,-30,-30,-50,-30,-30,  0,  0,  0,  0,-30,-30,
                 -30,-10, 20, 30, 30, 20,-10,-30,-30,-10, 30, 40, 40, 30,-10,-30,
                 -30,-10, 30, 40, 40, 30,-10,-30,-30,-10, 20, 30, 30, 20,-10,-30,
                 -30,-20,-10,  0,  0,-10,-20,-30,-50,-40,-30,-20,-20,-30,-40,-50];
const PST_MAP: Record<string, number[]> = { p: PST_P, n: PST_N, b: PST_B, r: PST_R, q: PST_Q };

function isEndgame(chess: ChessJS): boolean {
  const board = chess.board();
  let queens = 0, minors = 0;
  for (const row of board) for (const p of row) {
    if (!p) continue;
    if (p.type === "q") queens++;
    if (p.type === "n" || p.type === "b" || p.type === "r") minors++;
  }
  return queens === 0 || (queens <= 2 && minors <= 2);
}

// ─── Chess evaluation ─────────────────────────────────────────────────────────
function evalChessBoard(chess: ChessJS): number {
  if (chess.isCheckmate()) return chess.turn() === "b" ? -60_000 : 60_000;
  if (chess.isStalemate() || chess.isDraw()) return 0;

  const board  = chess.board();
  const eg     = isEndgame(chess);
  let score    = 0;
  let wBishops = 0, bBishops = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const val    = CHESS_PIECE_VALUES[p.type] ?? 0;
      const pstIdx = p.color === "w" ? r * 8 + c : (7 - r) * 8 + c;
      let pst      = 0;
      if (p.type === "k") pst = (eg ? PST_KE : PST_KM)[pstIdx] ?? 0;
      else                pst = (PST_MAP[p.type]?.[pstIdx] ?? 0);
      if (p.type === "b") { if (p.color === "w") wBishops++; else bBishops++; }
      score += p.color === "b" ? val + pst : -(val + pst);
    }
  }
  // Bishop pair bonus
  if (bBishops >= 2) score += 30;
  if (wBishops >= 2) score -= 30;
  return score;
}

// ─── Chess move ordering (MVV-LVA + promotions + checks) ─────────────────────
function chessMovePriority(m: Move): number {
  let s = 0;
  if (m.captured) {
    const victim   = CHESS_PIECE_VALUES[m.captured] ?? 0;
    const attacker = CHESS_PIECE_VALUES[m.piece]    ?? 0;
    s += 10_000 + victim * 10 - attacker;
  }
  if (m.promotion) s += CHESS_PIECE_VALUES[m.promotion] ?? 0;
  if (m.san?.includes("+") || m.san?.includes("#")) s += 500;
  return s;
}

function getSortedMoves(chess: ChessJS): Move[] {
  return (chess.moves({ verbose: true }) as Move[]).sort(
    (a, b) => chessMovePriority(b) - chessMovePriority(a)
  );
}

// ─── Quiescence search (captures only, max 4 plies past leaf) ─────────────────
function quiesce(chess: ChessJS, alpha: number, beta: number, isMax: boolean, qdepth = 0): number {
  const standPat = evalChessBoard(chess);
  if (qdepth >= 4) return standPat;
  if (chess.isGameOver()) return standPat;

  if (isMax) {
    if (standPat >= beta) return standPat;
    alpha = Math.max(alpha, standPat);
  } else {
    if (standPat <= alpha) return standPat;
    beta = Math.min(beta, standPat);
  }

  const captures = (chess.moves({ verbose: true }) as Move[])
    .filter(m => m.captured)
    .sort((a, b) => chessMovePriority(b) - chessMovePriority(a));

  if (isMax) {
    let v = standPat;
    for (const m of captures) {
      chess.move(m);
      v = Math.max(v, quiesce(chess, alpha, beta, false, qdepth + 1));
      chess.undo();
      alpha = Math.max(alpha, v);
      if (beta <= alpha) break;
    }
    return v;
  } else {
    let v = standPat;
    for (const m of captures) {
      chess.move(m);
      v = Math.min(v, quiesce(chess, alpha, beta, true, qdepth + 1));
      chess.undo();
      beta = Math.min(beta, v);
      if (beta <= alpha) break;
    }
    return v;
  }
}

// ─── Chess minimax (depth 4, alpha-beta) ─────────────────────────────────────
function minimaxChess(chess: ChessJS, depth: number, alpha: number, beta: number, isMax: boolean): number {
  if (chess.isGameOver()) return evalChessBoard(chess);
  if (depth === 0) return quiesce(chess, alpha, beta, isMax);

  const moves = getSortedMoves(chess);
  if (isMax) {
    let v = -Infinity;
    for (const m of moves) {
      chess.move(m);
      v = Math.max(v, minimaxChess(chess, depth - 1, alpha, beta, false));
      chess.undo();
      alpha = Math.max(alpha, v);
      if (beta <= alpha) break;
    }
    return v;
  } else {
    let v = Infinity;
    for (const m of moves) {
      chess.move(m);
      v = Math.min(v, minimaxChess(chess, depth - 1, alpha, beta, true));
      chess.undo();
      beta = Math.min(beta, v);
      if (beta <= alpha) break;
    }
    return v;
  }
}

function getBestChessMove(fen: string, depth = 4): Move | null {
  const chess = new ChessJS(fen);
  const moves = getSortedMoves(chess);
  if (!moves.length) return null;
  let best = moves[0], bestScore = -Infinity;
  for (const m of moves) {
    chess.move(m);
    const score = minimaxChess(chess, depth - 1, -Infinity, Infinity, false);
    chess.undo();
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

// ─── Chess Component ──────────────────────────────────────────────────────────
type ChessStatus = "playing" | "ai_thinking" | "player_wins" | "ai_wins" | "draw";

export function ChessGame({
  lang, showLB, setShowLB, onWin,
}: {
  lang: Lang; showLB: boolean; setShowLB: (v: boolean | ((p: boolean) => boolean)) => void;
  onWin: (tokens: number, sid: string) => void;
}) {
  const mobile     = useIsMobile();
  const cell       = mobile ? 36 : 44;
  const sessionId  = useRef(genId());
  const rewarded   = useRef(false);
  const chessRef   = useRef(new ChessJS());

  const [fen,      setFen]      = useState(() => chessRef.current.fen());
  const [selected, setSelected] = useState<string | null>(null);
  const [targets,  setTargets]  = useState<string[]>([]);
  const [history,  setHistory]  = useState<string[]>([]);
  const [status,   setStatus]   = useState<ChessStatus>("playing");

  const board   = chessRef.current.board();
  const inCheck = chessRef.current.isCheck() && status === "playing";

  const kingSquare = (() => {
    if (!inCheck) return null;
    const turn = chessRef.current.turn();
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (board[r][c]?.type === "k" && board[r][c]?.color === turn)
          return `${String.fromCharCode(97 + c)}${8 - r}`;
    return null;
  })();

  function getTargets(sq: string): string[] {
    return (chessRef.current.moves({ square: sq as Square, verbose: true }) as Move[]).map(m => m.to);
  }

  function triggerAiMove() {
    setStatus("ai_thinking");
    const currentFen = chessRef.current.fen();
    // Use setTimeout(10) to allow the "ai_thinking" repaint before heavy computation
    setTimeout(() => {
      const best = getBestChessMove(currentFen, 4);
      if (!best) {
        setStatus(chessRef.current.isCheckmate() ? "player_wins" : "draw");
        if (chessRef.current.isCheckmate() && !rewarded.current) {
          rewarded.current = true;
          onWin(GAME_TOKENS.chess, sessionId.current);
        }
        return;
      }
      const result = chessRef.current.move(best);
      if (!result) { setStatus("playing"); return; }
      setHistory(h => [...h, result.san]);
      setFen(chessRef.current.fen());
      if (chessRef.current.isCheckmate())                                setStatus("ai_wins");
      else if (chessRef.current.isStalemate() || chessRef.current.isDraw()) setStatus("draw");
      else                                                               setStatus("playing");
    }, 10);
  }

  function handleSquareClick(r: number, c: number) {
    if (status !== "playing") return;
    const sq    = `${String.fromCharCode(97 + c)}${8 - r}`;
    const piece = board[r][c];

    if (selected) {
      if (targets.includes(sq)) {
        const result = chessRef.current.move({ from: selected, to: sq, promotion: "q" });
        if (!result) { setSelected(null); setTargets([]); return; }
        setHistory(h => [...h, result.san]);
        setSelected(null); setTargets([]);
        if (chessRef.current.isCheckmate()) {
          setFen(chessRef.current.fen()); setStatus("player_wins");
          if (!rewarded.current) { rewarded.current = true; onWin(GAME_TOKENS.chess, sessionId.current); }
        } else if (chessRef.current.isStalemate() || chessRef.current.isDraw()) {
          setFen(chessRef.current.fen()); setStatus("draw");
        } else {
          setFen(chessRef.current.fen()); triggerAiMove();
        }
      } else if (piece?.color === "w") {
        setSelected(sq); setTargets(getTargets(sq));
      } else {
        setSelected(null); setTargets([]);
      }
    } else {
      if (piece?.color === "w" && chessRef.current.turn() === "w") {
        setSelected(sq); setTargets(getTargets(sq));
      }
    }
  }

  function reset() {
    chessRef.current = new ChessJS();
    sessionId.current = genId(); rewarded.current = false;
    setFen(chessRef.current.fen()); setSelected(null); setTargets([]);
    setHistory([]); setStatus("playing");
  }

  const statusBar = (() => {
    if (status === "player_wins") return <span style={{ fontWeight: 700, color: "#10B981" }}>{t("games.win", lang)}</span>;
    if (status === "ai_wins")    return <span style={{ fontWeight: 700, color: "#ef4444" }}>{t("games.lose", lang)}</span>;
    if (status === "draw")       return <span style={{ fontWeight: 700, color: "#D4A24C" }}>{t("games.draw", lang)}</span>;
    if (status === "ai_thinking") return <span style={{ fontWeight: 600, color: "rgb(232,232,240)" }}>{t("games.thinking", lang)}</span>;
    if (inCheck)                 return <span style={{ fontWeight: 700, color: "#f97316" }}>{t("games.chess.check", lang)}</span>;
    return <span style={{ fontWeight: 600, color: "rgb(232,232,240)" }}>{t("games.chess.whiteToMove", lang)}</span>;
  })();

  return (
    <div>
      <div className="glass-panel-sm" style={{ display: "flex", alignItems: "center", justifyContent: "center",
        gap: "16px", padding: "10px 24px", marginBottom: "12px" }}>
        {statusBar}
      </div>
      {/* Board */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "12px", overflowX: "auto" }}>
        <div className="glass-panel" style={{ padding: "10px", display: "inline-block" }}>
          <div style={{ display: "flex", paddingLeft: "20px", marginBottom: "2px" }}>
            {"abcdefgh".split("").map(l => (
              <div key={l} style={{ width: `${cell}px`, textAlign: "center", fontSize: "10px", color: "rgb(107,114,128)" }}>{l}</div>
            ))}
          </div>
          {board.map((row, r) => (
            <div key={r} style={{ display: "flex", alignItems: "center" }}>
              <div style={{ width: "20px", fontSize: "10px", color: "rgb(107,114,128)", textAlign: "right", paddingRight: "4px" }}>{8 - r}</div>
              {row.map((piece, c) => {
                const sq       = `${String.fromCharCode(97 + c)}${8 - r}`;
                const isDark   = (r + c) % 2 === 1;
                const isSel    = selected === sq;
                const isTarget = targets.includes(sq);
                const isCheck  = sq === kingSquare;
                const bg = isSel    ? "rgba(124,58,237,0.45)"
                         : isCheck  ? "rgba(239,68,68,0.35)"
                         : isTarget ? (isDark ? "rgba(16,185,129,0.25)" : "rgba(16,185,129,0.18)")
                         : isDark   ? "rgba(30,27,75,0.7)"
                         : "rgba(49,46,129,0.4)";
                return (
                  <button key={c} onClick={() => handleSquareClick(r, c)} style={{
                    width: `${cell}px`, height: `${cell}px`, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: mobile ? "16px" : "20px", border: "none",
                    cursor: status === "playing" ? "pointer" : "default",
                    position: "relative", background: bg,
                    outline: isSel ? "2px solid #7C3AED" : isTarget && piece ? "2px solid #10B981" : "none",
                    transition: "background 0.1s",
                  }}>
                    {isTarget && !piece && (
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%",
                        background: "rgba(16,185,129,0.6)", pointerEvents: "none" }} />
                    )}
                    {piece && (
                      <span style={{
                        color: piece.color === "w" ? "white" : "#06B6D4",
                        textShadow: piece.color === "w" ? "0 0 4px rgba(255,255,255,0.4)" : "0 0 4px rgba(6,182,212,0.4)",
                      }}>
                        {CHESS_UNICODE[piece.color][piece.type]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {/* Controls */}
      <div className="game-bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <div className="glass-panel" style={{ padding: "14px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "rgb(232,232,240)", marginBottom: "8px" }}>
            {t("games.chess.history", lang)}
          </div>
          <div style={{ maxHeight: "100px", overflowY: "auto" }}>
            {history.length === 0
              ? <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>{t("games.chess.noMoves", lang)}</div>
              : history.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", fontSize: "12px", marginBottom: "2px" }}>
                  <span style={{ color: "rgb(107,114,128)", fontSize: "11px", width: "18px" }}>{i + 1}.</span>
                  <span style={{ color: "rgb(232,232,240)" }}>{m}</span>
                </div>
              ))
            }
          </div>
        </div>
        <div className="glass-panel" style={{ padding: "14px", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: "8px" }}>
          <button onClick={reset} style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)",
            color: "#7C3AED", padding: "10px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
            cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            {t("games.newGame", lang)}
          </button>
          <button onClick={() => setShowLB(v => !v)} style={{ background: "transparent", border: "none",
            color: showLB ? "#D4A24C" : "rgb(107,114,128)", fontSize: "12px", cursor: "pointer",
            fontFamily: "Inter,sans-serif", textDecoration: "underline" }}>
            {t("games.leaderboard.toggle", lang)}
          </button>
          <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>{t("games.chess.label", lang)}</div>
        </div>
      </div>
    </div>
  );
}
