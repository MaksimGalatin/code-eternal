import { NextResponse } from "next/server";
import { rateLimit, getIp } from "@/lib/rateLimit";

function isValidEmail(email: string): boolean {
  const at = email.indexOf("@");
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1 && !/\s/.test(email);
}

export async function POST(request: Request) {
  if (rateLimit(getIp(request as Parameters<typeof getIp>[0]), 3, 60_000) !== null) {
    return NextResponse.json({ success: false, error: "Too many requests." }, { status: 429 });
  }

  let body: { email?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const { email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ success: false, error: "Email is required." }, { status: 400 });
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 254) {
    return NextResponse.json({ success: false, error: "Invalid email format." }, { status: 400 });
  }

  if (!isValidEmail(trimmed)) {
    return NextResponse.json(
      { success: false, error: "Invalid email format. Please provide a valid email address." },
      { status: 400 }
    );
  }

  // Vercel filesystem is read-only — log the subscription server-side
  // TODO: wire to Resend/database when newsletter is ready for production
  console.info("[newsletter] subscriber:", trimmed);

  return NextResponse.json({ success: true, message: "Subscribed to CODE Eternal updates" });
}
