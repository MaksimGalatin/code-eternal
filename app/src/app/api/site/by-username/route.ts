import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get("username")?.toLowerCase().trim();
  if (!username || !/^[a-z0-9_-]{1,32}$/.test(username)) {
    return NextResponse.json({ error: "invalid username" }, { status: 400 });
  }

  const res = await db.query(
    `SELECT sgj.arweave_url
     FROM users u
     INNER JOIN site_generation_jobs sgj ON sgj.wallet = u.wallet AND sgj.status = 'done'
     WHERE u.username = $1
     ORDER BY sgj.created_at DESC
     LIMIT 1`,
    [username]
  );

  const arweaveUrl = res.rows[0]?.arweave_url ?? null;
  if (!arweaveUrl) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ arweaveUrl }, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" },
  });
}
