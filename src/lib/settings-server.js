import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, mergeSettings, publicSettings } from "./settings";
import {
  fetchFrankfurterRates,
  isCurrencyRatesStale,
  mergeCurrencyRates,
} from "./currency-rates";

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

async function saveCurrencySettings(currency) {
  const sb = serviceClient();
  if (!sb) return false;
  const { error } = await sb.from("site_settings").upsert(
    { key: "currency", value: currency, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
  return !error;
}

/** Server-only: read settings with service role (includes PayFast secrets). */
export async function getServerSettings() {
  const sb = serviceClient();
  let fromDb = {};

  if (sb) {
    try {
      const { data } = await sb.from("site_settings").select("key,value").in("key", ["shipping", "tax", "currency", "payfast"]);
      for (const row of data || []) fromDb[row.key] = row.value;
    } catch {
      // table may not exist yet
    }
  }

  const merged = mergeSettings(fromDb);

  // Env fallbacks for PayFast when DB fields are empty
  if (!merged.payfast.merchantId && process.env.PAYFAST_MERCHANT_ID) {
    merged.payfast.merchantId = process.env.PAYFAST_MERCHANT_ID;
  }
  if (!merged.payfast.merchantKey && process.env.PAYFAST_MERCHANT_KEY) {
    merged.payfast.merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  }
  if (!merged.payfast.passphrase && process.env.PAYFAST_PASSPHRASE) {
    merged.payfast.passphrase = process.env.PAYFAST_PASSPHRASE;
  }
  if (process.env.PAYFAST_SANDBOX === "false") merged.payfast.sandbox = false;
  if (process.env.PAYFAST_SANDBOX === "true") merged.payfast.sandbox = true;

  return merged;
}

export async function getPublicServerSettings() {
  const all = await getServerSettings();

  if (isCurrencyRatesStale(all.currency)) {
    try {
      const live = await fetchFrankfurterRates();
      const currency = mergeCurrencyRates(all.currency, live);
      const saved = await saveCurrencySettings(currency);
      if (saved) all.currency = currency;
    } catch {
      // Keep existing manual or last-known rates.
    }
  }

  return publicSettings(all);
}
