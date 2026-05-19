import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { privyServer } from '@/lib/privy';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get('wallet');
  if (!wallet) return NextResponse.json({ error: 'wallet required' }, { status: 400 });

  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const claims = await privyServer.verifyAuthToken(token);
    const privyUser = await privyServer.getUser(claims.userId);
    const solanaAcct = (privyUser.linkedAccounts as any[]).find(
      (a: any) =>
        a.type === 'wallet' &&
        (a.chainType === 'solana' || a.chain_type === 'solana') &&
        (a.walletClientType === 'privy' || a.wallet_client_type === 'privy'),
    );
    if (solanaAcct?.address !== wallet) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

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

  const sessions = rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return NextResponse.json({ sessions });
}
