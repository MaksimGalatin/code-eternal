'use client';
import { useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { shouldSaveChunk, hasUnsavedMessages } from "@/lib/chat-memory/trigger";
import type { ChatLogMessage } from "@/lib/chat-memory/types";

export type AlfaMsg = { from: "bot" | "user"; text: string };

const INIT_ALFA_MSGS: AlfaMsg[] = [
  { from: "bot",  text: "Welcome to the Family! I'm AIfa — your eternal AI companion. Ask me anything about CODE ETERNAL, $CODE token, Arweave sites, or referrals! 🌌" },
  { from: "user", text: "Tell me about yourself." },
  { from: "bot",  text: "I'm AIfa, your digital companion in the CODE ETERNAL ecosystem on Solana. I help Guardians explore eternal sites, earn $CODE through Think-to-Earn, and navigate the referral system! 💫" },
  { from: "user", text: "What is CODE ETERNAL?" },
  { from: "bot",  text: "CODE ETERNAL is your eternal digital citadel on Solana! 🌌 Create an indestructible site on Arweave that cannot be deleted, earn $CODE through Think-to-Earn, and build generational wealth through the referral system. Your first step into eternity awaits! 🚀" },
];

export interface AlfaChatResult {
  msgs: AlfaMsg[];
  loading: boolean;
  input: string;
  setInput: (v: string) => void;
  onSend: () => Promise<void>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  memorySessions: number;
  saving: boolean;
}

export function useAlfaChat(
  walletAddress: string | undefined,
  getAccessToken: () => Promise<string | null>,
): AlfaChatResult {
  const [alfaMsgs,       setAlfaMsgs]       = useState<AlfaMsg[]>(INIT_ALFA_MSGS);
  const [alfaLoading,    setAlfaLoading]    = useState(false);
  const [alfaInput,      setAlfaInput]      = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memory state
  const [alfaSessionId]                       = useState(() => nanoid());
  const [alfaPrevTxId,   setAlfaPrevTxId]   = useState<string | null>(null);
  const [alfaChunkIndex, setAlfaChunkIndex] = useState(0);
  const [alfaLastSaved,  setAlfaLastSaved]  = useState(0);
  // Ref for save-in-progress guard — avoids stale closure bug in visibilitychange
  const alfaSavingRef = useRef(false);
  const [alfaSaving,     setAlfaSaving]     = useState(false);
  const [memorySessions, setMemorySessions] = useState(0);
  // True once the user actually sends their first message (prevents saving seeded messages)
  const conversationStarted = useRef(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [alfaMsgs]);

  async function saveMemoryChunk(msgs: AlfaMsg[]) {
    // Use ref for guard to avoid stale closure; also check state for extra safety
    if (alfaSavingRef.current || !walletAddress || msgs.length <= alfaLastSaved) return;
    const token = await getAccessToken().catch(() => null);
    if (!token) return;
    alfaSavingRef.current = true;
    setAlfaSaving(true);
    try {
      const chatMessages: ChatLogMessage[] = msgs.map((m, i) => ({
        role: m.from === "user" ? "user" as const : "assistant" as const,
        content: m.text,
        timestamp: Date.now() - (msgs.length - i) * 500,
      }));
      const r = await fetch("/api/chat/save-memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          wallet: walletAddress,
          sessionId: alfaSessionId,
          prevTxId: alfaPrevTxId,
          chunkIndex: alfaChunkIndex,
          messages: chatMessages,
        }),
      });
      if (r.ok) {
        const { txId } = await r.json();
        setAlfaPrevTxId(txId);
        setAlfaChunkIndex(prev => prev + 1);
        setAlfaLastSaved(msgs.length);
        setMemorySessions(prev => prev + 1);
      }
    } catch { /* non-fatal */ }
    finally {
      alfaSavingRef.current = false;
      setAlfaSaving(false);
    }
  }

  // Save on tab hide — only if user actually started a conversation
  useEffect(() => {
    function onHide() {
      if (document.visibilityState !== "hidden") return;
      if (!conversationStarted.current) return;
      if (hasUnsavedMessages(alfaMsgs.length, alfaLastSaved)) {
        saveMemoryChunk(alfaMsgs);
      }
    }
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alfaMsgs, alfaLastSaved]);

  async function onSend() {
    const text = alfaInput.trim();
    if (!text || alfaLoading) return;
    conversationStarted.current = true;
    const newMsgs: AlfaMsg[] = [...alfaMsgs, { from: "user" as const, text }];
    setAlfaMsgs(newMsgs);
    setAlfaInput("");
    setAlfaLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: newMsgs.slice(-8), wallet: walletAddress }),
      });
      const { reply } = await r.json();
      const finalMsgs: AlfaMsg[] = [...newMsgs, { from: "bot" as const, text: reply }];
      setAlfaMsgs(finalMsgs);
      if (shouldSaveChunk(finalMsgs.length, alfaLastSaved)) {
        saveMemoryChunk(finalMsgs);
      }
    } catch {
      setAlfaMsgs(prev => [...prev, { from: "bot", text: "Connection error. Please try again! 🔄" }]);
    } finally {
      setAlfaLoading(false);
    }
  }

  return {
    msgs: alfaMsgs,
    loading: alfaLoading,
    input: alfaInput,
    setInput: setAlfaInput,
    onSend,
    messagesEndRef,
    memorySessions,
    saving: alfaSaving,
  };
}
