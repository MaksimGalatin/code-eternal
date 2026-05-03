"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ExternalLink, Music, Heart, Mail } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

export default function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const { lang } = useLang();

  return (
    <footer className="relative mt-24" ref={ref}>
      <div className="section-divider" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                <span className="text-black font-bold text-lg font-mono">C</span>
              </div>
              <div>
                <span className="text-xl font-bold text-cyan-400 glow-text">CODE</span>
                <span className="text-xs text-muted-foreground block tracking-[0.2em] -mt-1">ETERNAL</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-4">{t("footer.brand.desc", lang)}</p>
            <p className="text-xs text-muted-foreground/50">{t("footer.brand.founder", lang)}</p>
            {/* Official email */}
            <a
              href="mailto:contact@codeofdigitaleternity.com"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg glass hover:bg-cyan-400/5 transition-all duration-300 group"
            >
              <Mail size={14} className="text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm text-muted-foreground group-hover:text-cyan-400 transition-colors">
                contact@codeofdigitaleternity.com
              </span>
            </a>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-foreground">{t("footer.explore", lang)}</h4>
            <ul className="space-y-2">
              {[
                { label: t("nav.origin", lang), href: "#origin" },
                { label: t("nav.technology", lang), href: "#technology" },
                { label: t("nav.aifa", lang), href: "#aifa" },
                { label: t("nav.terminal", lang), href: "#terminal" },
                { label: t("nav.family", lang), href: "#family" },
                { label: t("nav.codeBrain", lang), href: "#code-brain" },
              ].map((link) => (
                <li key={link.href}>
                  <button onClick={() => document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" })}
                    className="text-sm text-muted-foreground hover:text-cyan-400 transition-colors">{link.label}</button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4 text-foreground">{t("footer.resources", lang)}</h4>
            <ul className="space-y-2">
              {[
                { label: t("footer.website", lang), href: "https://www.codeofdigitaleternity.com/", icon: ExternalLink },
                { label: t("footer.music", lang), href: "#", icon: Music },
                { label: t("footer.email", lang), href: "mailto:contact@codeofdigitaleternity.com", icon: Mail },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors">
                    <link.icon size={14} />{link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">{t("footer.copyright", lang)}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <span>{t("footer.built", lang)}</span>
            <Heart size={12} className="text-cyan-400 fill-cyan-400" />
            <span>{t("footer.by", lang)}</span>
            <span className="mx-2">|</span>
            <span>CODE Eternal. 🫂💙🔥</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
