/** Animal tags on products — used for shop/search filtering. */

export const ANIMAL_SUGGESTIONS = [
  "lion", "lioness", "leopard", "cheetah", "elephant", "rhino", "zebra",
  "wildebeest", "buffalo", "giraffe", "hippo", "hyena", "wild dog",
  "bird", "eagle", "owl", "landscape",
];

const ANIMAL_VOCAB = ANIMAL_SUGGESTIONS;

const BW_PHRASES = ["black and white", "black & white", "b&w", "monochrome"];
const COLOUR_PHRASES = ["colour", "color"];

/** Normalise stored tags (array or comma-separated string) to lowercase slugs. */
export function parseAnimalTags(raw) {
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
  }
  if (typeof raw === "string" && raw.trim()) {
    return [...new Set(raw.split(/[,;]+/).map((t) => t.trim().toLowerCase()).filter(Boolean))];
  }
  return [];
}

/** Comma-separated admin input → array for the database. */
export function animalTagsFromInput(input) {
  return parseAnimalTags(input);
}

/** Display label: "lion" → "Lion" */
export function formatAnimalTag(tag) {
  const t = String(tag || "").trim();
  if (!t) return "";
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Tags as a single admin-friendly string. */
export function animalTagsToInput(tags) {
  return parseAnimalTags(tags).map(formatAnimalTag).join(", ");
}

/** Guess tags from product name when none are stored yet. */
export function inferAnimalTags(product) {
  const existing = parseAnimalTags(product?.animalTags || product?.animal_tags);
  if (existing.length) return existing;

  const hay = `${product?.name || ""} ${product?.desc || product?.description || ""} ${product?.category || ""}`.toLowerCase();
  const found = ANIMAL_VOCAB.filter((a) => hay.includes(a));
  if (found.length) return found;

  if (hay.includes("big cat") || hay.includes("cats")) return ["lion"];
  if (hay.includes("plains")) return ["wildebeest"];
  return [];
}

/** Primary animal label for search results. */
export function primaryAnimalLabel(product) {
  const tags = inferAnimalTags(product);
  return tags[0] ? formatAnimalTag(tags[0]) : "";
}

function productColour(product) {
  if (product.colour === "bw" || product.colour === "colour") return product.colour;
  const cat = String(product.category || "").trim().toLowerCase();
  return cat === "black & white" || cat === "black and white" ? "bw" : "colour";
}

/** Text blob for client-side search (name, category, animals, colour). */
export function productSearchHay(product) {
  const tags = inferAnimalTags(product);
  const colourWords = productColour(product) === "bw"
    ? "black white monochrome bw"
    : "colour color";
  return [
    product.name,
    product.category,
    product.desc,
    product.description,
    product.sku,
    ...tags,
    colourWords,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Split query into search terms and optional colour filter. */
export function parseSearchQuery(raw) {
  let q = String(raw || "").trim().toLowerCase();
  let colourFilter = null;

  for (const phrase of BW_PHRASES) {
    if (q.includes(phrase)) {
      colourFilter = "bw";
      q = q.replace(phrase, " ").replace(/\s+/g, " ").trim();
      break;
    }
  }

  if (!colourFilter) {
    for (const phrase of COLOUR_PHRASES) {
      if (q.includes(phrase)) {
        colourFilter = "colour";
        q = q.replace(phrase, " ").replace(/\s+/g, " ").trim();
        break;
      }
    }
  }

  return { terms: q.split(/\s+/).filter(Boolean), colourFilter };
}

export function matchProductQuery(product, query) {
  const { terms, colourFilter } = parseSearchQuery(query);
  if (!terms.length && !colourFilter) return true;

  if (colourFilter) {
    const pc = productColour(product);
    if (colourFilter === "bw" && pc !== "bw") return false;
    if (colourFilter === "colour" && pc === "bw") return false;
  }

  if (!terms.length) return true;

  const hay = productSearchHay(product);
  return terms.every((w) => hay.includes(w));
}
