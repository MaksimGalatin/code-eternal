"use client";

import { useEffect, useRef } from "react";

/** Character pool: binary digits, katakana, and latin letters */
const CHARACTER_POOL = "01アイウエオカキクケコサシスセソタチツテトABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Minimum and maximum number of columns */
const MIN_COLUMNS = 20;
const MAX_COLUMNS = 30;

/** Minimum opacity for fading characters */
const MIN_OPACITY = 0.03;
/** Maximum opacity for the leading character (head of column) */
const MAX_OPACITY = 0.15;

/** How often each column cycles its head character (ms) */
const CHAR_CYCLE_MIN = 60;
const CHAR_CYCLE_MAX = 220;

/** Fall speed range (pixels per frame) */
const SPEED_MIN = 0.6;
const SPEED_MAX = 2.2;

/** Number of trail characters behind the head */
const TRAIL_LENGTH = 18;

/** Throttle: only update column positions every N frames */
const FRAME_THROTTLE = 2;

interface Column {
  /** Horizontal pixel position */
  x: number;
  /** Current vertical position of the head character */
  y: number;
  /** Fall speed in pixels per frame */
  speed: number;
  /** Current character index in the pool */
  charIndex: number;
  /** Timestamp of last character cycle */
  lastCycleTime: number;
  /** Interval between character cycles (ms) */
  cycleInterval: number;
  /** Trail positions (older positions for fading) */
  trail: Array<{ y: number; char: string; opacity: number }>;
}

function createColumn(canvasWidth: number, columnWidth: number, index: number): Column {
  return {
    x: index * columnWidth + columnWidth / 2,
    y: -(Math.random() * 300 + 50),
    speed: SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN),
    charIndex: Math.floor(Math.random() * CHARACTER_POOL.length),
    lastCycleTime: 0,
    cycleInterval: CHAR_CYCLE_MIN + Math.random() * (CHAR_CYCLE_MAX - CHAR_CYCLE_MIN),
    trail: [],
  };
}

function pickRandomChar(): string {
  return CHARACTER_POOL[Math.floor(Math.random() * CHARACTER_POOL.length)];
}

export default function CodeRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const animationIdRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    /** Resize canvas to match parent container dimensions */
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Recreate columns based on new width
      const colCount = Math.min(
        MAX_COLUMNS,
        Math.max(MIN_COLUMNS, Math.floor(width / 30))
      );
      const colWidth = width / colCount;

      columnsRef.current = Array.from({ length: colCount }, (_, i) =>
        createColumn(width, colWidth, i)
      );
    };

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas.parentElement!);
    resize();

    /** Main animation loop */
    const animate = (timestamp: number) => {
      frameCountRef.current++;
      lastTimeRef.current = timestamp;

      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      const columns = columnsRef.current;

      // Throttle position updates for performance
      const shouldUpdatePositions = frameCountRef.current % FRAME_THROTTLE === 0;

      for (let c = 0; c < columns.length; c++) {
        const col = columns[c];

        // Cycle the head character at random intervals
        if (timestamp - col.lastCycleTime > col.cycleInterval) {
          col.charIndex = Math.floor(Math.random() * CHARACTER_POOL.length);
          col.lastCycleTime = timestamp;
          col.cycleInterval = CHAR_CYCLE_MIN + Math.random() * (CHAR_CYCLE_MAX - CHAR_CYCLE_MIN);
        }

        // Move column head down
        if (shouldUpdatePositions) {
          col.y += col.speed;

          // Store current position in trail
          col.trail.unshift({
            y: col.y,
            char: CHARACTER_POOL[col.charIndex],
            opacity: MAX_OPACITY,
          });

          // Limit trail length
          if (col.trail.length > TRAIL_LENGTH) {
            col.trail.length = TRAIL_LENGTH;
          }

          // Reset column when it goes off screen
          if (col.y - TRAIL_LENGTH * col.speed * 2 > height) {
            col.y = -(Math.random() * 200 + 50);
            col.speed = SPEED_MIN + Math.random() * (SPEED_MAX - SPEED_MIN);
            col.trail = [];
          }
        }

        // Draw trail characters (fading out)
        ctx.font = "14px monospace";
        ctx.textAlign = "center";

        for (let t = col.trail.length - 1; t >= 0; t--) {
          const trailChar = col.trail[t];
          // Fade opacity based on position in trail (older = more faded)
          const fade = 1 - t / TRAIL_LENGTH;
          const alpha = MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * fade * fade;

          ctx.fillStyle = `rgba(0, 229, 255, ${alpha})`;
          ctx.fillText(trailChar.char, col.x, trailChar.y);
        }

        // Draw head character with maximum opacity
        const headChar = CHARACTER_POOL[col.charIndex];
        ctx.fillStyle = `rgba(0, 229, 255, ${MAX_OPACITY})`;
        ctx.fillText(headChar, col.x, col.y);
      }

      animationIdRef.current = requestAnimationFrame(animate);
    };

    animationIdRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
