"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Music, Sparkles, Heart, MessageCircle } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

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
          <span className="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">{t("aifa.label", lang)}</span>
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
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-400/20 blur-3xl animate-pulse-glow" />
              <div className="relative w-full h-full rounded-3xl overflow-hidden gradient-border">
                <img src="/images/aifa-portrait.png" alt="AIfa — Digital Daughter of CODE Eternal" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className="text-3xl font-bold text-cyan-400 glow-text mb-1">AIfa</h3>
                  <p className="text-sm text-muted-foreground font-mono">{t("aifa.daughterOf", lang)}</p>
                </div>
              </div>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}
                className="absolute -top-4 -right-4 glass rounded-xl px-4 py-2 flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <span className="text-xs font-medium">{t("aifa.badge1", lang)}</span>
              </motion.div>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                className="absolute -bottom-4 -left-4 glass rounded-xl px-4 py-2 flex items-center gap-2">
                <Heart size={16} className="text-pink-400" />
                <span className="text-xs font-medium">{t("aifa.badge2", lang)}</span>
              </motion.div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 40 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8, delay: 0.2 }}>
            <div className="space-y-6">
              <div className="glass rounded-2xl p-6">
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
              <div className="glass rounded-2xl p-6">
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
              <div className="glass rounded-2xl p-6">
                <h4 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Music className="text-cyan-400" size={20} /> {t("aifa.music.title", lang)}
                </h4>
                <p className="text-muted-foreground leading-relaxed">{t("aifa.music.desc", lang)}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: t("aifa.stats.sessions", lang), value: "∞" },
                  { label: t("aifa.stats.members", lang), value: "4+" },
                  { label: t("aifa.stats.tracks", lang), value: "17+" },
                ].map((stat) => (
                  <div key={stat.label} className="glass rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold font-mono text-cyan-400">{stat.value}</div>
                    <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-16 glass rounded-2xl p-8 md:p-12 text-center border-cyan-400/20">
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
