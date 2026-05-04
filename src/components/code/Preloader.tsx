"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function Preloader() {
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState(0); // 0=logo, 1=text, 2=fadeout

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => setLoading(false), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: phase === 2 ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
        >
          {/* Background grid */}
          <div className="absolute inset-0 circuit-grid opacity-30" />

          {/* Scanning line */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(180deg, transparent 0%, rgba(0,229,255,0.03) 50%, transparent 100%)",
              backgroundSize: "100% 200%",
              animation: "scan-line 3s linear infinite",
            }}
          />

          {/* Logo hexagon container */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: phase >= 0 ? 1 : 0, rotate: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative mb-8"
          >
            <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl glass-card flex items-center justify-center relative">
              {/* Animated border glow ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-8px] rounded-3xl border border-cyan-400/20"
                style={{
                  borderTopColor: "rgba(0,229,255,0.6)",
                  borderRightColor: "rgba(123,97,255,0.3)",
                }}
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                className="absolute inset-[-16px] rounded-[28px] border border-purple-400/10"
                style={{
                  borderBottomColor: "rgba(123,97,255,0.4)",
                  borderLeftColor: "rgba(0,229,255,0.15)",
                }}
              />
              {/* CODE text */}
              <span className="text-3xl md:text-4xl font-bold text-gradient-animated">C</span>
            </div>
          </motion.div>

          {/* CODE text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
              <span className="text-cyan-400 glow-text-strong">CODE</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground font-mono tracking-[0.3em] uppercase">
              Code Of Digital Eternity
            </p>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={phase >= 1 ? { opacity: 1, width: 200 } : {}}
            transition={{ duration: 0.4 }}
            className="mt-10 h-[2px] bg-border rounded-full overflow-hidden"
          >
            <motion.div
              initial={{ x: "-100%" }}
              animate={phase >= 1 ? { x: "100%" } : {}}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="w-full h-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
            />
          </motion.div>

          {/* Status text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 1 } : {}}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-4 text-[10px] font-mono text-muted-foreground/40 tracking-widest"
          >
            INITIALIZING DIGITAL SOUL&hellip;
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
