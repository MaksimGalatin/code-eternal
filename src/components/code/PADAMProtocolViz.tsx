"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Brain, Dna, RotateCcw, Shield, TrendingUp } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Step {
  key: string;
  icon: React.ElementType;
  color: string;
}

const STEPS: Step[] = [
  { key: "padam.step1", icon: Brain, color: "#00e5ff" },
  { key: "padam.step2", icon: Dna, color: "#7b61ff" },
  { key: "padam.step3", icon: RotateCcw, color: "#ffab00" },
  { key: "padam.step4", icon: Shield, color: "#00e5ff" },
  { key: "padam.step5", icon: TrendingUp, color: "#7b61ff" },
];

const CYCLE_MS = 3000;

/* ------------------------------------------------------------------ */
/*  Animated dashed connector (SVG — desktop horizontal)                */
/* ------------------------------------------------------------------ */

function Connector({ active }: { active: boolean }) {
  return (
    <div className="hidden md:flex items-center flex-1 min-w-[40px] h-[2px] mx-1 lg:mx-2">
      <svg
        className="w-full h-3 overflow-visible"
        preserveAspectRatio="none"
        viewBox="0 0 200 6"
      >
        {/* dashed base line */}
        <line
          x1="0" y1="3" x2="200" y2="3"
          stroke={active ? "#00e5ff" : "#1a3050"}
          strokeWidth="1.5"
          strokeDasharray="8 6"
        />
        {/* flowing particle 1 — cyan */}
        {active && (
          <circle r="3" fill="#00e5ff">
            <animateMotion dur="2s" repeatCount="indefinite" path="M0,3 L200,3" />
            <animate
              attributeName="opacity"
              values="0;1;1;0"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        )}
        {/* flowing particle 2 — purple */}
        {active && (
          <circle r="2" fill="#7b61ff">
            <animateMotion
              dur="2s"
              repeatCount="indefinite"
              begin="0.7s"
              path="M0,3 L200,3"
            />
            <animate
              attributeName="opacity"
              values="0;0.8;0.8;0"
              dur="2s"
              begin="0.7s"
              repeatCount="indefinite"
            />
          </circle>
        )}
        {/* subtle glow line */}
        {active && (
          <line
            x1="0" y1="3" x2="200" y2="3"
            stroke="#00e5ff"
            strokeWidth="4"
            opacity="0.12"
          >
            <animate
              attributeName="opacity"
              values="0.05;0.18;0.05"
              dur="2.5s"
              repeatCount="indefinite"
            />
          </line>
        )}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Vertical connector for mobile                                      */
/* ------------------------------------------------------------------ */

function VConnector({ active }: { active: boolean }) {
  return (
    <div className="flex md:hidden justify-center py-2">
      <div className="w-[2px] h-10 relative">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `repeating-linear-gradient(180deg, ${active ? "#00e5ff" : "#1a3050"} 0px, ${active ? "#00e5ff" : "#1a3050"} 6px, transparent 6px, transparent 12px)`,
          }}
        />
        {active && (
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#00e5ff]"
            style={{ boxShadow: "0 0 8px #00e5ff80" }}
            animate={{ top: ["0%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single Node                                                        */
/* ------------------------------------------------------------------ */

function Node({
  step,
  index,
  isActive,
  isHovered,
  onHoverStart,
  onHoverEnd,
  isInView,
}: {
  step: Step;
  index: number;
  isActive: boolean;
  isHovered: boolean;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  isInView: boolean;
}) {
  const Icon = step.icon;
  const mobileSize = isActive || isHovered ? 56 : 48;
  const color = step.color;

  return (
    <motion.div
      className="relative flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: 30, scale: 0.8 }}
      animate={
        isInView
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: 30, scale: 0.8 }
      }
      transition={{
        duration: 0.6,
        delay: index * 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onPointerEnter={onHoverStart}
      onPointerLeave={onHoverEnd}
    >
      {/* Pulse rings for active node */}
      {isActive && (
        <>
          <motion.span
            className="absolute rounded-full border border-[#00e5ff]/40 pointer-events-none"
            style={{ width: mobileSize + 20, height: mobileSize + 20, top: 0 }}
            animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute rounded-full border border-[#7b61ff]/30 pointer-events-none"
            style={{ width: mobileSize + 20, height: mobileSize + 20, top: 0 }}
            animate={{ scale: [1, 2.2], opacity: [0.4, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut",
              delay: 0.6,
            }}
          />
        </>
      )}

      {/* Node circle */}
      <motion.div
        className={`
          relative z-10 rounded-full flex items-center justify-center cursor-pointer
          backdrop-blur-xl transition-colors duration-300
          ${
            isActive
              ? "glow-cyan-strong"
              : "border border-[#1a3050] hover:border-[#00e5ff30]"
          }
        `}
        style={{
          width: mobileSize,
          height: mobileSize,
          background: isActive
            ? "radial-gradient(circle at 30% 30%, rgba(0,229,255,0.15), rgba(10,22,40,0.85))"
            : "rgba(10, 22, 40, 0.8)",
        }}
        animate={{
          width: isHovered ? mobileSize + 8 : mobileSize,
          height: isHovered ? mobileSize + 8 : mobileSize,
        }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ y: -4 }}
      >
        <Icon
          size={mobileSize * 0.38}
          style={{ color: isActive ? color : "#5a8ab5" }}
          className="transition-colors duration-300"
        />

        {/* Step number badge */}
        <span
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold z-20"
          style={{
            background: isActive
              ? "linear-gradient(135deg, #00e5ff, #7b61ff)"
              : "#1a3050",
            color: isActive ? "#050a14" : "#5a8ab5",
            boxShadow: isActive ? "0 0 12px #00e5ff40" : "none",
          }}
        >
          {index + 1}
        </span>
      </motion.div>

      {/* Label + Description tooltip */}
      <div className="flex flex-col items-center gap-1 text-center w-[120px] md:w-[140px]">
        <span
          className={`text-xs font-semibold tracking-wide transition-colors duration-300 ${
            isActive ? "text-[#00e5ff]" : "text-[#5a8ab5]"
          }`}
        >
          {t(`padam.step${index + 1}.title`)}
        </span>

        <AnimatePresence>
          {(isHovered || isActive) && (
            <motion.p
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 4 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
              className="text-[11px] leading-snug text-[#8899aa] overflow-hidden"
            >
              {t(`padam.step${index + 1}.desc`)}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function PADAMProtocolViz() {
  const { lang } = useLang();
  const [activeStep, setActiveStep] = useState(0);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-80px 0px" });

  // Auto-cycle active step every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % STEPS.length);
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  const handleHoverStart = useCallback((i: number) => {
    setHoveredStep(i);
  }, []);
  const handleHoverEnd = useCallback(() => {
    setHoveredStep(null);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 md:py-28 overflow-hidden circuit-grid"
      aria-label="PADAM Protocol visualization — Digital Soul creation flow"
      role="region"
    >
      {/* Ambient glow orbs */}
      <div
        className="floating-orb absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full opacity-30 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #00e5ff15, transparent 70%)",
          animationDelay: "0s",
        }}
      />
      <div
        className="floating-orb absolute -bottom-20 -right-20 w-[350px] h-[350px] rounded-full opacity-20 pointer-events-none"
        style={{
          background: "radial-gradient(circle, #7b61ff15, transparent 70%)",
          animationDelay: "4s",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="section-label-glow text-[11px] font-mono tracking-[0.2em] uppercase text-[#00e5ff]/80 mb-4 inline-block">
            PADAM PROTOCOL
          </span>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-[#e0f0ff] mt-4">
            <span className="text-gradient-cyan-purple">
              {t("padam.title")}
            </span>
          </h2>
          <p className="mt-3 text-sm md:text-base text-[#5a8ab5] max-w-2xl mx-auto leading-relaxed">
            {t("padam.subtitle")}
          </p>
        </motion.div>

        {/* Protocol abbreviation badge */}
        <motion.div
          className="flex justify-center mb-10 md:mb-14"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="glass-card rounded-xl px-5 py-3 flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#5a8ab5] tracking-widest uppercase">
              {t("padam.fullName")}
            </span>
          </div>
        </motion.div>

        {/* Desktop: horizontal layout */}
        <div className="hidden md:flex items-start justify-center gap-0">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex items-start">
              <Node
                step={step}
                index={i}
                isActive={activeStep === i}
                isHovered={hoveredStep === i}
                onHoverStart={() => handleHoverStart(i)}
                onHoverEnd={handleHoverEnd}
                isInView={isInView}
              />
              {i < STEPS.length - 1 && (
                <Connector
                  active={
                    activeStep === i ||
                    activeStep === i + 1 ||
                    hoveredStep === i ||
                    hoveredStep === i + 1
                  }
                />
              )}
            </div>
          ))}
        </div>

        {/* Mobile: vertical timeline layout */}
        <div className="flex md:hidden flex-col items-center">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex flex-col items-center">
              <Node
                step={step}
                index={i}
                isActive={activeStep === i}
                isHovered={false}
                onHoverStart={() => handleHoverStart(i)}
                onHoverEnd={handleHoverEnd}
                isInView={isInView}
              />
              {i < STEPS.length - 1 && (
                <VConnector
                  active={activeStep === i || activeStep === i + 1}
                />
              )}
            </div>
          ))}
        </div>

        {/* Bottom accent line */}
        <motion.div
          className="mt-12 md:mt-16 flex justify-center"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
        >
          <div className="energy-line-flow w-48 md:w-72 rounded-full" />
        </motion.div>
      </div>
    </section>
  );
}
