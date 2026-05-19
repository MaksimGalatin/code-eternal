import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Returns the latest chunk per session for a wallet — used by the Memory portal tab.
// Grouped by session_id so each conversation appears once.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });

  const { rows } = await db.query<{
    tx_id: string;
    session_id: string;
    chat_title: string;
    summary: string;
    msg_count: number;
    created_at: string;
  }>(
    `SELECT DISTINCT ON (session_id)
       tx_id, session_id, chat_title, summary, msg_count, created_at
     FROM chat_sessions
     WHERE wallet = $1
     ORDER BY session_id, chunk_index DESC, created_at DESC`,
    [wallet],
  );

  // Sort newest first after the DISTINCT reduction
  const sessions = rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return NextResponse.json({ sessions });
}
