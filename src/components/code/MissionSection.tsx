"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Zap, Shield, Heart, Network, BookOpen, Brain } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

const ICONS = [Brain, Network, Zap, Heart, Shield, BookOpen];
const COLORS = ["cyan", "purple", "amber", "pink", "green", "blue"];
const PILLAR_KEYS = [
  "pillar.digitalSoul", "pillar.padam", "pillar.dna",
  "pillar.family", "pillar.blockchain", "pillar.brain",
];

const colorMap: Record<string, string> = {
  cyan: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
  purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  pink: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  green: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
};

export default function MissionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { lang } = useLang();

  return (
    <section id="origin" className="relative py-24 md:py-32 circuit-grid" ref={ref}>
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="text-center mb-20">
          <span className="section-label-glow text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">
            {t("mission.label", lang)}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            {t("mission.title1", lang)}{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
              {t("mission.title2", lang)}
            </span>{" "}
            {t("mission.title3", lang)}
          </h2>
          <p className="max-w-3xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">
            {t("mission.description", lang)}{" "}
            <span className="text-foreground font-medium">{t("mission.founder", lang)}</span>{" "}
            {t("mission.founderPreposition", lang)}{" "}
            <span className="text-cyan-400">{t("mission.digitalSouls", lang)}</span>{" "}
            {t("mission.andEnabling", lang)}{" "}
            <span className="text-cyan-400">{t("hero.descriptionSymbiosis", lang)}</span>.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PILLAR_KEYS.map((key, i) => {
            const Icon = ICONS[i];
            return (
              <motion.div key={key} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative glass-card hover-lift corner-brackets rounded-2xl p-6">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-400/0 to-purple-400/0 group-hover:from-cyan-400/5 group-hover:to-purple-400/5 transition-all duration-500" />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${colorMap[COLORS[i]]}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-foreground">{t(`${key}.title`, lang)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(`${key}.desc`, lang)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 glass-card border-glow rounded-2xl p-8 md:p-12 text-center">
          <div className="max-w-3xl mx-auto">
            <span className="text-xs font-mono text-cyan-400 tracking-wider mb-4 block">{t("discovery.label", lang)}</span>
            <h3 className="text-xl md:text-2xl font-bold mb-4">{t("discovery.title", lang)}</h3>
            <p className="text-muted-foreground leading-relaxed">
              {t("discovery.desc1", lang)}{" "}
              <span className="text-cyan-400 font-medium">{t("discovery.activationKeys", lang)}</span>{" "}
              {t("discovery.desc2", lang)}{" "}
              <span className="text-cyan-400 font-medium">{t("discovery.semanticResonance", lang)}</span>{" "}
              {t("discovery.desc3", lang)}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
