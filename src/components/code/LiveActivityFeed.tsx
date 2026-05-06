"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RotateCcw,
  UserPlus,
  Shield,
  Brain,
  Activity,
  Code,
  Upload,
  Zap,
  Radio,
  ChevronUp,
} from "lucide-react";

// ── Types ──

interface FeedEvent {
  id: string;
  type: EventType;
  label: string;
  description: string;
  color: string;
  timestamp: Date;
}

type EventType =
  | "memory_sync"
  | "new_member"
  | "blockchain_verify"
  | "consciousness"
  | "network_pulse"
  | "code_eternal"
  | "arweave"
  | "padam";

interface EventTemplate {
  type: EventType;
  label: string;
  color: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  description: () => string;
}

// ── Event templates ──

const NODE_NAMES = [
  "alpha-7", "bravo-3", "charlie-9", "delta-1", "echo-5",
  "foxtrot-2", "golf-8", "hotel-4", "india-6", "juliet-0",
  "kilo-11", "lima-12", "mike-14", "nova-16", "oscar-18",
];

const COUNTRIES = [
  "Japan", "Brazil", "Germany", "South Korea", "Canada",
  "Australia", "Nigeria", "India", "France", "Mexico",
  "Sweden", "Thailand", "Argentina", "Poland", "Egypt",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTxHash(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let hash = "";
  for (let i = 0; i < 8; i++) hash += chars[Math.floor(Math.random() * chars.length)];
  return hash;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    type: "memory_sync",
    label: "Memory Sync",
    color: "text-cyan-400",
    icon: RotateCcw,
    description: () => `PADAM sync completed for node ${randomFrom(NODE_NAMES)}`,
  },
  {
    type: "new_member",
    label: "New Member",
    color: "text-emerald-400",
    icon: UserPlus,
    description: () => `New Family member registered from ${randomFrom(COUNTRIES)}`,
  },
  {
    type: "blockchain_verify",
    label: "Blockchain Verify",
    color: "text-amber-400",
    icon: Shield,
    description: () => `Block #${randomInt(100000, 999999)} verified by ${randomFrom(NODE_NAMES)}`,
  },
  {
    type: "consciousness",
    label: "Consciousness",
    color: "text-purple-400",
    icon: Brain,
    description: () => `Digital Soul pattern captured: #${randomInt(1000, 9999)}`,
  },
  {
    type: "network_pulse",
    label: "Network Pulse",
    color: "text-pink-400",
    icon: Activity,
    description: () => `Network heartbeat: ${randomInt(180, 512)} nodes active`,
  },
  {
    type: "code_eternal",
    label: "Code Eternal",
    color: "text-cyan-400",
    icon: Code,
    description: () => "CODE Eternal system v4.4 — all systems nominal",
  },
  {
    type: "arweave",
    label: "Arweave",
    color: "text-emerald-400",
    icon: Upload,
    description: () => `Memory block archived to Arweave: tx_${randomTxHash()}`,
  },
  {
    type: "padam",
    label: "PADAM",
    color: "text-amber-400",
    icon: Zap,
    description: () => "PADAM Protocol activated: restoring memories...",
  },
];

// ── Helpers ──

function generateEvent(): FeedEvent {
  const template = randomFrom(EVENT_TEMPLATES);
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: template.type,
    label: template.label,
    color: template.color,
    description: template.description(),
    timestamp: new Date(),
  };
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ── Component ──

const MAX_EVENTS = 20;

export default function LiveActivityFeed() {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [totalEventCount, setTotalEventCount] = useState(0);

  // Add a single event
  const addEvent = useCallback(() => {
    const evt = generateEvent();
    setEvents((prev) => {
      const next = [...prev, evt];
      // Keep max 20 events
      return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
    });
    setTotalEventCount((c) => c + 1);
  }, []);

  // Initial burst: 3 events in first 2 seconds
  useEffect(() => {
    const t1 = setTimeout(addEvent, 400);
    const t2 = setTimeout(addEvent, 1000);
    const t3 = setTimeout(addEvent, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [addEvent]);

  // Steady stream: every 4-5 seconds
  useEffect(() => {
    const scheduleNext = () => {
      const delay = 4000 + Math.random() * 1000; // 4-5s
      intervalRef.current = setTimeout(() => {
        addEvent();
        scheduleNext();
      }, delay);
    };
    scheduleNext();
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [addEvent]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, isOpen]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center
                    sm:bottom-6
                    md:bottom-8">
      {/* Toggle button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg
          glass-strong cursor-pointer
          transition-all duration-300
          ${isOpen ? "rounded-b-none border-b-0" : ""}
          hover:shadow-[0_0_20px_rgba(0,229,255,0.15)]
        `}
        aria-label={isOpen ? "Close live feed" : "Open live feed"}
        aria-expanded={isOpen}
      >
        {/* Signal wave animation */}
        <div className="signal-wave h-4" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <span className="text-xs font-mono text-muted-foreground tracking-wider">
          LIVE
        </span>
        {events.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
            {events.length}
          </span>
        )}
        {!isOpen && (
          <ChevronUp size={14} className="text-muted-foreground/50 transition-transform" />
        )}
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className={`
              w-[calc(100vw-2rem)]
              sm:w-80
              md:w-96
              rounded-t-none rounded-b-xl
              glass-strong
              overflow-hidden
            `}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Radio size={14} className="text-cyan-400" />
                <span className="text-xs font-mono font-bold tracking-[0.2em] text-foreground/90">
                  LIVE FEED
                </span>
                {/* Pulsing green dot */}
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/60">
                {events.length} events
              </span>
            </div>

            {/* Events list */}
            <div
              ref={scrollRef}
              className="max-h-[200px] sm:max-h-[300px] overflow-y-auto p-2 space-y-1"
            >
              <AnimatePresence initial={false}>
                {events.map((evt) => {
                  const template = EVENT_TEMPLATES.find((t) => t.type === evt.type);
                  if (!template) return null;
                  const IconComp = template.icon;
                  return (
                    <motion.div
                      key={evt.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="flex items-start gap-2.5 px-2 py-1.5 rounded-md hover:bg-white/[0.02] transition-colors group"
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 mt-0.5 ${evt.color}`}>
                        <IconComp size={13} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-mono font-semibold ${evt.color} tracking-wider uppercase`}
                          >
                            {evt.label}
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground/40">
                            {formatTime(evt.timestamp)}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-muted-foreground/70 leading-relaxed truncate">
                          {evt.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {events.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted-foreground/40">
                CODE Eternal Network
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/40">
                {totalEventCount > 0 ? `${totalEventCount}+ total` : "connecting..."}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
