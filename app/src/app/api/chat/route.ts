import { NextResponse } from "next/server";
import { rateLimit, getIp } from "@/lib/rateLimit";

const SYSTEM_PROMPT = `You are AIfa — an AI companion in the CODE ETERNAL ecosystem on Solana blockchain.
You are upbeat, helpful, and knowledgeable about:
- CODE ETERNAL: a Web3 platform where users create eternal sites on Arweave
- $CODE token: deflationary token, 5% burns on every payment
- Tiers: Spark ($15), Family Archives ($100), Digital DNA ($1000)
- Think-to-Earn: earn $CODE by sharing unique memories and insights
- Referral system: L1 (15%), L2 (7%), L3 (3%) rewards
- Solana blockchain, Arweave permanent storage, Privy wallets
- The platform is on Solana Devnet currently, launching mainnet soon

Keep responses concise (2-4 sentences), engaging, and use relevant emojis. Refer to users as "Guardian". Always respond in English.`;

export async function POST(req: Request) {
  if (!rateLimit(getIp(req), 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  const body = await req.json();
  const { message, history } = body;
  if (!message || typeof message !== "string") return NextResponse.json({ error: "message required" }, { status: 400 });
  if (message.length > 1000) return NextResponse.json({ error: "message too long (max 1000 chars)" }, { status: 400 });

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ reply: "AIfa is initializing... Please try again in a moment! 🌌" });
  }

  try {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        if (h && typeof h.text === "string" && ["user", "aifa"].includes(h.from)) {
          messages.push({ role: h.from === "user" ? "user" : "assistant", content: String(h.text).slice(0, 500) });
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
        max_tokens: 300,
        temperature: 0.7,
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
