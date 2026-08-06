/**
 * Simple in-memory rate limiter (per server instance).
 * Good enough to blunt casual spam on contact / email endpoints.
 */
const buckets = new Map();

/**
 * @param {string} key
 * @param {{ limit?: number, windowMs?: number }} opts
 * @returns {{ ok: boolean, retryAfterSec?: number }}
 */
export function rateLimit(key, { limit = 8, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const prev = buckets.get(key) || [];
  const recent = prev.filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    const oldest = recent[0];
    return { ok: false, retryAfterSec: Math.ceil((oldest + windowMs - now) / 1000) };
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 5000) {
    // opportunistic prune
    for (const [k, v] of buckets) {
      if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
    }
  }
  return { ok: true };
}

export function clientIp(req) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
