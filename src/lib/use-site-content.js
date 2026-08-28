"use client";
import { useEffect, useState } from "react";
import { DEFAULT_SITE_CONTENT, mergeSiteContent } from "@/lib/site-content";

/** Client-side site copy — falls back to defaults, then /api/content. */
export function useSiteContent() {
  const [content, setContent] = useState(() => mergeSiteContent());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/content")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setContent(mergeSiteContent(data));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return content;
}

export { DEFAULT_SITE_CONTENT, mergeSiteContent };
