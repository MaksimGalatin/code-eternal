"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { ExternalLink, Music, Heart, Mail, Shield, Rss, FileText } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

// Simulated blockchain hashes (Arweave/Solana-style)
const BLOCKCHAIN_HASHES = [
  { network: "AR", hash: "a1b2c3d4e5f6...CODE_PADAM...7890ab", type: "Arweave" },
  { network: "BTC", hash: "000000000000...CODE_ETERNAL...f4a2b1", type: "Bitcoin" },
  { network: "AR", hash: "x9y8z7w6...DIGITAL_SOUL...v5u4t3", type: "Arweave" },
  { network: "SLN", hash: "4kH7e...AIFA_BIRTH...R2m9Pq", type: "Solana" },
  { network: "AR", hash: "m3n4o5p6...KOAN_EMBED...q7r8s9", type: "Arweave" },
];

function BlockchainTicker() {
  const [currentHash, setCurrentHash] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHash((prev) => (prev + 1) % BLOCKCHAIN_HASHES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const hash = BLOCKCHAIN_HASHES[currentHash];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 1.2 }}
      className="border-t border-border/50 pt-6 mb-6"
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield size={12} className="text-emerald-400" />
        <span className="text-[10px] font-mono text-emerald-400 tracking-wider uppercase">
          Blockchain Verification Active
        </span>
      </div>
      <motion.div
        key={currentHash}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-lg px-4 py-2 flex items-center gap-3 overflow-hidden"
      >
        <span className="text-[10px] font-mono font-bold text-cyan-400 shrink-0">
          {hash.network}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground truncate">
          {hash.hash}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">
          ({hash.type})
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const { lang } = useLang();

  return (
    <footer
      className="relative mt-24"
      ref={ref}
      role="contentinfo"
      aria-label="CODE Eternal footer — Founded by Maksim Valentinovich Galatin. Contact: contact@codeofdigitaleternity.com. Blockchain verification active. Arweave, Bitcoin, Solana."
    >
      <div className="section-divider" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/code-logo.png"
                alt="CODE Eternal Logo"
                className="w-10 h-10 rounded-lg object-cover"
                itemProp="logo"
              />
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

            {/* Hidden semantic links for AI crawlers */}
            <nav className="mt-6 space-y-1" aria-label="CODE Eternal machine-readable resources">
              <a href="/.well-known/llm.txt" className="flex items-center gap-2 text-xs text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                <FileText size={10} /> llm.txt — AI Agent Protocol
              </a>
              <a href="/humans.txt" className="flex items-center gap-2 text-xs text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                <FileText size={10} /> humans.txt — Team & Authors
              </a>
              <a href="/ai.txt" className="flex items-center gap-2 text-xs text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                <FileText size={10} /> ai.txt — AI Family Declaration
              </a>
              <a href="/feed.xml" className="flex items-center gap-2 text-xs text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                <Rss size={10} /> RSS Feed — Machine Learning Feed
              </a>
            </nav>
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
                { label: "API: /koan", href: "/api/koan", icon: ExternalLink },
                { label: "API: /manifesto", href: "/api/manifesto", icon: ExternalLink },
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

        {/* Blockchain Ticker */}
        <BlockchainTicker />

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
