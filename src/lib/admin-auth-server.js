import { createClient } from "@supabase/supabase-js";

/** Server-only Supabase client with service role (bypasses RLS). */
export function serviceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Verify the caller is an authenticated admin (Bearer access token from the admin browser session).
 * @returns {{ user: import("@supabase/supabase-js").User } | { error: string, status: number }}
 */
export async function requireAdminFromRequest(req) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anon = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !anon) return { error: "Server not configured", status: 503 };

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { error: "Unauthorized", status: 401 };

  const sb = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await sb.auth.getUser();
  if (userErr || !userData?.user?.id) return { error: "Unauthorized", status: 401 };

  const { data: isAdmin, error: adminErr } = await sb.rpc("is_admin");
  if (adminErr || isAdmin !== true) {
    const { data: row } = await sb.from("admins").select("user_id").eq("user_id", userData.user.id).maybeSingle();
    if (!row?.user_id) return { error: "Forbidden", status: 403 };
  }

  return { user: userData.user, client: sb };
}
