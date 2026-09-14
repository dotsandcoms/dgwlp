import { createClient } from "@supabase/supabase-js";
import { serverClient, hasSupabase, imageUrl } from "./supabase";
import { colourFromCategory } from "./pricing";
import { parseAnimalTags, inferAnimalTags } from "./product-tags";
import { applyStoreOrder, applyCategoryOrder } from "./store-order";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "./mock";

// Deterministic gradient so real products (before images load) still render
// an on-brand placeholder plate instead of a blank box.
function gradFor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return { grad: ["#2f2f2d", "#a9a49b"], angle: (h % 90) + 90 };
}

function mapRow(row, { priceRange, variants } = {}) {
  const g = gradFor(row.name);
  const category = row.categories?.name || row.category || "Uncategorised";
  const animalTags = inferAnimalTags({ ...row, animalTags: parseAnimalTags(row.animal_tags) });
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category,
    ratio: row.ratio_id || "landscape",
    colour: colourFromCategory(category),
    sku: row.sku,
    desc: row.description || "",
    animalTags,
    image: imageUrl(row.hero_image),
    grad: g.grad,
    angle: g.angle,
    ...(priceRange ? { priceRange } : {}),
    ...(variants ? { variants } : {}),
  };
}

const PRODUCT_FIELDS = "id,slug,name,sku,ratio_id,colour,description,hero_image,categories(name)";
const PRODUCT_FIELDS_TAGS = `${PRODUCT_FIELDS},animal_tags`;

async function fetchPublishedProducts(sb) {
  let res = await sb
    .from("products")
    .select(PRODUCT_FIELDS_TAGS)
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (res.error && /animal_tags/i.test(res.error.message || "")) {
    res = await sb
      .from("products")
      .select(PRODUCT_FIELDS)
      .eq("is_published", true)
      .order("created_at", { ascending: false });
  }
  return res;
}

async function fetchStoreOrderIds() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const sb = url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : serverClient();
  if (!sb) return [];
  const { data } = await sb.from("site_settings").select("value").eq("key", "store_order").maybeSingle();
  return Array.isArray(data?.value?.productIds) ? data.value.productIds.filter(Boolean) : [];
}

export async function getProducts() {
  if (!hasSupabase) return MOCK_PRODUCTS;
  try {
    const sb = serverClient();
    const [{ data, error }, { data: ranges }] = await Promise.all([
      fetchPublishedProducts(sb),
      sb.from("product_price_range").select("product_id,min_cents,max_cents"),
    ]);
    if (error || !data) return MOCK_PRODUCTS; // fall back to demo only on a real query failure
    const rangeMap = new Map((ranges || []).map((r) => [r.product_id, r]));
    const catalogue = data.map((row) => {
      const r = rangeMap.get(row.id);
      return mapRow(row, { priceRange: r ? [r.min_cents / 100, r.max_cents / 100] : [0, 0] });
    });
    let orderIds = [];
    try {
      orderIds = await fetchStoreOrderIds();
    } catch {
      orderIds = [];
    }
    return applyStoreOrder(catalogue, orderIds);
  } catch {
    return MOCK_PRODUCTS;
  }
}

export async function getProduct(slug) {
  if (!hasSupabase) return MOCK_PRODUCTS.find((p) => p.slug === slug) || null;
  try {
    const sb = serverClient();
    let res = await sb
      .from("products")
      .select(PRODUCT_FIELDS_TAGS)
      .eq("slug", slug)
      .maybeSingle();
    if (res.error && /animal_tags/i.test(res.error.message || "")) {
      res = await sb.from("products").select(PRODUCT_FIELDS).eq("slug", slug).maybeSingle();
    }
    const { data, error } = res;
    if (error || !data) return MOCK_PRODUCTS.find((p) => p.slug === slug) || null;
    const { data: variantRows } = await sb
      .from("product_variants")
      .select("size_id,material_id,price_cents")
      .eq("product_id", data.id)
      .eq("is_active", true);
    const variants = {};
    (variantRows || []).forEach((v) => { variants[`${v.size_id}:${v.material_id}`] = v.price_cents / 100; });
    return mapRow(data, { variants });
  } catch {
    return MOCK_PRODUCTS.find((p) => p.slug === slug) || null;
  }
}

export async function getCategories() {
  if (!hasSupabase) return MOCK_CATEGORIES;
  try {
    const sb = serverClient();
    const [{ data, error }, orderIds] = await Promise.all([
      sb.from("categories").select("id,name,sort").order("sort"),
      fetchCategoryOrderIds(),
    ]);
    if (error || !data) return MOCK_CATEGORIES;
    return applyCategoryOrder(data, orderIds).map((c) => c.name);
  } catch {
    return MOCK_CATEGORIES;
  }
}

async function fetchSiteSettingValue(key) {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const sb = url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : serverClient();
  if (!sb) return null;
  const { data } = await sb.from("site_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

async function fetchCategoryOrderIds() {
  try {
    const value = await fetchSiteSettingValue("category_order");
    return Array.isArray(value?.categoryIds) ? value.categoryIds.filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function fetchCategoryCoversServer() {
  try {
    const value = await fetchSiteSettingValue("category_covers");
    const covers = value?.covers;
    return covers && typeof covers === "object" ? covers : {};
  } catch {
    return {};
  }
}

/**
 * One cover product per category for the home “Browse by category” grid,
 * ordered by admin category order. Uses cover assignment when set.
 */
export async function getCategoryBrowseTiles(allProducts) {
  const catalogue = Array.isArray(allProducts) ? allProducts : await getProducts();
  if (!hasSupabase) {
    const seen = new Set();
    return catalogue.filter((p) => {
      if (!p.category || seen.has(p.category)) return false;
      seen.add(p.category);
      return true;
    });
  }
  try {
    const sb = serverClient();
    const [{ data: cats, error }, orderIds, covers] = await Promise.all([
      sb.from("categories").select("id,name,sort").order("sort"),
      fetchCategoryOrderIds(),
      fetchCategoryCoversServer(),
    ]);
    if (error || !cats?.length) {
      const seen = new Set();
      return catalogue.filter((p) => {
        if (!p.category || seen.has(p.category)) return false;
        seen.add(p.category);
        return true;
      });
    }
    return applyCategoryOrder(cats, orderIds)
      .map((cat) => {
        const inCat = catalogue.filter((p) => p.category === cat.name);
        if (!inCat.length) return null;
        const coverId = covers[cat.id];
        const cover = (coverId && inCat.find((p) => p.id === coverId)) || inCat[0];
        return cover ? { ...cover, category: cat.name, categoryId: cat.id } : null;
      })
      .filter(Boolean);
  } catch {
    const seen = new Set();
    return catalogue.filter((p) => {
      if (!p.category || seen.has(p.category)) return false;
      seen.add(p.category);
      return true;
    });
  }
}

const FEATURED_MAX = 6;

/** Read featured ids — service role when available (anon RLS may hide this key). */
async function fetchFeaturedIdsServer() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (url && serviceKey) {
    const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data } = await sb.from("site_settings").select("value").eq("key", "featured").maybeSingle();
    return Array.isArray(data?.value?.productIds) ? data.value.productIds.filter(Boolean) : [];
  }
  const sb = serverClient();
  if (!sb) return [];
  const { data } = await sb.from("site_settings").select("value").eq("key", "featured").maybeSingle();
  return Array.isArray(data?.value?.productIds) ? data.value.productIds.filter(Boolean) : [];
}

/** Ordered featured prints for the home page (falls back to newest). */
export async function getFeaturedProducts(allProducts) {
  const catalogue = Array.isArray(allProducts) ? allProducts : await getProducts();
  if (!catalogue.length) return [];

  let ids = [];
  if (hasSupabase) {
    try {
      ids = await fetchFeaturedIdsServer();
    } catch {
      ids = [];
    }
  }

  if (!ids.length) return catalogue.slice(0, FEATURED_MAX);

  const byId = new Map(catalogue.map((p) => [p.id, p]));
  const picked = ids.map((id) => byId.get(id)).filter(Boolean);
  if (picked.length) return picked.slice(0, FEATURED_MAX);
  return catalogue.slice(0, FEATURED_MAX);
}
