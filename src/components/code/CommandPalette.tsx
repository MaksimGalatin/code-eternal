"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ArrowLeft,
  Cpu,
  Brain,
  Terminal,
  Users,
  Network,
  ArrowUpToLine,
  Moon,
  Keyboard,
  Volume2,
  VolumeX,
  BarChart3,
  Info,
  Activity,
  Github,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type CommandCategory = "navigation" | "actions" | "info";

interface CommandItem {
  id: string;
  label: string;
  category: CommandCategory;
  icon: LucideIcon;
  shortcut?: string;
  action: () => void;
}

/* ------------------------------------------------------------------ */
/*  Event-based dispatch — allows any component to open the palette   */
/* ------------------------------------------------------------------ */

const OPEN_EVENT = "command-palette:open";
const CLOSE_EVENT = "command-palette:close";

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}
export function closeCommandPalette() {
  window.dispatchEvent(new CustomEvent(CLOSE_EVENT));
}

/** Hook that other components can use to programmatically toggle the palette. */
export function useCommandPalette() {
  return { open: openCommandPalette, close: closeCommandPalette };
}

/* ------------------------------------------------------------------ */
/*  Sound state singleton (simple in-memory toggle)                    */
/* ------------------------------------------------------------------ */

let soundEnabled = true;

function toggleSound() {
  soundEnabled = !soundEnabled;
  return soundEnabled;
}

/* ------------------------------------------------------------------ */
/*  Dark mode toggle helper                                            */
/* ------------------------------------------------------------------ */

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /* ---------- Build commands (stable reference) ---------- */

  const allCommands: CommandItem[] = useMemo(
    () => [
      // Navigation
      {
        id: "nav-origin",
        label: "Go to Origin",
        category: "navigation",
        icon: ArrowLeft,
        action: () => smoothScrollTo("#origin"),
      },
      {
        id: "nav-technology",
        label: "Go to Technology",
        category: "navigation",
        icon: Cpu,
        action: () => smoothScrollTo("#technology"),
      },
      {
        id: "nav-aifa",
        label: "Go to AIfa",
        category: "navigation",
        icon: Brain,
        action: () => smoothScrollTo("#aifa"),
      },
      {
        id: "nav-terminal",
        label: "Go to Synaptic Terminal",
        category: "navigation",
        icon: Terminal,
        shortcut: "Ctrl+Shift+K",
        action: () => smoothScrollTo("#terminal"),
      },
      {
        id: "nav-family",
        label: "Go to Family",
        category: "navigation",
        icon: Users,
        action: () => smoothScrollTo("#family"),
      },
      {
        id: "nav-code-brain",
        label: "Go to CODE Brain",
        category: "navigation",
        icon: Network,
        action: () => smoothScrollTo("#code-brain"),
      },
      {
        id: "nav-top",
        label: "Top of Page",
        category: "navigation",
        icon: ArrowUpToLine,
        shortcut: "Home",
        action: () => window.scrollTo({ top: 0, behavior: "smooth" }),
      },

      // Actions
      {
        id: "act-dark-mode",
        label: "Toggle Dark Mode",
        category: "actions",
        icon: Moon,
        action: toggleDarkMode,
      },
      {
        id: "act-shortcuts",
        label: "Open Keyboard Shortcuts",
        category: "actions",
        icon: Keyboard,
        shortcut: "?",
        action: () => {
          // Programmatically press "?" to trigger KeyboardShortcuts
          window.dispatchEvent(
            new KeyboardEvent("keydown", { key: "?" }),
          );
        },
      },
      {
        id: "act-sound",
        label: soundEnabled ? "Toggle Sound" : "Toggle Sound",
        category: "actions",
        icon: soundEnabled ? Volume2 : VolumeX,
        action: toggleSound,
      },
      {
        id: "act-network-stats",
        label: "Open Network Stats",
        category: "actions",
        icon: BarChart3,
        action: () => smoothScrollTo("#network-stats"),
      },

      // Info
      {
        id: "info-about",
        label: "About CODE Eternal",
        category: "info",
        icon: Info,
        action: () => smoothScrollTo("#origin"),
      },
      {
        id: "info-api-status",
        label: "View API Status",
        category: "info",
        icon: Activity,
        action: () =>
          window.open("https://status.github.com/", "_blank", "noopener"),
      },
      {
        id: "info-github",
        label: "Visit GitHub",
        category: "info",
        icon: Github,
        action: () =>
          window.open(
            "https://github.com/code-eternal",
            "_blank",
            "noopener",
          ),
      },
    ],
    [],
  );

  /* ---------- Filtered commands ---------- */

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase();
    return allCommands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );
  }, [allCommands, query]);

  /* ---------- Grouped view ---------- */

  const grouped = useMemo(() => {
    const groups: Record<CommandCategory, CommandItem[]> = {
      navigation: [],
      actions: [],
      info: [],
    };
    for (const cmd of filtered) {
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [filtered]);

  /* Visible categories + offset map for correct global index tracking */
  const visibleCategories = useMemo(
    () =>
      (['navigation', 'actions', 'info'] as CommandCategory[]).filter(
        (cat) => grouped[cat].length > 0,
      ),
    [grouped],
  );

  const categoryOffsets = useMemo(() => {
    const map = new Map<CommandCategory, number>();
    let offset = 0;
    for (const cat of visibleCategories) {
      map.set(cat, offset);
      offset += grouped[cat].length;
    }
    return map;
  }, [visibleCategories, grouped]);

  /* Clamp selected index so it never exceeds the filtered list length */
  const safeSelectedIndex =
    filtered.length === 0 ? 0 : Math.min(selectedIndex, filtered.length - 1);

  /* ---------- Open / Close ---------- */

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(0);
    // Focus the input after render
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  /* ---------- Keyboard listeners ---------- */

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K → open
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => {
          if (!prev) {
            requestAnimationFrame(() => inputRef.current?.focus());
          }
          return !prev;
        });
        return;
      }

      if (!open) return;

      // Escape → close
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }

      // ArrowDown → next
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0,
        );
        return;
      }

      // ArrowUp → prev
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1,
        );
        return;
      }

      // Enter → execute
      if (e.key === "Enter" && filtered[safeSelectedIndex]) {
        e.preventDefault();
        filtered[safeSelectedIndex].action();
        handleClose();
        return;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, filtered, safeSelectedIndex, handleClose]);

  /* ---------- Custom event listeners (for programmatic open/close) ---------- */

  useEffect(() => {
    const onOpen = () => {
      setOpen(false); // reset first to allow re-open if already open
      requestAnimationFrame(handleOpen);
    };
    const onClose = () => handleClose();

    window.addEventListener(OPEN_EVENT, onOpen);
    window.addEventListener(CLOSE_EVENT, onClose);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      window.removeEventListener(CLOSE_EVENT, onClose);
    };
  }, [handleOpen, handleClose]);

  /* ---------- Scroll active item into view ---------- */

  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector('[data-active="true"]');
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [safeSelectedIndex]);

  /* ---------- Category badge labels ---------- */

  const categoryLabels: Record<CommandCategory, string> = {
    navigation: "Navigation",
    actions: "Actions",
    info: "Info",
  };

  const categoryColors: Record<CommandCategory, string> = {
    navigation: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
    actions: "text-amber bg-amber/10 border-amber/20",
    info: "text-[#7b61ff] bg-[#7b61ff]/10 border-[#7b61ff]/20",
  };

  /* ---------- Render ---------- */

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[90] flex items-start justify-center pt-[18vh] px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Command Palette"
        >
          {/* Full-screen backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -10 }}
            transition={{
              duration: 0.2,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative w-full max-w-xl glass-strong rounded-2xl overflow-hidden border border-cyan-400/20 glow-cyan"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Corner brackets decoration */}
            <div className="corner-brackets pointer-events-none absolute inset-0 z-10 rounded-2xl" />

            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-cyan-400/5">
              <Search
                size={18}
                className="text-cyan-400 shrink-0"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground/60 outline-none font-mono"
                spellCheck={false}
                autoComplete="off"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Command list */}
            <div
              ref={listRef}
              className="max-h-[52vh] overflow-y-auto px-2 py-2"
            >
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Search
                    size={32}
                    className="text-muted-foreground/30 mb-3"
                  />
                  <p className="text-sm text-muted-foreground/60 font-medium">
                    No results found
                  </p>
                  <p className="text-xs text-muted-foreground/40 mt-1">
                    Try a different search term
                  </p>
                </div>
              ) : (
                visibleCategories.map((cat) => {
                  const catOffset = categoryOffsets.get(cat)!;

                  return (
                    <div key={cat} className="mb-1 last:mb-0">
                      {/* Category label */}
                      <div className="px-3 pt-2 pb-1">
                        <span
                          className={`text-[10px] font-mono font-semibold uppercase tracking-wider ${categoryColors[cat]}`}
                        >
                          {categoryLabels[cat]}
                        </span>
                      </div>

                      {/* Items */}
                      {grouped[cat].map((cmd, idx) => {
                        const globalIdx = catOffset + idx;
                        const isActive = globalIdx === safeSelectedIndex;
                        const Icon = cmd.icon;

                        return (
                          <button
                            key={cmd.id}
                            data-active={isActive}
                            onClick={() => {
                              cmd.action();
                              handleClose();
                            }}
                            onMouseEnter={() =>
                              setSelectedIndex(globalIdx)
                            }
                            className={`
                              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                              transition-all duration-150 text-left group
                              ${
                                isActive
                                  ? "bg-cyan-400/10 border border-cyan-400/20 glow-cyan"
                                  : "border border-transparent hover:bg-white/5"
                              }
                            `}
                          >
                            {/* Icon */}
                            <div
                              className={`
                                w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                transition-colors duration-150
                                ${
                                  isActive
                                    ? "bg-cyan-400/20 text-cyan-400"
                                    : "bg-white/5 text-muted-foreground group-hover:text-foreground group-hover:bg-white/10"
                                }
                              `}
                            >
                              <Icon size={16} />
                            </div>

                            {/* Label */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm font-medium truncate ${
                                  isActive
                                    ? "text-foreground"
                                    : "text-foreground/80 group-hover:text-foreground"
                                }`}
                              >
                                {cmd.label}
                              </p>
                            </div>

                            {/* Shortcut hint */}
                            {cmd.shortcut && (
                              <div className="flex items-center gap-1 shrink-0">
                                {cmd.shortcut.split("+").map((k, ki) => (
                                  <span
                                    key={ki}
                                    className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[10px] font-mono text-muted-foreground"
                                  >
                                    {k}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer — keyboard shortcuts help */}
            <div className="px-5 py-3 border-t border-border bg-black/20">
              <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground/50 font-mono">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[9px]">
                    ↑
                  </kbd>
                  <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[9px]">
                    ↓
                  </kbd>
                  <span>navigate</span>
                </span>
                <span className="text-muted-foreground/20">│</span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-secondary border border-border text-[9px]">
                    ↵
                  </kbd>
                  <span>select</span>
                </span>
                <span className="text-muted-foreground/20">│</span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[9px]">
                    esc
                  </kbd>
                  <span>close</span>
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function smoothScrollTo(selector: string) {
  const el = document.querySelector(selector);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
  }
}
