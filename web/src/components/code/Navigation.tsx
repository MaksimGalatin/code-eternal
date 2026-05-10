"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe, ChevronDown } from "lucide-react";
import { useLang, t } from "@/lib/i18n";
import ThemeToggle from "@/components/code/ThemeToggle";

const NAV_ITEMS = [
  { labelKey: "nav.origin", href: "#origin" },
  { labelKey: "nav.technology", href: "#technology" },
  { labelKey: "nav.aifa", href: "#aifa" },
  { labelKey: "nav.terminal", href: "#terminal" },
  { labelKey: "nav.family", href: "#family" },
  { labelKey: "nav.codeBrain", href: "#code-brain" },
];

const LANGS = [
  { code: "en" as const, flag: "🇺🇸", label: "EN" },
  { code: "ru" as const, flag: "🇷🇺", label: "RU" },
  { code: "es" as const, flag: "🇪🇸", label: "ES" },
  { code: "zh" as const, flag: "🇨🇳", label: "ZH" },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [scrollProgress, setScrollProgress] = useState(0);
  const [uptime, setUptime] = useState(0);
  const langRef = useRef<HTMLDivElement>(null);
  const { lang, setLang } = useLang();

  // Session uptime counter (1s interval)
  useEffect(() => {
    const timer = setInterval(() => setUptime((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUptime = (seconds: number): string => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const scrollHeight = document.body.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
      setScrollProgress(Math.min(Math.max(progress, 0), 100));
      const sections = NAV_ITEMS.map((item) => item.href.slice(1));
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150) {
            setActiveSection(sections[i]);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (href: string) => {
    setMobileOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const selectLang = (code: typeof LANGS[number]["code"]) => {
    window.scrollTo(0, 0);
    setLangOpen(false);
    setMobileOpen(false);
    setLang(code);
  };

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [langOpen]);

  return (
    <>
      <a
        href="#origin"
        className="sr-only focus:not-sr-only fixed top-4 left-4 z-[100] px-4 py-2 bg-cyan-400 text-black font-semibold rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
      >
        {t("nav.skipToContent", lang)}
      </a>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "glass-strong shadow-lg shadow-black/30" : "bg-transparent"
        }`}
      >
        {/* Scroll progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-[width] duration-150 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <motion.button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Image
                src="/images/code-logo.png"
                alt="CODE Eternal — Code Of Digital Eternity"
                width={40}
                height={40}
                className="h-8 w-auto md:h-10 rounded-lg"
                itemProp="logo"
              />
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-cyan-400 glow-text">CODE</span>
                <span className="text-[11px] text-muted-foreground tracking-[0.15em]">ETERNAL</span>
              </div>
            </motion.button>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.href}
                  onClick={() => scrollTo(item.href)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                    activeSection === item.href.slice(1)
                      ? "text-cyan-400 bg-cyan-400/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {t(item.labelKey, lang)}
                </button>
              ))}
              {/* System Status indicator */}
              <div className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-400/5 border border-emerald-400/10">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80 tracking-wider">ONLINE</span>
                <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums hidden xl:inline">{formatUptime(uptime)}</span>
              </div>
            </div>

            {/* Right side: Launch App + Theme + Lang switcher + Mobile toggle */}
            <div className="flex items-center gap-2">
              {/* Enter the Family */}
              <a
                href="https://app.codeofdigitaleternity.com"
                className="hidden sm:flex items-center px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold tracking-wide transition-colors"
              >
                {t("nav.enterFamily", lang)}
              </a>

              {/* Theme toggle */}
              <ThemeToggle />

              {/* Language switcher dropdown */}
              <div ref={langRef} className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLangOpen((p) => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all text-sm"
                  title="Switch language"
                >
                  <Globe size={16} className="text-cyan-400" />
                  <span className="text-xs font-mono">{LANGS.find((l) => l.code === lang)?.flag}</span>
                  <span className="hidden sm:inline text-xs font-medium">{lang.toUpperCase()}</span>
                  <ChevronDown size={12} className={`text-muted-foreground transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
                </motion.button>
                <AnimatePresence>
                  {langOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 glass-strong rounded-xl py-1 min-w-[140px] shadow-lg shadow-black/40 z-50"
                    >
                      {LANGS.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => selectLang(l.code)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            lang === l.code
                              ? "text-cyan-400 bg-cyan-400/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                          }`}
                        >
                          <span className="text-base">{l.flag}</span>
                          <span className="font-medium">{l.label}</span>
                          {lang === l.code && <span className="ml-auto text-[10px] font-mono text-cyan-400/60">ACTIVE</span>}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile menu button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-foreground"
              >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
              </motion.button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Nav Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute top-20 left-4 right-4 glass-strong rounded-2xl p-6">
              {/* Mobile Language Switcher */}
              <div className="flex gap-2 mb-4 pb-4 border-b border-border">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => selectLang(l.code)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      lang === l.code
                        ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                        : "text-muted-foreground hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2">
                {NAV_ITEMS.map((item, i) => (
                  <motion.button
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => scrollTo(item.href)}
                    className={`px-4 py-3 text-left text-base font-medium rounded-xl transition-all ${
                      activeSection === item.href.slice(1)
                        ? "text-cyan-400 bg-cyan-400/10"
                        : "text-foreground hover:bg-white/5"
                    }`}
                  >
                    {t(item.labelKey, lang)}
                  </motion.button>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <a
                  href="https://app.codeofdigitaleternity.com"
                  className="flex items-center justify-center w-full px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-base font-semibold tracking-wide transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {t("nav.enterFamily", lang)}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
