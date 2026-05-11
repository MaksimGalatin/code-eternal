import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

function isValidEmail(email: string): boolean {
  const at = email.indexOf("@");
  if (at < 1 || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  return dot > 0 && dot < domain.length - 1 && !/\s/.test(email);
}
const DATA_FILE = path.join(process.cwd(), "data", "newsletter.json");

interface Subscriber {
  email: string;
  subscribedAt: string;
}

async function readSubscribers(): Promise<Subscriber[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Subscriber[];
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), "utf-8");
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required." },
        { status: 400 }
      );
    }

    const trimmed = email.trim().toLowerCase();

    if (!isValidEmail(trimmed)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format. Please provide a valid email address." },
        { status: 400 }
      );
    }

    const subscribers = await readSubscribers();

    if (subscribers.some((s) => s.email === trimmed)) {
      return NextResponse.json(
        { success: false, error: "This email is already subscribed to CODE Eternal updates." },
        { status: 409 }
      );
    }

    subscribers.push({
      email: trimmed,
      subscribedAt: new Date().toISOString(),
    });

    await fs.writeFile(DATA_FILE, JSON.stringify(subscribers, null, 2), "utf-8");

    return NextResponse.json({
      success: true,
      message: "Subscribed to CODE Eternal updates",
    });
  } catch (error) {
    console.error("[newsletter] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
