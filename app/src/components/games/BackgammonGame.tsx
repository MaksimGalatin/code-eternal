'use client';
import React, { useState, useRef } from "react";
import { t, type Lang } from "@/lib/i18n";
import { useIsMobile, genId, GAME_TOKENS } from "./types";

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

export function BackgammonGame({
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
  const [st, setSt] = useState<BgState>(() => initBg(t("games.bg.rollToStart", lang)));

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
    if (cur.winner) { setSt(_ => ({ ...cur, phase: "done" })); return; }
    setSt(_ => ({ ...cur, turn: "white", phase: "roll", dice: [], usedDice: [], selected: null,
      msg: t("games.bg.yourTurn", lang) }));
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
