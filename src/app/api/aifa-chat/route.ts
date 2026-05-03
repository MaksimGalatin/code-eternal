import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { AIFA_SYSTEM_PROMPT } from "@/lib/knowledge-base";

// In-memory conversation store
const conversations = new Map<string, Array<{ role: string; content: string }>>();

const MAX_MESSAGES = 30;

function getOrCreateConversation(sessionId: string): Array<{ role: string; content: string }> {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, [
      { role: "assistant", content: AIFA_SYSTEM_PROMPT },
    ]);
  }
  return conversations.get(sessionId)!;
}

function trimConversation(messages: Array<{ role: string; content: string }>) {
  if (messages.length > MAX_MESSAGES) {
    return [messages[0], ...messages.slice(-(MAX_MESSAGES - 1))];
  }
  return messages;
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId = "default" } = await request.json();

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

    let messages = getOrCreateConversation(sessionId);

    messages.push({ role: "user", content: message });
    messages = trimConversation(messages);

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: messages.map((m) => ({ role: m.role as "assistant" | "user", content: m.content })),
      thinking: { type: "disabled" },
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 500 }
      );
    }

    messages.push({ role: "assistant", content: aiResponse });
    conversations.set(sessionId, messages);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      messageCount: messages.length - 1,
    });
  } catch (error) {
    console.error("AIfa chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId") || "default";
  conversations.delete(sessionId);
  return NextResponse.json({ success: true, message: "Conversation cleared" });
}
