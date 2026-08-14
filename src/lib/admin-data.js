// Client-side Supabase CRUD for the admin panel. Every call runs through the
// browser client so Postgres RLS (is_admin()) is the real access boundary —
// these are convenience wrappers, not a security layer of their own.
"use client";
import { browserClient } from "./supabase";
import { DEFAULT_SETTINGS, mergeSettings } from "./settings";
import { enrichOrdersWithImages } from "./orders";

export const slugify = (s) =>
  (s || "").toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "print";

export async function checkIsAdmin() {
  const sb = browserClient();
  if (!sb) return false;

  // Validate the JWT with the server (avoids stale local sessions)
  const { data: userData, error: userErr } = await sb.auth.getUser();
  const uid = userData?.user?.id;
  if (userErr || !uid) return false;

  const { data: rpcData, error: rpcErr } = await sb.rpc("is_admin");
  if (!rpcErr && (rpcData === true || rpcData === "true")) return true;

  // Always try a direct row read too — don't trust a bare `false` from RPC
  // when auth.uid() failed to resolve inside the function.
  const { data: row, error: rowErr } = await sb
    .from("admins")
    .select("user_id")
    .eq("user_id", uid)
    .maybeSingle();
  if (!rowErr && row?.user_id) return true;

  return false;
}

/* ------------------------------ categories --------------------------- */
export async function fetchCategories() {
  const sb = browserClient();
  const { data, error } = await sb.from("categories").select("id,name,slug,sort").order("sort");
  if (error) throw error;
  return data || [];
}

export async function createCategory(name) {
  const sb = browserClient();
  const slug = slugify(name);
  const { error } = await sb.from("categories").insert({ name, slug });
  if (error) throw error;
}

export async function deleteCategory(id) {
  const sb = browserClient();
  const { error } = await sb.from("categories").delete().eq("id", id);
  if (error) throw error;
}

/* ------------------------------- products ----------------------------- */
export async function fetchProducts() {
  const sb = browserClient();
  const [{ data: products, error: pErr }, { data: ranges, error: rErr }] = await Promise.all([
    sb.from("products")
      .select("id,name,slug,sku,category_id,ratio_id,colour,description,hero_image,is_published,created_at,categories(name)")
      .order("created_at", { ascending: false }),
    sb.from("product_price_range").select("product_id,min_cents,max_cents"),
  ]);
  if (pErr) throw pErr;
  if (rErr) throw rErr;
  const rangeMap = new Map((ranges || []).map((r) => [r.product_id, r]));
  return (products || []).map((p) => ({
    ...p,
    category_name: p.categories?.name || "Uncategorised",
    min_cents: rangeMap.get(p.id)?.min_cents ?? 0,
    max_cents: rangeMap.get(p.id)?.max_cents ?? 0,
  }));
}

export async function fetchProductForEdit(id) {
  const sb = browserClient();
  const [{ data: product, error: pErr }, { data: variants, error: vErr }, { data: rooms, error: roErr }] = await Promise.all([
    sb.from("products").select("*").eq("id", id).single(),
    sb.from("product_variants").select("size_id,material_id,price_cents").eq("product_id", id),
    sb.from("product_rooms").select("room_id").eq("product_id", id),
  ]);
  if (pErr) throw pErr;
  if (vErr) throw vErr;
  if (roErr) throw roErr;
  return { product, variants: variants || [], roomIds: (rooms || []).map((r) => r.room_id) };
}

export async function uploadPrintImage(file) {
  const sb = browserClient();
  const path = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}${(file.name.match(/\.[^.]+$/) || [""])[0]}`;
  const { error } = await sb.storage.from("prints").upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) throw error;
  return path;
}

// variants: [{ size_id, material_id, price_cents }]   roomIds: ["lounge", ...]
export async function saveProduct({ id, fields, variants, roomIds }) {
  const sb = browserClient();
  let productId = id;

  if (productId) {
    const { error } = await sb.from("products").update(fields).eq("id", productId);
    if (error) throw error;
    await sb.from("product_variants").delete().eq("product_id", productId);
    await sb.from("product_rooms").delete().eq("product_id", productId);
  } else {
    const { data, error } = await sb.from("products").insert(fields).select("id").single();
    if (error) throw error;
    productId = data.id;
  }

  if (variants.length) {
    const { error } = await sb.from("product_variants").insert(
      variants.map((v) => ({ ...v, product_id: productId }))
    );
    if (error) throw error;
  }
  if (roomIds.length) {
    const { error } = await sb.from("product_rooms").insert(
      roomIds.map((room_id) => ({ product_id: productId, room_id }))
    );
    if (error) throw error;
  }
  return productId;
}

export async function deleteProduct(id) {
  const sb = browserClient();
  const { error } = await sb.from("products").delete().eq("id", id);
  if (error) throw error;
}

/* --------------------------------- orders ------------------------------ */
const ORDER_DETAIL_SELECT = `
  id,order_no,email,user_id,status,total_cents,subtotal_cents,shipping_cents,
  created_at,delivery,payment_provider,tracking_no,shipping_method,
  order_items(product_name,size_id,material_id,frame_colour_id,colour,unit_price_cents,qty)
`;

function customerFromDelivery(delivery) {
  if (!delivery || typeof delivery !== "object") return { name: null, phone: null };
  return {
    name: delivery.name || delivery.full_name || null,
    phone: delivery.phone || delivery.mobile || null,
  };
}

function mapAdminOrder(row, profile) {
  const lines = (row.order_items || []).map((i) => ({
    name: i.product_name,
    summary: [i.material_id, i.size_id, i.frame_colour_id].filter(Boolean).join(" · "),
    qty: i.qty || 1,
    price: (i.unit_price_cents || 0) / 100,
    colour: i.colour || "bw",
    ratio: "landscape",
    image: null,
    grad: ["#2f2f2d", "#a9a49b"],
    angle: 120,
  }));

  const pay =
    row.payment_provider === "paystack" ? "Paystack"
      : row.payment_provider === "payfast" ? "PayFast"
        : row.payment_provider || "Card";

  const fromDelivery = customerFromDelivery(row.delivery);
  const customerName = fromDelivery.name || profile?.full_name || null;
  const customerPhone = fromDelivery.phone || profile?.phone || null;

  return {
    id: row.id,
    order_no: row.order_no || row.id,
    user_id: row.user_id || null,
    email: row.email || null,
    customerName,
    customerPhone,
    status: row.status || "pending",
    date: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : "",
    created_at: row.created_at,
    item_count: lines.reduce((n, l) => n + (l.qty || 1), 0),
    subtotal: row.subtotal_cents != null ? row.subtotal_cents / 100 : lines.reduce((n, l) => n + l.price * l.qty, 0),
    shipping: row.shipping_cents != null ? row.shipping_cents / 100 : 0,
    total: row.total_cents != null ? row.total_cents / 100 : 0,
    total_cents: row.total_cents ?? 0,
    pay,
    tracking: row.tracking_no || "",
    delivery: row.delivery || null,
    shippingMethod: row.shipping_method || null,
    lines,
  };
}

/** Load profile name/phone for a set of user ids (admin can read via RLS). */
async function fetchProfilesByIds(sb, userIds) {
  const ids = [...new Set((userIds || []).filter(Boolean))];
  if (!ids.length) return new Map();
  const { data, error } = await sb
    .from("profiles")
    .select("id,full_name,phone")
    .in("id", ids);
  if (error || !data) return new Map();
  return new Map(data.map((p) => [p.id, p]));
}

export async function fetchOrders() {
  const sb = browserClient();
  const { data, error } = await sb
    .from("orders")
    .select("id,order_no,email,user_id,status,total_cents,created_at,delivery,order_items(qty)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const profiles = await fetchProfilesByIds(sb, (data || []).map((o) => o.user_id));

  return (data || []).map((o) => {
    const profile = profiles.get(o.user_id);
    const fromDelivery = customerFromDelivery(o.delivery);
    return {
      ...o,
      item_count: (o.order_items || []).reduce((n, i) => n + (i.qty || 0), 0),
      customerName: fromDelivery.name || profile?.full_name || null,
      customerPhone: fromDelivery.phone || profile?.phone || null,
      deliveryCity: o.delivery?.city || null,
    };
  });
}

/** Full order for the admin detail modal (items + images + delivery + customer). */
export async function fetchOrderDetail(id) {
  const sb = browserClient();
  const { data, error } = await sb
    .from("orders")
    .select(ORDER_DETAIL_SELECT)
    .eq("id", id)
    .single();
  if (error) throw error;
  const profiles = await fetchProfilesByIds(sb, [data.user_id]);
  const mapped = mapAdminOrder(data, profiles.get(data.user_id));
  const [enriched] = await enrichOrdersWithImages(sb, [mapped]);
  return enriched || mapped;
}

/**
 * Update order status / tracking. Returns the updated row.
 * Caller should fire status emails via notifyOrderStatusEmail.
 */
export async function updateOrder(id, { status, tracking_no } = {}) {
  const sb = browserClient();
  const patch = {};
  if (status != null) patch.status = status;
  if (tracking_no !== undefined) patch.tracking_no = tracking_no ? String(tracking_no).trim() : null;
  if (!Object.keys(patch).length) return null;

  const { data, error } = await sb
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select(ORDER_DETAIL_SELECT)
    .single();
  if (error) throw error;
  const profiles = await fetchProfilesByIds(sb, [data.user_id]);
  const mapped = mapAdminOrder(data, profiles.get(data.user_id));
  const [enriched] = await enrichOrdersWithImages(sb, [mapped]);
  return enriched || mapped;
}

export async function updateOrderStatus(id, status) {
  return updateOrder(id, { status });
}

/**
 * Fire a transactional email for a status change.
 * Safe to call before Resend templates exist — /api/email no-ops without a key.
 */
export async function notifyOrderStatusEmail(order, status) {
  if (!order?.email) return { skipped: true };
  try {
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: status,
        order: {
          id: order.order_no || order.id,
          email: order.email,
          items: order.lines || order.items || [],
          total: order.total,
          tracking: order.tracking || null,
          status,
          delivery: order.delivery || null,
        },
      }),
    });
    return await res.json().catch(() => ({}));
  } catch {
    return { skipped: true };
  }
}

/* ------------------------------- settings ----------------------------- */
const SETTINGS_KEYS = ["shipping", "tax", "currency", "payfast"];

export async function fetchSettings() {
  const sb = browserClient();
  if (!sb) {
    try {
      const raw = localStorage.getItem("dg_site_settings");
      if (raw) return mergeSettings(JSON.parse(raw));
    } catch {}
    return mergeSettings();
  }
  const { data, error } = await sb.from("site_settings").select("key,value").in("key", SETTINGS_KEYS);
  if (error) throw error;
  const partial = {};
  for (const row of data || []) partial[row.key] = row.value;
  return mergeSettings(partial);
}

/**
 * Save settings. For payfast secrets, empty merchantKey / passphrase keeps the existing value.
 */
export async function saveSettings(next, { previous } = {}) {
  const merged = mergeSettings(next);
  const prev = mergeSettings(previous);

  // Don't wipe secrets if the admin left the fields blank
  if (!merged.payfast.merchantKey) merged.payfast.merchantKey = prev.payfast.merchantKey || "";
  if (!merged.payfast.passphrase) merged.payfast.passphrase = prev.payfast.passphrase || "";

  const sb = browserClient();
  if (!sb) {
    try { localStorage.setItem("dg_site_settings", JSON.stringify(merged)); } catch {}
    return merged;
  }

  const rows = SETTINGS_KEYS.map((key) => ({
    key,
    value: merged[key],
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) throw error;
  return merged;
}

const FEATURED_KEY = "featured";
const FEATURED_MAX = 6;

/** Ordered product ids shown in the home “New & Featured” strip. */
export async function fetchFeaturedIds() {
  const sb = browserClient();
  if (!sb) {
    try {
      const raw = localStorage.getItem("dg_featured_ids");
      if (raw) {
        const ids = JSON.parse(raw);
        return Array.isArray(ids) ? ids.filter(Boolean).slice(0, FEATURED_MAX) : [];
      }
    } catch {}
    return [];
  }
  const { data, error } = await sb.from("site_settings").select("value").eq("key", FEATURED_KEY).maybeSingle();
  if (error) throw error;
  const ids = data?.value?.productIds;
  return Array.isArray(ids) ? ids.filter(Boolean).slice(0, FEATURED_MAX) : [];
}

export async function saveFeaturedIds(productIds = []) {
  const ids = (Array.isArray(productIds) ? productIds : [])
    .filter(Boolean)
    .map(String)
    .slice(0, FEATURED_MAX);

  const sb = browserClient();
  if (!sb) {
    try { localStorage.setItem("dg_featured_ids", JSON.stringify(ids)); } catch {}
    return ids;
  }
  const { error } = await sb.from("site_settings").upsert(
    { key: FEATURED_KEY, value: { productIds: ids }, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  if (error) throw error;
  return ids;
}

export { FEATURED_MAX };

/** Public shipping + tax + currency (uses anon RLS where allowed; prefer /api/settings). */
export async function fetchPublicSettings() {
  const sb = browserClient();
  if (!sb) {
    try {
      const raw = localStorage.getItem("dg_site_settings");
      if (raw) {
        const m = mergeSettings(JSON.parse(raw));
        return { shipping: m.shipping, tax: m.tax, currency: m.currency };
      }
    } catch {}
    return {
      shipping: DEFAULT_SETTINGS.shipping,
      tax: DEFAULT_SETTINGS.tax,
      currency: DEFAULT_SETTINGS.currency,
    };
  }
  const { data, error } = await sb.from("site_settings").select("key,value").in("key", ["shipping", "tax", "currency"]);
  if (error) throw error;
  const partial = {};
  for (const row of data || []) partial[row.key] = row.value;
  const m = mergeSettings(partial);
  return { shipping: m.shipping, tax: m.tax, currency: m.currency };
}
