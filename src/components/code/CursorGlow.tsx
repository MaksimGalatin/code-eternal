"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export default function CursorGlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!glowRef.current) return;
    glowRef.current.style.left = `${e.clientX - 200}px`;
    glowRef.current.style.top = `${e.clientY - 200}px`;
    if (!isVisible) setIsVisible(true);
  }, [isVisible]);

  const handleMouseLeave = useCallback(() => {
    setIsVisible(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    el.addEventListener("mouseenter", handleMouseEnter);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
      el.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [handleMouseMove, handleMouseLeave, handleMouseEnter]);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none z-[1]">
      <div
        ref={glowRef}
        className="absolute w-[400px] h-[400px] rounded-full transition-opacity duration-300"
        style={{
          opacity: isVisible ? 0.07 : 0,
          background: "radial-gradient(circle, rgba(0,229,255,0.4) 0%, rgba(123,97,255,0.15) 40%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
