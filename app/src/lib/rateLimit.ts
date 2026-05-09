// In-memory rate limiter (per-instance on Vercel — good enough for hackathon, use Redis for prod)
const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function getIp(req: { headers: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  return req.socket?.remoteAddress ?? "unknown";
}
