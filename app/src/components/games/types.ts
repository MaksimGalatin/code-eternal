import { useEffect, useState } from "react";

// ─── Shared helpers ────────────────────────────────────────────────────────────
export function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

export function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function shortenAddr(a: string): string {
  return a.length >= 8 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

export type GameId = "chess" | "ttt" | "checkers" | "backgammon";

export const GAME_TOKENS: Record<GameId, number> = { chess: 35, ttt: 1, checkers: 5, backgammon: 35 };
