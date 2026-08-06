import { createClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS, mergeSettings } from "./settings";

/** Server-only: read settings with service role (includes PayFast secrets). */
export async function getServerSettings() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let fromDb = {};

  if (url && serviceKey) {
    try {
      const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
      const { data } = await sb.from("site_settings").select("key,value").in("key", ["shipping", "tax", "payfast"]);
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
  return { shipping: all.shipping || DEFAULT_SETTINGS.shipping, tax: all.tax || DEFAULT_SETTINGS.tax };
}
