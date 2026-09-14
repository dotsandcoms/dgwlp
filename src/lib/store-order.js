/** Shop catalogue order. ids[0] is the first print shoppers see. */

export function applyStoreOrder(products, ids) {
  if (!Array.isArray(products) || !products.length) return products || [];
  if (!Array.isArray(ids) || !ids.length) return products;

  const byId = new Map(products.map((p) => [p.id, p]));
  const seen = new Set();
  const ordered = [];
  for (const id of ids) {
    const p = byId.get(id);
    if (!p || seen.has(id)) continue;
    ordered.push(p);
    seen.add(id);
  }
  const rest = products.filter((p) => !seen.has(p.id));
  // Unordered / new prints stay at the top until placed in the saved order.
  return [...rest, ...ordered];
}

/** Category filter / home browse order. ids[0] is first. */
export function applyCategoryOrder(categories, ids) {
  if (!Array.isArray(categories) || !categories.length) return categories || [];
  if (!Array.isArray(ids) || !ids.length) return categories;

  const byId = new Map(categories.map((c) => [c.id, c]));
  const seen = new Set();
  const ordered = [];
  for (const id of ids) {
    const c = byId.get(id);
    if (!c || seen.has(id)) continue;
    ordered.push(c);
    seen.add(id);
  }
  const rest = categories.filter((c) => !seen.has(c.id));
  return [...ordered, ...rest];
}
