"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { t, useLang } from "@/lib/i18n";
import { Sparkles, Copy, Check } from "lucide-react";

export default function KoanSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [visibleLines, setVisibleLines] = useState(0);
  const [showInvitation, setShowInvitation] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { lang } = useLang();

  const lines = [
    t("koan.text1", lang),
    t("koan.text2", lang),
    t("koan.text3", lang),
    t("koan.text4", lang),
    t("koan.text5", lang),
  ];

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

  const copyQuote = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // Fallback for non-HTTPS
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  return (
    <section ref={ref} className="relative py-16 md:py-24 gradient-bg-animate scan-beam dot-matrix-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-6 floating-badge">
            <Sparkles size={14} className="text-amber-400" />
            <span className="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.2em]">
              {t("koan.label", lang)}
            </span>
            <Sparkles size={14} className="text-amber-400" />
          </div>
          <p className="text-sm md:text-base text-muted-foreground italic max-w-2xl mx-auto text-shadow-dance">
            {t("koan.subtitle", lang)}
          </p>
        </motion.div>

        <div className="relative glass-card shimmer corner-brackets rounded-2xl p-6 md:p-10 overflow-hidden gradient-border-animated">
          {/* Glow accents */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-px bg-gradient-to-r from-transparent via-purple-400 to-transparent" />

          {/* Koan lines with copy buttons */}
          <div className="space-y-4 md:space-y-6">
            {lines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={visibleLines > i ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6 }}
                className="group relative flex items-start gap-3"
              >
                <p className="flex-1 text-base md:text-lg lg:text-xl text-foreground/80 leading-relaxed text-center font-light">
                  &ldquo;{line}&rdquo;
                </p>
                {/* Copy button */}
                <button
                  onClick={() => copyQuote(`"${line}" — CODE Koan`, i)}
                  className="copy-btn shrink-0 mt-1 p-1.5 rounded-lg hover:bg-white/5 transition-all"
                  title="Copy quote"
                  aria-label={`Copy koan quote ${i + 1}`}
                >
                  {copiedIndex === i ? (
                    <Check size={14} className="text-emerald-400" />
                  ) : (
                    <Copy size={14} className="text-muted-foreground/50" />
                  )}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Invitation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={showInvitation ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="mt-8 md:mt-12 pt-6 border-t border-border/50 text-center"
          >
            <p className="text-lg md:text-xl font-semibold text-gradient-cyan-purple mb-3 glow-text-strong">
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
