/** Shared request checks for public API routes. */

export function isAllowedOrigin(req) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // Same-origin browser calls send Origin; server-to-server may not.
  if (!origin && !referer) return true;
  if (!site) return true;

  const allowed = [site, "http://localhost:3000", "http://127.0.0.1:3000"];
  if (origin && allowed.some((a) => origin === a || origin.startsWith(a))) return true;
  if (referer && allowed.some((a) => referer.startsWith(a))) return true;
  return false;
}

export function looksLikeEmail(v) {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) && v.length < 254;
}

export function scrubText(v, max = 5000) {
  if (typeof v !== "string") return "";
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}
