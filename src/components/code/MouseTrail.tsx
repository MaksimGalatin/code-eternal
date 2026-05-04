"use client";

import { useEffect, useRef } from "react";

// ─── Particle Type ───
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  glowColor: string;
  life: number;      // remaining life in ms
  maxLife: number;    // total lifespan in ms
  opacity: number;
}

// ─── Constants ───
const COLORS: Array<{ fill: string; glow: string }> = [
  { fill: "#00e5ff", glow: "rgba(0, 229, 255, 0.6)" },   // cyan
  { fill: "#7b61ff", glow: "rgba(123, 97, 255, 0.6)" },   // purple
];

const MAX_PARTICLES = 30;
const MIN_LIFE = 600;
const MAX_LIFE = 800;
const MIN_SIZE = 2;
const MAX_SIZE = 4;
const THROTTLE_MS = 30;
const SPAWN_COUNT = 2; // particles per spawn event
const DRIFT_FORCE = 0.8;
const GRAVITY = -0.15; // negative = upward

// ─── Pure helper: spawn particles into the array ───
function spawnParticles(particles: Particle[], x: number, y: number) {
  for (let i = 0; i < SPAWN_COUNT; i++) {
    // Remove oldest if at capacity
    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }

    const colorSet = COLORS[Math.floor(Math.random() * COLORS.length)];
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * DRIFT_FORCE;
    const life = MIN_LIFE + Math.random() * (MAX_LIFE - MIN_LIFE);
    const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE);

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed + GRAVITY,
      size,
      color: colorSet.fill,
      glowColor: colorSet.glow,
      life,
      maxLife: life,
      opacity: 1,
    });
  }
}

// ─── Pure helper: resize canvas to match viewport ───
function resizeCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;

  const ctx = canvas.getContext("2d");
  if (ctx) ctx.scale(dpr, dpr);
}

export default function MouseTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Aliases for use in nested closures (TypeScript narrowing doesn't persist)
    const ctxNonNull = ctx as CanvasRenderingContext2D;
    const canvasNonNull = canvas as HTMLCanvasElement;

    // Mutable state (refs are not needed since we're inside a single effect closure)
    const particles: Particle[] = [];
    let animFrameId = 0;
    let lastMouseTime = 0;
    let lastTimestamp = 0;

    // ─── Resize ───
    resizeCanvas(canvas);

    // ─── Animation loop ───
    function animate(timestamp: number) {
      // Delta time in ms (capped to avoid huge jumps on tab switch)
      if (!lastTimestamp) lastTimestamp = timestamp;
      const dt = Math.min(timestamp - lastTimestamp, 50);
      lastTimestamp = timestamp;

      // Clear canvas
      ctxNonNull.clearRect(0, 0, canvasNonNull.width, canvasNonNull.height);

      // Update & draw particles (iterate backwards for safe removal)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Decrease life
        p.life -= dt;

        // Remove dead particles
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Opacity based on remaining life ratio
        const lifeRatio = p.life / p.maxLife;
        p.opacity = lifeRatio;

        // Apply velocity scaled by delta time
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);

        // Slight deceleration (friction)
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Draw outer glow layer
        ctxNonNull.save();
        ctxNonNull.globalAlpha = p.opacity * 0.5;
        ctxNonNull.shadowColor = p.glowColor;
        ctxNonNull.shadowBlur = 12;
        ctxNonNull.beginPath();
        ctxNonNull.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
        ctxNonNull.fillStyle = p.glowColor;
        ctxNonNull.fill();
        ctxNonNull.restore();

        // Draw core particle
        ctxNonNull.save();
        ctxNonNull.globalAlpha = p.opacity;
        ctxNonNull.beginPath();
        ctxNonNull.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctxNonNull.fillStyle = p.color;
        ctxNonNull.fill();
        ctxNonNull.restore();
      }

      // Schedule next frame
      animFrameId = requestAnimationFrame(animate);
    }

    // ─── Throttled mousemove ───
    function onMouseMove(e: MouseEvent) {
      const now = Date.now();
      // Throttle spawning to ~THROTTLE_MS intervals
      if (now - lastMouseTime < THROTTLE_MS) return;
      lastMouseTime = now;
      spawnParticles(particles, e.clientX, e.clientY);
    }

    function onResize() {
      resizeCanvas(canvasNonNull);
    }

    // ─── Start ───
    animFrameId = requestAnimationFrame(animate);
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    // ─── Cleanup ───
    return () => {
      cancelAnimationFrame(animFrameId);
      document.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      particles.length = 0;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9998 }}
    />
  );
}
