"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const SECTIONS = [
  { id: "hero", label: "Home" },
  { id: "origin", label: "Origin" },
  { id: "technology", label: "Tech" },
  { id: "aifa", label: "AIfa" },
  { id: "terminal", label: "Chat" },
  { id: "family", label: "Family" },
  { id: "code-brain", label: "Brain" },
];

export default function SectionProgress() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show dots after 3 seconds (after preloader)
    const timer = setTimeout(() => setIsVisible(true), 3200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const el = document.getElementById(SECTIONS[i].id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.4) {
            setActiveIndex(i);
            break;
          }
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={isVisible ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="fixed right-4 top-1/2 -translate-y-1/2 z-30 hidden lg:flex flex-col items-center gap-3"
    >
      {SECTIONS.map((section, i) => {
        const isActive = i === activeIndex;
        const isPast = i < activeIndex;

        return (
          <motion.button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            whileHover={{ scale: 1.4 }}
            whileTap={{ scale: 0.9 }}
            className="group relative flex items-center"
            title={section.label}
            aria-label={`Navigate to ${section.label}`}
          >
            {/* Dot */}
            <motion.div
              animate={{
                width: isActive ? 10 : 6,
                height: isActive ? 10 : 6,
                backgroundColor: isActive
                  ? "rgb(0, 229, 255)"
                  : isPast
                    ? "rgba(0, 229, 255, 0.4)"
                    : "rgba(255, 255, 255, 0.15)",
              }}
              transition={{ duration: 0.3 }}
              className="rounded-full"
              style={{
                boxShadow: isActive ? "0 0 10px rgba(0,229,255,0.5), 0 0 20px rgba(0,229,255,0.2)" : "none",
              }}
            />
            {/* Connector line */}
            {i < SECTIONS.length - 1 && (
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 w-px"
                style={{
                  height: 10,
                  background: isPast
                    ? "linear-gradient(to bottom, rgba(0,229,255,0.3), rgba(0,229,255,0.05))"
                    : "rgba(255,255,255,0.05)",
                }}
              />
            )}
            {/* Label tooltip */}
            <motion.span
              initial={{ opacity: 0, x: 5 }}
              whileHover={{ opacity: 1, x: 0 }}
              className="absolute right-full mr-3 px-2 py-1 rounded-md glass text-[10px] font-mono text-cyan-400 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {section.label}
            </motion.span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
