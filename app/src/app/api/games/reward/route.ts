import { db } from "@/lib/db";
import { rateLimit, getIp } from "@/lib/rateLimit";

const TOKENS: Record<string, number> = {
  ttt: 1,
  checkers: 5,
  chess: 35,
  backgammon: 35,
};

const VALID_GAMES = new Set(Object.keys(TOKENS));
const WALLET_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function POST(req: Request) {
  const ip = getIp(req);
  if (rateLimit(ip, 15, 60_000) !== null) {
    return Response.json({ error: "Rate limited" }, { status: 429 });
  }

  let body: { wallet?: unknown; gameType?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { wallet, gameType, sessionId } = body;

  if (
    typeof wallet !== "string" ||
    !WALLET_RE.test(wallet)
  ) {
    return Response.json({ error: "Invalid wallet" }, { status: 400 });
  }

  if (typeof gameType !== "string" || !VALID_GAMES.has(gameType)) {
    return Response.json({ error: "Invalid gameType" }, { status: 400 });
  }

  if (
    typeof sessionId !== "string" ||
    sessionId.length < 8 ||
    sessionId.length > 128
  ) {
    return Response.json({ error: "Invalid sessionId" }, { status: 400 });
  }

  const tokens = TOKENS[gameType];

  try {
    const result = await db.query(
      `INSERT INTO game_wins (wallet, game_type, tokens_earned, session_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (session_id) DO NOTHING
       RETURNING id`,
      [wallet, gameType, tokens, sessionId]
    );
    const rewarded = (result.rowCount ?? 0) > 0;
    return Response.json({ ok: true, rewarded, tokens: rewarded ? tokens : 0 });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
