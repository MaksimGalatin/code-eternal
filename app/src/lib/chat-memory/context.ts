// Server-side only — imported by /api/chat/route.ts
import type { ChatFilePayload } from './types';

const IRYS_NODE_URL = process.env.IRYS_NODE_URL ?? 'https://devnet.irys.xyz';

export async function loadPayloadByTxId(txId: string): Promise<ChatFilePayload | null> {
  try {
    const res = await fetch(`${IRYS_NODE_URL}/${txId}`);
    if (!res.ok) return null;
    return (await res.json()) as ChatFilePayload;
  } catch {
    return null;
  }
}

export interface AIMemoryContext {
  systemPromptAddition: string;
}

export function prepareContextForAI(payload: ChatFilePayload): AIMemoryContext {
  const { summary, keyFacts } = payload.metadata;

  const factBlock =
    keyFacts.length > 0
      ? `Known facts about this user:\n${keyFacts.map(f => `• ${f}`).join('\n')}`
      : '';

  const summaryBlock = summary ? `What we discussed before:\n${summary}` : '';

  const systemPromptAddition = [factBlock, summaryBlock].filter(Boolean).join('\n\n');

  return { systemPromptAddition };
}
