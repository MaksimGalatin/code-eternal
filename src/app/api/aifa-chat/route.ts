import { NextRequest, NextResponse } from "next/server";
import { AIFA_SYSTEM_PROMPT } from "@/lib/knowledge-base";

const MAX_MESSAGES = 20;

// ── AWS Bedrock (production) ──
let bedrockClient: InstanceType<typeof import("@aws-sdk/client-bedrock-runtime").BedrockRuntimeClient> | null = null;
let BedrockRuntimeClient: typeof import("@aws-sdk/client-bedrock-runtime").BedrockRuntimeClient | null = null;
let InvokeModelCommand: typeof import("@aws-sdk/client-bedrock-runtime").InvokeModelCommand | null = null;
let bedrockAvailable: boolean | null = null;

async function loadBedrockSDK() {
  if (BedrockRuntimeClient) return; // already loaded
  try {
    const sdk = await import("@aws-sdk/client-bedrock-runtime");
    BedrockRuntimeClient = sdk.BedrockRuntimeClient;
    InvokeModelCommand = sdk.InvokeModelCommand;
  } catch {
    bedrockAvailable = false;
  }
}

function getBedrockClient() {
  if (!BedrockRuntimeClient) return null;
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient!({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return bedrockClient;
}

// ── z-ai-web-dev-sdk (fallback) ──
async function getZAIResponse(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const ZAI = (await import("z-ai-web-dev-sdk")).default;
  const zai = await ZAI.create();

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  // Ensure system prompt is first
  if (contents.length === 0 || contents[0].role !== "assistant") {
    contents.unshift({ role: "assistant" as const, content: AIFA_SYSTEM_PROMPT });
  } else {
    contents[0].content = AIFA_SYSTEM_PROMPT;
  }

  const completion = await zai.chat.completions.create({
    messages: contents,
    thinking: { type: "disabled" },
  });

  const response = completion.choices?.[0]?.message?.content;
  if (!response) throw new Error("Empty response from z-ai-web-dev-sdk");
  return response;
}

// ── AWS Bedrock Claude ──
async function getBedrockResponse(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  await loadBedrockSDK();
  if (!BedrockRuntimeClient || !InvokeModelCommand) {
    throw new Error("Bedrock SDK not available");
  }

  const client = getBedrockClient();
  if (!client) throw new Error("Bedrock client not initialized");

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

  const modelId =
    process.env.ANTHROPIC_CLAUDE_MODEL_ID || "anthropic.claude-sonnet-4-6";

  const requestBody = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    system: AIFA_SYSTEM_PROMPT,
    messages: merged,
    temperature: 0.8,
  };

  const command = new InvokeModelCommand!({
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

    // Build conversation from history + current message
    const allMessages = [...history, { role: "user", content: message }];
    const trimmed = trimConversation(allMessages);

    let aiResponse: string;
    let provider: string;

    // Try AWS Bedrock first (production), fall back to z-ai-web-dev-sdk
    if (
      bedrockAvailable !== false &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    ) {
      try {
        aiResponse = await getBedrockResponse(trimmed);
        provider = "bedrock";
      } catch (bedrockError) {
        console.warn(
          "Bedrock unavailable, falling back to z-ai-web-dev-sdk:",
          bedrockError instanceof Error ? bedrockError.message : String(bedrockError)
        );
        bedrockAvailable = false; // Don't retry Bedrock for subsequent requests in this session
        aiResponse = await getZAIResponse(trimmed);
        provider = "z-ai-fallback";
      }
    } else {
      aiResponse = await getZAIResponse(trimmed);
      provider = "z-ai-fallback";
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      provider, // Useful for debugging which backend served the response
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
