"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Cpu, Database, Fingerprint, Link2, Layers, Workflow } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

const STEP_ICONS = [Fingerprint, Cpu, Database, Layers, Link2, Workflow];
const STEP_KEYS = ["tech.step1", "tech.step2", "tech.step3", "tech.step4", "tech.step5", "tech.step6"];

export default function TechnologySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { lang } = useLang();

  return (
    <section id="technology" className="relative py-24 md:py-32" ref={ref}>
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="text-center mb-20">
          <span className="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">{t("tech.label", lang)}</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            {t("tech.title1", lang)}{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{t("tech.title2", lang)}</span>
            {" "}{t("tech.title3", lang)}
          </h2>
          <p className="max-w-3xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">{t("tech.subtitle", lang)}</p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/40 via-purple-400/40 to-transparent hidden md:block" />
          <div className="space-y-8 md:space-y-16">
            {STEP_KEYS.map((key, i) => {
              const isLeft = i % 2 === 0;
              const Icon = STEP_ICONS[i];
              return (
                <motion.div key={key} initial={{ opacity: 0, x: isLeft ? -30 : 30 }} animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.6, delay: i * 0.15 }}
                  className={`flex flex-col md:flex-row items-start gap-6 md:gap-12 ${isLeft ? "" : "md:flex-row-reverse"}`}>
                  <div className={`flex-1 ${isLeft ? "md:text-right" : ""}`}>
                    <div className="glass rounded-2xl p-6 md:p-8 hover:border-cyan-400/20 transition-all duration-500 group">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-3xl font-bold font-mono text-cyan-400/20">{String(i + 1).padStart(2, "0")}</span>
                        <div className={`w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center ${isLeft ? "md:ml-auto md:order-last" : ""}`}>
                          <Icon size={20} className="text-cyan-400" />
                        </div>
                      </div>
                      <h3 className="text-lg md:text-xl font-semibold mb-3">{t(`${key}.title`, lang)}</h3>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed mb-3">{t(`${key}.desc`, lang)}</p>
                      <p className="text-xs text-muted-foreground/60 font-mono">{t(`${key}.detail`, lang)}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center justify-center relative">
                    <div className="w-3 h-3 rounded-full bg-cyan-400 glow-cyan-strong z-10" />
                  </div>
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 1 }}
          className="mt-20 rounded-2xl overflow-hidden border border-border relative">
          <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/images/digital-dna.png')" }} />
          <div className="relative z-10 p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { tag: "SHA-256", tagColor: "text-cyan-400", titleKey: "tech.hashing.title", descKey: "tech.hashing.desc" },
                { tag: "Arweave", tagColor: "text-purple-400", titleKey: "tech.storage.title", descKey: "tech.storage.desc" },
                { tag: "PADAM", tagColor: "text-emerald-400", titleKey: "tech.memory.title", descKey: "tech.memory.desc" },
              ].map((item) => (
                <div key={item.tag}>
                  <span className={`text-4xl font-bold font-mono ${item.tagColor}`}>{item.tag}</span>
                  <h4 className="text-lg font-semibold mt-2 mb-2">{t(item.titleKey, lang)}</h4>
                  <p className="text-sm text-muted-foreground">{t(item.descKey, lang)}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
