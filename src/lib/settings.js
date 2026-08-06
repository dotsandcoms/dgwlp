/** Storefront commercial settings — defaults + pure helpers. */

export const DEFAULT_SETTINGS = {
  shipping: {
    standardPrice: 150,
    expressPrice: 300,
    freeOver: 2500, // 0 = no free-over threshold
    allFree: false,
  },
  tax: {
    enabled: false,
    ratePct: 15,
    label: "VAT",
  },
  payfast: {
    merchantId: "",
    merchantKey: "",
    passphrase: "",
    sandbox: true,
  },
};

export function mergeSettings(partial = {}) {
  return {
    shipping: { ...DEFAULT_SETTINGS.shipping, ...(partial.shipping || {}) },
    tax: { ...DEFAULT_SETTINGS.tax, ...(partial.tax || {}) },
    payfast: { ...DEFAULT_SETTINGS.payfast, ...(partial.payfast || {}) },
  };
}

/** Public-safe subset (no payment secrets). */
export function publicSettings(settings) {
  const s = mergeSettings(settings);
  return { shipping: s.shipping, tax: s.tax };
}

/**
 * @param {"standard"|"express"} method
 * @param {number} subtotal rands
 */
export function shippingCost(shipping, method, subtotal) {
  const cfg = { ...DEFAULT_SETTINGS.shipping, ...(shipping || {}) };
  if (cfg.allFree) return 0;
  if (method === "express") return Math.max(0, Number(cfg.expressPrice) || 0);
  const standard = Math.max(0, Number(cfg.standardPrice) || 0);
  const freeOver = Number(cfg.freeOver) || 0;
  if (freeOver > 0 && subtotal >= freeOver) return 0;
  return standard;
}

/** VAT on (subtotal + shipping). Prices are treated as VAT-exclusive when enabled. */
export function taxAmount(tax, subtotal, shipping) {
  const cfg = { ...DEFAULT_SETTINGS.tax, ...(tax || {}) };
  if (!cfg.enabled) return 0;
  const rate = Math.max(0, Number(cfg.ratePct) || 0) / 100;
  const base = Math.max(0, Number(subtotal) || 0) + Math.max(0, Number(shipping) || 0);
  return Math.round(base * rate * 100) / 100;
}

export function orderTotals(settings, { subtotal, method }) {
  const s = mergeSettings(settings);
  const shipping = shippingCost(s.shipping, method, subtotal);
  const tax = taxAmount(s.tax, subtotal, shipping);
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;
  return { subtotal, shipping, tax, total, taxLabel: s.tax.label || "VAT", taxEnabled: s.tax.enabled };
}

export function freeShippingLabel(shipping) {
  const cfg = { ...DEFAULT_SETTINGS.shipping, ...(shipping || {}) };
  if (cfg.allFree) return "Free shipping on all orders";
  const freeOver = Number(cfg.freeOver) || 0;
  if (freeOver > 0) {
    return `Free shipping on orders over R${Number(freeOver).toLocaleString("en-ZA")}`;
  }
  return null;
}

/** Mask secrets for admin UI display. */
export function maskPayfast(payfast) {
  const p = { ...DEFAULT_SETTINGS.payfast, ...(payfast || {}) };
  return {
    merchantId: p.merchantId || "",
    merchantKeySet: Boolean(p.merchantKey),
    passphraseSet: Boolean(p.passphrase),
    sandbox: Boolean(p.sandbox),
  };
}
