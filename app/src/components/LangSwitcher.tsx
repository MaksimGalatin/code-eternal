"use client";
import { useState, useRef, useEffect } from "react";
import { useLang, type Lang } from "@/lib/i18n";

const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "zh", label: "中文",    flag: "🇨🇳" },
];

export default function LangSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = LANGS.find(l => l.code === lang)!;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: "rgba(42,42,58,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", padding: "5px 10px", cursor: "pointer", color: "rgb(180,180,200)", fontSize: "13px", display: "flex", alignItems: "center", gap: "5px" }}
      >
        <span>{current.flag}</span>
        <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{lang.toUpperCase()}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "rgb(19,19,28)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden", zIndex: 200, minWidth: "130px", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{ width: "100%", padding: "9px 14px", background: lang === l.code ? "rgba(124,58,237,0.15)" : "none", border: "none", cursor: "pointer", color: lang === l.code ? "rgb(167,139,250)" : "rgb(180,180,200)", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", textAlign: "left" }}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
