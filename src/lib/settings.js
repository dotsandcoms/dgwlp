/** Storefront commercial settings — defaults + pure helpers. */

import { zar, MATERIALS } from "./pricing";

export const DEFAULT_SETTINGS = {
  shipping: {
    standardPrice: 0, // free standard local delivery by default
    expressPrice: 300,
    freeOver: 0, // only used when standardPrice > 0
    allFree: false, // legacy; if true, standard is free (express still charged)
    internationalQuote: true,
    internationalUnframedOnly: true,
    internationalNote: "International shipping is quoted on request.",
  },
  tax: {
    enabled: false,
    ratePct: 15,
    label: "VAT",
  },
  currency: {
    // ZAR per 1 unit of foreign currency (for approximate display)
    zarPerUsd: 18.5,
    zarPerEur: 20,
    zarPerGbp: 23.5,
    ratesUpdatedAt: null,
    rateDate: null,
    source: "manual",
  },
  payfast: {
    merchantId: "",
    merchantKey: "",
    passphrase: "",
    sandbox: true,
  },
};

/** Shopper-facing display currencies. Checkout/PayFast remain ZAR. */
export const DISPLAY_CURRENCIES = [
  { code: "ZAR", label: "ZAR", symbol: "R" },
  { code: "USD", label: "USD", symbol: "$", rateKey: "zarPerUsd" },
  { code: "EUR", label: "EUR", symbol: "€", rateKey: "zarPerEur" },
  { code: "GBP", label: "GBP", symbol: "£", rateKey: "zarPerGbp" },
];

export function mergeSettings(partial = {}) {
  return {
    shipping: { ...DEFAULT_SETTINGS.shipping, ...(partial.shipping || {}) },
    tax: { ...DEFAULT_SETTINGS.tax, ...(partial.tax || {}) },
    currency: { ...DEFAULT_SETTINGS.currency, ...(partial.currency || {}) },
    payfast: { ...DEFAULT_SETTINGS.payfast, ...(partial.payfast || {}) },
  };
}

/** Public-safe subset (no payment secrets). */
export function publicSettings(settings) {
  const s = mergeSettings(settings);
  return { shipping: s.shipping, tax: s.tax, currency: s.currency };
}

/**
 * @param {"standard"|"express"} method
 * @param {number} subtotal rands
 */
export function shippingCost(shipping, method, subtotal) {
  const cfg = { ...DEFAULT_SETTINGS.shipping, ...(shipping || {}) };
  // Express is always its own rate — never zeroed by “free standard” / allFree.
  if (method === "express") return Math.max(0, Number(cfg.expressPrice) || 0);

  if (cfg.allFree) return 0;
  const standard = Math.max(0, Number(cfg.standardPrice) || 0);
  if (standard === 0) return 0;
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

export function orderTotals(settings, { subtotal, method, international = false }) {
  const s = mergeSettings(settings);
  if (international) {
    const tax = taxAmount(s.tax, subtotal, 0);
    const total = Math.round((subtotal + tax) * 100) / 100;
    return {
      subtotal,
      shipping: 0,
      shippingQuoted: true,
      tax,
      total,
      taxLabel: s.tax.label || "VAT",
      taxEnabled: s.tax.enabled,
    };
  }
  const shipping = shippingCost(s.shipping, method, subtotal);
  const tax = taxAmount(s.tax, subtotal, shipping);
  const total = Math.round((subtotal + shipping + tax) * 100) / 100;
  return {
    subtotal,
    shipping,
    shippingQuoted: false,
    tax,
    total,
    taxLabel: s.tax.label || "VAT",
    taxEnabled: s.tax.enabled,
  };
}

export function freeShippingLabel(shipping) {
  const cfg = { ...DEFAULT_SETTINGS.shipping, ...(shipping || {}) };
  const standardFree = cfg.allFree || Number(cfg.standardPrice) === 0;
  if (standardFree) return "Free standard shipping nationwide";
  const freeOver = Number(cfg.freeOver) || 0;
  if (freeOver > 0) {
    return `Free standard shipping on orders over R${Number(freeOver).toLocaleString("en-ZA")}`;
  }
  return null;
}

export function internationalShippingNote(shipping) {
  const cfg = { ...DEFAULT_SETTINGS.shipping, ...(shipping || {}) };
  return (cfg.internationalNote || DEFAULT_SETTINGS.shipping.internationalNote).trim();
}

export function isFramedMaterial(matId) {
  return Boolean(MATERIALS.find((m) => m.id === matId)?.framed);
}

/** Cart lines that use a framed finish. */
export function framedCartItems(items = []) {
  return (items || []).filter((i) => isFramedMaterial(i.material));
}

function currencyMeta(code) {
  return DISPLAY_CURRENCIES.find((c) => c.code === code) || DISPLAY_CURRENCIES[0];
}

/**
 * Format a ZAR amount in a single display currency (no dual ZAR · ~$xx).
 * @param {number} amountZar
 * @param {object} currency settings (rates)
 * @param {"ZAR"|"USD"|"EUR"|"GBP"} [displayCode="ZAR"]
 */
export function formatMoney(amountZar, currency, displayCode = "ZAR") {
  const cfg = { ...DEFAULT_SETTINGS.currency, ...(currency || {}) };
  const meta = currencyMeta(displayCode);
  if (!meta.rateKey) return zar(amountZar);

  const rate = Number(cfg[meta.rateKey]) || 0;
  if (rate <= 0) return zar(amountZar);
  const converted = Math.round((Number(amountZar) || 0) / rate);
  return `${meta.symbol}${converted.toLocaleString("en-US")}`;
}

/** Clean min–max range in one currency, e.g. "$88 – $441". */
export function formatMoneyRange(minZar, maxZar, currency, displayCode = "ZAR") {
  const a = Number(minZar) || 0;
  const b = Number(maxZar) || 0;
  if (a === b) return formatMoney(a, currency, displayCode);
  return `${formatMoney(a, currency, displayCode)} – ${formatMoney(b, currency, displayCode)}`;
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
