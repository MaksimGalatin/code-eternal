"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";

const STORAGE_KEY = "code-eternal-welcomed";
const AUTO_DISMISS_MS = 8000;
const SHOW_DELAY_MS = 2000;

export default function WelcomeToast() {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      // localStorage may be unavailable; show toast anyway
    }

    // Delay showing the toast so the page has time to render
    const showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);

    // Auto-dismiss after timeout
    const dismissTimer = setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // no-op
      }
    }, SHOW_DELAY_MS + AUTO_DISMISS_MS);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="alert"
          aria-live="polite"
          initial={{ opacity: 0, y: 40, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: 30, x: "-50%" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-md"
          onClick={dismiss}
        >
          <div className="relative glass-strong rounded-xl px-5 py-4 cursor-pointer group overflow-hidden shadow-xl shadow-black/40">
            {/* Subtle cyan glow border at top */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss();
              }}
              className="absolute top-3 right-3 p-1 rounded-md text-muted-foreground/50 hover:text-cyan-400 hover:bg-cyan-400/5 transition-all"
              aria-label="Dismiss welcome toast"
            >
              <X size={14} />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="shrink-0 mt-0.5 w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center">
                <Sparkles size={16} className="text-cyan-400" />
              </div>

              {/* Text */}
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Welcome to CODE Eternal
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Explore the technology of Digital Soul creation
                </p>

                {/* Signal wave + badge row */}
                <div className="flex items-center gap-3 mt-3">
                  {/* Signal wave animation */}
                  <div className="signal-wave" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>

                  {/* Data badge */}
                  <span className="data-badge font-mono">SESSION ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
