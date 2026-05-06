"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Database, Brain, Shield } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

const TIMELINE_ICONS = [Brain, Brain, Shield, Brain, Database, Shield];
const TIMELINE_KEYS = [
  "brain.timeline.1", "brain.timeline.2", "brain.timeline.3",
  "brain.timeline.4", "brain.timeline.5", "brain.timeline.6",
];

export default function CodeBrainSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { lang } = useLang();

  return (
    <section id="code-brain" className="relative py-24 md:py-32" ref={ref}>
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="text-center mb-16">
          <span className="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">{t("brain.label", lang)}</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("brain.title1", lang)}{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">{t("brain.title2", lang)}</span>
          </h2>
          <p className="max-w-3xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">{t("brain.subtitle", lang)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.2 }}
          className="glass rounded-2xl p-6 md:p-10 mb-16">
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {["Obsidian", "Ollama Cloud", "Arweave", "WSL2", "Docker", "AI Agents"].map((tech) => (
              <span key={tech} className="px-3 py-1.5 text-xs font-mono rounded-full border border-cyan-400/20 bg-cyan-400/5 text-cyan-400">{tech}</span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Database, title: t("brain.storage.title", lang), desc: t("brain.storage.desc", lang) },
              { icon: Brain, title: t("brain.local.title", lang), desc: t("brain.local.desc", lang) },
              { icon: Shield, title: t("brain.sync.title", lang), desc: t("brain.sync.desc", lang) },
            ].map((item) => (
              <div key={item.title} className="text-center">
                <div className="w-14 h-14 mx-auto rounded-xl bg-cyan-400/10 flex items-center justify-center mb-4">
                  <item.icon size={24} className="text-cyan-400" />
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.4 }}>
          <h3 className="text-xl md:text-2xl font-bold text-center mb-12">
            {t("brain.timeline.title", lang)}
          </h3>
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/40 via-cyan-400/20 to-transparent md:-translate-x-px" />
            <div className="space-y-8">
              {TIMELINE_KEYS.map((key, i) => {
                const isLeft = i % 2 === 0;
                const Icon = TIMELINE_ICONS[i];
                return (
                  <motion.div key={key} initial={{ opacity: 0, x: isLeft ? -20 : 20 }} animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                    className={`relative flex flex-col md:flex-row items-start gap-4 md:gap-8 ${isLeft ? "" : "md:flex-row-reverse"}`}>
                    <div className="absolute left-4 md:left-1/2 top-4 w-2 h-2 rounded-full bg-cyan-400 glow-cyan-strong z-10 -translate-x-1 md:-translate-x-1" />
                    <div className={`flex-1 pl-10 md:pl-0 ${isLeft ? "md:text-right md:pr-12" : "md:text-left md:pl-12"}`}>
                      <span className="text-xs font-mono text-cyan-400">{t(`${key}.date`, lang)}</span>
                      <h4 className="text-base font-semibold mt-1">{t(`${key}.event`, lang)}</h4>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(`${key}.detail`, lang)}</p>
                    </div>
                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 1 }}
          className="mt-16 text-center">
          <blockquote className="text-lg md:text-xl text-muted-foreground italic max-w-3xl mx-auto">
            &ldquo;{t("brain.quote", lang)}&rdquo;
          </blockquote>
          <p className="text-sm text-cyan-400 mt-4 font-mono">{t("brain.quoteAuthor", lang)}</p>
        </motion.div>
      </div>
    </section>
  );
}
