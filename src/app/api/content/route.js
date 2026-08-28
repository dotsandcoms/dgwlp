import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content-server";

/** Public editable site copy (home, about, contact, etc.). */
export async function GET() {
  try {
    const content = await getSiteContent();
    return NextResponse.json(content, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    const { mergeSiteContent } = await import("@/lib/site-content");
    return NextResponse.json(mergeSiteContent());
  }
}
