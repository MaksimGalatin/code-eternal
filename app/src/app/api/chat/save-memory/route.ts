import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { privyServer } from '@/lib/privy';
import { rateLimit, getIp } from '@/lib/rateLimit';
import { prepareTags } from '@/lib/chat-memory/tags';
import type { ChatFilePayload, ChatLogMessage } from '@/lib/chat-memory/types';

const GROK_API_KEY = process.env.GROK_API_KEY;
const IRYS_NODE_URL = process.env.IRYS_NODE_URL ?? 'https://devnet.irys.xyz';
const HELIUS_RPC_URL = process.env.HELIUS_RPC_URL;
const IRYS_PRIVATE_KEY = process.env.IRYS_PRIVATE_KEY;

async function generateSummaryAndFacts(
  messages: ChatLogMessage[],
): Promise<{ summary: string; keyFacts: string[]; title: string }> {
  if (!GROK_API_KEY) return { summary: '', keyFacts: [], title: 'Session' };

  const conversation = messages
    .map(m => `${m.role === 'user' ? 'User' : 'AIfa'}: ${m.content}`)
    .join('\n');

  try {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROK_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content:
              'You extract memory from conversations. Return ONLY valid JSON, no markdown, no explanation.',
          },
          {
            role: 'user',
            content: `Analyze this conversation and return JSON with three fields:
1. "title": a short 3-5 word title for this conversation
2. "summary": 2-3 sentence summary of what was discussed
3. "keyFacts": array of up to 5 notable facts about the user revealed in this conversation (interests, goals, name, preferences). Empty array if none.

Conversation:
${conversation.slice(0, 8000)}`,
          },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return { summary: '', keyFacts: [], title: 'Session' };
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? '{}';
    // Strip markdown code fences if model adds them despite instructions
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      title: String(parsed.title ?? 'Session').slice(0, 150),
      summary: String(parsed.summary ?? '').slice(0, 1000),
      keyFacts: Array.isArray(parsed.keyFacts)
        ? (parsed.keyFacts as string[]).slice(0, 5).map(f => String(f).slice(0, 200))
        : [],
    };
  } catch {
    return { summary: '', keyFacts: [], title: 'Session' };
  }
}

async function uploadToIrys(
  payload: ChatFilePayload,
  tags: Array<{ name: string; value: string }>,
): Promise<string> {
  // Dynamic import so webpack doesn't bundle @irys/sdk into every route
  const { default: Irys } = await import('@irys/sdk');
  const irys = new Irys({
    url: IRYS_NODE_URL,
    token: 'solana',
    key: IRYS_PRIVATE_KEY!,
    config: { providerUrl: HELIUS_RPC_URL! },
  });
  const receipt = await irys.upload(JSON.stringify(payload), { tags });
  return receipt.id as string;
}

export async function POST(req: Request) {
  if (rateLimit(getIp(req), 10, 60_000) !== null) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // Auth
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let authenticatedWallet: string;
  try {
    const claims = await privyServer.verifyAuthToken(token);
    const privyUser = await privyServer.getUser(claims.userId);
    const solanaAcct = (privyUser.linkedAccounts as any[]).find(
      (a: any) =>
        a.type === 'wallet' &&
        (a.chainType === 'solana' || a.chain_type === 'solana') &&
        (a.walletClientType === 'privy' || a.wallet_client_type === 'privy'),
    );
    if (!solanaAcct?.address) {
      return NextResponse.json({ error: 'no solana wallet linked' }, { status: 403 });
    }
    authenticatedWallet = solanaAcct.address as string;
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: {
    wallet?: string;
    sessionId?: string;
    prevTxId?: string | null;
    chunkIndex?: number;
    messages?: ChatLogMessage[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const { wallet, sessionId, prevTxId = null, chunkIndex = 0, messages } = body;

  if (wallet !== authenticatedWallet) {
    return NextResponse.json({ error: 'wallet mismatch' }, { status: 403 });
  }
  if (!sessionId || typeof sessionId !== 'string') {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }
  if (!IRYS_PRIVATE_KEY || !HELIUS_RPC_URL) {
    return NextResponse.json({ error: 'storage not configured' }, { status: 503 });
  }

  const { summary, keyFacts, title } = await generateSummaryAndFacts(messages);

  const payload: ChatFilePayload = {
    version: 1,
    wallet: wallet!,
    sessionId,
    chunkIndex,
    prevTxId: prevTxId ?? null,
    metadata: { summary, keyFacts },
    messages,
  };

  const tags = prepareTags(payload, title);

  let txId: string;
  try {
    txId = await uploadToIrys(payload, tags);
  } catch (err) {
    console.error('Irys upload failed:', err);
    return NextResponse.json({ error: 'upload failed' }, { status: 502 });
  }

  // Persist to DB — update pointer on users + insert session index row
  await db.query('UPDATE users SET last_chat_tx_id=$1 WHERE wallet=$2', [txId, wallet]);
  await db.query(
    `INSERT INTO chat_sessions
       (wallet, tx_id, prev_tx_id, session_id, chunk_index, chat_title, summary, msg_count)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (tx_id) DO NOTHING`,
    [wallet, txId, prevTxId ?? null, sessionId, chunkIndex, title, summary, messages.length],
  );

  return NextResponse.json({ txId });
}
