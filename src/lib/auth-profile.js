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
    p_phone: data?.phone ?? authUser.user_metadata?.phone ?? null,
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

/** Load name, phone and default address for the signed-in user. */
export async function fetchMyProfile(authUser) {
  const fallbackName =
    authUser?.user_metadata?.full_name ||
    (authUser?.email || "").split("@")[0].replace(/\b\w/g, (c) => c.toUpperCase()) ||
    "";

  if (!authUser?.id) {
    return { name: fallbackName, email: authUser?.email || "", phone: "", address: null };
  }

  const sb = browserClient();
  if (!sb) {
    return {
      name: fallbackName,
      email: authUser.email,
      phone: authUser.user_metadata?.phone || "",
      address: null,
    };
  }

  const [{ data: profile }, { data: addresses }] = await Promise.all([
    sb.from("profiles").select("full_name,phone").eq("id", authUser.id).maybeSingle(),
    sb.from("addresses")
      .select("street,suburb,city,province,postal_code,notes,is_default,created_at")
      .eq("user_id", authUser.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const addr = Array.isArray(addresses) ? addresses[0] : addresses;
  return {
    name: profile?.full_name || fallbackName,
    email: authUser.email,
    phone: profile?.phone || "",
    address: addr
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

  const data = pending || {
    name: authUser.user_metadata?.full_name,
    phone: authUser.user_metadata?.phone,
    address: {
      street: authUser.user_metadata?.street,
      suburb: authUser.user_metadata?.suburb,
      city: authUser.user_metadata?.city,
      province: authUser.user_metadata?.province,
      postal: authUser.user_metadata?.postal,
      notes: authUser.user_metadata?.notes,
    },
  };

  const hasPhone = Boolean(data.phone);
  const hasAddr = Boolean(data.address?.street && data.address?.city && (data.address?.postal || data.address?.postal_code));
  if (!hasPhone && !hasAddr && !data.name) {
    if (pending) localStorage.removeItem(PENDING_KEY);
    return;
  }

  const result = await saveDeliveryProfile(authUser, data);
  if (result.ok) {
    try { localStorage.removeItem(PENDING_KEY); } catch {}
  }
}
