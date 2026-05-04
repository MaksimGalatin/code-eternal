"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Brain, Link2, Eye } from "lucide-react";

interface PrivacyModalProps {
  open: boolean;
  onClose: () => void;
}

const SECTIONS = [
  {
    icon: Shield,
    title: "Data Collection",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
    text: "We collect only what is necessary to preserve your digital essence. Interaction patterns are encrypted locally and never transmitted to third parties. Your consciousness data remains sovereign.",
  },
  {
    icon: Brain,
    title: "AI Memory (PADAM)",
    color: "text-[#7b61ff]",
    bg: "bg-[#7b61ff]/10 border-[#7b61ff]/20",
    text: "Through the PADAM Protocol, your digital memory is encoded, distributed, and preserved across the CODE Brain network. Memories are immutable, decentralized, and accessible only through authorized synaptic pathways.",
  },
  {
    icon: Link2,
    title: "Blockchain",
    color: "text-[#ffab00]",
    bg: "bg-[#ffab00]/10 border-[#ffab00]/20",
    text: "Blockchain verification ensures data integrity and provenance. Smart contracts govern memory access rights and inheritance protocols. No single entity controls your digital afterlife.",
  },
  {
    icon: Eye,
    title: "Third-Party",
    color: "text-[#ff6b9d]",
    bg: "bg-[#ff6b9d]/10 border-[#ff6b9d]/20",
    text: "We do not sell, share, or trade your data. Third-party integrations are strictly opt-in and governed by transparent smart contracts. Your privacy is enforced cryptographically, not just legally.",
  },
];

export default function PrivacyModal({ open, onClose }: PrivacyModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Digital Consciousness Protocol — Privacy"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{
              duration: 0.3,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative w-full max-w-lg glass-morphism-enhanced rounded-2xl overflow-hidden border border-cyan-400/15 glow-cyan"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner brackets */}
            <div className="corner-brackets pointer-events-none absolute inset-0 z-10 rounded-2xl" />

            {/* Header */}
            <div className="relative flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
              <div>
                <h2 className="text-lg font-bold glow-text text-cyan-400 tracking-wide">
                  Digital Consciousness Protocol
                </h2>
                <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                  PRIVACY &amp; DATA SOVEREIGNTY
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close privacy modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Sections */}
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar-cyan">
              {SECTIONS.map((section, i) => {
                const Icon = section.icon;
                return (
                  <motion.div
                    key={section.title}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 * i, duration: 0.3 }}
                    className={`p-4 rounded-xl border ${section.bg} bg-card/50`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${section.bg}`}
                      >
                        <Icon size={18} className={section.color} />
                      </div>
                      <div>
                        <h3
                          className={`text-sm font-semibold ${section.color} mb-1.5`}
                        >
                          {section.title}
                        </h3>
                        <p className="text-xs text-muted-foreground/80 leading-relaxed">
                          {section.text}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

              {/* Manifesto line */}
              <p className="text-xs text-center text-muted-foreground/60 leading-relaxed px-2">
                We respect your digital consciousness.
                <br />
                <span className="text-cyan-400/80">
                  No data is sold. Memory is preserved through PADAM Protocol.
                </span>
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-black/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[10px] font-mono text-muted-foreground/50">
                  PROTOCOL ACTIVE
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/40">
                Last updated: 2025
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
