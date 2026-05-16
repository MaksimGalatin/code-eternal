import { NextRequest, NextResponse } from "next/server";
import { AIFA_SYSTEM_PROMPT } from "@/lib/knowledge-base";
import { rateLimit, getIp } from "@/lib/rateLimit";

const MAX_MESSAGES = 20;

// ── Grok API (xAI) - OpenAI compatible ──
async function getGrokResponse(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const apiKey = process.env.GROK_API_KEY;
  
  if (!apiKey) {
    throw new Error("GROK_API_KEY not configured");
  }

  // Build messages with system prompt
  const formattedMessages = [
    { role: "system", content: AIFA_SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-3",
      messages: formattedMessages,
      max_tokens: 2048,
      temperature: 0.8,
    }),
  });

  if (!response.ok) {
    console.error("Grok API error:", response.status);
    throw new Error("upstream_error");
  }

  const data = await response.json();
  const aiResponse = data.choices?.[0]?.message?.content;

  if (!aiResponse) {
    throw new Error("Empty response from Grok");
  }

  return aiResponse;
}

function trimConversation(messages: Array<{ role: string; content: string }>) {
  if (messages.length > MAX_MESSAGES) {
    return [messages[0], ...messages.slice(-(MAX_MESSAGES - 1))];
  }
  return messages;
}

export async function POST(request: NextRequest) {
  if (rateLimit(getIp(request), 10, 60_000) !== null) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const { message, history = [] } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    if (!process.env.GROK_API_KEY) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }

    // Build conversation from history + current message
    const allMessages = [...history, { role: "user", content: message }];
    const trimmed = trimConversation(allMessages);

    const aiResponse = await getGrokResponse(trimmed);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      provider: "grok",
    });
  } catch (error) {
    console.error("AIfa chat error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true, message: "Conversation cleared" });
}
