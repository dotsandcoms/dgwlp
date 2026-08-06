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

async function requireUser(sb) {
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user?.id) throw new Error("Please sign in again.");
  return data.user;
}

/** Write profile + address with RPC, then verify via direct table writes if needed. */
export async function saveDeliveryProfile(authUser, data) {
  const sb = browserClient();
  if (!sb) return { ok: false, error: "No client" };

  let user = authUser;
  try {
    user = await requireUser(sb);
  } catch (e) {
    return { ok: false, error: e };
  }

  const a = data?.address || {};
  const payload = {
    name: (data?.name || "").trim(),
    phone: data?.phone != null ? String(data.phone).trim() : "",
    street: (a.street || "").trim(),
    suburb: (a.suburb || "").trim(),
    city: (a.city || "").trim(),
    province: a.province || "",
    postal: (a.postal || a.postal_code || "").trim(),
    notes: a.notes != null ? String(a.notes).trim() : "",
  };

  // 1) RPC (security definer)
  const { error: rpcErr } = await sb.rpc("save_my_delivery", {
    p_full_name: payload.name || null,
    p_phone: payload.phone,
    p_street: payload.street || null,
    p_suburb: payload.suburb || null,
    p_city: payload.city || null,
    p_province: payload.province || null,
    p_postal: payload.postal || null,
    p_notes: payload.notes,
  });

  // 2) Direct writes — always, so a silent RPC no-op can't drop data
  const { error: profErr } = await sb.from("profiles").upsert(
    {
      id: user.id,
      full_name: payload.name || "",
      phone: payload.phone || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  let addrErr = null;
  if (payload.street && payload.city && payload.postal) {
    await sb.from("addresses").delete().eq("user_id", user.id).eq("is_default", true);
    const ins = await sb.from("addresses").insert({
      user_id: user.id,
      street: payload.street,
      suburb: payload.suburb || null,
      city: payload.city,
      province: payload.province || "Gauteng",
      postal_code: payload.postal,
      notes: payload.notes || null,
      is_default: true,
    });
    addrErr = ins.error;
  }

  if (rpcErr && profErr) {
    return { ok: false, error: rpcErr || profErr };
  }
  if (payload.street && addrErr && profErr) {
    return { ok: false, error: addrErr };
  }

  // 3) Verify phone landed (or address if provided)
  const check = await fetchMyProfile(user);
  const phoneOk = !payload.phone || check.phone === payload.phone;
  const addrOk =
    !payload.street ||
    (check.address?.street === payload.street && check.address?.city === payload.city);

  if (!phoneOk || !addrOk) {
    // One more forced upsert if verify failed
    if (!phoneOk) {
      const { error } = await sb.from("profiles").update({
        phone: payload.phone || null,
        full_name: payload.name || check.name,
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      if (error) return { ok: false, error };
    }
    if (!addrOk && payload.street) {
      await sb.from("addresses").delete().eq("user_id", user.id).eq("is_default", true);
      const { error } = await sb.from("addresses").insert({
        user_id: user.id,
        street: payload.street,
        suburb: payload.suburb || null,
        city: payload.city,
        province: payload.province || "Gauteng",
        postal_code: payload.postal,
        notes: payload.notes || null,
        is_default: true,
      });
      if (error) return { ok: false, error };
    }
  }

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

  // Prefer security-definer RPC
  const { data, error } = await sb.rpc("get_my_profile");
  if (!error && data && typeof data === "object") {
    const addr = data.address;
    return {
      name: data.full_name || emptyProfile(authUser).name,
      email: authUser.email,
      phone: data.phone || "",
      address: addr && addr.street
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
