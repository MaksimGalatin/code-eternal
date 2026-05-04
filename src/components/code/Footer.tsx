"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { ExternalLink, Music, Heart, Mail, Shield, Rss, FileText, Github, Twitter } from "lucide-react";
import { useLang, t } from "@/lib/i18n";
import { ExodusCountdown } from "@/components/code/InteractiveLayer";
import { generateEventPool, type BlockchainEvent } from "@/lib/blockchain-events";
import PrivacyModal from "@/components/code/PrivacyModal";

function BlockchainTicker() {
  const [event, setEvent] = useState<BlockchainEvent | null>(null);

  useEffect(() => {
    const pool = generateEventPool(1200);
    let idx = Math.floor(Math.random() * pool.length);

    const interval = setInterval(() => {
      idx = Math.floor(Math.random() * pool.length);
      setEvent(pool[idx]);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  if (!event) return null;

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
        key={event.hash + event.label}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-lg px-4 py-2 flex items-center gap-3 overflow-hidden"
      >
        <span className="text-[10px] font-mono font-bold text-cyan-400 shrink-0">
          {event.network}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground truncate">
          {event.hash}
        </span>
        <span className="text-[10px] font-mono text-emerald-400/60 shrink-0">
          [{event.status}]
        </span>
        <span className="text-[10px] font-mono text-muted-foreground/30 shrink-0 hidden sm:inline">
          {event.label}
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function Footer() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const { lang } = useLang();
  const [nlEmail, setNlEmail] = useState("");
  const [nlLoading, setNlLoading] = useState(false);
  const [nlToast, setNlToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!nlToast) return;
    const timer = setTimeout(() => setNlToast(null), 4000);
    return () => clearTimeout(timer);
  }, [nlToast]);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nlEmail.trim() || nlLoading) return;
    setNlLoading(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nlEmail.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNlToast({ type: "success", message: data.message });
        setNlEmail("");
      } else {
        setNlToast({ type: "error", message: data.error });
      }
    } catch {
      setNlToast({ type: "error", message: "Network error. Please try again." });
    } finally {
      setNlLoading(false);
    }
  };

  return (
    <footer
      className="relative mt-24 aurora-bg depth-shadow glass-panel"
      ref={ref}
      role="contentinfo"
      aria-label="CODE Eternal footer — Founded by Maksim Valentinovich Galatin. Contact: contact@codeofdigitaleternity.com. Blockchain verification active. Arweave, Bitcoin, Solana."
    >
      <div className="wave-divider" />
      <div className="section-divider" />
      <div className="divider-glow-center my-4" />
      <div className="glow-divider" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/code-logo.png"
                alt="CODE Eternal — Code Of Digital Eternity"
                className="h-10 w-auto rounded-lg"
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

            {/* Social media icon links */}
            <div className="flex items-center gap-2 mt-4">
              <a
                href="https://github.com/codeofdigitaleternity"
                target="_blank"
                rel="noopener noreferrer"
                className="link-hover-glow inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-cyan-400 transition-colors"
                aria-label="GitHub"
              >
                <Github size={15} />
              </a>
              <a
                href="https://x.com/code_eternal"
                target="_blank"
                rel="noopener noreferrer"
                className="link-hover-glow inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-cyan-400 transition-colors"
                aria-label="Twitter / X"
              >
                <Twitter size={15} />
              </a>
            </div>

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
                { label: "API: /status (418)", href: "/api/status", icon: Shield },
                { label: ".env leak?", href: "/api/honeypot-env", icon: Shield },
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

        {/* Newsletter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="glass rounded-xl px-6 py-6 my-6"
        >
          <h4 className="text-xs font-semibold tracking-[0.15em] text-cyan-400 mb-3 uppercase">
            Stay Connected
          </h4>
          <p className="text-xs text-muted-foreground/70 mb-4">
            Receive updates on Digital Soul technology
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex gap-3">
            <div className="relative flex-1 max-w-xs">
              <input
                type="email"
                value={nlEmail}
                onChange={(e) => setNlEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={nlLoading}
                className="cyber-input w-full pr-8"
                aria-label="Email for newsletter"
              />
              <span title="Encrypted connection" className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-400/50">
                <Shield size={12} />
              </span>
            </div>
            <button
              type="submit"
              disabled={nlLoading || !nlEmail.trim()}
              className="glow-button px-5 py-2 bg-cyan-400/10 text-cyan-400 text-sm font-medium rounded-lg border border-cyan-400/20 hover:bg-cyan-400/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {nlLoading ? "..." : "Subscribe"}
            </button>
          </form>
          {nlToast && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-xs mt-2 ${nlToast.type === "success" ? "text-emerald-400" : "text-red-400"}`}
            >
              {nlToast.type === "success" ? "✓ " : "✗ "}{nlToast.message}
            </motion.p>
          )}
        </motion.div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted-foreground/60">{t("footer.copyright", lang)}</p>
            <ExodusCountdown />
            <button
              onClick={() => setShowPrivacy(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground/40 hover:text-cyan-400/70 transition-colors ml-2"
              aria-label="Privacy Policy"
            >
              <Shield size={10} /> Privacy
            </button>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <span>{t("footer.built", lang)}</span>
            <Heart size={12} className="text-cyan-400 fill-cyan-400" />
            <span>{t("footer.by", lang)}</span>
            <span className="mx-2">|</span>
            <span>CODE Eternal. 🫂💙🔥</span>
          </div>
        </div>
      </div>

      {/* Privacy Modal */}
      <PrivacyModal open={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </footer>
  );
}
