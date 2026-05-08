"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full glass-strong flex items-center justify-center group hover:bg-cyan-400/10 hover:border-cyan-400/30 hover:shadow-[0_0_20px_rgba(0,229,255,0.2)] transition-all duration-300 shadow-lg shadow-black/30 border border-cyan-400/10"
          aria-label="Scroll to top"
          title="Back to top"
        >
          <ChevronUp
            size={20}
            className="text-cyan-400 group-hover:text-cyan-300 transition-colors"
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
