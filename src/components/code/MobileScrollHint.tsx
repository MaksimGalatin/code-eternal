"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const STORAGE_KEY = "code-eternal-scroll-hint-shown";
const SHOW_DELAY = 5000; // 5 seconds
const AUTO_DISMISS = 6000; // 6 seconds
const SCROLL_THRESHOLD = 200; // pixels

export default function MobileScrollHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed in a previous session
    try {
      if (localStorage.getItem(STORAGE_KEY) === "true") return;
    } catch {
      // localStorage unavailable (private browsing, etc.)
      return;
    }

    let dismissed = false;

    // Show hint after delay if user hasn't scrolled
    const showTimer = setTimeout(() => {
      if (!dismissed && window.scrollY === 0) {
        setVisible(true);
      }
    }, SHOW_DELAY);

    // Auto-dismiss after a duration
    const autoDismissTimer = setTimeout(() => {
      if (!dismissed) {
        setVisible(false);
        dismissed = true;
        try {
          localStorage.setItem(STORAGE_KEY, "true");
        } catch {
          // silent fail
        }
      }
    }, SHOW_DELAY + AUTO_DISMISS);

    // Dismiss on scroll past threshold
    const handleScroll = () => {
      if (!dismissed && window.scrollY > SCROLL_THRESHOLD) {
        setVisible(false);
        dismissed = true;
        try {
          localStorage.setItem(STORAGE_KEY, "true");
        } catch {
          // silent fail
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearTimeout(showTimer);
      clearTimeout(autoDismissTimer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{
            duration: 0.5,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] lg:hidden pointer-events-none"
        >
          <div className="flex flex-col items-center gap-2">
            {/* Pulsing down arrow */}
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-10 h-10 rounded-full glass-strong border border-cyan-400/20 flex items-center justify-center glow-cyan"
            >
              <ChevronDown
                size={20}
                className="text-cyan-400"
              />
            </motion.div>

            {/* Label */}
            <span className="text-[10px] font-mono text-muted-foreground/50 tracking-wider uppercase">
              Scroll to explore
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
