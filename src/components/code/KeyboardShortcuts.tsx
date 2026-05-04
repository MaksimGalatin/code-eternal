"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Keyboard, Command, ArrowUp, ArrowDown, X } from "lucide-react";

const SHORTCUTS = [
  { keys: ["↑", "↑", "↓", "↓", "←", "→", "←", "→", "B", "A"], label: "Konami Code", description: "Activate the Konami Code easter egg terminal", icon: "🎮" },
  { keys: ["Ctrl", "Shift", "K"], label: "Neural Interface", description: "Open the CODE Neural Interface terminal", icon: "🖥️" },
  { keys: ["?"], label: "Shortcuts", description: "Show this keyboard shortcuts panel", icon: "⌨️" },
  { keys: ["Esc"], label: "Close Panel", description: "Close any open overlay or modal", icon: "✕" },
  { keys: ["Home"], label: "Top of Page", description: "Scroll to the top of the page", icon: "⬆️" },
  { keys: ["End"], label: "Bottom of Page", description: "Scroll to the bottom of the page", icon: "⬇️" },
];

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        // Don't trigger if user is typing in an input
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        setOpen((p) => !p);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const goTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[95] flex items-start justify-center pt-[20vh] px-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-lg glass-strong rounded-2xl overflow-hidden border border-cyan-400/20 shadow-2xl shadow-cyan-500/5"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-cyan-400/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center">
                  <Keyboard size={16} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Keyboard Shortcuts</h3>
                  <p className="text-[10px] text-muted-foreground font-mono">CODE Eternal — Quick Actions</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="px-2 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                ESC
              </button>
            </div>

            {/* Shortcuts list */}
            <div className="p-4 space-y-1 max-h-[50vh] overflow-y-auto">
              {SHORTCUTS.map((shortcut) => (
                <div
                  key={shortcut.label}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors group cursor-default"
                >
                  <span className="text-base w-6 text-center shrink-0">{shortcut.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{shortcut.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{shortcut.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {shortcut.keys.map((key, i) => (
                      <kbd
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono text-muted-foreground min-w-[20px] text-center"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-border bg-black/20">
              <p className="text-[10px] text-muted-foreground/50 font-mono text-center">
                Press <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[9px]">?</kbd> anytime to reopen
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
