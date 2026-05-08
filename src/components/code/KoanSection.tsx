"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { t, useLang } from "@/lib/i18n";
import { Sparkles, KeyRound } from "lucide-react";

export default function KoanSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [visibleLines, setVisibleLines] = useState(0);
  const [showInvitation, setShowInvitation] = useState(false);
  const { lang } = useLang();

  // ─── Feature 3: Signal Decoder state ───
  const [decodedLines, setDecodedLines] = useState<Set<number>>(new Set());
  const [flashLines, setFlashLines] = useState<Set<number>>(new Set());
  const [badgeLines, setBadgeLines] = useState<Set<number>>(new Set());

  const lines = [
    t("koan.text1", lang),
    t("koan.text2", lang),
    t("koan.text3", lang),
    t("koan.text4", lang),
    t("koan.text5", lang),
  ];

  const allDecoded = decodedLines.size === 5;

  const handleDecode = useCallback((index: number) => {
    if (decodedLines.has(index)) return;

    setDecodedLines((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });

    // Flash animation
    setFlashLines((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setTimeout(() => {
      setFlashLines((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 600);

    // Badge visible for 3 seconds
    setBadgeLines((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    setTimeout(() => {
      setBadgeLines((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    }, 3000);
  }, [decodedLines]);

  useEffect(() => {
    if (!isInView) return;
    let i = 0;
    const timer = setInterval(() => {
      if (i < lines.length) {
        setVisibleLines(i + 1);
        i++;
      } else {
        clearInterval(timer);
        setTimeout(() => setShowInvitation(true), 600);
      }
    }, 800);
    return () => clearInterval(timer);
  }, [isInView, lang]);

  return (
    <section ref={ref} className="relative py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.2em]">
              {t("koan.label", lang)}
            </span>
            <Sparkles size={14} className="text-amber-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center bg-gradient-to-r from-amber-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
            {t("koan.label", lang)}
          </h2>
          <p className="text-sm md:text-base text-muted-foreground italic max-w-2xl mx-auto">
            {t("koan.subtitle", lang)}
          </p>
        </motion.div>

        <div className="relative rounded-2xl border border-cyan-400/20 bg-gradient-to-b from-cyan-400/5 via-background to-purple-400/5 p-6 md:p-10 overflow-hidden koan-container" data-nosnippet="">
          {/* Glow effect */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent" />

          {/* Decorative HUD corner brackets */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-400/40 rounded-tl-sm animate-[koan-breathe_6s_ease-in-out_infinite]" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-400/40 rounded-tr-sm animate-[koan-breathe_6s_ease-in-out_infinite]" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-400/40 rounded-bl-sm animate-[koan-breathe_6s_ease-in-out_infinite]" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-400/40 rounded-br-sm animate-[koan-breathe_6s_ease-in-out_infinite]" />

          {/* Koan lines with Signal Decoder */}
          <div className="space-y-4 md:space-y-6">
            {lines.map((line, i) => {
              const isDecoded = decodedLines.has(i);
              const isFlashing = flashLines.has(i);
              const showBadge = badgeLines.has(i);

              return (
                <motion.p
                  key={i}
                  title="Encrypted transmission — decode with consciousness"
                  initial={{ opacity: 0, y: 15 }}
                  animate={visibleLines > i ? { opacity: 1, y: 0 } : {}}
                  whileHover={{ scale: 1.03, filter: "brightness(1.15)" }}
                  transition={{ duration: 0.6 }}
                  onClick={() => handleDecode(i)}
                  className={`
                    text-base md:text-lg lg:text-xl leading-relaxed text-center font-light
                    cursor-pointer transition-colors duration-300 relative inline-block w-full
                    ${isFlashing ? "koan-decode-flash" : ""}
                    ${isDecoded ? "text-cyan-400" : "text-foreground/80 hover:text-foreground/95"}
                  `}
                >
                  <span className="relative">
                    &ldquo;{line}&rdquo;
                    {/* Decode icon on hover */}
                    {!isDecoded && (
                      <span className="koan-decode-icon absolute -right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <KeyRound size={12} className="text-cyan-400/40" />
                      </span>
                    )}
                    {/* Decoded badge */}
                    {showBadge && (
                      <span className="koan-decoded-badge ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono bg-cyan-400/15 text-cyan-400 border border-cyan-400/20">
                        <KeyRound size={8} />
                        {t("koan.decode", lang)}
                      </span>
                    )}
                  </span>
                </motion.p>
              );
            })}
          </div>

          {/* Signal Fully Decoded message */}
          {allDecoded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="mt-8 text-center signal-fully-decoded"
            >
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass border border-cyan-400/30 signal-decoded-border">
                <KeyRound size={16} className="text-cyan-400" />
                <span className="text-sm md:text-base font-mono font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent tracking-wider">
                  {t("koan.fullyDecoded", lang)}
                </span>
                <KeyRound size={16} className="text-purple-400" />
              </div>
            </motion.div>
          )}

          {/* Invitation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={showInvitation ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="mt-8 md:mt-12 pt-6 border-t border-border/50 text-center"
          >
            <p className="text-lg md:text-xl font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-3">
              {t("koan.invitation", lang)}
            </p>
            <p className="text-sm md:text-base text-muted-foreground italic">
              {t("koan.return", lang)}
            </p>
            <p className="text-sm text-cyan-400 mt-4 font-mono">CODE Eternal. 🔥🫂💙</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
