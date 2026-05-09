import type { NextApiRequest, NextApiResponse } from "next";

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { message, history } = req.body;
  if (!message || typeof message !== "string") return res.status(400).json({ error: "message required" });

  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) {
    return res.json({ reply: "AIfa is initializing... Please try again in a moment! 🌌" });
  }

  try {
    const messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (Array.isArray(history)) {
      for (const h of history.slice(-6)) {
        messages.push({ role: h.from === "user" ? "user" : "assistant", content: h.text });
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
      const err = await grokRes.text();
      console.error("Grok API error:", grokRes.status, err);
      return res.json({ reply: "I'm having trouble connecting right now, Guardian. Try again! 🔄" });
    }

    const data = await grokRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "Hmm, I couldn't process that. Ask me anything about CODE ETERNAL! 🌌";
    res.json({ reply });
  } catch (e: any) {
    console.error("Chat error:", e.message);
    res.json({ reply: "Connection error, Guardian. Please try again! 🔄" });
  }
}
