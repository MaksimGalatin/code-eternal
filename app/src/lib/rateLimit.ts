// In-memory rate limiter (per-instance on Vercel — good enough for hackathon, use Redis for prod)
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
  // x-real-ip is set by Vercel/nginx to the true client IP and cannot be spoofed by the client
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  // Fall back to x-forwarded-for (first entry = client IP when Vercel is the edge terminator)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
