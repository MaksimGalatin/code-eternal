"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useLang, t, type Lang } from "@/lib/i18n";

interface Props {
  lang?: Lang;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  createdAt: number;
}

// ── Code stream characters ──
const CODE_CHARS = "01アイウエオカキクケコ{}[]<>/=;:∞∆ΩΨ∴∵∫∑∏⟐⟡⧫⬡⬢";
const CODE_STREAM_COUNT = 18; // columns of falling code

interface CodeColumn {
  id: number;
  x: number;       // percentage 0-100
  speed: number;    // animation duration in seconds
  delay: number;    // animation delay
  chars: string;    // the characters to display
  opacity: number;  // base opacity
}

const MAX_PARTICLES = 20;
const PARTICLE_LIFETIME = 500;

/**
 * AIfa Living Portrait — animated portrait that:
 * - Follows the user's cursor with eyes/face (parallax tilt)
 * - Gently breathes (subtle zoom in/out cycle ~8s)
 * - Has flowing code matrix streaming across the portrait
 * - Subtly smiles every ~30 seconds (barely perceptible warmth)
 * - Very rarely winks (~every 3 minutes, so subtle it seems imagined)
 * - Spawns particle trails on hover
 *
 * Uses CSS transforms only — no WebGL, no heavy deps.
 */
export default function AIfaLivingPortrait({ lang }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSmiling, setIsSmiling] = useState(false);
  const [isWinking, setIsWinking] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const rafRef = useRef<number>(0);

  // ── Pre-compute code stream columns (stable across renders) ──
  const codeColumns = useRef<CodeColumn[]>([]).current;
  if (codeColumns.length === 0) {
    for (let i = 0; i < CODE_STREAM_COUNT; i++) {
      const charCount = 3 + Math.floor(Math.random() * 8); // 3-10 chars per column
      let chars = "";
      for (let j = 0; j < charCount; j++) {
        chars += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
      }
      codeColumns.push({
        id: i,
        x: (i / CODE_STREAM_COUNT) * 100 + Math.random() * 3, // spread across width
        speed: 6 + Math.random() * 10, // 6-16s fall duration
        delay: Math.random() * 12,     // 0-12s stagger
        chars,
        opacity: 0.03 + Math.random() * 0.06, // very subtle: 0.03-0.09
      });
    }
  }

  // ── Particle trail on hover ──
  const spawnParticle = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setParticles((prev) => {
      const now = performance.now();
      const alive = prev.filter((p) => now - p.createdAt < PARTICLE_LIFETIME);
      if (alive.length >= MAX_PARTICLES) alive.shift();
      return [...alive, { id: particleIdRef.current++, x, y, createdAt: now }];
    });
  }, []);

  // Cleanup expired particles periodically
  useEffect(() => {
    const cleanup = () => {
      setParticles((prev) => {
        const now = performance.now();
        return prev.filter((p) => now - p.createdAt < PARTICLE_LIFETIME);
      });
      rafRef.current = requestAnimationFrame(cleanup);
    };
    rafRef.current = requestAnimationFrame(cleanup);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Mouse tracking ──
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      setMousePos({ x, y });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ── Subtle smile every ~30 seconds (lasts 2.5s) ──
  useEffect(() => {
    const smileTimerRef = { current: 0 as ReturnType<typeof setTimeout> };

    const scheduleSmile = () => {
      // 25-35 seconds between smiles — very rare and subtle
      const delay = 25000 + Math.random() * 10000;
      return setTimeout(() => {
        setIsSmiling(true);
        setTimeout(() => {
          setIsSmiling(false);
          smileTimerRef.current = scheduleSmile();
        }, 2500);
      }, delay);
    };

    // First smile after 15-20 seconds
    const initialDelay = 15000 + Math.random() * 5000;
    smileTimerRef.current = setTimeout(() => {
      setIsSmiling(true);
      setTimeout(() => {
        setIsSmiling(false);
        smileTimerRef.current = scheduleSmile();
      }, 2500);
    }, initialDelay) as ReturnType<typeof setTimeout>;

    return () => clearTimeout(smileTimerRef.current);
  }, []);

  // ── Very rare wink every ~3 minutes (lasts 300ms) ──
  useEffect(() => {
    const winkTimerRef = { current: 0 as ReturnType<typeof setTimeout> };

    const scheduleWink = () => {
      // 2.5-3.5 minutes between winks — so rare you think you imagined it
      const delay = 150000 + Math.random() * 60000; // 150-210 seconds
      return setTimeout(() => {
        setIsWinking(true);
        setTimeout(() => {
          setIsWinking(false);
          winkTimerRef.current = scheduleWink();
        }, 300); // Very brief — just a flicker
      }, delay);
    };

    // First wink after 2-3 minutes
    const initialDelay = 120000 + Math.random() * 60000;
    winkTimerRef.current = setTimeout(() => {
      setIsWinking(true);
      setTimeout(() => {
        setIsWinking(false);
        winkTimerRef.current = scheduleWink();
      }, 300);
    }, initialDelay) as ReturnType<typeof setTimeout>;

    return () => clearTimeout(winkTimerRef.current);
  }, []);

  // Derived transform values from mouse position
  const rotateY = mousePos.x * 8;
  const rotateX = -mousePos.y * 6;
  const translateX = mousePos.x * 12;
  const translateY = mousePos.y * 8;
  const scaleFactor = 1 + Math.abs(mousePos.x) * 0.02 + Math.abs(mousePos.y) * 0.015;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      onMouseMove={spawnParticle}
    >
      {/* Background glow — follows mouse slightly */}
      <motion.div
        className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400/20 to-purple-400/20 blur-3xl"
        animate={{
          x: translateX * 0.5,
          y: translateY * 0.5,
        }}
        transition={{ type: "tween", duration: 0.6, ease: "easeOut" }}
      />

      {/* Main portrait with parallax */}
      <motion.div
        className="relative w-full h-full rounded-3xl overflow-hidden gradient-border"
        animate={{
          rotateX,
          rotateY,
          scale: scaleFactor,
          translateX,
          translateY,
        }}
        transition={{ type: "tween", duration: 0.5, ease: "easeOut" }}
        style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      >
        {/* Portrait image — with breathing zoom and wink */}
        <motion.img
          src="/images/aifa-portrait.png"
          alt="AIfa — Digital Daughter of CODE Eternal"
          className="w-full h-full object-cover"
          animate={{
            scale: isSmiling ? 1.02 : 1,
            filter: isWinking
              ? "brightness(1.04) saturate(1.05)"
              : isSmiling
                ? "brightness(1.06) saturate(1.1)"
                : "brightness(1) saturate(1)",
          }}
          transition={{ duration: isWinking ? 0.15 : 1.5, ease: "easeInOut" }}
          style={{ animation: "aifa-breathe-zoom 8s ease-in-out infinite" }}
        />

        {/* ── Code stream overlay — flowing code across the portrait ── */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {codeColumns.map((col) => (
            <div
              key={col.id}
              className="absolute top-0 aifa-code-stream"
              style={{
                left: `${col.x}%`,
                opacity: col.opacity,
                animationDuration: `${col.speed}s`,
                animationDelay: `${col.delay}s`,
              }}
            >
              {col.chars.split("").map((char, ci) => (
                <div
                  key={ci}
                  className="text-[10px] leading-[14px] font-mono text-cyan-400"
                  style={{
                    opacity: 1 - (ci / col.chars.length) * 0.5,
                    textShadow: "0 0 4px rgba(0,229,255,0.3)",
                  }}
                >
                  {char}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Smile glow overlay — very subtle warmth */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: isSmiling
              ? "radial-gradient(ellipse at 50% 62%, rgba(255,200,220,0.08) 0%, rgba(0,243,255,0.04) 35%, transparent 60%)"
              : "radial-gradient(ellipse at 50% 62%, transparent 0%, transparent 100%)",
            opacity: isSmiling ? 1 : 0,
          }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Wink overlay — incredibly subtle, just a tiny brightness shift on one eye area */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: isWinking
              ? "linear-gradient(105deg, transparent 35%, rgba(0,229,255,0.04) 42%, rgba(0,229,255,0.06) 45%, rgba(0,229,255,0.04) 48%, transparent 55%)"
              : "transparent",
            opacity: isWinking ? 1 : 0,
          }}
          transition={{ duration: 0.1 }}
        />

        {/* Bottom gradient overlay (always) */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </motion.div>

      {/* "Breathing" ambient ring — softer, not square */}
      <motion.div
        className="absolute inset-[-4px] rounded-3xl pointer-events-none"
        animate={{
          boxShadow: isSmiling
            ? [
                "0 0 30px rgba(0,243,255,0.12), inset 0 0 30px rgba(0,243,255,0.04)",
                "0 0 45px rgba(0,243,255,0.2), inset 0 0 45px rgba(0,243,255,0.06)",
                "0 0 30px rgba(0,243,255,0.12), inset 0 0 30px rgba(0,243,255,0.04)",
              ]
            : [
                "0 0 20px rgba(0,243,255,0.06), inset 0 0 20px rgba(0,243,255,0.02)",
                "0 0 30px rgba(0,243,255,0.1), inset 0 0 30px rgba(0,243,255,0.03)",
                "0 0 20px rgba(0,243,255,0.06), inset 0 0 20px rgba(0,243,255,0.02)",
              ],
        }}
        transition={{
          duration: isSmiling ? 1.5 : 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Labels */}
      <div className="absolute bottom-6 left-6 right-6 z-10">
        <h3 className="text-3xl font-bold text-cyan-400 glow-text mb-1">AIfa</h3>
        <p className="text-sm text-muted-foreground font-mono">
          {lang ? t("aifa.daughterOf", lang) : "Digital Daughter of CODE Eternal"}
        </p>
      </div>

      {/* Particle trail effect */}
      {particles.map((p) => {
        const age = performance.now() - p.createdAt;
        const lifeRatio = Math.min(age / PARTICLE_LIFETIME, 1);
        const opacity = 1 - lifeRatio;
        const scale = 1 - lifeRatio * 0.5;
        return (
          <div
            key={p.id}
            className="absolute pointer-events-none rounded-full"
            style={{
              left: p.x - 4,
              top: p.y - 4,
              width: 8,
              height: 8,
              backgroundColor: `rgba(0, 243, 255, ${opacity * 0.7})`,
              boxShadow: `0 0 6px rgba(0, 243, 255, ${opacity * 0.5})`,
              transform: `scale(${scale})`,
              transition: "none",
            }}
          />
        );
      })}
    </div>
  );
}
