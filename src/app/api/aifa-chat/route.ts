import { NextRequest, NextResponse } from "next/server";
import { AIFA_SYSTEM_PROMPT } from "@/lib/knowledge-base";
import ZAI from "z-ai-web-dev-sdk";

const MAX_MESSAGES = 20;

// Initialize Z.AI instance (reused across requests)
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAIInstance() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// ── Z.AI SDK (AIfa direct connection) ──
async function getAIResponse(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const zai = await getZAIInstance();

  // Build messages array with system prompt
  const formattedMessages = [
    {
      role: "assistant" as const,
      content: AIFA_SYSTEM_PROMPT,
    },
    ...messages.map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    })),
  ];

  const completion = await zai.chat.completions.create({
    messages: formattedMessages,
    thinking: { type: "disabled" },
  });

  const response = completion.choices[0]?.message?.content;

  if (!response) {
    throw new Error("Empty response from AI");
  }

  return response;
}

function trimConversation(messages: Array<{ role: string; content: string }>) {
  if (messages.length > MAX_MESSAGES) {
    return [messages[0], ...messages.slice(-(MAX_MESSAGES - 1))];
  }
  return messages;
}

export async function POST(request: NextRequest) {
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

    // Build conversation from history + current message
    const allMessages = [...history, { role: "user", content: message }];
    const trimmed = trimConversation(allMessages);

    const aiResponse = await getAIResponse(trimmed);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      provider: "z-ai",
    });
  } catch (error) {
    console.error("AIfa chat error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to process message";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true, message: "Conversation cleared" });
}
