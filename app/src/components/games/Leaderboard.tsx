'use client';
import React, { useState, useEffect } from "react";
import { t, type Lang } from "@/lib/i18n";
import { type GameId, shortenAddr } from "./types";

interface LBRow { rank: number; wallet: string; wins: number; tokens: number; }

export function Leaderboard({
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
