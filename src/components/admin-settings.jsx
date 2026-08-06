"use client";
import React, { useEffect, useState } from "react";
import { Loader2, Save, Truck, Percent, CreditCard } from "lucide-react";
import { C, HEAD } from "@/lib/pricing";
import { DEFAULT_SETTINGS, mergeSettings } from "@/lib/settings";
import { friendlyError } from "@/lib/errors";
import * as db from "@/lib/admin-data";
import { Pill } from "./primitives";

const inp = {
  className: "w-full py-2.5 px-3 text-[14px] outline-none bg-white",
  style: { border: `1px solid ${C.line}`, borderRadius: 4 },
};

function Section({ icon: Icon, title, hint, children }) {
  return (
    <section className="p-5 sm:p-6 mb-5 bg-white" style={{ border: `1px solid ${C.line}`, borderRadius: 8 }}>
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: C.greenSoft, color: C.green }}>
          <Icon size={16} />
        </div>
        <div>
          <h2 className="text-[16px]" style={{ fontFamily: HEAD }}>{title}</h2>
          {hint && <p className="text-[13px] text-neutral-500 mt-0.5">{hint}</p>}
        </div>
      </div>
      {children}
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
 * Admin Settings — shipping, VAT, PayFast credentials.
 */
export function LiveSettings({ toast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [baseline, setBaseline] = useState(mergeSettings());
  const [shipping, setShipping] = useState(DEFAULT_SETTINGS.shipping);
  const [tax, setTax] = useState(DEFAULT_SETTINGS.tax);
  const [payfast, setPayfast] = useState({
    merchantId: "",
    merchantKey: "",
    passphrase: "",
    sandbox: true,
  });
  const [keyDirty, setKeyDirty] = useState(false);
  const [passDirty, setPassDirty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    db.fetchSettings()
      .then((s) => {
        if (cancelled) return;
        setBaseline(s);
        setShipping(s.shipping);
        setTax(s.tax);
        setPayfast({
          merchantId: s.payfast.merchantId || "",
          merchantKey: "",
          passphrase: "",
          sandbox: Boolean(s.payfast.sandbox),
        });
        setKeyDirty(false);
        setPassDirty(false);
      })
      .catch((e) => toast(friendlyError(e, "Could not load settings")))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toast]);

  const save = async () => {
    setSaving(true);
    try {
      const next = {
        shipping: {
          standardPrice: Math.max(0, Number(shipping.standardPrice) || 0),
          expressPrice: Math.max(0, Number(shipping.expressPrice) || 0),
          freeOver: Math.max(0, Number(shipping.freeOver) || 0),
          allFree: Boolean(shipping.allFree),
        },
        tax: {
          enabled: Boolean(tax.enabled),
          ratePct: Math.max(0, Math.min(100, Number(tax.ratePct) || 0)),
          label: (tax.label || "VAT").trim() || "VAT",
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
          <p className="text-[13px] text-neutral-500 mt-1">Shipping, tax and payment credentials for the live store.</p>
        </div>
        <Pill onClick={save} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Saving…" : "Save changes"}
        </Pill>
      </div>

      <Section icon={Truck} title="Delivery" hint="Prices in South African rand. Set standard to 0 or enable free shipping for all orders.">
        <label className="flex items-center gap-2 mb-4 text-[14px] cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(shipping.allFree)}
            onChange={(e) => setShipping({ ...shipping, allFree: e.target.checked })}
          />
          Free shipping on all orders
        </label>
        <div className="grid sm:grid-cols-2 gap-4" style={{ opacity: shipping.allFree ? 0.45 : 1, pointerEvents: shipping.allFree ? "none" : "auto" }}>
          <Field label="STANDARD DELIVERY (R)" hint="Shown as free when the order qualifies below.">
            <input type="number" min="0" step="1" value={shipping.standardPrice} onChange={(e) => setShipping({ ...shipping, standardPrice: e.target.value })} {...inp} />
          </Field>
          <Field label="EXPRESS DELIVERY (R)">
            <input type="number" min="0" step="1" value={shipping.expressPrice} onChange={(e) => setShipping({ ...shipping, expressPrice: e.target.value })} {...inp} />
          </Field>
          <Field label="FREE STANDARD OVER (R)" hint="Set to 0 to disable free-over threshold. Express is never free via this rule.">
            <input type="number" min="0" step="1" value={shipping.freeOver} onChange={(e) => setShipping({ ...shipping, freeOver: e.target.value })} {...inp} />
          </Field>
        </div>
      </Section>

      <Section icon={Percent} title="VAT / tax" hint="When enabled, VAT is calculated on subtotal + shipping and added at checkout (prices are treated as exclusive).">
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
      </Section>

      <Section
        icon={CreditCard}
        title="PayFast"
        hint="Credentials are only visible to admins. Leave secret fields blank to keep the saved value."
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
      </Section>

      <div className="flex justify-end">
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
