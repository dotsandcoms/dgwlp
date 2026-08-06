import { browserClient } from "./supabase";

const PENDING_KEY = "dg_pending_profile";

export function stashPendingProfile(data) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({
      name: data.name,
      phone: data.phone,
      address: data.address || null,
    }));
  } catch {}
}

/** Metadata payload embedded in auth.users at signUp for the DB trigger. */
export function signupMeta(data) {
  const a = data.address || {};
  return {
    full_name: data.name || "",
    phone: data.phone || "",
    street: a.street || "",
    suburb: a.suburb || "",
    city: a.city || "",
    province: a.province || "",
    postal: a.postal || a.postal_code || "",
    notes: a.notes || "",
  };
}

/**
 * Persist phone + address via secure RPC (bypasses brittle client RLS upserts).
 */
export async function saveDeliveryProfile(authUser, data) {
  if (!authUser?.id) return { ok: false, error: "No user" };
  const sb = browserClient();
  if (!sb) return { ok: false, error: "No client" };

  const a = data?.address || {};
  const { error } = await sb.rpc("save_my_delivery", {
    p_full_name: data?.name || authUser.user_metadata?.full_name || null,
    p_phone: data?.phone != null ? String(data.phone) : null,
    p_street: a.street || null,
    p_suburb: a.suburb || null,
    p_city: a.city || null,
    p_province: a.province || null,
    p_postal: a.postal || a.postal_code || null,
    p_notes: a.notes != null ? String(a.notes) : null,
  });

  if (error) return { ok: false, error };
  return { ok: true };
}

function emptyProfile(authUser) {
  const fallbackName =
    authUser?.user_metadata?.full_name ||
    (authUser?.email || "").split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "";
  return {
    name: fallbackName,
    email: authUser?.email || "",
    phone: authUser?.user_metadata?.phone || "",
    address: null,
  };
}

/** Load name, phone and default address for the signed-in user. */
export async function fetchMyProfile(authUser) {
  if (!authUser?.id) return emptyProfile(authUser);

  const sb = browserClient();
  if (!sb) return emptyProfile(authUser);

  // Prefer security-definer RPC — reliable after login
  try {
    const { data, error } = await sb.rpc("get_my_profile");
    if (!error && data && typeof data === "object") {
      const addr = data.address;
      return {
        name: data.full_name || emptyProfile(authUser).name,
        email: authUser.email,
        phone: data.phone || "",
        address: addr && (addr.street || addr.city)
          ? {
              street: addr.street || "",
              suburb: addr.suburb || "",
              city: addr.city || "",
              province: addr.province || "",
              postal: addr.postal || "",
              notes: addr.notes || "",
            }
          : null,
      };
    }
  } catch {
    // fall through to table reads
  }

  const [{ data: profile, error: pErr }, { data: addresses, error: aErr }] = await Promise.all([
    sb.from("profiles").select("full_name,phone").eq("id", authUser.id).maybeSingle(),
    sb.from("addresses")
      .select("street,suburb,city,province,postal_code,notes,is_default,created_at")
      .eq("user_id", authUser.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (pErr && aErr) return emptyProfile(authUser);

  const addr = Array.isArray(addresses) ? addresses[0] : addresses;
  return {
    name: profile?.full_name || emptyProfile(authUser).name,
    email: authUser.email,
    phone: profile?.phone || "",
    address: addr?.street
      ? {
          street: addr.street || "",
          suburb: addr.suburb || "",
          city: addr.city || "",
          province: addr.province || "",
          postal: addr.postal_code || "",
          notes: addr.notes || "",
        }
      : null,
  };
}

/** Save profile + address queued at signup (before email confirm). */
export async function flushPendingProfile(authUser) {
  if (!authUser?.id || typeof window === "undefined") return;
  let pending = null;
  try { pending = JSON.parse(localStorage.getItem(PENDING_KEY) || "null"); } catch {}

  // Only flush explicitly stashed signup data — never overwrite DB with empty metadata
  if (!pending) return;

  const hasPhone = Boolean(pending.phone);
  const hasAddr = Boolean(
    pending.address?.street &&
    pending.address?.city &&
    (pending.address?.postal || pending.address?.postal_code)
  );
  if (!hasPhone && !hasAddr && !pending.name) {
    localStorage.removeItem(PENDING_KEY);
    return;
  }

  const result = await saveDeliveryProfile(authUser, pending);
  if (result.ok) {
    try { localStorage.removeItem(PENDING_KEY); } catch {}
  }
}
