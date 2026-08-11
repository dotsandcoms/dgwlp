"use client";
import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, mergeSettings, publicSettings } from "@/lib/settings";

/**
 * Load public store settings (shipping, tax, currency) from /api/settings.
 */
export function usePublicSettings() {
  const [settings, setSettings] = useState(() => publicSettings(DEFAULT_SETTINGS));

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setSettings(publicSettings(mergeSettings(data)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return settings;
}
