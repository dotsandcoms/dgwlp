"use client";
import React, { useEffect, useRef, useState } from "react";
import { Loader2, Save, Truck, Percent, CreditCard, DollarSign, ChevronDown, RefreshCw } from "lucide-react";
import { C, HEAD } from "@/lib/pricing";
import { DEFAULT_SETTINGS, mergeSettings } from "@/lib/settings";
import { friendlyError } from "@/lib/errors";
import * as db from "@/lib/admin-data";
import { Pill } from "./primitives";

const inp = {
  className: "w-full py-2.5 px-3 text-[14px] outline-none bg-white",
  style: { border: `1px solid ${C.line}`, borderRadius: 4 },
};

function AccordionSection({ id, icon: Icon, title, hint, open, onToggle, children }) {
  return (
    <section className="mb-3 bg-white overflow-hidden" style={{ border: `1px solid ${C.line}`, borderRadius: 8 }}>
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 p-4 sm:p-5 text-left"
      >
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.greenSoft, color: C.green }}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[16px]" style={{ fontFamily: HEAD }}>{title}</h2>
          {hint && !open && (
            <p className="text-[12px] text-neutral-500 mt-0.5 truncate">{hint}</p>
          )}
        </div>
        <ChevronDown
          size={18}
          className="shrink-0 text-neutral-400 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-0">
          {hint && <p className="text-[13px] text-neutral-500 mb-5 -mt-1">{hint}</p>}
          {children}
        </div>
      )}
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block mb-4 last:mb-0">
      <span className="block text-[12px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>{label}</span>
      {children}
      {hint && <span className="block text-[12px] text-neutral-500 mt-1.5">{hint}</span>}
    </label>
  );
}

/**
 * Admin Settings — shipping, VAT, currency display, PayFast credentials.
 */
export function LiveSettings({ toast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState(mergeSettings());
  const [shipping, setShipping] = useState(DEFAULT_SETTINGS.shipping);
  const [tax, setTax] = useState(DEFAULT_SETTINGS.tax);
  const [currency, setCurrency] = useState(DEFAULT_SETTINGS.currency);
  const [payfast, setPayfast] = useState({
    merchantId: "",
    merchantKey: "",
    passphrase: "",
    sandbox: true,
  });
  const [keyDirty, setKeyDirty] = useState(false);
  const [passDirty, setPassDirty] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Load once — do not re-fetch when toast identity changes or the browser tab regains focus.
  useEffect(() => {
    let cancelled = false;
    db.fetchSettings()
      .then((s) => {
        if (cancelled) return;
        setBaseline(s);
        setShipping(s.shipping);
        setTax(s.tax);
        setCurrency(s.currency);
        setPayfast({
          merchantId: s.payfast.merchantId || "",
          merchantKey: "",
          passphrase: "",
          sandbox: Boolean(s.payfast.sandbox),
        });
        setKeyDirty(false);
        setPassDirty(false);
      })
      .catch((e) => toastRef.current(friendlyError(e, "Could not load settings")))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id));

  const refreshLiveRates = async () => {
    setRefreshingRates(true);
    try {
      const next = await db.refreshCurrencyRates();
      setCurrency(next);
      setBaseline((b) => ({ ...b, currency: next }));
      toast("Exchange rates updated from Frankfurter");
    } catch (e) {
      toast(friendlyError(e, "Could not fetch live rates"));
    } finally {
      setRefreshingRates(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const next = {
        shipping: {
          standardPrice: Math.max(0, Number(shipping.standardPrice) || 0),
          expressPrice: Math.max(0, Number(shipping.expressPrice) || 0),
          freeOver: Math.max(0, Number(shipping.standardPrice) || 0) === 0
            ? 0
            : Math.max(0, Number(shipping.freeOver) || 0),
          allFree: false,
          internationalQuote: true,
          internationalUnframedOnly: Boolean(shipping.internationalUnframedOnly),
          internationalNote: (shipping.internationalNote || DEFAULT_SETTINGS.shipping.internationalNote).trim()
            || DEFAULT_SETTINGS.shipping.internationalNote,
        },
        tax: {
          enabled: Boolean(tax.enabled),
          ratePct: Math.max(0, Math.min(100, Number(tax.ratePct) || 0)),
          label: (tax.label || "VAT").trim() || "VAT",
        },
        currency: {
          zarPerUsd: Math.max(0.01, Number(currency.zarPerUsd) || DEFAULT_SETTINGS.currency.zarPerUsd),
          zarPerEur: Math.max(0.01, Number(currency.zarPerEur) || DEFAULT_SETTINGS.currency.zarPerEur),
          zarPerGbp: Math.max(0.01, Number(currency.zarPerGbp) || DEFAULT_SETTINGS.currency.zarPerGbp),
          ratesUpdatedAt: currency.ratesUpdatedAt || null,
          rateDate: currency.rateDate || null,
          source: currency.source || "manual",
        },
        payfast: {
          merchantId: (payfast.merchantId || "").trim(),
          merchantKey: keyDirty ? (payfast.merchantKey || "").trim() : "",
          passphrase: passDirty ? (payfast.passphrase || "").trim() : "",
          sandbox: Boolean(payfast.sandbox),
        },
      };
      const saved = await db.saveSettings(next, { previous: baseline });
      setBaseline(saved);
      setShipping(saved.shipping);
      setTax(saved.tax);
      setCurrency(saved.currency);
      setPayfast({
        merchantId: saved.payfast.merchantId || "",
        merchantKey: "",
        passphrase: "",
        sandbox: Boolean(saved.payfast.sandbox),
      });
      setKeyDirty(false);
      setPassDirty(false);
      toast("Settings saved");
    } catch (e) {
      toast(friendlyError(e, "Could not save settings — run supabase/site_settings.sql if the table is missing"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-neutral-500 text-[14px] flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading settings…
      </div>
    );
  }

  const keySet = Boolean(baseline.payfast?.merchantKey);
  const passSet = Boolean(baseline.payfast?.passphrase);

  return (
    <div className="max-w-[720px]">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[28px]" style={{ fontFamily: HEAD, fontWeight: 300 }}>Settings</h1>
          <p className="text-[13px] text-neutral-500 mt-1">Shipping, tax, currency display and payment credentials.</p>
        </div>
        <Pill onClick={save} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : "Save changes"}
        </Pill>
      </div>

      <AccordionSection
        id="delivery"
        icon={Truck}
        title="Delivery"
        hint="South Africa: set standard to free and still charge for express. International orders are always quoted."
        open={openId === "delivery"}
        onToggle={toggle}
      >
        <label className="flex items-center gap-2 mb-4 text-[14px] cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(shipping.allFree) || Number(shipping.standardPrice) === 0}
            onChange={(e) => {
              const on = e.target.checked;
              setShipping({
                ...shipping,
                allFree: false,
                standardPrice: on ? 0 : (Number(shipping.standardPrice) > 0 ? shipping.standardPrice : 150),
              });
            }}
          />
          Standard delivery is free
          <span className="text-[12px] text-neutral-500">(express can still be charged)</span>
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="STANDARD DELIVERY (R)"
            hint={Number(shipping.standardPrice) === 0 || shipping.allFree ? "Currently free for all SA orders." : "Shown as free when the order meets the threshold below."}
          >
            <input
              type="number"
              min="0"
              step="1"
              value={shipping.allFree ? 0 : shipping.standardPrice}
              onChange={(e) => setShipping({ ...shipping, allFree: false, standardPrice: e.target.value })}
              {...inp}
            />
          </Field>
          <Field label="EXPRESS DELIVERY (R)" hint="Always available as a paid upgrade when set above 0.">
            <input type="number" min="0" step="1" value={shipping.expressPrice} onChange={(e) => setShipping({ ...shipping, expressPrice: e.target.value })} {...inp} />
          </Field>
          <Field
            label="FREE STANDARD OVER (R)"
            hint="Only applies when standard is not free. Set to 0 to disable. Express is never free via this rule."
          >
            <input
              type="number"
              min="0"
              step="1"
              value={shipping.freeOver}
              onChange={(e) => setShipping({ ...shipping, freeOver: e.target.value })}
              disabled={Boolean(shipping.allFree) || Number(shipping.standardPrice) === 0}
              {...inp}
              style={{
                ...inp.style,
                opacity: Boolean(shipping.allFree) || Number(shipping.standardPrice) === 0 ? 0.45 : 1,
              }}
            />
          </Field>
        </div>

        <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${C.line}` }}>
          <p className="text-[12px] tracking-[.08em] text-neutral-500 mb-3" style={{ fontFamily: HEAD }}>INTERNATIONAL</p>
          <label className="flex items-start gap-2 mb-4 text-[14px] cursor-pointer">
            <input
              type="checkbox"
              className="mt-1"
              checked={Boolean(shipping.internationalUnframedOnly)}
              onChange={(e) => setShipping({ ...shipping, internationalUnframedOnly: e.target.checked })}
            />
            <span>
              International shipping — unframed prints only
              <span className="block text-[12px] text-neutral-500 mt-1">
                When enabled, overseas checkout blocks framed finishes (paper framed / canvas framed). SA customers are unaffected.
              </span>
            </span>
          </label>
          <Field label="QUOTE MESSAGE" hint="Shown at checkout when the shopper chooses International.">
            <textarea
              rows={2}
              value={shipping.internationalNote || ""}
              onChange={(e) => setShipping({ ...shipping, internationalNote: e.target.value })}
              {...inp}
            />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        id="currency"
        icon={DollarSign}
        title="Currency"
        hint="Shoppers can switch ZAR, USD, EUR and GBP in the header. Checkout still charges in rand. Rates auto-refresh daily."
        open={openId === "currency"}
        onToggle={toggle}
      >
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <Pill size="sm" variant="outline" onClick={refreshLiveRates} disabled={refreshingRates}>
            {refreshingRates ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh live rates
          </Pill>
          {currency.ratesUpdatedAt ? (
            <span className="text-[12px] text-neutral-500">
              Updated {new Date(currency.ratesUpdatedAt).toLocaleString("en-ZA")}
              {currency.rateDate ? ` · ECB ${currency.rateDate}` : ""}
            </span>
          ) : (
            <span className="text-[12px] text-neutral-500">Rates not refreshed yet — click to fetch live ECB rates.</span>
          )}
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="ZAR PER 1 USD" hint="e.g. 18.5 → R1 850 ≈ $100">
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={currency.zarPerUsd}
              onChange={(e) => setCurrency({ ...currency, zarPerUsd: e.target.value })}
              {...inp}
            />
          </Field>
          <Field label="ZAR PER 1 EUR" hint="e.g. 20 → R2 000 ≈ €100">
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={currency.zarPerEur ?? DEFAULT_SETTINGS.currency.zarPerEur}
              onChange={(e) => setCurrency({ ...currency, zarPerEur: e.target.value })}
              {...inp}
            />
          </Field>
          <Field label="ZAR PER 1 GBP" hint="e.g. 23.5 → R2 350 ≈ £100">
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={currency.zarPerGbp ?? DEFAULT_SETTINGS.currency.zarPerGbp}
              onChange={(e) => setCurrency({ ...currency, zarPerGbp: e.target.value })}
              {...inp}
            />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        id="vat"
        icon={Percent}
        title="VAT / tax"
        hint="When enabled, VAT is calculated on subtotal + shipping at checkout."
        open={openId === "vat"}
        onToggle={toggle}
      >
        <label className="flex items-center gap-2 mb-4 text-[14px] cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(tax.enabled)}
            onChange={(e) => setTax({ ...tax, enabled: e.target.checked })}
          />
          Charge VAT on orders
        </label>
        <div className="grid sm:grid-cols-2 gap-4" style={{ opacity: tax.enabled ? 1 : 0.45, pointerEvents: tax.enabled ? "auto" : "none" }}>
          <Field label="RATE (%)">
            <input type="number" min="0" max="100" step="0.1" value={tax.ratePct} onChange={(e) => setTax({ ...tax, ratePct: e.target.value })} {...inp} />
          </Field>
          <Field label="LABEL ON INVOICE">
            <input value={tax.label} onChange={(e) => setTax({ ...tax, label: e.target.value })} placeholder="VAT" {...inp} />
          </Field>
        </div>
      </AccordionSection>

      <AccordionSection
        id="payfast"
        icon={CreditCard}
        title="Payment (PayFast)"
        hint="Credentials are only visible to admins. Leave secret fields blank to keep the saved value."
        open={openId === "payfast"}
        onToggle={toggle}
      >
        <label className="flex items-center gap-2 mb-4 text-[14px] cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(payfast.sandbox)}
            onChange={(e) => setPayfast({ ...payfast, sandbox: e.target.checked })}
          />
          Sandbox mode (test payments)
        </label>
        <Field label="MERCHANT ID">
          <input
            value={payfast.merchantId}
            onChange={(e) => setPayfast({ ...payfast, merchantId: e.target.value })}
            placeholder="10000100"
            autoComplete="off"
            {...inp}
          />
        </Field>
        <Field label="MERCHANT KEY" hint={keySet && !keyDirty ? "A key is saved — enter a new one only to replace it." : "Stored encrypted at rest by Supabase; never shown again after save."}>
          <input
            type="password"
            value={payfast.merchantKey}
            onChange={(e) => { setKeyDirty(true); setPayfast({ ...payfast, merchantKey: e.target.value }); }}
            placeholder={keySet ? "••••••••••••" : "Merchant key"}
            autoComplete="new-password"
            {...inp}
          />
        </Field>
        <Field label="PASSPHRASE" hint={passSet && !passDirty ? "A passphrase is saved — enter a new one only to replace it." : "Optional — required if set in your PayFast account."}>
          <input
            type="password"
            value={payfast.passphrase}
            onChange={(e) => { setPassDirty(true); setPayfast({ ...payfast, passphrase: e.target.value }); }}
            placeholder={passSet ? "••••••••••••" : "Passphrase (optional)"}
            autoComplete="new-password"
            {...inp}
          />
        </Field>
        <p className="text-[12px] text-neutral-500 mt-2">
          Env vars <code className="text-[11px]">PAYFAST_*</code> are used as a fallback if these fields are empty.
        </p>
      </AccordionSection>

      <div className="flex justify-end mt-4">
        <Pill onClick={save} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : "Save changes"}
        </Pill>
      </div>
    </div>
  );
}

/** Demo / localStorage settings (no Supabase). */
export function DemoSettings({ toast }) {
  return <LiveSettings toast={toast} />;
}
