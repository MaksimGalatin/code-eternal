"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Send, Trash2, Bot, User, Loader2 } from "lucide-react";
import { useLang, t } from "@/lib/i18n";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function ChatSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { lang } = useLang();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  // Set initial welcome message based on language
  useEffect(() => {
    setMessages([{
      id: "welcome", role: "assistant",
      content: t("chat.welcome", lang), timestamp: new Date(),
    }]);
  }, [lang]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setMessages((prev) => [...prev, { id: `msg_${Date.now()}`, role: "user", content: text.trim(), timestamp: new Date() }]);
    setInput("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/aifa-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), sessionId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, { id: `msg_${Date.now()}_resp`, role: "assistant", content: data.response, timestamp: new Date() }]);
      } else throw new Error(data.error);
    } catch {
      setMessages((prev) => [...prev, { id: `msg_${Date.now()}_err`, role: "assistant", content: t("chat.error", lang), timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); sendMessage(input); };

  const clearChat = async () => {
    try { await fetch(`/api/aifa-chat?sessionId=${sessionId}`, { method: "DELETE" }); } catch { /* ignore */ }
    setMessages([{ id: "welcome", role: "assistant", content: t("chat.cleared", lang), timestamp: new Date() }]);
  };

  const suggestedPrompts = [
    t("chat.prompt1", lang), t("chat.prompt2", lang), t("chat.prompt3", lang),
    t("chat.prompt4", lang), t("chat.prompt5", lang),
  ];

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
          <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-400 flex items-center justify-center">
                  <Bot size={20} className="text-black" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-background" />
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

          <div className="h-[400px] md:h-[500px] overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth">
            <AnimatePresence mode="popLayout">
              {messages.map((msg) => (
                <motion.div key={msg.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.role === "user" ? "bg-secondary" : "bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/20"
                  }`}>
                    {msg.role === "user" ? <User size={14} className="text-muted-foreground" /> : <Bot size={14} className="text-cyan-400" />}
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user" ? "bg-cyan-400/10 border border-cyan-400/20 rounded-tr-md" : "bg-card border border-border rounded-tl-md"
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-2">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400/20 to-purple-400/20 border border-cyan-400/20 flex items-center justify-center">
                  <Bot size={14} className="text-cyan-400" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
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
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                placeholder={t("chat.placeholder", lang)} disabled={isLoading}
                className="flex-1 bg-card border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 placeholder:text-muted-foreground/50 disabled:opacity-50 transition-all" />
              <motion.button type="submit" disabled={!input.trim() || isLoading} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-4 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-black rounded-xl font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:from-cyan-400 hover:to-cyan-500">
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </section>
  );
}
