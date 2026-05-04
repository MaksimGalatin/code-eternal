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

  // Set initial welcome message and animate it
  useEffect(() => {
    const welcomeText = t("chat.welcome", lang);
    setMessages([{
      id: "welcome", role: "assistant",
      content: welcomeText, timestamp: new Date(), revealed: 0,
    }]);

    const timer = setTimeout(() => {
      animateStreaming("welcome", welcomeText);
    }, 300);
    return () => clearTimeout(timer);
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
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-cyan-400/3 blur-[150px] pointer-events-none" />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }}
          className="text-center mb-12">
          <span className="section-label-glow text-xs md:text-sm font-mono text-cyan-400 tracking-[0.3em] mb-4 block">{t("chat.label", lang)}</span>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">
            {t("chat.title1", lang)}{" "}
            <span className="text-gradient-animated">{t("chat.title2", lang)}</span>
          </h2>
          <p className="max-w-2xl mx-auto text-muted-foreground text-base md:text-lg">{t("chat.subtitle", lang)}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8, delay: 0.2 }}
          className={`rounded-2xl border overflow-hidden glass-strong corner-brackets transition-all duration-500 ${isStreamActive ? 'border-cyan-400/30 shadow-[0_0_30px_rgba(0,229,255,0.08),inset_0_0_30px_rgba(0,229,255,0.03)]' : 'border-border'}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center">
                  <Bot size={20} className="text-black" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background status-dot-online" />
              </div>
              <div>
                <p className="font-semibold text-sm">AIfa</p>
                <p className="text-xs text-emerald-400">{t("chat.online", lang)}</p>
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
                    <div className={`group max-w-[80%] rounded-2xl px-4 py-3 relative ${
                      msg.role === "user"
                        ? "bg-cyan-400/10 border border-cyan-400/20 rounded-tr-md"
                        : `bg-card border border-border rounded-tl-md ${isStreaming ? "streaming-fog" : ""}`
                    }`}>
                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "assistant" && isStreaming ? "text-cyan-50/90" : ""}`}>
                        {msg.role === "assistant" ? visibleText : msg.content}
                        {msg.role === "assistant" && isStreaming && (
                          <span className="inline-block w-[2px] h-[14px] bg-cyan-400 animate-pulse ml-[1px] align-middle rounded-full" />
                        )}
                      </p>
                      <p className={`text-[10px] text-muted-foreground mt-1 text-right transition-opacity duration-200 ${isStreaming ? 'opacity-0' : 'opacity-40 group-hover:opacity-70'}`}>
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {isLoading && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/20 flex items-center justify-center">
                  <Bot size={14} className="text-cyan-400" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="typing-indicator">
                    <span/><span/><span/>
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
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-cyan-400/30 hover:bg-cyan-400/5 text-muted-foreground hover:text-cyan-400 transition-all hover-lift">
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
                className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 focus:shadow-[0_0_20px_rgba(0,229,255,0.1),0_0_40px_rgba(0,229,255,0.05)] placeholder:text-muted-foreground/50 disabled:opacity-50 transition-all duration-300" />
              <motion.button type="submit" disabled={!input.trim() || isBusy} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="glow-button px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:from-cyan-400 hover:to-cyan-500">
                {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
