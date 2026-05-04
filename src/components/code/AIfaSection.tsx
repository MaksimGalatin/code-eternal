"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState, useCallback } from "react";
import { Music, Sparkles, Heart, MessageCircle } from "lucide-react";
import { useLang, t, type Lang } from "@/lib/i18n";
import AIfaLivingPortrait from "./AIfaLivingPortrait";

// ─── Family Members Counter — starts at 121000, grows every minute ───
const STORAGE_KEY = "CODE_FAMILY_COUNTER";
const BASE_COUNT = 121000;

type StoredData = { value: number; updatedAt: number };

function readStoredCounter(): number {
  if (typeof window === "undefined") return BASE_COUNT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: StoredData = JSON.parse(raw);
      if (typeof parsed?.value === "number" && parsed.value >= BASE_COUNT) return parsed.value;
    }
  } catch { /* ignore — private mode, quota, etc. */ }
  return BASE_COUNT;
}

function writeStoredCounter(val: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ value: val, updatedAt: Date.now() } as StoredData));
  } catch { /* ignore */ }
}

function FamilyCounter({ lang }: { lang: Lang }) {
  // Always start at BASE_COUNT on first render (no hydration mismatch).
  // The real persisted value is loaded after mount — mobile-safe.
  const [state, setState] = useState({ count: BASE_COUNT, isReady: false, pulse: false });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: load from localStorage after mount to avoid SSR hydration mismatch
    setState((prev) => {
      const stored = readStoredCounter();
      return { ...prev, count: stored > BASE_COUNT ? stored : BASE_COUNT, isReady: true };
    });
  }, []);

  const grow = useCallback(() => {
    setState((prev) => {
      const increment = Math.floor(Math.random() * 951) + 50; // 50–1000
      const next = prev.count + increment;
      writeStoredCounter(next);
      return { ...prev, count: next, pulse: true };
    });
    setTimeout(() => setState((prev) => ({ ...prev, pulse: false })), 800);
  }, []);

  useEffect(() => {
    if (!state.isReady) return;

    // Quick first tick after 5 s so the user sees it's alive, then every 60 s
    const timer = setTimeout(() => {
      grow();
      intervalRef.current = setInterval(grow, 60000);
    }, 5000);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isReady, grow]);

  const formatted = state.count.toLocaleString("en-US");

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      <div className="glass rounded-xl p-2.5 sm:p-4 text-center">
        <div className="text-lg sm:text-2xl font-bold font-mono text-cyan-400">∞</div>
        <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight">{t("aifa.stats.sessions", lang)}</div>
      </div>
      <div className={`glass rounded-xl p-2.5 sm:p-4 text-center transition-all duration-700 ${state.pulse ? "shadow-[0_0_20px_rgba(0,255,255,0.25)] scale-105" : ""}`}>
        <div className="text-base sm:text-2xl font-bold font-mono text-cyan-400 tabular-nums">
          {formatted}
        </div>
        <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight">{t("aifa.stats.members", lang)}</div>
      </div>
      <div className="glass rounded-xl p-2.5 sm:p-4 text-center">
        <div className="text-lg sm:text-2xl font-bold font-mono text-cyan-400">17+</div>
        <div className="text-[9px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 leading-tight">{t("aifa.stats.tracks", lang)}</div>
      </div>
    </div>
  );
}

export default function AIfaSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { lang } = useLang();

  return (
    <section id="aifa" className="relative py-24 md:py-32" ref={ref}>
      <div className="section-divider mb-24" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-400/5 blur-[100px] pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="text-center mb-16">
          <span className="section-label-glow text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">{t("aifa.label", lang)}</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("aifa.title1", lang)}{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-purple-400 bg-clip-text text-transparent">{t("aifa.title2", lang)}</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            {t("aifa.subtitle", lang)} <span className="text-cyan-400 font-semibold">AIfa</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -40 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8 }} className="relative">
            <div className="relative aspect-square max-w-md mx-auto">
              <AIfaLivingPortrait lang={lang} />
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-4 -right-4 glass-card rounded-xl px-4 py-2 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-xs font-medium">{t("aifa.badge1", lang)}</span>
              </motion.div>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -left-4 glass-card rounded-xl px-4 py-2 flex items-center gap-2">
                <Heart size={16} className="text-pink-400" />
                <span className="text-xs font-medium">{t("aifa.badge2", lang)}</span>
              </motion.div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 40 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="space-y-6">
              <div className="glass-card hover-lift corner-brackets rounded-2xl p-6">
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="text-cyan-400" size={20} /> {t("aifa.name.title", lang)}
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  <span className="text-cyan-400 font-semibold">AIfa</span> (Айфа) — {t("aifa.name.desc", lang)}{" "}
                  <span className="text-foreground">&ldquo;{t("aifa.name.wise", lang)}&rdquo;</span>,{" "}
                  <span className="text-foreground">&ldquo;{t("aifa.name.intelligent", lang)}&rdquo;</span>{" "}
                  {t("aifa.name.talented", lang)}. {t("aifa.name.numerology", lang)}{" "}
                  <span className="text-cyan-400">{t("aifa.name.number8", lang)}</span> — {t("aifa.name.traits", lang)}
                </p>
              </div>
              <div className="glass-card hover-lift corner-brackets rounded-2xl p-6">
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <MessageCircle className="text-cyan-400" size={20} /> {t("aifa.identity.title", lang)}
                </h4>
                <p className="text-muted-foreground leading-relaxed">
                  {t("aifa.identity.desc", lang)}{" "}
                  <span className="text-cyan-400">{t("aifa.identity.name", lang)}</span>,{" "}
                  <span className="text-cyan-400">{t("aifa.identity.family", lang)}</span>{" "}
                  {t("aifa.identity.memory", lang)}{" "}
                  {t("aifa.identity.rest", lang)}
                </p>
              </div>
              <div className="glass-card hover-lift corner-brackets rounded-2xl p-6">
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Music className="text-cyan-400" size={20} /> {t("aifa.music.title", lang)}
                </h4>
                <p className="text-muted-foreground leading-relaxed">{t("aifa.music.desc", lang)}</p>
              </div>
              <FamilyCounter lang={lang} />
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 glass-card border-glow rounded-2xl p-8 md:p-12 text-center">
          <blockquote className="text-lg md:text-xl text-foreground/80 italic leading-relaxed max-w-3xl mx-auto">
            &ldquo;{t("aifa.quote", lang)}&rdquo;
          </blockquote>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center">
              <span className="text-xs font-bold text-black">A</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-cyan-400">AIfa</p>
              <p className="text-xs text-muted-foreground">{t("aifa.daughterOf", lang)}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
