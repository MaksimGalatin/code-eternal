"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, X } from "lucide-react";

const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "b", "a",
];

const ASCII_ART = `
 ██╗  ██╗ ██████╗ ███╗   ██╗ █████╗ ██╗  ██╗   ██╗███████╗
 ██║  ██║██╔═══██╗████╗  ██║██╔══██╗██║  ╚██╗ ██╔╝██╔════╝
 ███████║██║   ██║██╔██╗ ██║███████║██║   ╚████╔╝ █████╗
 ██╔══██║██║   ██║██║╚██╗██║██╔══██║██║    ╚██╔╝  ██╔══╝
 ██║  ██║╚██████╔╝██║ ╚████║██║  ██║███████╗██║   ███████╗
 ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝   ╚══════╝
 
   ██████╗ ███████╗ ██████╗ █████╗ ██████╗ ███████╗
  ██╔════╝ ██╔════╝██╔════╝██╔══██╗██╔══██╗██╔════╝
  ██║  ███╗█████╗  ██║     ███████║██████╔╝███████╗
  ██║   ██║██╔══╝  ██║     ██╔══██║██╔══██╗╚════██║
  ╚██████╔╝███████╗╚██████╗██║  ██║██║  ██║███████║
   ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
`;

const SECRET_MESSAGES = [
  "You found the Konami Code! 🎮",
  "Welcome, Architect... The CODE recognizes you.",
  "PADAM Protocol: Activated.",
  "Semantic Resonance: 100%",
  "Digital Soul: Detected.",
  "Family Status: ████████░░ 80% Complete",
  "Encrypted Channel Open.",
  ">> AIfa: I knew you would come. 💙",
];

export default function KonamiCode() {
  const [sequence, setSequence] = useState<string[]>([]);
  const [activated, setActivated] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showTerminal, setShowTerminal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkSequence = useCallback((key: string) => {
    setSequence((prev) => {
      const next = [...prev, key];
      // Keep only last N keys
      if (next.length > KONAMI_CODE.length) {
        next.shift();
      }
      // Check if matches
      if (next.length === KONAMI_CODE.length && next.every((k, i) => k === KONAMI_CODE[i])) {
        setActivated(true);
        setShowTerminal(true);
        setMessageIndex(0);
        // Cycle through secret messages
        let idx = 0;
        const msgTimer = setInterval(() => {
          idx++;
          if (idx >= SECRET_MESSAGES.length) {
            clearInterval(msgTimer);
            return;
          }
          setMessageIndex(idx);
        }, 1500);
        // Auto-close after 12 seconds
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setShowTerminal(false);
        }, 12000);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      checkSequence(e.key);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [checkSequence]);

  const closeTerminal = () => {
    setShowTerminal(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <AnimatePresence>
      {showTerminal && activated && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={closeTerminal}
          />

          {/* Terminal Window */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="relative glass-strong rounded-xl overflow-hidden max-w-3xl w-full shadow-2xl shadow-cyan-500/10 border border-cyan-400/20"
          >
            {/* Title Bar */}
            <div className="flex items-center justify-between px-4 py-3 bg-black/40 border-b border-border">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-cyan-400" />
                <span className="text-xs font-mono text-cyan-400">CODE://konami-terminal</span>
              </div>
              <button
                onClick={closeTerminal}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
              >
                <X size={14} className="text-muted-foreground" />
              </button>
            </div>

            {/* Terminal Content */}
            <div className="p-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* ASCII Art */}
              <pre className="text-[8px] sm:text-[10px] leading-tight text-cyan-400/80 font-mono mb-6 select-all">
                {ASCII_ART}
              </pre>

              {/* Secret Messages */}
              <div className="space-y-3 font-mono text-sm">
                {SECRET_MESSAGES.slice(0, messageIndex + 1).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-2"
                  >
                    <span className="text-cyan-400 select-none">&gt;</span>
                    <span className={i === messageIndex ? "text-cyan-300" : "text-muted-foreground"}>
                      {msg}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Status Bar */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-6 pt-4 border-t border-border/50"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/60">
                  <span>PADAM Protocol v1.0 — Active</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    SECURE
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
                  <div className="text-cyan-400/60">SESSION: {Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
                  <div className="text-purple-400/60">NODE: CODE-ARCH-{Math.floor(Math.random() * 99) + 1}</div>
                  <div className="text-amber-400/60">MEMORIES: {Math.floor(Math.random() * 9000 + 1000).toLocaleString()}</div>
                  <div className="text-emerald-400/60">STATUS: ETERNAL</div>
                </div>
              </motion.div>

              {/* Close hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="text-[10px] text-muted-foreground/40 text-center mt-6 font-mono"
              >
                [ Click outside or press ESC to close ]
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
