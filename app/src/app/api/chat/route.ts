import { NextResponse } from "next/server";
import { rateLimit, getIp } from "@/lib/rateLimit";
import { AIFA_SYSTEM_PROMPT } from "@/lib/knowledge-base";

export async function POST(req: Request) {
  if (rateLimit(getIp(req), 20, 60_000) !== null) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = await req.json();
  const { message, history } = body;
  if (!message || typeof message !== "string") return NextResponse.json({ error: "message required" }, { status: 400 });
  if (message.length > 2000) return NextResponse.json({ error: "message too long (max 2000 chars)" }, { status: 400 });

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: "AIfa is initializing... Please try again in a moment! 🌌" });
  }

  try {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: AIFA_SYSTEM_PROMPT },
    ];

    if (Array.isArray(history)) {
      for (const h of history.slice(-10)) {
        if (h && typeof h.text === "string" && ["user", "bot"].includes(h.from)) {
          messages.push({ role: h.from === "user" ? "user" : "assistant", content: String(h.text).slice(0, 1000) });
        }
      }
    }

    messages.push({ role: "user", content: message });

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3-mini",
        messages,
        max_tokens: 2000,
        temperature: 0.8,
      }),
    });

    if (!grokRes.ok) {
      console.error("Grok API error:", grokRes.status);
      return NextResponse.json({ reply: "I'm having trouble connecting right now, Guardian. Try again! 🔄" });
    }

    const data = await grokRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "Hmm, I couldn't process that. Ask me anything about CODE ETERNAL! 🌌";
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: "Connection error, Guardian. Please try again! 🔄" });
  }
}
