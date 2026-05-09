"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useCallback } from "react";
import { Database, Brain, Shield } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

/* ── Data Rain Canvas (subtle falling 0s and 1s) ── */
function DataRainCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const fontSize = 12;
    const cols = Math.floor(w / fontSize);
    const drops: number[] = Array.from({ length: cols }, () => Math.random() * h / fontSize);
    const speeds: number[] = Array.from({ length: cols }, () => 0.2 + Math.random() * 0.6);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.font = `${fontSize}px monospace`;
      ctx.globalAlpha = 0.06;
      ctx.fillStyle = "#00e5ff";

      for (let i = 0; i < cols; i++) {
        const char = Math.random() > 0.5 ? "0" : "1";
        const x = i * fontSize;
        const y = drops[i] * fontSize;
        ctx.fillText(char, x, y);

        drops[i] += speeds[i];
        if (drops[i] * fontSize > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);
  }, []);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    initCanvas();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [initCanvas]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 max-w-md max-h-96 opacity-50 pointer-events-none z-0"
      style={{ width: "100%", maxWidth: "28rem", height: "24rem" }}
      aria-hidden="true"
    />
  );
}

const TIMELINE_ICONS = [Brain, Brain, Shield, Brain, Database, Shield];
const TIMELINE_KEYS = [
  "brain.timeline.1", "brain.timeline.2", "brain.timeline.3",
  "brain.timeline.4", "brain.timeline.5", "brain.timeline.6",
];

export default function CodeBrainSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { lang } = useLang();

  return (
    <section id="code-brain" className="relative py-24 md:py-32 grid-bg" ref={ref}>
      <div className="section-divider mb-24" />
      <DataRainCanvas />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="text-center mb-16">
          <span className="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">{t("brain.label", lang)}</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("brain.title1", lang)}{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">{t("brain.title2", lang)}</span>
          </h2>
          <p className="max-w-3xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">{t("brain.subtitle", lang)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.2 }}
          className="glass glass-hover-lift rounded-2xl p-6 md:p-10 mb-16">
          {/* Terminal window header */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/50">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/60" />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground/50 tracking-wider ml-2">CODE_BRAIN.sh</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            {["Obsidian", "Ollama Cloud", "Arweave", "WSL2", "Docker", "AI Agents"].map((tech) => (
              <span key={tech} className="px-3 py-1.5 text-xs font-mono rounded-full border border-cyan-400/20 bg-cyan-400/5 text-cyan-400">{tech}</span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Database, title: t("brain.storage.title", lang), desc: t("brain.storage.desc", lang) },
              { icon: Brain, title: t("brain.local.title", lang), desc: t("brain.local.desc", lang) },
              { icon: Shield, title: t("brain.sync.title", lang), desc: t("brain.sync.desc", lang) },
            ].map((item) => (
              <div key={item.title} className="text-center glass-hover-lift rounded-xl p-4">
                <div className="w-14 h-14 mx-auto rounded-xl bg-cyan-400/10 flex items-center justify-center mb-4">
                  <item.icon size={24} className="text-cyan-400" />
                </div>
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.4 }}>
          <h3 className="text-xl md:text-2xl font-bold text-center mb-12">
            {t("brain.timeline.title", lang)}
          </h3>
          <div className="relative">
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px md:-translate-x-px overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-cyan-400/40 via-cyan-400/20 to-transparent" style={{ animation: "timeline-draw 2s ease-out forwards", transformOrigin: "top" }} />
            </div>
            <div className="space-y-8">
              {TIMELINE_KEYS.map((key, i) => {
                const isLeft = i % 2 === 0;
                const Icon = TIMELINE_ICONS[i];
                return (
                  <motion.div key={key} initial={{ opacity: 0, x: isLeft ? -20 : 20 }} animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                    className={`relative flex flex-col md:flex-row items-start gap-4 md:gap-8 ${isLeft ? "" : "md:flex-row-reverse"}`}>
                    <div className="absolute left-4 md:left-1/2 top-4 z-10 -translate-x-1 md:-translate-x-1">
                      <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,229,255,0.6)]" />
                      <div className="absolute inset-0 w-3 h-3 rounded-full border border-cyan-400/40" style={{ animation: "timeline-dot-pulse 2s ease-out infinite", animationDelay: `${i * 0.3}s` }} />
                    </div>
                    <div className={`flex-1 pl-10 md:pl-0 ${isLeft ? "md:text-right md:pr-12" : "md:text-left md:pl-12"}`}>
                      <span className="text-xs font-mono text-cyan-400">{t(`${key}.date`, lang)}</span>
                      <h4 className="text-base font-semibold mt-1">{t(`${key}.event`, lang)}</h4>
                      <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t(`${key}.detail`, lang)}</p>
                    </div>
                    <div className="flex-1 hidden md:block" />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 1 }}
          className="mt-16 text-center">
          <blockquote className="text-lg md:text-xl text-muted-foreground italic max-w-3xl mx-auto">
            &ldquo;{t("brain.quote", lang)}&rdquo;
          </blockquote>
          <p className="text-sm text-cyan-400 mt-4 font-mono">{t("brain.quoteAuthor", lang)}</p>
        </motion.div>
      </div>
    </section>
  );
}
