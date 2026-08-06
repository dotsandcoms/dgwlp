// Client-side Supabase CRUD for the admin panel. Every call runs through the
// browser client so Postgres RLS (is_admin()) is the real access boundary —
// these are convenience wrappers, not a security layer of their own.
"use client";
import { browserClient } from "./supabase";
import { DEFAULT_SETTINGS, mergeSettings } from "./settings";

export const slugify = (s) =>
  (s || "").toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "print";

export async function checkIsAdmin() {
  const sb = browserClient();
  if (!sb) return false;
  const { data, error } = await sb.rpc("is_admin");
  if (error) return false;
  return Boolean(data);
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
export async function fetchOrders() {
  const sb = browserClient();
  const { data, error } = await sb
    .from("orders")
    .select("id,order_no,email,status,total_cents,created_at,order_items(qty)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []).map((o) => ({
    ...o,
    item_count: (o.order_items || []).reduce((n, i) => n + (i.qty || 0), 0),
  }));
}

export async function updateOrderStatus(id, status) {
  const sb = browserClient();
  const { error } = await sb.from("orders").update({ status }).eq("id", id);
  if (error) throw error;
}

/* ------------------------------- settings ----------------------------- */
const SETTINGS_KEYS = ["shipping", "tax", "payfast"];

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

/** Public shipping + tax only (uses anon RLS). */
export async function fetchPublicSettings() {
  const sb = browserClient();
  if (!sb) {
    try {
      const raw = localStorage.getItem("dg_site_settings");
      if (raw) {
        const m = mergeSettings(JSON.parse(raw));
        return { shipping: m.shipping, tax: m.tax };
      }
    } catch {}
    return { shipping: DEFAULT_SETTINGS.shipping, tax: DEFAULT_SETTINGS.tax };
  }
  const { data, error } = await sb.from("site_settings").select("key,value").in("key", ["shipping", "tax"]);
  if (error) throw error;
  const partial = {};
  for (const row of data || []) partial[row.key] = row.value;
  const m = mergeSettings(partial);
  return { shipping: m.shipping, tax: m.tax };
}
