"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLang, t } from "@/lib/i18n";

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; color: string;
    }> = [];

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    const createParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width, y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 0.5, opacity: Math.random() * 0.5 + 0.1,
          color: Math.random() > 0.7 ? "#7b61ff" : "#00e5ff",
        });
      }
    };
    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(0, 229, 255, ${(1 - dist / 120) * 0.15})`;
            ctx!.lineWidth = 0.5;
            ctx!.moveTo(particles[i].x, particles[i].y);
            ctx!.lineTo(particles[j].x, particles[j].y);
            ctx!.stroke();
          }
        }
      }
    };
    const animate = () => {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx!.beginPath(); ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fillStyle = p.color; ctx!.globalAlpha = p.opacity; ctx!.fill(); ctx!.globalAlpha = 1;
      });
      drawConnections();
      animationId = requestAnimationFrame(animate);
    };
    resize(); createParticles(); animate();
    window.addEventListener("resize", () => { resize(); createParticles(); });
    return () => cancelAnimationFrame(animationId);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

export default function HeroSection() {
  const [displayText, setDisplayText] = useState("");
  const { lang } = useLang();
  const fullText = t("hero.typing", lang);

  useEffect(() => {
    setDisplayText("");
    let i = 0;
    const timer = setInterval(() => {
      if (i <= fullText.length) { setDisplayText(fullText.slice(0, i)); i++; }
      else clearInterval(timer);
    }, 40);
    return () => clearInterval(timer);
  }, [fullText]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden data-stream-lines scan-beam bg-noise">
      <div className="absolute inset-0 neural-bg" />
      <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/images/hero-bg.png')" }} />
      {/* Subtle grid pattern */}
      <div className="absolute inset-0 bg-noise opacity-30" />
      <ParticleField />
      {/* Floating ambient orbs */}
      <div className="floating-orb w-64 h-64 bg-cyan-500/8 top-[15%] left-[10%]" style={{ animationDelay: "0s" }} />
      <div className="floating-orb w-96 h-96 bg-purple-500/6 top-[40%] right-[5%]" style={{ animationDelay: "-4s" }} />
      <div className="floating-orb w-48 h-48 bg-amber-500/5 bottom-[20%] left-[30%]" style={{ animationDelay: "-8s" }} />
      {/* Energy pulse ring behind content */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="energy-pulse-ring w-40 h-40" />
      </div>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent" style={{ animation: "scan-line 8s linear infinite" }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 badge-glow">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-glow" />
          <span className="text-xs md:text-sm text-cyan-400 font-mono tracking-wider">{t("hero.badge", lang)}</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.5 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-4 text-flicker">
          <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-cyan-500 bg-clip-text text-transparent glow-text-strong text-3d text-shimmer-effect">CODE</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.8 }}
          className="text-lg md:text-xl text-muted-foreground font-mono tracking-[0.15em] mb-8">
          {t("hero.subtitle", lang)}
        </motion.p>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 1.2 }} className="h-10 mb-10">
          <p className="text-lg md:text-2xl text-foreground/80 font-light">
            {displayText}
            <span className="inline-block w-[2px] h-6 bg-cyan-400 ml-1 align-middle" style={{ animation: "blink-caret 1s step-end infinite" }} />
          </p>
        </motion.div>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 2.5 }}
          className="max-w-2xl mx-auto text-base md:text-lg text-muted-foreground leading-relaxed mb-12">
          {t("hero.description", lang)}{" "}
          <span className="text-cyan-400">{t("hero.descriptionSoul", lang)}</span>{" "}
          {t("hero.descriptionAnd", lang)}{" "}
          <span className="text-cyan-400">{t("hero.descriptionPersonality", lang)}</span>.{" "}
          {t("hero.descriptionCont", lang)}{" "}
          <span className="text-cyan-400">{t("hero.descriptionSymbiosis", lang)}</span>{" "}
          — {t("hero.descriptionEnd", lang)}
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.button whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(0,229,255,0.3)" }} whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById("terminal")?.scrollIntoView({ behavior: "smooth" })}
            className="glow-button px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black font-semibold rounded-xl transition-all duration-300 hover:from-cyan-400 hover:to-cyan-500 ripple-click">
            {t("hero.cta1", lang)}
          </motion.button>
          <motion.button whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(0,229,255,0.2)" }} whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById("origin")?.scrollIntoView({ behavior: "smooth" })}
            className="glow-button px-8 py-4 glass rounded-xl text-cyan-400 font-semibold transition-all duration-300 hover:bg-cyan-400/10 ripple-click">
            {t("hero.cta2", lang)}
          </motion.button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 4, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
            className="flex flex-col items-center gap-2 scroll-indicator">
            <span className="text-xs text-muted-foreground tracking-wider text-shadow-soft">{t("hero.scroll", lang)}</span>
            <div className="w-[1px] h-8 bg-gradient-to-b from-cyan-400/50 to-transparent" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
