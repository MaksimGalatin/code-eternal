import { db } from "@/lib/db";

const VALID_GAMES = new Set(["ttt", "checkers", "chess", "backgammon"]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game") ?? "";

  if (!VALID_GAMES.has(game)) {
    return Response.json({ error: "Invalid game" }, { status: 400 });
  }

  try {
    const result = await db.query(
      `SELECT
         wallet,
         COUNT(*)::int            AS wins,
         SUM(tokens_earned)::int  AS tokens
       FROM game_wins
       WHERE game_type = $1
       GROUP BY wallet
       ORDER BY wins DESC, tokens DESC
       LIMIT 100`,
      [game]
    );

    const leaderboard = result.rows.map((row, i) => ({
      rank: i + 1,
      wallet: row.wallet as string,
      wins: row.wins as number,
      tokens: row.tokens as number,
    }));

    return Response.json({ leaderboard });
  } catch {
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
