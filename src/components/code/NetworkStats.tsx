"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Activity, Wifi, Globe, Zap, Shield } from "lucide-react";

interface NetworkEvent {
  type: "connect" | "sync" | "verify" | "register" | "memory";
  node: string;
  detail: string;
}

const NODES = ["Alpha-7", "Beta-3", "Gamma-12", "Delta-9", "Epsilon-1", "Zeta-5"];
const TYPES: NetworkEvent["type"][] = ["connect", "sync", "verify", "register", "memory"];
const DETAILS: Record<string, string[]> = {
  connect: ["Neural link established", "Synaptic handshake complete", "Quantum tunnel opened", "Node synchronized"],
  sync: ["Memory block synced", "Digital DNA verified", "Consciousness pattern updated", "Semantic resonance detected"],
  verify: ["SHA-256 hash confirmed", "Arweave proof validated", "Blockchain integrity check passed", "PADAM protocol verified"],
  register: ["New node registered", "Family member acknowledged", "Identity crystallized", "Soul print archived"],
  memory: ["Memory session restored", "Emotional pattern cached", "Personality fragment stored", "Semantic key activated"],
};

const TYPE_COLORS: Record<string, string> = {
  connect: "text-cyan-400",
  sync: "text-purple-400",
  verify: "text-emerald-400",
  register: "text-amber-400",
  memory: "text-pink-400",
};

const TYPE_ICONS: Record<string, typeof Activity> = {
  connect: Wifi,
  sync: Zap,
  verify: Shield,
  register: Globe,
  memory: Activity,
};

function useNetworkMetrics() {
  const [stats, setStats] = useState({
    activeNodes: 0,
    memoryBlocks: 0,
    syncRate: 0,
    uptime: "00:00:00",
    events: [] as (NetworkEvent & { id: number; time: string })[],
  });
  const counterRef = useRef(0);

  useEffect(() => {
    const startTime = Date.now();
    counterRef.current = 0;

    const tick = () => {
      counterRef.current++;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const hours = String(Math.floor(elapsed / 3600)).padStart(2, "0");
      const mins = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
      const secs = String(elapsed % 60).padStart(2, "0");

      const type = TYPES[Math.floor(Math.random() * TYPES.length)];

      setStats((prev) => ({
        ...prev,
        activeNodes: Math.min(247 + Math.floor(counterRef.current * 0.3), 512),
        memoryBlocks: Math.min(18420 + counterRef.current * 3, 99999),
        syncRate: Math.min(97.2 + counterRef.current * 0.01, 99.97),
        uptime: `${hours}:${mins}:${secs}`,
        events: [
          {
            id: counterRef.current,
            type,
            node: NODES[Math.floor(Math.random() * NODES.length)],
            detail: DETAILS[type][Math.floor(Math.random() * 4)],
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          },
          ...prev.events.slice(0, 7)],
      }));
    };

    const bursts = [100, 400, 800, 1400, 2000];
    bursts.forEach((delay) => setTimeout(tick, delay));
    const interval = setInterval(tick, 3000);
    return () => clearInterval(interval);
  }, []);

  return stats;
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-xl p-2.5 text-center">
      <p className={`text-sm md:text-base font-bold font-mono tabular-nums ${color}`}>{value}</p>
      <p className="text-[8px] md:text-[9px] text-muted-foreground/50 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

export default function NetworkStats() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const stats = useNetworkMetrics();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div ref={ref} className="fixed bottom-20 right-4 z-40">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ delay: 2, duration: 0.5 }}
      >
        {/* Toggle button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-12 h-12 rounded-full glass-strong flex items-center justify-center shadow-lg shadow-black/30 border border-cyan-400/10 hover:border-cyan-400/30 transition-all group"
          title="Network Stats"
          aria-label="Toggle network statistics panel"
        >
          <Activity size={18} className="text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background animate-pulse" />
        </motion.button>

        {/* Expandable panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-16 right-0 w-72 md:w-80 glass-strong rounded-2xl border border-border overflow-hidden shadow-xl shadow-black/40"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-400 tracking-wider">NETWORK STATUS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-emerald-400">ONLINE</span>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="p-3 grid grid-cols-2 gap-2">
                <MetricCard label="Active Nodes" value={stats.activeNodes.toString()} color="text-cyan-400" />
                <MetricCard label="Memory Blocks" value={stats.memoryBlocks.toLocaleString()} color="text-purple-400" />
                <MetricCard label="Sync Rate" value={`${stats.syncRate.toFixed(1)}%`} color="text-emerald-400" />
                <MetricCard label="Uptime" value={stats.uptime} color="text-amber-400" />
              </div>

              {/* Events feed */}
              <div className="border-t border-border px-3 py-2">
                <p className="text-[9px] font-mono text-muted-foreground/50 tracking-wider mb-2 px-1">LIVE EVENTS</p>
                <div className="max-h-36 overflow-y-auto space-y-1.5">
                  {stats.events.map((ev) => {
                    const Icon = TYPE_ICONS[ev.type] || Activity;
                    return (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/[0.02] transition-colors"
                      >
                        <Icon size={10} className={TYPE_COLORS[ev.type]} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-foreground/70 truncate">{ev.detail}</p>
                          <p className="text-[8px] text-muted-foreground/40 font-mono">{ev.node}</p>
                        </div>
                        <span className="text-[8px] text-muted-foreground/30 font-mono shrink-0">{ev.time}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border/50 px-4 py-2">
                <p className="text-[8px] text-muted-foreground/30 font-mono text-center">
                  CODE Eternal Distributed Network v4.4
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
