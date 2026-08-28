import { serverClient } from "./supabase";
import { mergeSiteContent } from "./site-content";

/** Server-side site copy for RSC pages. */
export async function getSiteContent() {
  try {
    const sb = serverClient();
    const { data } = await sb.from("site_settings").select("value").eq("key", "content").maybeSingle();
    return mergeSiteContent(data?.value);
  } catch {
    return mergeSiteContent();
  }
}
