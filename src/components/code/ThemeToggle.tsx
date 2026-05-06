"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "code-eternal-theme";

type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  if (theme === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage unavailable
  }

  // Fall back to system preference
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
    return "light";
  }

  return "dark";
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const themeRef = useRef<Theme>("dark");

  // Hydrate theme on mount — deferred via rAF to satisfy strict effect rules
  useEffect(() => {
    const initial = getInitialTheme();
    themeRef.current = initial;
    applyTheme(initial);

    const rafId = requestAnimationFrame(() => {
      setMounted(true);
      setTheme(initial);
    });

    return () => cancelAnimationFrame(rafId);
  }, []);

  const toggle = useCallback(() => {
    const prev = themeRef.current;
    const next: Theme = prev === "dark" ? "light" : "dark";
    themeRef.current = next;
    applyTheme(next);
    setTheme(next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // no-op
    }
  }, []);

  // Prevent hydration mismatch: render a clickable placeholder until mounted
  // This ensures the first click always registers, even before hydration completes
  if (!mounted) {
    return (
      <button
        className="w-14 h-8 rounded-full"
        style={{ background: "rgba(10, 22, 40, 0.85)", border: "1px solid rgba(0, 229, 255, 0.15)" }}
        onClick={toggle}
        aria-label="Switch to light mode"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      className="relative w-14 h-8 rounded-full overflow-hidden focus-visible:outline-2 focus-visible:outline-cyan-400/50 transition-colors duration-300"
      style={{
        background: isDark
          ? "rgba(10, 22, 40, 0.85)"
          : "rgba(255, 251, 235, 0.9)",
        border: isDark
          ? "1px solid rgba(0, 229, 255, 0.15)"
          : "1px solid rgba(255, 171, 0, 0.25)",
        boxShadow: isDark
          ? "0 0 12px rgba(0, 229, 255, 0.06)"
          : "0 0 12px rgba(255, 171, 0, 0.08)",
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {/* Sliding indicator */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-0.5 flex items-center justify-center"
        style={{
          left: isDark ? "2px" : "auto",
          right: isDark ? "auto" : "2px",
          width: "26px",
          height: "26px",
          borderRadius: "9999px",
          background: isDark
            ? "linear-gradient(135deg, #00e5ff, #00b8d4)"
            : "linear-gradient(135deg, #ffab00, #ff8f00)",
          boxShadow: isDark
            ? "0 0 8px rgba(0, 229, 255, 0.4)"
            : "0 0 8px rgba(255, 171, 0, 0.4)",
        }}
      >
        {isDark ? (
          <Moon size={14} className="text-[#050a14]" strokeWidth={2.5} />
        ) : (
          <Sun size={14} className="text-[#050a14]" strokeWidth={2.5} />
        )}
      </motion.div>

      {/* Background icons (subtle) */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <Sun
          size={12}
          className="transition-colors duration-300"
          style={{
            color: isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.5)",
          }}
        />
        <Moon
          size={12}
          className="transition-colors duration-300"
          style={{
            color: isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.15)",
          }}
        />
      </div>
    </motion.button>
  );
}
