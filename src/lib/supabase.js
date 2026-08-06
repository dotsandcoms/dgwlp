import { createClient } from "@supabase/supabase-js";

/**
 * Next.js only inlines env vars that start with NEXT_PUBLIC_ into the
 * browser bundle. Prefer those names on Vercel.
 * Server-only aliases (SUPABASE_URL / SUPABASE_ANON_KEY) are accepted as a
 * fallback so SSR catalogue reads still work if PUBLIC_ was stripped by mistake.
 */
function env(name) {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

// Trailing newlines/spaces from Vercel/dashboard pastes break CSS url(...) images.
const url =
  env("NEXT_PUBLIC_SUPABASE_URL") ||
  env("NEXT_SUPABASE_URL") ||
  env("SUPABASE_URL");
const anon =
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
  env("NEXT_SUPABASE_ANON_KEY") ||
  env("SUPABASE_ANON_KEY");

export const hasSupabase = Boolean(url && anon);

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
