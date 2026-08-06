import { serverClient, hasSupabase, imageUrl } from "./supabase";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "./mock";

// Deterministic gradient so real products (before images load) still render
// an on-brand placeholder plate instead of a blank box.
function gradFor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return { grad: ["#2f2f2d", "#a9a49b"], angle: (h % 90) + 90 };
}

function mapRow(row) {
  const g = gradFor(row.name);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.categories?.name || row.category || "Uncategorised",
    ratio: row.ratio_id || "landscape",
    colour: row.colour || "bw",
    sku: row.sku,
    desc: row.description || "",
    image: imageUrl(row.hero_image),
    grad: g.grad,
    angle: g.angle,
  };
}

export async function getProducts() {
  if (!hasSupabase) return MOCK_PRODUCTS;
  try {
    const sb = serverClient();
    const { data, error } = await sb
      .from("products")
      .select("id,slug,name,sku,ratio_id,colour,description,hero_image,categories(name)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error || !data || data.length < 3) return MOCK_PRODUCTS; // stay on demo until a real catalogue is loaded
    return data.map(mapRow);
  } catch {
    return MOCK_PRODUCTS;
  }
}

export async function getProduct(slug) {
  if (!hasSupabase) return MOCK_PRODUCTS.find((p) => p.slug === slug) || null;
  try {
    const sb = serverClient();
    const { data, error } = await sb
      .from("products")
      .select("id,slug,name,sku,ratio_id,colour,description,hero_image,categories(name)")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return MOCK_PRODUCTS.find((p) => p.slug === slug) || null;
    return mapRow(data);
  } catch {
    return MOCK_PRODUCTS.find((p) => p.slug === slug) || null;
  }
}

export async function getCategories() {
  if (!hasSupabase) return MOCK_CATEGORIES;
  try {
    const sb = serverClient();
    const { data, error } = await sb.from("categories").select("name").order("sort");
    if (error || !data || data.length === 0) return MOCK_CATEGORIES;
    return data.map((c) => c.name);
  } catch {
    return MOCK_CATEGORIES;
  }
}
