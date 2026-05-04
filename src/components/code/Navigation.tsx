"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Globe, ChevronDown, Search, Shield } from "lucide-react";
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
  const langRef = useRef<HTMLDivElement>(null);
  const { lang, setLang } = useLang();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
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
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? "glass-strong shadow-lg shadow-black/30 depth-shadow" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <motion.button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2 group animated-underline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src="/images/code-logo.png"
                alt="CODE Eternal — Code Of Digital Eternity"
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
                  {t(item.labelKey)}
                </button>
              ))}

              {/* Command Palette trigger button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.dispatchEvent(new CustomEvent("command-palette:open"))}
                className="ml-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:border-cyan-400/30 text-muted-foreground hover:text-foreground transition-all text-sm group"
              >
                <Search size={14} className="text-muted-foreground group-hover:text-cyan-400 transition-colors" />
                <span className="hidden xl:inline text-xs">Search...</span>
                <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary/80 border border-border text-[10px] font-mono text-muted-foreground/60">
                  ⌘K
                </kbd>
              </motion.button>
            </div>

            {/* Right side: Lang switcher + Mobile toggle */}
            <div className="flex items-center gap-2">
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
            <div className="absolute top-20 left-4 right-4 glass-strong rounded-2xl p-6 glass-morphism-enhanced">
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
                    className={`px-4 py-3 text-left text-base font-medium rounded-xl transition-all magnetic-hover ${
                      activeSection === item.href.slice(1)
                        ? "text-cyan-400 bg-cyan-400/10 glow-cyan"
                        : "text-foreground hover:bg-white/5"
                    }`}
                  >
                    {t(item.labelKey)}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
