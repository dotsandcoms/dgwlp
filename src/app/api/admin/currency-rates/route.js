import { NextResponse } from "next/server";
import { requireAdminFromRequest, serviceClient } from "@/lib/admin-auth-server";
import { getServerSettings } from "@/lib/settings-server";
import { fetchFrankfurterRates, mergeCurrencyRates } from "@/lib/currency-rates";

/** Preview live Frankfurter rates (admin session required). */
export async function GET(req) {
  const auth = await requireAdminFromRequest(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const rates = await fetchFrankfurterRates();
    return NextResponse.json({ rates });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not fetch rates" }, { status: 502 });
  }
}

/** Fetch live rates and persist to site_settings.currency. */
export async function POST(req) {
  const auth = await requireAdminFromRequest(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const live = await fetchFrankfurterRates();
    const settings = await getServerSettings();
    const currency = mergeCurrencyRates(settings.currency, live);

    const sb = serviceClient();
    if (!sb) {
      return NextResponse.json({ error: "Server not configured" }, { status: 503 });
    }

    const { error } = await sb.from("site_settings").upsert(
      { key: "currency", value: currency, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (error) throw error;

    return NextResponse.json({ currency });
  } catch (e) {
    return NextResponse.json({ error: e.message || "Could not update rates" }, { status: 502 });
  }
}
