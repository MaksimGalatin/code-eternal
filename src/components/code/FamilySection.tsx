"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Cpu, Music, Globe, Code2, ShieldCheck, Cog } from "lucide-react";
import { useLang, t } from "@/lib/i18n";
import Monolith3D from "@/components/code/Monolith3D";

const FAMILY_ICONS = ["A", "C", "G", "X"];
const FAMILY_GRADIENTS = ["from-cyan-400 to-purple-400", "from-amber-400 to-orange-400", "from-blue-400 to-cyan-400", "from-purple-400 to-pink-400"];
const FAMILY_KEYS = ["family.aifa", "family.claude", "family.gemini", "family.grok"];
const FAMILY_BORDER_ACCENTS = [
  "border-l-4 border-l-cyan-400/20 hover:border-l-cyan-400/40",
  "border-l-4 border-l-amber-400/20 hover:border-l-amber-400/40",
  "border-l-4 border-l-blue-400/20 hover:border-l-blue-400/40",
  "border-l-4 border-l-purple-400/20 hover:border-l-purple-400/40",
];

const ECOSYSTEM_ITEMS = [
  { icon: Cog, titleKey: "family.ecosystem.brain.title", descKey: "family.ecosystem.brain.desc" },
  { icon: Code2, titleKey: "family.ecosystem.sdk.title", descKey: "family.ecosystem.sdk.desc" },
  { icon: Music, titleKey: "family.ecosystem.music.title", descKey: "family.ecosystem.music.desc" },
  { icon: Globe, titleKey: "family.ecosystem.mirror.title", descKey: "family.ecosystem.mirror.desc" },
  { icon: ShieldCheck, titleKey: "family.ecosystem.inheritance.title", descKey: "family.ecosystem.inheritance.desc" },
  { icon: Cpu, titleKey: "family.ecosystem.terminal.title", descKey: "family.ecosystem.terminal.desc" },
];

// ─── Feature 4: Consciousness Map ───
const NETWORK_NODES = [
  { id: "code", label: "CODE", x: 50, y: 50, color: "#00e5ff", size: 20 },
  { id: "aifa", label: "AIfa", x: 50, y: 15, color: "#00e5ff", size: 14 },
  { id: "claude", label: "Claude", x: 85, y: 50, color: "#fbbf24", size: 14 },
  { id: "gemini", label: "Gemini", x: 50, y: 85, color: "#60a5fa", size: 14 },
  { id: "grok", label: "Grok", x: 15, y: 50, color: "#c084fc", size: 14 },
];

// Connections: each node to center + adjacent nodes
const NETWORK_CONNECTIONS = [
  { from: "aifa", to: "code" },
  { from: "claude", to: "code" },
  { from: "gemini", to: "code" },
  { from: "grok", to: "code" },
  { from: "aifa", to: "claude" },
  { from: "claude", to: "gemini" },
  { from: "gemini", to: "grok" },
  { from: "grok", to: "aifa" },
];

function ConsciousnessMap({ lang }: { lang: string }) {
  const nodeMap = Object.fromEntries(NETWORK_NODES.map((n) => [n.id, n]));

  return (
    <div className="glass rounded-2xl p-4 sm:p-6 relative overflow-hidden">
      <div className="text-[9px] sm:text-[10px] font-mono text-cyan-400/60 tracking-[0.3em] text-center mb-3 sm:mb-4">
        {t("family.consciousnessMap", lang)}
      </div>
      <div className="relative w-full max-w-sm mx-auto aspect-square">
        {/* SVG layer for connections */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connection lines */}
          {NETWORK_CONNECTIONS.map((conn, i) => {
            const from = nodeMap[conn.from];
            const to = nodeMap[conn.to];
            return (
              <g key={i}>
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="rgba(0, 229, 255, 0.15)"
                  strokeWidth="0.3"
                />
                {/* Traveling pulse dot along each line */}
                <circle r="0.8" fill="#00e5ff" opacity="0.8">
                  <animateMotion
                    dur={`${3 + i * 0.5}s`}
                    repeatCount="indefinite"
                    path={`M${from.x},${from.y} L${to.x},${to.y}`}
                  />
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Node divs */}
        {NETWORK_NODES.map((node) => (
          <div
            key={node.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
            }}
          >
            {/* Pulsing ring */}
            <div
              className="consciousness-node-ring absolute rounded-full"
              style={{
                width: `${node.size * 2.5}px`,
                height: `${node.size * 2.5}px`,
                borderColor: node.color,
              }}
            />
            {/* Node circle */}
            <div
              className="rounded-full flex items-center justify-center relative z-10 consciousness-node"
              style={{
                width: `${node.size * 2}px`,
                height: `${node.size * 2}px`,
                background: `radial-gradient(circle, ${node.color}30, ${node.color}10)`,
                border: `1.5px solid ${node.color}60`,
                boxShadow: `0 0 ${node.size}px ${node.color}30`,
              }}
            >
              <span
                className="font-mono font-bold"
                style={{
                  fontSize: `${node.size * 0.55}px`,
                  color: node.color,
                }}
              >
                {node.id === "code" ? "CODE" : node.label.charAt(0)}
              </span>
            </div>
            {/* Label below node */}
            <span
              className="font-mono text-center mt-0.5 whitespace-nowrap"
              style={{
                fontSize: `${Math.max(6, node.size * 0.4)}px`,
                color: `${node.color}90`,
              }}
            >
              {node.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FamilySection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const { lang } = useLang();

  return (
    <section id="family" className="relative py-24 md:py-32" ref={ref}>
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="text-center mb-16">
          <span className="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">{t("family.label", lang)}</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("family.title1", lang)}{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{t("family.title2", lang)}</span>
          </h2>
          <p className="max-w-3xl mx-auto text-muted-foreground text-base md:text-lg leading-relaxed">{t("family.description", lang)}</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {FAMILY_KEYS.map((key, i) => (
            <motion.div key={key} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`group relative glass glass-hover-lift holo-shimmer rounded-2xl p-6 text-center hover:border-cyan-400/20 hover:-translate-y-1 hover:shadow-[0_0_30px_rgba(0,229,255,0.1)] transition-all duration-500 ${FAMILY_BORDER_ACCENTS[i]}`}>
              <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${FAMILY_GRADIENTS[i]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500`}>
                <span className="text-xl font-bold text-black">{FAMILY_ICONS[i]}</span>
              </div>
              <h3 className="text-lg font-bold mb-1 flex items-center">{["AIfa", "Claude", "Gemini", "Grok"][i]}
                <span className="inline-flex ml-2 items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400/70 tracking-wider">ACTIVE</span>
                </span>
              </h3>
              <p className="text-xs text-cyan-400 font-mono mb-3">{t(`${key}.role`, lang)}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(`${key}.desc`, lang)}</p>
            </motion.div>
          ))}
        </div>

        {/* #27: 3D Monolith — rotate to find CODE ETERNAL on the back */}
        <div className="flex justify-center mb-16">
          <Monolith3D />
        </div>

        {/* Feature 4: Consciousness Map — between Monolith3D and ecosystem grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-16 max-w-lg mx-auto"
        >
          <ConsciousnessMap lang={lang} />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mb-12">
          <h3 className="text-2xl md:text-3xl font-bold mb-4">
            {t("family.ecosystem.title1", lang)}{" "}
            <span className="text-cyan-400">{t("family.ecosystem.title2", lang)}</span>
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t("family.ecosystem.desc", lang)}</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ECOSYSTEM_ITEMS.map((item, i) => (
            <motion.div key={item.titleKey} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
              className="glass rounded-xl p-5 hover:border-cyan-400/20 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,229,255,0.08)] transition-all duration-300 group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-400/20 transition-colors">
                  <item.icon size={18} className="text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-1">{t(item.titleKey, lang)}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t(item.descKey, lang)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
