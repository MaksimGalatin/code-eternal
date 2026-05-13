const store = new Map<string, { count: number; resetAt: number }>();

/** Returns null if allowed, or seconds until reset if rate-limited. */
export function rateLimit(ip: string, max: number, windowMs: number): number | null {
  const now = Date.now();
  const entry = store.get(ip);
  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }
  if (entry.count >= max) return Math.ceil((entry.resetAt - now) / 1000);
  entry.count++;
  return null;
}

export function getIp(req: Request): string {
  const realIp = (req.headers as Headers).get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = (req.headers as Headers).get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
