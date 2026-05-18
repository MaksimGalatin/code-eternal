'use client';
import React, { memo, useState, useEffect, useRef, useCallback } from "react";
import { Chess as ChessJS, type Square, type Move } from "chess.js";
import { usePrivy } from "@privy-io/react-auth";
import { useLang, t, type Lang } from "@/lib/i18n";

// ─── Shared helpers ────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function shortenAddr(a: string): string {
  return a.length >= 8 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

type GameId = "chess" | "ttt" | "checkers" | "backgammon";

const GAME_TOKENS: Record<GameId, number> = { chess: 35, ttt: 1, checkers: 5, backgammon: 35 };

// ─── Leaderboard ──────────────────────────────────────────────────────────────
interface LBRow { rank: number; wallet: string; wins: number; tokens: number; }

function Leaderboard({
  gameType, lang, refreshKey, userWallet,
}: {
  gameType: GameId; lang: Lang; refreshKey?: number; userWallet?: string;
}) {
  const [rows, setRows]       = useState<LBRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/games/leaderboard?game=${gameType}`)
      .then(r => r.json())
      .then(d => setRows(d.leaderboard ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [gameType, refreshKey]);

  const userRow = userWallet ? rows.find(r => r.wallet === userWallet) : null;

  return (
    <div className="glass-panel" style={{ padding: "16px", marginTop: "12px" }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "rgb(232,232,240)", letterSpacing: "-0.01em" }}>
          🏆 {t("games.leaderboard.title", lang)}
        </div>
        {userRow && (
          <div style={{
            fontSize: "10px", color: "#7C3AED", background: "rgba(124,58,237,0.12)",
            border: "1px solid rgba(124,58,237,0.25)", borderRadius: "6px", padding: "2px 8px",
          }}>
            Your rank: #{userRow.rank}
          </div>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: "center", color: "rgb(107,114,128)", fontSize: "12px", padding: "12px 0" }}>
          {t("games.leaderboard.loading", lang)}
        </div>
      )}
      {!loading && rows.length === 0 && (
        <div style={{ textAlign: "center", color: "rgb(107,114,128)", fontSize: "12px", padding: "12px 0" }}>
          {t("games.leaderboard.empty", lang)}
        </div>
      )}
      {!loading && rows.length > 0 && (
        <>
          <div style={{
            display: "grid", gridTemplateColumns: "40px 1fr 52px 70px", gap: "8px",
            fontSize: "10px", fontWeight: 600, color: "rgb(107,114,128)",
            textTransform: "uppercase", letterSpacing: "0.06em",
            paddingBottom: "6px", borderBottom: "1px solid rgba(124,58,237,0.15)", marginBottom: "4px",
          }}>
            <span>{t("games.leaderboard.rank", lang)}</span>
            <span>Wallet</span>
            <span style={{ textAlign: "right" }}>{t("games.leaderboard.wins", lang)}</span>
            <span style={{ textAlign: "right" }}>{t("games.leaderboard.tokens", lang)}</span>
          </div>
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {rows.map(row => {
              const isUser = userWallet && row.wallet === userWallet;
              const medal  = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null;
              return (
                <div key={row.wallet} style={{
                  display: "grid", gridTemplateColumns: "40px 1fr 52px 70px", gap: "8px",
                  padding: "5px 4px", borderRadius: "6px",
                  borderBottom: "1px solid rgba(124,58,237,0.07)",
                  background: isUser ? "rgba(124,58,237,0.07)" : "transparent",
                  fontSize: "12px", color: row.rank <= 3 ? "rgb(232,232,240)" : "rgb(160,160,180)",
                  transition: "background 0.1s",
                }}>
                  <span style={{ color: row.rank <= 3 ? "#D4A24C" : "rgb(107,114,128)", fontWeight: 700 }}>
                    {medal ?? `#${row.rank}`}
                  </span>
                  <span style={{
                    fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    color: isUser ? "#7C3AED" : undefined, fontWeight: isUser ? 700 : undefined,
                  }}>
                    {shortenAddr(row.wallet)}{isUser ? " ←" : ""}
                  </span>
                  <span style={{ textAlign: "right", color: "#10B981", fontWeight: 600 }}>{row.wins}</span>
                  <span style={{ textAlign: "right", color: "#7C3AED", fontWeight: 600 }}>+{row.tokens}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Reward Toast ──────────────────────────────────────────────────────────────
function RewardToast({ tokens, gameType, lang }: { tokens: number; gameType: GameId; lang: Lang }) {
  const label = gameType === "chess" ? "Chess" : gameType === "checkers" ? "Checkers"
              : gameType === "backgammon" ? "Backgammon" : "Tic-Tac-Toe";
  return (
    <div style={{
      position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
      background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.45)",
      backdropFilter: "blur(12px)", borderRadius: "16px", padding: "14px 20px",
      display: "flex", flexDirection: "column", gap: "4px", minWidth: "200px",
      boxShadow: "0 4px 32px rgba(16,185,129,0.18)", animation: "slideInRight 0.3s ease",
    }}>
      <div style={{ fontSize: "11px", color: "rgb(107,114,128)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {t("games.reward.label", lang)}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: "#10B981", letterSpacing: "-0.02em" }}>
        +{tokens} $CODE
      </div>
      <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>{label} win recorded</div>
    </div>
  );
}

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

function Chess({
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

function TicTacToe({
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
function Checkers({
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

// ─── Backgammon — heuristic AI ─────────────────────────────────────────────────
// White = player (moves 24→1, bearoff), Black = AI (moves 1→24, bearoff)
// points[i] > 0 = white checkers, < 0 = black checkers
interface BgState {
  points: number[]; bar: [number, number]; off: [number, number];
  dice: number[]; usedDice: boolean[];
  turn: "white" | "black"; selected: number | "bar" | null;
  phase: "roll" | "move" | "done"; winner: "white" | "black" | null; msg: string;
}

function initBg(msg: string): BgState {
  const pts = Array(24).fill(0);
  pts[23]=2; pts[12]=5; pts[7]=3; pts[5]=5;
  pts[0]=-2; pts[11]=-5; pts[16]=-3; pts[18]=-5;
  return { points: pts, bar: [0,0], off: [0,0], dice: [], usedDice: [],
    turn: "white", selected: null, phase: "roll", winner: null, msg };
}

function rollDie(): number { return Math.floor(Math.random() * 6) + 1; }

function bgValidMoves(st: BgState, die: number): { from: number | "bar"; to: number | "off" }[] {
  const isWhite = st.turn === "white";
  const moves: { from: number | "bar"; to: number | "off" }[] = [];
  if (isWhite) {
    if (st.bar[0] > 0) {
      const to = 24 - die;
      if (to >= 0 && to <= 23 && st.points[to] >= -1) moves.push({ from: "bar", to });
      return moves;
    }
    const allHome = st.points.slice(0, 6).every(v => v >= 0) && st.bar[0] === 0;
    for (let idx = 0; idx < 24; idx++) {
      if (st.points[idx] <= 0) continue;
      const toIdx = idx - die;
      if (toIdx < 0) {
        if (allHome) {
          const highest = st.points.slice(0, 6).reduce((a, v, i) => v > 0 ? i : a, -1);
          if (toIdx === -1 || (toIdx < -1 && idx === highest)) moves.push({ from: idx, to: "off" });
        }
      } else if (st.points[toIdx] >= -1) {
        moves.push({ from: idx, to: toIdx });
      }
    }
  } else {
    if (st.bar[1] > 0) {
      const to = die - 1;
      if (to >= 0 && to <= 23 && st.points[to] <= 1) moves.push({ from: "bar", to });
      return moves;
    }
    const allHome = st.points.slice(18, 24).every(v => v <= 0) && st.bar[1] === 0;
    for (let idx = 0; idx < 24; idx++) {
      if (st.points[idx] >= 0) continue;
      const toIdx = idx + die;
      if (toIdx > 23) {
        if (allHome) {
          const highest = st.points.slice(18, 24).reduce((a, v, i) => v < 0 ? 18 + i : a, -1);
          if (toIdx === 24 || (toIdx > 24 && idx === highest)) moves.push({ from: idx, to: "off" });
        }
      } else if (st.points[toIdx] <= 1) {
        moves.push({ from: idx, to: toIdx });
      }
    }
  }
  return moves;
}

function applyBgMove(st: BgState, from: number | "bar", to: number | "off", dieIdx: number, lang: Lang = "en"): BgState {
  const ns: BgState = JSON.parse(JSON.stringify(st));
  const isWhite = st.turn === "white";
  ns.usedDice = [...st.usedDice]; ns.usedDice[dieIdx] = true;
  if (from === "bar") { if (isWhite) ns.bar[0]--; else ns.bar[1]--; }
  else { if (isWhite) ns.points[from as number]--; else ns.points[from as number]++; }
  if (to === "off") {
    if (isWhite) ns.off[0]++; else ns.off[1]++;
    if (isWhite && ns.off[0] === 15) { ns.phase = "done"; ns.winner = "white"; ns.msg = t("games.win", lang); }
    if (!isWhite && ns.off[1] === 15) { ns.phase = "done"; ns.winner = "black"; ns.msg = t("games.lose", lang); }
  } else {
    const ti = to as number;
    if (isWhite && ns.points[ti] === -1)  { ns.points[ti] = 1;  ns.bar[1]++; }
    else if (!isWhite && ns.points[ti] === 1) { ns.points[ti] = -1; ns.bar[0]++; }
    else { if (isWhite) ns.points[ti]++; else ns.points[ti]--; }
  }
  return ns;
}

function bgPipCount(st: BgState): { white: number; black: number } {
  let w = 0, b = 0;
  for (let i = 0; i < 24; i++) {
    if (st.points[i] > 0) w += st.points[i] * (i + 1);
    if (st.points[i] < 0) b += Math.abs(st.points[i]) * (24 - i);
  }
  w += st.bar[0] * 25; b += st.bar[1] * 25;
  return { white: w, black: b };
}

// Improved scoring: pip minimization + hit value + point-making + prime building + blot avoidance
function scoreBgMove(st: BgState, mv: { from: number | "bar"; to: number | "off" }, dieIdx: number): number {
  const ns   = applyBgMove(st, mv.from, mv.to, dieIdx);
  const pips = bgPipCount(ns);
  let score  = -pips.black * 2; // minimize black pip count (lower = better for black)

  if (mv.to === "off") {
    score += 250; // bearing off is always best
    return score;
  }

  const ti = mv.to as number;

  // Hit a white blot — great!
  if (st.points[ti] === 1) score += 200;

  // Make a point (anchor, 2+ checkers) — solid
  if (Math.abs(ns.points[ti]) >= 2) score += 90;

  // Avoid leaving a blot after moving
  if (ns.points[ti] === -1) score -= 70;

  // Bonus for closing prime (4+ consecutive black points)
  let consec = 0;
  for (let i = 0; i < 24; i++) {
    if (ns.points[i] <= -2) { consec++; if (consec >= 4) score += 30; }
    else consec = 0;
  }

  // Prefer moving toward home board (points 18-23)
  if (ti >= 18 && ti <= 23) score += 20;

  // Bar entry priority (if we have checkers on bar, entering is urgent)
  if (st.bar[1] > 0 && mv.from === "bar") score += 150;

  return score;
}

function Backgammon({
  lang, showLB, setShowLB, onWin,
}: {
  lang: Lang; showLB: boolean; setShowLB: (v: boolean | ((p: boolean) => boolean)) => void;
  onWin: (tokens: number, sid: string) => void;
}) {
  const mobile   = useIsMobile();
  const ptW      = mobile ? 30 : 42;
  const barW     = mobile ? 24 : 32;
  const chkSz    = mobile ? 20 : 28;
  const sessionId = useRef(genId());
  const rewarded  = useRef(false);
  const [st, setSt] = useState<BgState>(() => initBg(t("games.bg.rollToStart", "en")));

  function roll() {
    if (st.phase !== "roll") return;
    const d1 = rollDie(), d2 = rollDie();
    const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
    const ns: BgState = { ...st, dice, usedDice: Array(dice.length).fill(false), phase: "move",
      msg: `${dice.join(", ")}. ${t("games.bg.selectChecker", lang)}`, selected: null };
    const canMove = dice.some(d => bgValidMoves(ns, d).length > 0);
    if (!canMove) { setSt({ ...ns, msg: t("games.bg.noMoves", lang) }); endTurn(ns); return; }
    setSt(ns);
  }

  function endTurn(state: BgState) {
    if (state.winner) {
      if (state.winner === "white" && !rewarded.current) {
        rewarded.current = true; onWin(GAME_TOKENS.backgammon, sessionId.current);
      }
      return;
    }
    const next = state.turn === "white" ? "black" : "white";
    const ns: BgState = { ...state, turn: next as "white"|"black", phase: "roll", dice: [], usedDice: [],
      selected: null, msg: next === "black" ? t("games.bg.aifaTurn", lang) : t("games.bg.yourTurn", lang) };
    setSt(ns);
    if (next === "black") setTimeout(() => doAiTurn(ns), 600);
  }

  function doAiTurn(state: BgState) {
    const d1 = rollDie(), d2 = rollDie();
    const dice = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
    let cur: BgState = { ...state, dice, usedDice: Array(dice.length).fill(false), phase: "move" };
    // Greedy: find best move for each die in sequence
    for (let attempt = 0; attempt < dice.length; attempt++) {
      if (cur.winner) break;
      let bestScore = -Infinity, bestDieIdx = -1;
      let bestMv: { from: number | "bar"; to: number | "off" } | null = null;
      for (let i = 0; i < cur.dice.length; i++) {
        if (cur.usedDice[i]) continue;
        const mvs = bgValidMoves(cur, cur.dice[i]);
        for (const mv of mvs) {
          const s = scoreBgMove(cur, mv, i);
          if (s > bestScore) { bestScore = s; bestDieIdx = i; bestMv = mv; }
        }
      }
      if (bestMv !== null && bestDieIdx >= 0) cur = applyBgMove(cur, bestMv.from, bestMv.to, bestDieIdx, lang);
      else break;
    }
    if (cur.winner) { setSt({ ...cur, phase: "done" }); return; }
    setSt({ ...cur, turn: "white", phase: "roll", dice: [], usedDice: [], selected: null,
      msg: t("games.bg.yourTurn", lang) });
  }

  function handlePointClick(idx: number) {
    if (st.phase !== "move" || st.turn !== "white") return;
    if (st.bar[0] > 0 && st.selected !== "bar") {
      setSt({ ...st, selected: "bar", msg: t("games.bg.selectTarget", lang) }); return;
    }
    if (st.selected === null || st.selected === "bar") {
      if (st.points[idx] > 0) setSt({ ...st, selected: idx, msg: t("games.bg.selectMove", lang) });
      return;
    }
    // Try to move selected → idx
    for (let i = 0; i < st.dice.length; i++) {
      if (st.usedDice[i]) continue;
      const mvs = bgValidMoves(st, st.dice[i]);
      const mv = mvs.find(m => m.from === st.selected && m.to === idx);
      if (mv) {
        let ns = applyBgMove(st, mv.from, mv.to, i, lang);
        if (ns.winner) {
          setSt(ns);
          if (ns.winner === "white" && !rewarded.current) { rewarded.current = true; onWin(GAME_TOKENS.backgammon, sessionId.current); }
          return;
        }
        const remaining = ns.dice.filter((_, j) => !ns.usedDice[j]);
        if (!remaining.length) { endTurn({ ...ns, selected: null }); return; }
        const canStill = remaining.some(d => bgValidMoves(ns, d).length > 0);
        if (!canStill) { endTurn({ ...ns, selected: null }); return; }
        setSt({ ...ns, selected: null, msg: t("games.bg.selectChecker", lang) }); return;
      }
    }
    // Re-select another piece
    if (st.points[idx] > 0) setSt({ ...st, selected: idx });
    else setSt({ ...st, selected: null, msg: t("games.bg.selectChecker", lang) });
  }

  function handleBarClick() {
    if (st.phase !== "move" || st.turn !== "white") return;
    if (st.bar[0] > 0) setSt({ ...st, selected: "bar", msg: t("games.bg.selectTarget", lang) });
  }

  function handleBearOff() {
    if (st.phase !== "move" || st.turn !== "white" || st.selected === null || st.selected === "bar") return;
    const from = st.selected as number;
    for (let i = 0; i < st.dice.length; i++) {
      if (st.usedDice[i]) continue;
      const mv = bgValidMoves(st, st.dice[i]).find(m => m.from === from && m.to === "off");
      if (mv) {
        let ns = applyBgMove(st, mv.from, mv.to, i, lang);
        if (ns.winner) {
          setSt(ns);
          if (ns.winner === "white" && !rewarded.current) { rewarded.current = true; onWin(GAME_TOKENS.backgammon, sessionId.current); }
          return;
        }
        const remaining = ns.dice.filter((_, j) => !ns.usedDice[j]);
        if (!remaining.length) { endTurn({ ...ns, selected: null }); return; }
        setSt({ ...ns, selected: null, msg: t("games.bg.selectChecker", lang) }); return;
      }
    }
  }

  const pts = st.points;
  const bearOffPossible = st.selected !== null && st.selected !== "bar" && st.dice.some((_, i) => {
    if (st.usedDice[i]) return false;
    return bgValidMoves(st, st.dice[i]).some(m => m.from === st.selected && m.to === "off");
  });

  function renderPoint(idx: number) {
    const count   = Math.abs(pts[idx]);
    const isWhite = pts[idx] > 0;
    const isSel   = st.selected === idx;
    const isTarget = st.selected !== null && st.dice.some((_, i) => {
      if (st.usedDice[i]) return false;
      return bgValidMoves(st, st.dice[i]).some(m => m.from === st.selected && m.to === idx);
    });
    return (
      <button key={idx} onClick={() => handlePointClick(idx)} style={{
        width: `${ptW}px`, minHeight: `${ptW + 10}px`, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "flex-start", padding: "3px 0",
        background: isSel ? "rgba(124,58,237,0.3)" : isTarget ? "rgba(16,185,129,0.2)" : "transparent",
        border: isSel ? "1px solid #7C3AED" : isTarget ? "1px solid #10B981" : "1px solid transparent",
        borderRadius: "4px", cursor: "pointer", gap: "2px", transition: "background 0.1s",
      }}>
        {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
          <div key={i} style={{
            width: `${chkSz}px`, height: `${chkSz}px`, borderRadius: "50%",
            background: isWhite ? "#e5e7eb" : "#1e1b4b",
            border: isWhite ? "2px solid #9ca3af" : "2px solid #60a5fa",
            flexShrink: 0, fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center",
            color: isWhite ? "#111" : "#93c5fd",
          }}>{i === 0 && count > 5 ? count : ""}</div>
        ))}
        {count > 5 && <div style={{ fontSize: "9px", color: "rgb(107,114,128)" }}>{count}</div>}
        {isTarget && count === 0 && <div style={{ width: "12px", height: "12px", borderRadius: "50%",
          background: "rgba(16,185,129,0.7)" }} />}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
      <div className="glass-panel-sm" style={{ padding: "8px 24px", textAlign: "center", fontSize: "14px",
        fontWeight: 600, color: "rgb(232,232,240)" }}>
        {st.msg}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        {st.dice.length > 0
          ? st.dice.map((d, i) => (
            <div key={i} style={{
              width: "36px", height: "36px", borderRadius: "8px",
              background: st.usedDice[i] ? "rgba(30,27,75,0.4)" : "rgba(124,58,237,0.15)",
              border: st.usedDice[i] ? "1px solid rgba(107,114,128,0.3)" : "1px solid rgba(124,58,237,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "20px", color: st.usedDice[i] ? "rgba(107,114,128,0.5)" : "#7C3AED",
              opacity: st.usedDice[i] ? 0.5 : 1,
            }}>
              {["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][d]}
            </div>
          ))
          : <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>{t("games.bg.rollPrompt", lang)}</div>
        }
      </div>
      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"], width: "100%" }}>
        <div className="glass-panel" style={{ padding: "8px", display: "inline-block", position: "relative" }}>
          <div style={{ display: "flex", gap: "2px", marginBottom: "4px" }}>
            {[12,13,14,15,16,17].map(i => renderPoint(i))}
            <button onClick={handleBarClick} style={{
              width: `${barW}px`, minHeight: `${ptW + 10}px`, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: st.selected === "bar" ? "rgba(124,58,237,0.3)" : "rgba(15,15,25,0.8)",
              border: st.selected === "bar" ? "1px solid #7C3AED" : "1px solid rgba(124,58,237,0.2)",
              borderRadius: "4px", cursor: "pointer", gap: "2px", padding: "4px 0",
            }}>
              {st.bar[0] > 0 && Array.from({ length: Math.min(st.bar[0], 3) }).map((_, i) => (
                <div key={i} style={{ width: `${chkSz}px`, height: `${chkSz}px`, borderRadius: "50%",
                  background: "#e5e7eb", border: "2px solid #9ca3af" }} />
              ))}
              {st.bar[1] > 0 && Array.from({ length: Math.min(st.bar[1], 3) }).map((_, i) => (
                <div key={i} style={{ width: `${chkSz}px`, height: `${chkSz}px`, borderRadius: "50%",
                  background: "#1e1b4b", border: "2px solid #60a5fa" }} />
              ))}
              <div style={{ fontSize: "8px", color: "rgba(107,114,128,0.6)" }}>BAR</div>
            </button>
            {[18,19,20,21,22,23].map(i => renderPoint(i))}
          </div>
          <div style={{ display: "flex", gap: "2px", marginTop: "4px" }}>
            {[11,10,9,8,7,6].map(i => renderPoint(i))}
            <div style={{ width: `${barW}px` }} />
            {[5,4,3,2,1,0].map(i => renderPoint(i))}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>
          Off: <span style={{ color: "#e5e7eb" }}>⬤{st.off[0]}</span>{" "}
          <span style={{ color: "#60a5fa" }}>⬤{st.off[1]}</span>
          &nbsp;|&nbsp;Bar: <span style={{ color: "#e5e7eb" }}>⬤{st.bar[0]}</span>{" "}
          <span style={{ color: "#60a5fa" }}>⬤{st.bar[1]}</span>
        </div>
        {st.phase === "roll" && st.turn === "white" && (
          <button onClick={roll} style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)",
            color: "#7C3AED", padding: "8px 20px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
            cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            {t("games.bg.rollDice", lang)}
          </button>
        )}
        {bearOffPossible && (
          <button onClick={handleBearOff} style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
            color: "#10B981", padding: "8px 16px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
            cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            {t("games.bg.bearOff", lang)}
          </button>
        )}
        <button onClick={() => { setSt(initBg(t("games.bg.rollToStart", lang))); sessionId.current = genId(); rewarded.current = false; }}
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
            color: "#7C3AED", padding: "8px 16px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
            cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
          {t("games.newGame", lang)}
        </button>
        <button onClick={() => setShowLB(v => !v)} style={{ background: "transparent", border: "none",
          color: showLB ? "#D4A24C" : "rgb(107,114,128)", fontSize: "12px", cursor: "pointer",
          fontFamily: "Inter,sans-serif", textDecoration: "underline" }}>
          {t("games.leaderboard.toggle", lang)}
        </button>
      </div>
      <div style={{ fontSize: "11px", color: "rgb(107,114,128)" }}>{t("games.bg.label", lang)}</div>
    </div>
  );
}

// ─── GamesArena wrapper ────────────────────────────────────────────────────────
function GamesArena({ wallet }: { wallet?: string }) {
  const { lang }        = useLang();
  const { getAccessToken } = usePrivy();
  const mobile          = useIsMobile();
  const [active, setActive] = useState<GameId>("chess");
  const [keys,   setKeys]   = useState<Record<GameId, number>>({ chess: 0, ttt: 0, checkers: 0, backgammon: 0 });
  const [showLB, setShowLB] = useState(false);
  const [lbRefreshKey, setLbRefreshKey] = useState(0);
  const [toast,  setToast]  = useState<{ tokens: number; gameType: GameId } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset leaderboard visibility when switching games
  function selectGame(id: GameId) {
    setActive(id); setShowLB(false);
    setKeys(k => ({ ...k, [id]: k[id] + 1 }));
  }

  const rewardUser = useCallback(async (gameType: GameId, tokens: number, sessionId: string) => {
    if (!wallet) return;
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/games/reward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ wallet, gameType, tokens, sessionId }),
      });
      const data = await res.json();
      if (data.rewarded) {
        setLbRefreshKey(k => k + 1); // force leaderboard re-fetch
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ tokens: data.tokens, gameType });
        toastTimer.current = setTimeout(() => setToast(null), 4000);
      }
    } catch (err) {
      console.warn("reward endpoint unavailable:", err);
    }
  }, [wallet, getAccessToken]);

  const games = [
    { id: "chess"      as GameId, icon: "♟", label: t("games.chess", lang),      desc: t("games.chess.desc", lang)      },
    { id: "ttt"        as GameId, icon: "✕", label: t("games.ttt", lang),        desc: t("games.ttt.desc", lang)        },
    { id: "checkers"   as GameId, icon: "⬤", label: t("games.checkers", lang),   desc: t("games.checkers.desc", lang)   },
    { id: "backgammon" as GameId, icon: "🎲", label: t("games.backgammon", lang), desc: t("games.backgammon.desc", lang) },
  ];

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "12px",
          background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🎮</div>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "rgb(232,232,240)" }}>{t("games.title", lang)}</div>
          <div style={{ fontSize: "12px", color: "rgb(107,114,128)" }}>
            {t("games.subtitle", lang)}
            {!wallet && <span style={{ marginLeft: "8px", color: "rgba(212,162,76,0.8)" }}>· {t("games.noWallet", lang)}</span>}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {(["ttt", "checkers", "chess", "backgammon"] as GameId[]).map(g => (
            <span key={g} style={{ fontSize: "10px", color: "rgba(124,58,237,0.7)",
              background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
              borderRadius: "6px", padding: "2px 8px", whiteSpace: "nowrap" }}>
              {g === "ttt" ? "TTT" : g === "checkers" ? "DRF" : g === "chess" ? "♟" : "🎲"} +{GAME_TOKENS[g]} $CODE
            </span>
          ))}
        </div>
      </div>

      {/* Game selector */}
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr 1fr" : "repeat(4,1fr)", gap: "8px", marginBottom: "16px" }}>
        {games.map(g => (
          <button key={g.id} onClick={() => selectGame(g.id)} style={{
            display: "flex", alignItems: "center", gap: "8px", padding: mobile ? "8px 12px" : "10px 18px",
            borderRadius: "12px", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            fontFamily: "Inter,sans-serif", transition: "all 0.15s",
            background: active === g.id ? "rgba(124,58,237,0.2)" : "rgba(15,15,25,0.6)",
            border: active === g.id ? "1px solid rgba(124,58,237,0.5)" : "1px solid rgba(124,58,237,0.15)",
            color: active === g.id ? "#7C3AED" : "rgb(107,114,128)",
          }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>{g.icon}</span>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{g.label}</span>
              <span style={{ fontSize: "10px", fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden",
                textOverflow: "ellipsis", maxWidth: "100%",
                color: active === g.id ? "rgba(124,58,237,0.8)" : "rgba(107,114,128,0.7)" }}>
                {g.desc} · +{GAME_TOKENS[g.id]} $CODE
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Active game — remounts on new game via key */}
      {active === "chess" && (
        <Chess lang={lang} key={keys.chess} showLB={showLB} setShowLB={setShowLB}
          onWin={(tk, sid) => rewardUser("chess", tk, sid)} />
      )}
      {active === "ttt" && (
        <TicTacToe lang={lang} key={keys.ttt} showLB={showLB} setShowLB={setShowLB}
          onWin={(tk, sid) => rewardUser("ttt", tk, sid)} />
      )}
      {active === "checkers" && (
        <Checkers lang={lang} key={keys.checkers} showLB={showLB} setShowLB={setShowLB}
          onWin={(tk, sid) => rewardUser("checkers", tk, sid)} />
      )}
      {active === "backgammon" && (
        <Backgammon lang={lang} key={keys.backgammon} showLB={showLB} setShowLB={setShowLB}
          onWin={(tk, sid) => rewardUser("backgammon", tk, sid)} />
      )}

      {/* Leaderboard — shared, shown below all games */}
      {showLB && (
        <Leaderboard gameType={active} lang={lang} refreshKey={lbRefreshKey} userWallet={wallet} />
      )}

      {/* Reward toast */}
      {toast && <RewardToast tokens={toast.tokens} gameType={toast.gameType} lang={lang} />}

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
      `}</style>
    </div>
  );
}

export default memo(GamesArena);
