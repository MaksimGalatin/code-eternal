"use client";

import { useEffect, useRef, useCallback } from "react";
import { useInView } from "framer-motion";

interface AnimatedCounterProps {
  target: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export default function AnimatedCounter({
  target,
  duration = 2000,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, margin: "-50px" });
  const animationRef = useRef<number | null>(null);
  const displayValueRef = useRef<number>(0);

  const animate = useCallback(
    (from: number, to: number, dur: number) => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }

      const startTime = performance.now();

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / dur, 1);
        const eased = easeOutExpo(progress);
        const current = from + (to - from) * eased;

        displayValueRef.current = current;

        if (ref.current) {
          ref.current.textContent =
            prefix + formatNumber(current, decimals) + suffix;
        }

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(step);
        } else {
          displayValueRef.current = to;
          if (ref.current) {
            ref.current.textContent =
              prefix + formatNumber(to, decimals) + suffix;
          }
          animationRef.current = null;
        }
      };

      animationRef.current = requestAnimationFrame(step);
    },
    [prefix, suffix, decimals]
  );

  useEffect(() => {
    if (isInView) {
      const from = displayValueRef.current;
      animate(from, target, duration);
    } else {
      // Reset to start value when out of view
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      displayValueRef.current = 0;
      if (ref.current) {
        ref.current.textContent = prefix + formatNumber(0, decimals) + suffix;
      }
    }
  }, [isInView, target, duration, animate, prefix, suffix, decimals]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <span
      ref={ref}
      className={`font-variant-numeric tabular-nums ${className}`}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {prefix}
      {formatNumber(0, decimals)}
      {suffix}
    </span>
  );
}
