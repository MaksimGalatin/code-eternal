"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Send, Trash2, Bot, User, Loader2 } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  revealed: number;
}

// localStorage persistence helpers
const CHAT_STORAGE_KEY = "code-chat-messages";
const MAX_STORED_MESSAGES = 50;

function serializeMessages(msgs: Message[]): string {
  const toStore = msgs.slice(-MAX_STORED_MESSAGES);
  return JSON.stringify(
    toStore.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      timestamp: m.timestamp.toISOString(),
      revealed: m.revealed,
    }))
  );
}

function deserializeMessages(json: string | null): Message[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((m: Record<string, unknown>) => ({
      id: String(m.id),
      role: m.role === "user" ? "user" as const : "assistant" as const,
      content: String(m.content),
      timestamp: new Date(String(m.timestamp)),
      revealed: Number(m.revealed),
    }));
  } catch {
    return null;
  }
}

function getCharDelay(char: string): number {
  if (char === " ") return 8;
  if (char === "\n") return 30;
  return 18 + Math.random() * 14;
}

export default function ChatSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { lang } = useLang();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const streamingTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ── Callbacks (must be defined before effects that use them) ──

  const scrollToBottom = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, []);

  const animateStreaming = useCallback((msgId: string, content: string) => {
    streamingTimerRef.current.forEach(clearTimeout);
    streamingTimerRef.current = [];
    setIsStreamActive(true);

    let totalDelay = 0;
    const contentLen = content.length;
    const batchSize = 2;

    for (let i = 0; i < contentLen; i += batchSize) {
      const end = Math.min(i + batchSize, contentLen);
      totalDelay += getCharDelay(content[Math.min(i + 1, contentLen - 1)]);

      const idx = end;
      const tm = setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, revealed: idx } : m))
        );
        if (idx >= contentLen) {
          setIsStreamActive(false);
          scrollToBottom();
          setTimeout(() => inputRef.current?.focus(), 50);
        }
      }, totalDelay);
      streamingTimerRef.current.push(tm);
    }
  }, [scrollToBottom]);

  // ── Effects ──

  // Persist messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, serializeMessages(messages));
      } catch { /* storage full or unavailable — ignore */ }
    }
  }, [messages]);

  // Track previous lang to detect language changes
  const prevLangRef = useRef(lang);

  // Set initial welcome message and animate it, or update on language change
  useEffect(() => {
    const welcomeText = t("chat.welcome", lang);
    const isLangChange = prevLangRef.current !== lang;
    prevLangRef.current = lang;

    setMessages((prev) => {
      // On language change with existing messages: preserve conversation
      if (isLangChange && prev.length > 0) {
        const hasUserMessages = prev.some((m) => m.role === "user");
        if (hasUserMessages) {
          // Don't touch messages at all — conversation is preserved as-is
          return prev;
        }
        // Only welcome message exists: update its text without re-animating
        return prev.map((m) =>
          m.id === "welcome"
            ? { ...m, content: welcomeText, revealed: welcomeText.length }
            : m
        );
      }

      // Try to restore saved messages from localStorage on initial mount
      const saved = deserializeMessages(localStorage.getItem(CHAT_STORAGE_KEY));
      if (saved && saved.length > 0) {
        // Mark all restored messages as fully revealed (no re-animation)
        return saved.map((m) => ({
          ...m,
          revealed: m.content.length,
        }));
      }

      // No saved messages: set fresh welcome message
      return [{
        id: "welcome", role: "assistant",
        content: welcomeText, timestamp: new Date(), revealed: 0,
      }];
    });

    // Only animate on initial mount with no saved messages, not on language change
    if (!isLangChange) {
      const saved = deserializeMessages(localStorage.getItem(CHAT_STORAGE_KEY));
      if (!saved || saved.length === 0) {
        const timer = setTimeout(() => {
          animateStreaming("welcome", welcomeText);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [lang, animateStreaming]);

  // Auto-scroll when messages change
  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Auto-focus input when AIfa finishes typing
  useEffect(() => {
    if (!isLoading && !isStreamActive && messages.length > 1) {
      inputRef.current?.focus();
    }
  }, [isLoading, isStreamActive, messages.length]);

  // Cleanup timers on unmount
  useEffect(() => () => streamingTimerRef.current.forEach(clearTimeout), []);

  // ── Handlers ──

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isStreamActive) return;

    const userMsg: Message = { id: `msg_${Date.now()}`, role: "user", content: text.trim(), timestamp: new Date(), revealed: 0 };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/aifa-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.filter(m => m.role !== 'assistant' || m.revealed >= m.content.length)
            .map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (data.success) {
        const respId = `msg_${Date.now()}_resp`;
        const assistantMsg: Message = {
          id: respId, role: "assistant", content: data.response,
          timestamp: new Date(), revealed: 0,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setTimeout(() => animateStreaming(respId, data.response), 150);
      } else {
        throw new Error(data.error);
      }
    } catch {
      const errId = `msg_${Date.now()}_err`;
      const errText = t("chat.error", lang);
      setMessages((prev) => [...prev, { id: errId, role: "assistant", content: errText, timestamp: new Date(), revealed: 0 }]);
      setTimeout(() => animateStreaming(errId, errText), 100);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); sendMessage(input); };

  const clearChat = async () => {
    try { await fetch("/api/aifa-chat", { method: "DELETE" }); } catch { /* ignore */ }
    streamingTimerRef.current.forEach(clearTimeout);
    streamingTimerRef.current = [];
    setIsStreamActive(false);
    // Clear localStorage persistence
    localStorage.removeItem(CHAT_STORAGE_KEY);
    const clearedId = `welcome_${Date.now()}`;
    const clearedContent = t("chat.cleared", lang);
    setMessages([{ id: clearedId, role: "assistant", content: clearedContent, timestamp: new Date(), revealed: 0 }]);
    setTimeout(() => animateStreaming(clearedId, clearedContent), 100);
  };

  const suggestedPrompts = [
    t("chat.prompt1", lang), t("chat.prompt2", lang), t("chat.prompt3", lang),
    t("chat.prompt4", lang), t("chat.prompt5", lang),
  ];

  const hasActiveStream = messages.some((m) => m.revealed < m.content.length);
  const isBusy = isLoading || isStreamActive;

  // ── Render ──

  return (
    <section id="terminal" className="relative py-24 md:py-32" ref={ref}>
      <div className="section-divider mb-24" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="text-center mb-12">
          <span className="text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">{t("chat.label", lang)}</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("chat.title1", lang)}{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">{t("chat.title2", lang)}</span>
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground text-base md:text-lg">{t("chat.subtitle", lang)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.2 }}
          className="rounded-2xl border border-border overflow-hidden glass-strong">
          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center${isBusy ? " animate-pulse" : ""}`}>
                  <Bot size={20} className="text-black" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
              </div>
              <div>
                <p className="font-semibold text-sm">AIfa</p>
                <p className="text-xs text-emerald-400 flex items-center">
                  {t("chat.online", lang)}
                  {!isBusy && messages.length <= 1 && (
                    <span className="inline-flex gap-0.5 ml-1">
                      <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
                      <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1.4s' }} />
                      <span className="w-1 h-1 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1.4s' }} />
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button onClick={clearChat} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors" title="Clear">
              <Trash2 size={16} />
            </button>
          </div>

          {/* Messages area */}
          <div ref={scrollContainerRef} className="h-[400px] md:h-[500px] overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => {
                const isStreaming = msg.revealed < msg.content.length;
                const visibleText = msg.content.slice(0, msg.revealed);
                return (
                  <motion.div key={msg.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.role === "user" ? "bg-secondary" : "bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/20"
                    }`}>
                      {msg.role === "user" ? <User size={14} className="text-muted-foreground" /> : <Bot size={14} className="text-cyan-400" />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-cyan-400/10 border border-cyan-400/20 rounded-tr-md"
                        : `bg-card border rounded-tl-md ${isStreaming ? "border-cyan-400/30 streaming-fog" : "border-border"}`
                    }`}>
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "assistant" && isStreaming ? "text-cyan-50/90" : ""}`}>
                        {msg.role === "assistant" ? visibleText : msg.content}
                        {msg.role === "assistant" && isStreaming && (
                          <span className="inline-block w-[2px] h-[14px] bg-cyan-400 animate-pulse ml-[1px] align-middle rounded-full" />
                        )}
                      </p>
                      {!isStreaming && (
                        <p className="text-[10px] text-muted-foreground/50 mt-2">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/20 flex items-center justify-center">
                  <Bot size={14} className="text-cyan-400" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-end gap-[3px] h-5">
                    <div className="neural-bar" />
                    <div className="neural-bar" />
                    <div className="neural-bar" />
                    <div className="neural-bar" />
                    <div className="neural-bar" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && !hasActiveStream && (
            <div className="px-4 md:px-6 pb-3">
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button key={prompt} onClick={() => sendMessage(prompt)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-cyan-400/30 hover:bg-cyan-400/5 text-muted-foreground hover:text-cyan-400 transition-all">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="border-t border-border p-3 md:p-4">
            <div className="flex items-center gap-3">
              <input ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={t("chat.placeholder", lang)} disabled={isBusy}
                className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none chat-input-glow placeholder:text-muted-foreground/50 disabled:opacity-50 transition-all" />
              <motion.button type="submit" disabled={!input.trim() || isBusy} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:from-cyan-400 hover:to-cyan-500">
                {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
