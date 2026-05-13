import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimit, getIp } from "@/lib/rateLimit";

const MAX = { fio: 120, contact: 120, language: 60, avatar_desc: 500, reason: 2000 };

export async function POST(req: Request) {
  const retryAfter = rateLimit(getIp(req), 3, 10 * 60 * 1000);
  if (retryAfter !== null) {
    const mins = Math.ceil(retryAfter / 60);
    return NextResponse.json(
      { error: `Too many requests. Try again in ${mins} minute${mins !== 1 ? "s" : ""}.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { fio, contact, language, avatar_desc, reason } = body as Record<string, string>;

  if (!fio?.trim()) return NextResponse.json({ error: "Full name is required" }, { status: 400 });
  if (!contact?.trim()) return NextResponse.json({ error: "Contact is required" }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: "Please explain why you want to join" }, { status: 400 });

  if (fio.length > MAX.fio) return NextResponse.json({ error: `Name too long (max ${MAX.fio} chars)` }, { status: 400 });
  if (contact.length > MAX.contact) return NextResponse.json({ error: `Contact too long (max ${MAX.contact} chars)` }, { status: 400 });
  if (language && language.length > MAX.language) return NextResponse.json({ error: `Language too long (max ${MAX.language} chars)` }, { status: 400 });
  if (avatar_desc && avatar_desc.length > MAX.avatar_desc) return NextResponse.json({ error: `Avatar description too long (max ${MAX.avatar_desc} chars)` }, { status: 400 });
  if (reason.length > MAX.reason) return NextResponse.json({ error: `Reason too long (max ${MAX.reason} chars)` }, { status: 400 });

  try {
    await db.query(
      `INSERT INTO applications_1000 (fio, contact, language, avatar_desc, reason, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
      [fio.trim(), contact.trim(), language?.trim() || null, avatar_desc?.trim() || null, reason.trim()]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("apply-1000 error:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
