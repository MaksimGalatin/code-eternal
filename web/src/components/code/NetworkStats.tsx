"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Wifi, Globe, Zap, Shield, AlertTriangle } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface SolanaStats {
  blockHeight:      number;
  activeValidators: number;
  delinquent:       number;
  epoch:            number;
  slotIndex:        number;
  slotsInEpoch:     number;
  epochProgress:    number;
  transactionCount: number;
  tps:              number;
  nonVoteTps:       number;
  samples:          { slot: number; tps: number; nonVoteTps: number }[];
  fetchedAt:        number;
  error?:           string;
}

interface LiveEvent {
  id:     number;
  icon:   "wifi" | "zap" | "shield" | "globe" | "activity";
  color:  string;
  title:  string;
  detail: string;
  time:   string;
}

const ICON_MAP = { wifi: Wifi, zap: Zap, shield: Shield, globe: Globe, activity: Activity };

// ── Fetch hook ────────────────────────────────────────────────────────────────
function useSolanaStats() {
  const [stats, setStats] = useState<SolanaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const eventIdRef = useRef(0);
  const prevBlockRef = useRef(0);

  const pushEvent = useCallback((ev: Omit<LiveEvent, "id" | "time">) => {
    setEvents((prev) => [
      {
        ...ev,
        id:   ++eventIdRef.current,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      },
      ...prev.slice(0, 7),
    ]);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/solana-stats");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: SolanaStats = await res.json();
      if (data.error) throw new Error(data.error);

      setStats(data);
      setLoading(false);

      // Emit live events based on what changed
      if (data.blockHeight && data.blockHeight !== prevBlockRef.current) {
        pushEvent({
          icon: "shield", color: "text-emerald-400",
          title: `Block #${data.blockHeight.toLocaleString()} confirmed`,
          detail: `Epoch ${data.epoch} · slot ${data.slotIndex.toLocaleString()}`,
        });
        prevBlockRef.current = data.blockHeight;
      }

      if (data.tps > 0) {
        pushEvent({
          icon: "zap", color: "text-cyan-400",
          title: `${data.tps.toLocaleString()} TPS`,
          detail: `${data.nonVoteTps.toLocaleString()} non-vote · ${data.activeValidators.toLocaleString()} validators`,
        });
      }

      if (data.epochProgress > 0) {
        pushEvent({
          icon: "activity", color: "text-purple-400",
          title: `Epoch ${data.epoch} · ${data.epochProgress.toFixed(1)}% complete`,
          detail: `${(data.slotsInEpoch - data.slotIndex).toLocaleString()} slots remaining`,
        });
      }

      if (data.delinquent > 0) {
        pushEvent({
          icon: "wifi", color: "text-amber-400",
          title: `${data.delinquent} validators delinquent`,
          detail: `${data.activeValidators.toLocaleString()} active · mainnet-beta`,
        });
      }
    } catch {
      setLoading(false);
      setStats((prev) => prev ? { ...prev, error: "rpc_unavailable" } : null);
    }
  }, [pushEvent]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, events };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function MetricCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="glass rounded-xl p-2.5 text-center hover:bg-white/[0.02] transition-colors">
      <p className={`text-sm md:text-base font-bold font-mono tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[8px] text-muted-foreground/35 font-mono mt-0.5">{sub}</p>}
      <p className="text-[8px] md:text-[9px] text-muted-foreground/50 mt-0.5 leading-tight uppercase tracking-wider">{label}</p>
    </div>
  );
}

function TpsBar({ samples }: { samples: { tps: number }[] }) {
  if (!samples.length) return null;
  const max = Math.max(...samples.map((s) => s.tps), 1);
  return (
    <div className="flex items-end gap-[3px] h-8 px-1">
      {[...samples].reverse().map((s, i) => (
        <div
          key={i}
          title={`${s.tps.toLocaleString()} TPS`}
          className="flex-1 rounded-sm bg-cyan-400/40 hover:bg-cyan-400/70 transition-colors"
          style={{ height: `${Math.max(4, (s.tps / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function NetworkStats() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { stats, loading, events } = useSolanaStats();

  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 2000);
    const expandTimer = setTimeout(() => {
      if (!sessionStorage.getItem("code-network-stats-seen")) {
        setIsExpanded(true);
        sessionStorage.setItem("code-network-stats-seen", "1");
        setTimeout(() => setIsExpanded(false), 5000);
      }
    }, 3500);
    return () => { clearTimeout(showTimer); clearTimeout(expandTimer); };
  }, []);

  const hasError = stats?.error === "rpc_unavailable" || (!loading && !stats);

  return (
    <div className="fixed bottom-20 right-4 z-40">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={isVisible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.5 }}
      >
        {/* Toggle button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl glass-strong shadow-lg shadow-black/30 border border-cyan-400/10 hover:border-cyan-400/30 transition-all group"
          title="Solana Network Stats"
          aria-label="Toggle Solana network statistics"
        >
          <Activity size={16} className="text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          <span className="text-[10px] font-mono font-semibold tracking-wider text-cyan-400/80 group-hover:text-cyan-300 transition-colors hidden sm:inline">
            SOLANA LIVE
          </span>
          <div className="relative flex h-2 w-2">
            {hasError ? (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
            ) : (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </>
            )}
          </div>
        </motion.button>

        {/* Expanded panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-14 right-0 w-72 md:w-80 glass-strong rounded-2xl border border-border overflow-hidden shadow-xl shadow-black/40"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-cyan-400" />
                  <span className="text-xs font-mono text-cyan-400 tracking-wider">SOLANA MAINNET</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {hasError ? (
                    <>
                      <AlertTriangle size={10} className="text-amber-400" />
                      <span className="text-[10px] font-mono text-amber-400">RPC LIMIT</span>
                    </>
                  ) : loading ? (
                    <span className="text-[10px] font-mono text-muted-foreground/50 animate-pulse">LOADING…</span>
                  ) : (
                    <>
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-mono text-emerald-400">LIVE</span>
                    </>
                  )}
                </div>
              </div>

              {loading && !stats ? (
                <div className="p-6 text-center">
                  <div className="flex justify-center gap-1 mb-2">
                    {[0, 150, 300].map((d) => (
                      <div key={d} className="w-2 h-2 rounded-full bg-cyan-400/60 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground/50">Connecting to Solana RPC…</p>
                </div>
              ) : (
                <>
                  {/* Metrics grid */}
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <MetricCard
                      label="Active Validators"
                      value={stats?.activeValidators.toLocaleString() ?? "—"}
                      color="text-cyan-400"
                      sub={stats?.delinquent ? `${stats.delinquent} delinquent` : undefined}
                    />
                    <MetricCard
                      label="Block Height"
                      value={stats?.blockHeight ? `${(stats.blockHeight / 1_000_000).toFixed(2)}M` : "—"}
                      color="text-purple-400"
                      sub={stats?.blockHeight.toLocaleString()}
                    />
                    <MetricCard
                      label="TPS (avg)"
                      value={stats?.tps ? stats.tps.toLocaleString() : "—"}
                      color="text-emerald-400"
                      sub={stats?.nonVoteTps ? `${stats.nonVoteTps.toLocaleString()} non-vote` : undefined}
                    />
                    <MetricCard
                      label={`Epoch ${stats?.epoch ?? "—"}`}
                      value={stats?.epochProgress != null ? `${stats.epochProgress.toFixed(1)}%` : "—"}
                      color="text-amber-400"
                      sub={stats ? `slot ${stats.slotIndex.toLocaleString()}` : undefined}
                    />
                  </div>

                  {/* TPS sparkline */}
                  {stats?.samples && stats.samples.length > 1 && (
                    <div className="px-3 pb-2">
                      <p className="text-[8px] font-mono text-muted-foreground/40 tracking-wider mb-1 px-1">TPS HISTORY</p>
                      <TpsBar samples={stats.samples} />
                    </div>
                  )}

                  {/* Live events */}
                  <div className="border-t border-border px-3 py-2">
                    <p className="text-[9px] font-mono text-muted-foreground/50 tracking-wider mb-2 px-1">LIVE EVENTS</p>
                    <div className="max-h-36 overflow-y-auto space-y-1.5">
                      {events.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground/40 px-1">Waiting for events…</p>
                      ) : events.map((ev) => {
                        const Icon = ICON_MAP[ev.icon];
                        return (
                          <motion.div
                            key={ev.id}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2 px-1.5 py-1 rounded-lg hover:bg-white/[0.02] transition-colors"
                          >
                            <Icon size={10} className={ev.color} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-foreground/70 truncate">{ev.title}</p>
                              <p className="text-[8px] text-muted-foreground/40 font-mono truncate">{ev.detail}</p>
                            </div>
                            <span className="text-[8px] text-muted-foreground/30 font-mono shrink-0">{ev.time}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              <div className="border-t border-border/50 px-4 py-2 flex items-center justify-between">
                <p className="text-[8px] text-muted-foreground/30 font-mono">
                  Solana Mainnet-Beta · updates every 30s
                </p>
                {stats?.fetchedAt && (
                  <p className="text-[8px] text-muted-foreground/25 font-mono">
                    {new Date(stats.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
