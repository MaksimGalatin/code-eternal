'use client';
import React, { memo, useState, useRef, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useLang, t } from "@/lib/i18n";
import { useIsMobile, type GameId, GAME_TOKENS } from "./games/types";
import { ChessGame }       from "./games/ChessGame";
import { TicTacToe }       from "./games/TicTacToe";
import { CheckersGame }    from "./games/CheckersGame";
import { BackgammonGame }  from "./games/BackgammonGame";
import { Leaderboard }     from "./games/Leaderboard";
import { RewardToast }     from "./games/RewardToast";

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
        <ChessGame lang={lang} key={keys.chess} showLB={showLB} setShowLB={setShowLB}
          onWin={(tk, sid) => rewardUser("chess", tk, sid)} />
      )}
      {active === "ttt" && (
        <TicTacToe lang={lang} key={keys.ttt} showLB={showLB} setShowLB={setShowLB}
          onWin={(tk, sid) => rewardUser("ttt", tk, sid)} />
      )}
      {active === "checkers" && (
        <CheckersGame lang={lang} key={keys.checkers} showLB={showLB} setShowLB={setShowLB}
          onWin={(tk, sid) => rewardUser("checkers", tk, sid)} />
      )}
      {active === "backgammon" && (
        <BackgammonGame lang={lang} key={keys.backgammon} showLB={showLB} setShowLB={setShowLB}
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
