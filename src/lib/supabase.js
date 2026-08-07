import { createClient } from "@supabase/supabase-js";

/**
 * Next.js only inlines env vars that are written as static property access
 * (process.env.NEXT_PUBLIC_FOO). Dynamic process.env[name] is empty in the
 * browser bundle — that previously forced Demo admin / mock data on the client.
 *
 * Prefer NEXT_PUBLIC_* names. Server-only aliases are fallbacks for SSR.
 */
const url = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
).trim();

const anon = (
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  ""
).trim();

export const hasSupabase = Boolean(url && anon);

/**
 * Absolute site origin for auth redirects (confirm email, OAuth, etc.).
 * Prefer the browser origin so local vs production follows the domain in use;
 * fall back to NEXT_PUBLIC_SITE_URL / Vercel URL on the server.
 */
export function getAppOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/$/, "");
  }
  const fromEnv = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const vercel = (process.env.VERCEL_URL || "").trim().replace(/\/$/, "");
  if (vercel) return vercel.startsWith("http") ? vercel : `https://${vercel}`;
  return "";
}

/** Email confirm / magic-link return URL (must be allowlisted in Supabase Auth). */
export function authCallbackUrl(next = "/account") {
  const origin = getAppOrigin();
  if (!origin) return undefined;
  const safe = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  return `${origin}/auth/callback?next=${encodeURIComponent(safe)}`;
}

// Server-side read client (uses anon key; RLS applies). Used in server components.
// Next.js 14 caches fetch() by default — force no-store so catalogue changes
// (new imports, publishes) show up immediately instead of serving a stale Lion-only payload.
export function serverClient() {
  if (!hasSupabase) return null;
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init = {}) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}

// Browser singleton (auth + client reads).
let _browser = null;
export function browserClient() {
  if (!hasSupabase) return null;
  if (_browser) return _browser;
  _browser = createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  });
  return _browser;
}

// Build a public URL for an image stored in the `prints` bucket (product photos).
export function imageUrl(path) {
  if (!path) return null;
  const clean = String(path).trim().replace(/^\/+/, "");
  if (!clean) return null;
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  if (!url) return null;
  return `${url}/storage/v1/object/public/prints/${clean}`;
}

// Website furniture (hero, scroller panoramas) lives in the `images` bucket.
// Serves from Supabase Storage when NEXT_PUBLIC_STORAGE_SITE_IMAGES=true,
// otherwise from the bundled /public/images files (works out of the box).
export function siteImage(file) {
  const fromStorage =
    process.env.NEXT_PUBLIC_STORAGE_SITE_IMAGES === "true" ||
    process.env.STORAGE_SITE_IMAGES === "true";
  if (fromStorage && url) return `${url}/storage/v1/object/public/images/${file}`;
  return `/images/${file}`;
}
