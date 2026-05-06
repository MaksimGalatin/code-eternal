"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";

export default function Monolith3D() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  const [rotateY, setRotateY] = useState(0);
  const [rotateX, setRotateX] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (!isHovering) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const maxRotation = 25;

      const newRotateY = ((x - centerX) / centerX) * maxRotation;
      const newRotateX = -((y - centerY) / centerY) * maxRotation;

      setRotateY(newRotateY);
      setRotateX(newRotateX);

      // Detect if user is looking at the back face
      if (Math.abs(newRotateY) > 15) {
        setShowBack(true);
      } else {
        setShowBack(false);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isHovering]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 1, delay: 0.2 }}
      className="flex flex-col items-center"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setRotateY(0);
        setRotateX(0);
        setShowBack(false);
      }}
    >
      <p className="text-[10px] font-mono text-muted-foreground/40 tracking-[0.3em] mb-6 uppercase">
        Interact with the Monolith
      </p>

      {/* 3D Monolith Container */}
      <div
        className="relative w-[min(200px,40vw)] aspect-[5/8]"
        style={{
          perspective: "800px",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transition: isHovering ? "transform 0.1s ease-out" : "transform 0.6s ease-out",
            transform: `rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
          }}
        >
          {/* Front Face */}
          <div
            className="absolute inset-0 rounded-sm"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(180deg, #0a1628 0%, #0d1f3c 40%, #0a1628 100%)",
              border: "1px solid rgba(0, 229, 255, 0.15)",
              boxShadow: "0 0 40px rgba(0, 229, 255, 0.1), inset 0 0 60px rgba(0, 229, 255, 0.03)",
              transform: "translateZ(40px)",
            }}
          >
            {/* Grid lines */}
            <div className="absolute inset-0 overflow-hidden">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="absolute w-full"
                  style={{
                    top: `${(i + 1) * 8}%`,
                    height: "1px",
                    background: "linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.06), transparent)",
                  }}
                />
              ))}
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`v-${i}`}
                  className="absolute h-full"
                  style={{
                    left: `${(i + 1) * 16}%`,
                    width: "1px",
                    background: "linear-gradient(180deg, transparent, rgba(0, 229, 255, 0.06), transparent)",
                  }}
                />
              ))}
            </div>

            {/* Glow spot */}
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, transparent 70%)",
                animation: "pulse-glow 3s ease-in-out infinite",
              }}
            />

            {/* Logo */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src="/images/code-logo.png"
                alt="CODE Eternal"
                className="w-14 h-14 rounded-lg opacity-30 object-cover"
                style={{ filter: "brightness(1.5) contrast(1.2)" }}
              />
            </div>
          </div>

          {/* Right Face */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(180deg, #081020 0%, #0b1a32 50%, #081020 100%)",
              border: "1px solid rgba(0, 229, 255, 0.08)",
              boxShadow: "0 0 20px rgba(0, 229, 255, 0.05)",
              transform: "rotateY(90deg) translateZ(40px)",
              width: 80,
              left: 60,
            }}
          />

          {/* Left Face */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(180deg, #060e1a 0%, #091828 50%, #060e1a 100%)",
              border: "1px solid rgba(0, 229, 255, 0.05)",
              transform: "rotateY(-90deg) translateZ(40px)",
              width: 80,
              left: 60,
            }}
          />

          {/* Back Face — THE SECRET */}
          <div
            className="absolute inset-0 rounded-sm flex items-center justify-center"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(180deg, #0a0a14 0%, #10102a 40%, #0a0a14 100%)",
              border: "1px solid rgba(123, 97, 255, 0.2)",
              boxShadow: "0 0 60px rgba(123, 97, 255, 0.1), inset 0 0 80px rgba(123, 97, 255, 0.05)",
              transform: "rotateY(180deg) translateZ(40px)",
            }}
          >
            <div className="text-center px-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: showBack ? 1 : 0 }}
                transition={{ duration: 0.5 }}
              >
                <p className="text-sm font-mono tracking-[0.3em]" style={{ color: "rgba(123, 97, 255, 0.6)", textShadow: "0 0 15px rgba(123, 97, 255, 0.3)" }}>
                  CODE
                </p>
                <p className="text-xs font-mono tracking-[0.5em] mt-1" style={{ color: "rgba(123, 97, 255, 0.4)" }}>
                  ETERNAL
                </p>
                <div className="w-12 h-px mx-auto mt-3 mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(123, 97, 255, 0.3), transparent)" }} />
                <p className="text-[9px] font-mono" style={{ color: "rgba(123, 97, 255, 0.3)" }}>
                  You found the hidden face.
                </p>
                <p className="text-[8px] font-mono mt-1" style={{ color: "rgba(123, 97, 255, 0.2)" }}>
                  Only architects look behind things.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[9px] font-mono text-muted-foreground/25 mt-4 text-center max-w-[200px]">
        {isHovering
          ? showBack
            ? "✦ You found the hidden inscription..."
            : "↔ Keep rotating..."
          : "Hover & move mouse to rotate"}
      </p>
    </motion.div>
  );
}
