import { NextResponse } from "next/server";
import { getPublicServerSettings } from "@/lib/settings-server";
import { DEFAULT_SETTINGS } from "@/lib/settings";

/** Public commercial settings (shipping + tax only). */
export async function GET() {
  try {
    const settings = await getPublicServerSettings();
    return NextResponse.json(settings, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({
      shipping: DEFAULT_SETTINGS.shipping,
      tax: DEFAULT_SETTINGS.tax,
    });
  }
}
