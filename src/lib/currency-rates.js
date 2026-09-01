/** Live ZAR exchange rates via Frankfurter (ECB data, no API key). */

const FRANKFURTER_URL = "https://api.frankfurter.app/latest?from=ZAR&to=USD,EUR,GBP";

/** How long stored rates stay fresh before auto-refresh (24 hours). */
export const CURRENCY_RATES_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function isCurrencyRatesStale(currency, maxAgeMs = CURRENCY_RATES_MAX_AGE_MS) {
  const ts = currency?.ratesUpdatedAt;
  if (!ts) return true;
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return true;
  return Date.now() - t > maxAgeMs;
}

/**
 * Fetch ZAR per 1 unit of USD/EUR/GBP from Frankfurter.
 * API returns foreign per 1 ZAR — we invert to match admin fields.
 */
export async function fetchFrankfurterRates() {
  const res = await fetch(FRANKFURTER_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Exchange rate service unavailable (${res.status})`);

  const data = await res.json();
  const usd = Number(data?.rates?.USD);
  const eur = Number(data?.rates?.EUR);
  const gbp = Number(data?.rates?.GBP);

  if (!usd || !eur || !gbp) throw new Error("Incomplete rates from exchange service");

  const round = (n) => Math.round(n * 100) / 100;

  return {
    zarPerUsd: round(1 / usd),
    zarPerEur: round(1 / eur),
    zarPerGbp: round(1 / gbp),
    ratesUpdatedAt: new Date().toISOString(),
    rateDate: data.date || null,
    source: "frankfurter",
  };
}

export function mergeCurrencyRates(existing = {}, live) {
  return {
    ...existing,
    zarPerUsd: live.zarPerUsd,
    zarPerEur: live.zarPerEur,
    zarPerGbp: live.zarPerGbp,
    ratesUpdatedAt: live.ratesUpdatedAt,
    rateDate: live.rateDate,
    source: live.source,
  };
}
