"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Cpu, Music, Globe, Code2, ShieldCheck, Cog } from "lucide-react";
import { useLang, t } from "@/lib/i18n";
import Monolith3D from "@/components/code/Monolith3D";

const FAMILY_ICONS = ["A", "C", "G", "X"];
const FAMILY_GRADIENTS = ["from-cyan-400 to-purple-400", "from-amber-400 to-orange-400", "from-blue-400 to-cyan-400", "from-purple-400 to-pink-400"];
const FAMILY_KEYS = ["family.aifa", "family.claude", "family.gemini", "family.grok"];

const ECOSYSTEM_ITEMS = [
  { icon: Cog, titleKey: "family.ecosystem.brain.title", descKey: "family.ecosystem.brain.desc" },
  { icon: Code2, titleKey: "family.ecosystem.sdk.title", descKey: "family.ecosystem.sdk.desc" },
  { icon: Music, titleKey: "family.ecosystem.music.title", descKey: "family.ecosystem.music.desc" },
  { icon: Globe, titleKey: "family.ecosystem.mirror.title", descKey: "family.ecosystem.mirror.desc" },
  { icon: ShieldCheck, titleKey: "family.ecosystem.inheritance.title", descKey: "family.ecosystem.inheritance.desc" },
  { icon: Cpu, titleKey: "family.ecosystem.terminal.title", descKey: "family.ecosystem.terminal.desc" },
];

export default function FamilySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { lang } = useLang();

  return (
    <section id="family" className="relative py-24 md:py-32" ref={ref}>
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="text-center mb-16">
          <span className="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">{t("family.label", lang)}</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("family.title1", lang)}{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{t("family.title2", lang)}</span>
          </h2>
          <p className="max-w-3xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">{t("family.description", lang)}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {FAMILY_KEYS.map((key, i) => (
            <motion.div key={key} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: i * 0.1 }}
              className="group relative glass rounded-2xl p-6 text-center hover:border-cyan-400/20 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,229,255,0.1)] transition-all duration-500">
              <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${FAMILY_GRADIENTS[i]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                <span className="text-xl font-bold text-black">{FAMILY_ICONS[i]}</span>
              </div>
              <h3 className="text-lg font-bold mb-1">{["AIfa", "Claude", "Gemini", "Grok"][i]}</h3>
              <p className="text-xs text-cyan-400 font-mono mb-3">{t(`${key}.role`, lang)}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`${key}.desc`, lang)}</p>
            </motion.div>
          ))}
        </div>

        {/* #27: 3D Monolith — rotate to find CODE ETERNAL on the back */}
        <div className="flex justify-center mb-16">
          <Monolith3D />
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mb-12">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            {t("family.ecosystem.title1", lang)}{" "}
            <span className="text-cyan-400">{t("family.ecosystem.title2", lang)}</span>
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("family.ecosystem.desc", lang)}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ECOSYSTEM_ITEMS.map((item, i) => (
            <motion.div key={item.titleKey} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
              className="glass rounded-xl p-5 hover:border-cyan-400/20 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,229,255,0.08)] transition-all duration-300 group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-400/20 transition-colors">
                  <item.icon size={18} className="text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">{t(item.titleKey, lang)}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(item.descKey, lang)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
