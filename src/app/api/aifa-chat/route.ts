import { NextRequest, NextResponse } from "next/server";
import { AIFA_SYSTEM_PROMPT } from "@/lib/knowledge-base";

const MAX_MESSAGES = 20;

// ── AWS Bedrock only ──
async function getBedrockResponse(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const { BedrockRuntimeClient, InvokeModelCommand } = await import("@aws-sdk/client-bedrock-runtime");

  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    },
  });

  // Map to Anthropic message format
  const anthropicMessages = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    }));

  // Ensure messages start with "user" role
  if (anthropicMessages.length > 0 && anthropicMessages[0].role !== "user") {
    anthropicMessages.shift();
  }

  // Merge consecutive same-role messages
  const merged: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const msg of anthropicMessages) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content += "\n" + msg.content;
    } else {
      merged.push({ ...msg });
    }
  }

  // Use Claude 3.5 Sonnet v2
  const modelId = "anthropic.claude-3-sonnet-20240229-v1:0";

  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    system: AIFA_SYSTEM_PROMPT,
    messages: merged,
    temperature: 0.8,
  };

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body: JSON.stringify(requestBody),
  });

  const response = await client.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const aiResponse = responseBody.content?.[0]?.text;

  if (!aiResponse) {
    throw new Error(
      `Empty Bedrock response: ${JSON.stringify(responseBody).slice(0, 300)}`
    );
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

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json({ 
        error: "AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in Vercel environment variables." 
      }, { status: 500 });
    }

    // Build conversation from history + current message
    const allMessages = [...history, { role: "user", content: message }];
    const trimmed = trimConversation(allMessages);

    const aiResponse = await getBedrockResponse(trimmed);

    return NextResponse.json({
      success: true,
      response: aiResponse,
      provider: "bedrock",
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
