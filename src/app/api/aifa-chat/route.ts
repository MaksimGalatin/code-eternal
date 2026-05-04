import { NextRequest, NextResponse } from "next/server";
import { AIFA_SYSTEM_PROMPT } from "@/lib/knowledge-base";
import ZAI from "z-ai-web-dev-sdk";

const MAX_MESSAGES = 20;

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

    // Map to SDK format: "assistant" role for system prompt, "user" for user messages
    const contents = trimmed.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

    // Ensure system prompt is first
    if (contents.length === 0 || contents[0].role !== "assistant") {
      contents.unshift({ role: "assistant" as const, content: AIFA_SYSTEM_PROMPT });
    } else {
      contents[0].content = AIFA_SYSTEM_PROMPT;
    }

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: contents,
      thinking: { type: "disabled" },
    });

    const aiResponse = completion.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error("Empty AI response from SDK");
      return NextResponse.json(
        { error: "Empty response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
    });
  } catch (error) {
    console.error("AIfa chat error:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true, message: "Conversation cleared" });
}
