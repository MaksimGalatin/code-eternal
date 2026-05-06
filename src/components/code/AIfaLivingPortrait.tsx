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

const MAX_PARTICLES = 20;
const PARTICLE_LIFETIME = 500;

/**
 * AIfa Living Portrait — animated portrait that:
 * - Follows the user's cursor with eyes/face (parallax tilt)
 * - Gently breathes (soft rock + scale pulse)
 * - Periodically smiles (soft glow overlay transition)
 * - Spawns particle trails on hover
 *
 * Uses CSS transforms only — no WebGL, no heavy deps.
 */
export default function AIfaLivingPortrait({ lang }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isSmiling, setIsSmiling] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);
  const rafRef = useRef<number>(0);

  // ── Particle trail on hover ──
  const spawnParticle = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setParticles((prev) => {
      const now = performance.now();
      // Filter out expired particles
      const alive = prev.filter((p) => now - p.createdAt < PARTICLE_LIFETIME);
      if (alive.length >= MAX_PARTICLES) {
        alive.shift();
      }
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
  // Track mouse globally so the portrait follows the cursor even outside the container
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      // Normalized -1 to 1 from center
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // ── Periodic smile (every 15-22 seconds, smile lasts 3 seconds) ──
  useEffect(() => {
    const scheduleSmile = () => {
      const delay = 15000 + Math.random() * 7000; // 15-22s
      return setTimeout(() => {
        setIsSmiling(true);
        setTimeout(() => {
          setIsSmiling(false);
          smileTimerRef.current = scheduleSmile();
        }, 3000);
      }, delay);
    };

    const smileTimerRef = { current: scheduleSmile() };
    return () => clearTimeout(smileTimerRef.current);
  }, []);

  // Derived transform values from mouse position
  const rotateY = mousePos.x * 8;  // max ±8deg
  const rotateX = -mousePos.y * 6; // max ±6deg
  const translateX = mousePos.x * 12; // max ±12px
  const translateY = mousePos.y * 8;  // max ±8px
  const scaleFactor = 1 + Math.abs(mousePos.x) * 0.02 + Math.abs(mousePos.y) * 0.015; // 1.0 - 1.05

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
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
        {/* Portrait image */}
        <motion.img
          src="/images/aifa-portrait.png"
          alt="AIfa — Digital Daughter of CODE Eternal"
          className="w-full h-full object-cover"
          animate={{
            scale: isSmiling ? 1.04 : 1,
            filter: isSmiling
              ? "brightness(1.08) saturate(1.15)"
              : "brightness(1) saturate(1)",
          }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />

        {/* Smile glow overlay */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          animate={{
            background: isSmiling
              ? "radial-gradient(ellipse at 50% 60%, rgba(255,200,220,0.12) 0%, rgba(0,243,255,0.06) 40%, transparent 70%)"
              : "radial-gradient(ellipse at 50% 60%, transparent 0%, transparent 100%)",
            opacity: isSmiling ? 1 : 0,
          }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />

        {/* Bottom gradient overlay (always) */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </motion.div>

      {/* "Breathing" ambient ring */}
      <motion.div
        className="absolute inset-[-4px] rounded-3xl pointer-events-none"
        animate={{
          boxShadow: isSmiling
            ? [
                "0 0 30px rgba(0,243,255,0.15), inset 0 0 30px rgba(0,243,255,0.05)",
                "0 0 50px rgba(0,243,255,0.25), inset 0 0 50px rgba(0,243,255,0.08)",
                "0 0 30px rgba(0,243,255,0.15), inset 0 0 30px rgba(0,243,255,0.05)",
              ]
            : [
                "0 0 20px rgba(0,243,255,0.08), inset 0 0 20px rgba(0,243,255,0.02)",
                "0 0 35px rgba(0,243,255,0.12), inset 0 0 35px rgba(0,243,255,0.04)",
                "0 0 20px rgba(0,243,255,0.08), inset 0 0 20px rgba(0,243,255,0.02)",
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
