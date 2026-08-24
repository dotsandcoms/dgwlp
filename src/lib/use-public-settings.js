"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { DEFAULT_SETTINGS, mergeSettings, publicSettings, formatMoney, formatMoneyRange, DISPLAY_CURRENCIES } from "@/lib/settings";

const STORAGE_KEY = "dg_display_currency";

const PublicSettingsCtx = createContext(publicSettings(DEFAULT_SETTINGS));
const DisplayCurrencyCtx = createContext(null);

/**
 * Loads public store settings once and shares display-currency selection site-wide
 * so header changes update prices everywhere.
 */
export function StoreSettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => publicSettings(DEFAULT_SETTINGS));
  const [code, setCodeState] = useState("ZAR");

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && DISPLAY_CURRENCIES.some((c) => c.code === saved)) setCodeState(saved);
    } catch {}
  }, []);

  const setCode = useCallback((next) => {
    const valid = DISPLAY_CURRENCIES.some((c) => c.code === next) ? next : "ZAR";
    setCodeState(valid);
    try { localStorage.setItem(STORAGE_KEY, valid); } catch {}
  }, []);

  const currency = settings.currency;
  const value = useMemo(() => {
    const money = (n) => formatMoney(n, currency, code);
    const moneyRange = (min, max) => formatMoneyRange(min, max, currency, code);
    return {
      code,
      setCode,
      money,
      moneyRange,
      currency,
      options: DISPLAY_CURRENCIES,
      isForeign: code !== "ZAR",
    };
  }, [code, setCode, currency]);

  return (
    <PublicSettingsCtx.Provider value={settings}>
      <DisplayCurrencyCtx.Provider value={value}>
        {children}
      </DisplayCurrencyCtx.Provider>
    </PublicSettingsCtx.Provider>
  );
}

/** Public shipping / tax / currency rates. */
export function usePublicSettings() {
  return useContext(PublicSettingsCtx);
}

/**
 * Shopper-selected display currency (ZAR / USD / EUR / GBP).
 * Must be used under StoreSettingsProvider.
 */
export function useDisplayCurrency() {
  const ctx = useContext(DisplayCurrencyCtx);
  if (!ctx) {
    // Safe fallback if a tree renders outside the provider (shouldn't happen in app layout).
    return {
      code: "ZAR",
      setCode: () => {},
      money: (n) => formatMoney(n, DEFAULT_SETTINGS.currency, "ZAR"),
      moneyRange: (min, max) => formatMoneyRange(min, max, DEFAULT_SETTINGS.currency, "ZAR"),
      currency: DEFAULT_SETTINGS.currency,
      options: DISPLAY_CURRENCIES,
      isForeign: false,
    };
  }
  return ctx;
}
