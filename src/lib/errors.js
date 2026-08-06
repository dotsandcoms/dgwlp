// Maps raw Supabase/Postgres error text to plain, customer-facing copy.
// Toasts should never show a stack trace or a Postgres constraint name.
const KNOWN = [
  [/invalid login credentials/i, "That email or password isn't right."],
  [/email not confirmed/i, "Please confirm your email first — check your inbox for the link."],
  [/user already registered/i, "An account with that email already exists — try signing in instead."],
  [/password should be at least/i, "Please use a longer password (at least 6 characters)."],
  [/rate limit/i, "Too many attempts — please wait a moment and try again."],
  [/products_slug_key/i, "A print with that name already exists — try a slightly different name."],
  [/categories_slug_key/i, "A category with that name already exists."],
  [/duplicate key value violates unique constraint/i, "That already exists — try a different name."],
  [/violates row-level security policy/i, "You don't have permission to do that."],
  [/violates foreign key constraint/i, "That's still linked to other data and can't be changed right now."],
  [/jwt expired/i, "Your session expired — please sign in again."],
  [/failed to fetch|networkerror/i, "Couldn't reach the server — check your connection and try again."],
];

export function friendlyError(err, fallback = "Something went wrong — please try again.") {
  const raw = (err && (err.message || err.error_description || err.msg)) || (typeof err === "string" ? err : "");
  for (const [pattern, text] of KNOWN) if (pattern.test(raw)) return text;
  return fallback;
}
