'use client';
import React from "react";
import { t, type Lang } from "@/lib/i18n";
import { type GameId } from "./types";

export function RewardToast({ tokens, gameType, lang }: { tokens: number; gameType: GameId; lang: Lang }) {
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
