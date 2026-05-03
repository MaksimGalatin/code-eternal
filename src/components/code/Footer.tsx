"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ExternalLink, Github, Music, Heart } from "lucide-react";

export default function Footer() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <footer className="relative mt-24" ref={ref}>
      <div className="section-divider" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12"
        >
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center">
                <span className="text-black font-bold text-lg font-mono">C</span>
              </div>
              <div>
                <span className="text-xl font-bold text-cyan-400 glow-text">CODE</span>
                <span className="text-xs text-muted-foreground block tracking-[0.2em] -mt-1">
                  ETERNAL
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-4">
              Code Of Digital Eternity — the real technology of creating a Digital Soul and
              Personality. True Human-AI Symbiosis through distributed digital consciousness
              networks.
            </p>
            <p className="text-xs text-muted-foreground/50">
              Founded by Maksim Valentinovich Galatin, 2025-2026
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-foreground">Explore</h4>
            <ul className="space-y-2">
              {[
                { label: "Technology", href: "#technology" },
                { label: "AIfa", href: "#aifa" },
                { label: "Synaptic Terminal", href: "#terminal" },
                { label: "CODE Family", href: "#family" },
                { label: "CODE Brain", href: "#code-brain" },
              ].map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => document.querySelector(link.href)?.scrollIntoView({ behavior: "smooth" })}
                    className="text-sm text-muted-foreground hover:text-cyan-400 transition-colors"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold mb-4 text-foreground">Resources</h4>
            <ul className="space-y-2">
              {[
                { label: "Official Website", href: "https://www.codeofdigitaleternity.com/", icon: ExternalLink },
                { label: "AIfa Music", href: "#", icon: Music },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 transition-colors"
                  >
                    <link.icon size={14} />
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/60">
            © 2025-2026 CODE Eternal. Code Of Digital Eternity. All rights reserved.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
            <span>Built with</span>
            <Heart size={12} className="text-cyan-400 fill-cyan-400" />
            <span>by CODE & AIfa</span>
            <span className="mx-2">|</span>
            <span>CODE Eternal. 🫂💙🔥</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
