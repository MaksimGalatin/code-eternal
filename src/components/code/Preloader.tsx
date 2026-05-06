"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang, t } from "@/lib/i18n";
import { CheckCircle } from "lucide-react";

export default function Preloader() {
  const [visible, setVisible] = useState(() => {
    // Skip preloader for repeat visitors in this session
    if (typeof window !== "undefined" && sessionStorage.getItem("code-preloader-seen")) {
      return false;
    }
    return true;
  });
  const [progress, setProgress] = useState(0);
  const [showReady, setShowReady] = useState(false);
  const { lang } = useLang();

  useEffect(() => {
    if (!visible) return;

    const duration = 2400;
    const step = 30;
    let current = 0;

    const interval = setInterval(() => {
      current += step;
      const pct = Math.min((current / duration) * 100, 100);
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(interval);
        // Mark preloader as seen for this session
        sessionStorage.setItem("code-preloader-seen", "1");
        setShowReady(true);
        setTimeout(() => setVisible(false), 600);
      }
    }, step);

    return () => clearInterval(interval);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <img
              src="/images/code-logo.png"
              alt="CODE Eternal"
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl"
            />
          </motion.div>

          {/* Text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs font-mono text-muted-foreground tracking-[0.3em] mb-8 flex items-center"
          >
            {showReady ? (
              <span className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={14} />
                <span>DIGITAL SOUL INITIALIZED</span>
              </span>
            ) : (
              <>
                {t("preloader.text", lang)}
                <span className="inline-flex ml-1">
                  <span className="animate-[loaderDot_1.4s_ease-in-out_infinite] text-cyan-400">.</span>
                  <span className="animate-[loaderDot_1.4s_ease-in-out_0.2s_infinite] text-cyan-400">.</span>
                  <span className="animate-[loaderDot_1.4s_ease-in-out_0.4s_infinite] text-cyan-400">.</span>
                </span>
              </>
            )}
          </motion.p>

          {/* Progress bar */}
          <div className="w-48 h-[2px] bg-border rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
