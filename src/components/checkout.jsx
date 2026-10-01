"use client";
import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Truck, ShieldCheck, ShoppingBag } from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { siteImage } from "@/lib/supabase";
import { Plate, Pill, Row, Reveal } from "./primitives";
import { RegisterForm, LoginForm } from "./forms";
import { AddressFields } from "./address-fields";
import { emptyAddress } from "@/lib/address";
import {
  DEFAULT_SETTINGS,
  orderTotals,
  internationalShippingNote,
  framedCartItems,
} from "@/lib/settings";
import { useDisplayCurrency } from "@/lib/use-public-settings";
import { useCart, useAuth, useToast } from "@/context/providers";
import { friendlyError } from "@/lib/errors";
import { placeOrder, newQuoteToken } from "@/lib/orders";

const QUOTED_CHECKOUT_KEY = "dg_quoted_checkout";

export function loadQuotedCheckout() {
  try {
    const raw = localStorage.getItem(QUOTED_CHECKOUT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveQuotedCheckout(payload) {
  try { localStorage.setItem(QUOTED_CHECKOUT_KEY, JSON.stringify(payload)); } catch {}
}

export function clearQuotedCheckout() {
  try { localStorage.removeItem(QUOTED_CHECKOUT_KEY); } catch {}
}

export function CheckoutFlow() {
  const cart = useCart();
  const { user, register, login, updateProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const { money, isForeign, code } = useDisplayCurrency();

  const [step, setStep] = useState(1);
  const [authTab, setAuthTab] = useState("register");
  const [ship, setShip] = useState("standard");
  const [pay, setPay] = useState("payfast");
  const [addr, setAddr] = useState(null);
  const [destination, setDestination] = useState("za");
  const [quotedCheckout, setQuotedCheckout] = useState(null);
  const [placing, setPlacing] = useState(false);
  const [storeSettings, setStoreSettings] = useState({
    shipping: DEFAULT_SETTINGS.shipping,
    tax: DEFAULT_SETTINGS.tax,
    currency: DEFAULT_SETTINGS.currency,
  });

  useEffect(() => { if (user) { setStep((s) => (s === 1 ? 2 : s)); setAddr(user.address || null); } }, [user]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data) return;
        setStoreSettings({
          shipping: { ...DEFAULT_SETTINGS.shipping, ...(data.shipping || {}) },
          tax: { ...DEFAULT_SETTINGS.tax, ...(data.tax || {}) },
          currency: { ...DEFAULT_SETTINGS.currency, ...(data.currency || {}) },
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Resume international checkout after customer accepts a shipping quote.
  useEffect(() => {
    const quoted = loadQuotedCheckout();
    if (!quoted?.orderNo || !Array.isArray(quoted.items) || !quoted.items.length) return;
    setQuotedCheckout(quoted);
    setDestination("international");
    setAddr(quoted.delivery || null);
    setShip("international");
    if (user) setStep(3);
    const nextItems = quoted.items.map((item) => ({
      ...item,
      key: item.key || Math.random().toString(36).slice(2),
      product: item.product || {
        name: item.name,
        image: item.image || null,
        colour: item.printColour || "bw",
        grad: ["#2f2f2d", "#a9a49b"],
        angle: 120,
      },
    }));
    cart.replace(nextItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for quote resume
  }, [user]);

  const international = destination === "international";
  const quotedShipping = quotedCheckout ? Number(quotedCheckout.shipping) || 0 : null;
  const totals = useMemo(() => {
    if (quotedShipping != null) {
      const tax = 0;
      const subtotal = cart.subtotal;
      return {
        subtotal,
        shipping: quotedShipping,
        shippingQuoted: false,
        tax,
        total: Math.round((subtotal + quotedShipping) * 100) / 100,
        taxLabel: storeSettings.tax?.label || "VAT",
        taxEnabled: false,
      };
    }
    return orderTotals(storeSettings, { subtotal: cart.subtotal, method: ship, international });
  }, [storeSettings, cart.subtotal, ship, international, quotedShipping]);
  const { shipping: shipCost, tax: taxCost, total, taxLabel, taxEnabled, shippingQuoted } = totals;
  const steps = ["Account", "Delivery", "Payment"];

  /** Persist delivery (including notes) to the signed-in profile. */
  const saveDeliveryToProfile = async (delivery) => {
    if (!user || !delivery?.street || delivery.destination === "international") return;
    try {
      await updateProfile({
        name: user.name,
        phone: user.phone || "",
        address: {
          street: (delivery.street || "").trim(),
          suburb: (delivery.suburb || "").trim(),
          city: (delivery.city || "").trim(),
          province: delivery.province || "",
          postal: (delivery.postal || "").trim(),
          notes: (delivery.notes || "").trim(),
        },
      });
    } catch {
      // Checkout can continue even if profile sync fails
    }
  };

  const placeLocal = async () => {
    if (!user?.email) {
      toast("Please sign in to place an order");
      setStep(1);
      return;
    }
    setPlacing(true);
    try {
      await saveDeliveryToProfile(addr);
      const result = await placeOrder({
        user,
        email: user.email,
        items: cart.items,
        subtotal: cart.subtotal,
        shipping: shipCost,
        total,
        delivery: { ...(addr || {}), destination: "za", name: user.name || "", phone: user.phone || "" },
        pay,
        shipMethod: "standard",
        status: "pending",
      });
      const order = {
        ...result.order,
        tax: taxCost,
        taxLabel,
        email: user.email,
      };
      try { localStorage.setItem("dg_last_order", JSON.stringify(order)); } catch {}
      try {
        const { sendOrderStatusEmailClient } = await import("@/lib/emails");
        await sendOrderStatusEmailClient(order, "receipt");
      } catch {}
      cart.clear();
      clearQuotedCheckout();
      toast(result.localOnly ? "Order placed (demo mode)" : "Order placed — thank you!");
      router.push("/order/success");
    } catch (e) {
      toast(friendlyError(e, "Could not place order"));
    } finally {
      setPlacing(false);
    }
  };

  /** Pay an international order after the customer accepted the shipping quote. */
  const placeQuoted = async () => {
    if (!user?.email) {
      toast("Please sign in to place an order");
      setStep(1);
      return;
    }
    if (!quotedCheckout?.token) {
      toast("Shipping quote missing — open the link from your email again");
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/order/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: quotedCheckout.token,
          action: "pay",
          payment_provider: pay,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not confirm payment order");

      const order = {
        ...(data.order || {}),
        email: user.email,
        tax: 0,
        taxLabel,
      };
      try { localStorage.setItem("dg_last_order", JSON.stringify(order)); } catch {}
      try {
        const { sendOrderStatusEmailClient } = await import("@/lib/emails");
        await sendOrderStatusEmailClient(order, "receipt");
      } catch {}
      cart.clear();
      clearQuotedCheckout();
      setQuotedCheckout(null);
      toast("Order confirmed — thank you!");
      router.push("/order/success");
    } catch (e) {
      toast(friendlyError(e, "Could not place order"));
    } finally {
      setPlacing(false);
    }
  };

  const placeInternationalQuoteRequest = async (delivery) => {
    if (!user?.email) {
      toast("Please sign in to place an order");
      setStep(1);
      return;
    }
    const framed = framedCartItems(cart.items);
    if (storeSettings.shipping?.internationalUnframedOnly && framed.length) {
      toast("Remove framed items before requesting an international quote");
      return;
    }
    setPlacing(true);
    try {
      const quoteToken = newQuoteToken();
      const deliveryPayload = {
        ...(delivery || {}),
        destination: "international",
        name: user.name || "",
        phone: user.phone || "",
        quote_token: quoteToken,
      };
      const result = await placeOrder({
        user,
        email: user.email,
        items: cart.items,
        subtotal: cart.subtotal,
        shipping: 0,
        total: cart.subtotal,
        delivery: deliveryPayload,
        pay: null,
        shipMethod: "international",
        status: "awaiting_quote",
      });
      const order = {
        ...result.order,
        email: user.email,
        quoteToken,
      };
      try { localStorage.setItem("dg_last_order", JSON.stringify(order)); } catch {}
      try {
        const { sendOrderStatusEmailClient } = await import("@/lib/emails");
        await sendOrderStatusEmailClient(order, "awaiting_quote");
      } catch {}
      cart.clear();
      toast("Order submitted — we'll email your shipping quote shortly");
      router.push("/order/success?quote=1");
    } catch (e) {
      toast(friendlyError(e, "Could not submit quote request"));
    } finally {
      setPlacing(false);
    }
  };

  const place = () => (quotedCheckout ? placeQuoted() : placeLocal());

  if (cart.items.length === 0) return (
    <div className="max-w-[600px] mx-auto px-5 py-24 text-center">
      <ShoppingBag size={40} color={C.gray} className="mx-auto mb-5" />
      <h2 className="text-[26px] mb-3" style={{ fontFamily: HEAD, fontWeight: 300 }}>Your cart is empty</h2>
      <Pill onClick={() => router.push("/shop")}>Browse the collection</Pill>
    </div>
  );

  return (
    <div className="max-w-[1040px] mx-auto px-4 sm:px-5 py-8 sm:py-12 overflow-x-clip w-full">
      <h1 className="text-[28px] sm:text-[34px] mb-5 sm:mb-6" style={{ fontFamily: HEAD, fontWeight: 300 }}>CHECKOUT</h1>
      <div className="flex items-center gap-2 mb-8 sm:mb-10 min-w-0">
        {steps.map((s, i) => {
          const n = i + 1, active = step === n, done = step > n;
          return (
            <React.Fragment key={s}>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px]" style={{ background: done ? C.green : active ? C.ink : "#fff", color: done || active ? "#fff" : C.gray, border: `1px solid ${done || active ? "transparent" : C.line}`, fontFamily: HEAD }}>{done ? <Check size={14} /> : n}</div>
                <span className="text-[12px] sm:text-[13px] hidden sm:inline" style={{ fontFamily: HEAD, color: active ? C.ink : C.gray }}>{s}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px min-w-2" style={{ background: C.line }} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-8 md:gap-10 min-w-0">
        <div className="md:col-span-2 min-w-0 w-full">
          {step === 1 && (
            <div className="min-w-0 w-full">
              <div className="flex flex-wrap gap-2 mb-6">
                {[["register", "New customer"], ["login", "I have an account"]].map(([id, l]) => (
                  <button key={id} onClick={() => setAuthTab(id)} className="text-[12px] sm:text-[13px] px-3 sm:px-4 py-2 rounded-full" style={{ background: authTab === id ? C.green : "transparent", color: authTab === id ? "#fff" : C.gray, border: `1px solid ${authTab === id ? C.green : C.line}`, fontFamily: HEAD }}>{l}</button>
                ))}
              </div>
              {authTab === "register"
                ? <RegisterForm compact onDone={async (d) => {
                    try {
                      const result = await register(d);
                      if (result?.needsConfirmation) {
                        toast("Check your email to confirm your account, then sign in.");
                        return;
                      }
                      setAddr(d.address);
                      setStep(2);
                      toast("Account created");
                    } catch (e) {
                      toast(friendlyError(e, "Could not create account"));
                    }
                  }} />
                : <LoginForm onDone={async (d) => { try { await login(d); setStep(2); toast("Welcome back"); } catch (e) { toast(friendlyError(e, "Sign in failed")); } }} />}
            </div>
          )}

          {step === 2 && (
            <DeliveryStep
              addr={addr || user?.address}
              setAddr={setAddr}
              ship={ship}
              setShip={setShip}
              subtotal={cart.subtotal}
              shippingCfg={storeSettings.shipping}
              cartItems={cart.items}
              destination={destination}
              setDestination={setDestination}
              placing={placing}
              onBack={() => setStep(user ? 2 : 1)}
              onNext={async (delivery) => {
                setAddr(delivery);
                await saveDeliveryToProfile(delivery);
                setStep(3);
              }}
              onRequestQuote={placeInternationalQuoteRequest}
            />
          )}

          {step === 3 && (!international || quotedCheckout) && (
            <div>
              {quotedCheckout && (
                <div className="mb-5 p-4 rounded" style={{ background: C.greenSoft, border: `1px solid ${C.line}` }}>
                  <div className="text-[12px] tracking-[.1em]" style={{ fontFamily: HEAD, color: C.green }}>SHIPPING QUOTE ACCEPTED</div>
                  <p className="text-[13px] text-neutral-700 mt-1">
                    Order {quotedCheckout.orderNo} — international shipping {zar(quotedShipping)} is included below. Complete payment to confirm.
                  </p>
                </div>
              )}
              <h3 className="text-[14px] tracking-[.1em] mb-4" style={{ fontFamily: HEAD }}>PAYMENT METHOD</h3>
              {[["payfast", "PayFast", "Cards · Instant EFT · SnapScan"], ["paystack", "Paystack", "Cards & bank transfer"]].map(([id, n, d]) => (
                <label key={id} className="flex items-center gap-3 p-3 mb-2 cursor-pointer" style={{ border: `1px solid ${pay === id ? C.green : C.line}`, borderRadius: 4 }}>
                  <input type="radio" checked={pay === id} onChange={() => setPay(id)} />
                  <CreditCard size={18} color={C.green} />
                  <div><div className="text-[14px]" style={{ fontFamily: HEAD }}>{n}</div><div className="text-[12px] text-neutral-500">{d}</div></div>
                </label>
              ))}
              {addr && (
                <div className="mt-6 p-4 rounded" style={{ background: "#faf9f6", border: `1px solid ${C.line}` }}>
                  <div className="text-[12px] tracking-[.08em] text-neutral-500 mb-1" style={{ fontFamily: HEAD }}>DELIVERING TO</div>
                  <div className="text-[13px] text-neutral-700">
                    {addr.street}{addr.suburb ? `, ${addr.suburb}` : ""}{addr.city ? `, ${addr.city}` : ""}
                    {addr.province ? `, ${addr.province}` : ""}{addr.country ? `, ${addr.country}` : ""}{addr.postal ? `, ${addr.postal}` : ""}
                  </div>
                  {addr.notes && <div className="text-[12px] text-neutral-500 mt-1">{addr.notes}</div>}
                  {!quotedCheckout && (
                    <button onClick={() => setStep(2)} className="text-[12px] mt-1" style={{ color: C.green }}>Edit</button>
                  )}
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
                {!quotedCheckout ? (
                  <button onClick={() => setStep(2)} className="text-[13px] text-neutral-500 text-center sm:text-left">← Delivery</button>
                ) : <span />}
                <Pill
                  onClick={place}
                  style={{ width: "100%", maxWidth: 360, opacity: placing ? 0.6 : 1, pointerEvents: placing ? "none" : "auto" }}
                >
                  {placing ? "Please wait…" : `Pay ${zar(total)} with ${pay === "payfast" ? "PayFast" : "Paystack"}`}
                </Pill>
              </div>
              <p className="text-[11px] text-neutral-500 mt-3 flex items-center gap-1"><ShieldCheck size={13} /> You'll be redirected to complete payment securely.</p>
            </div>
          )}
        </div>

        <div className="h-fit p-4 sm:p-6 min-w-0 w-full" style={{ background: C.greenSoft, borderRadius: 6 }}>
          <h3 className="text-[15px] sm:text-[16px] mb-4 tracking-[.08em]" style={{ fontFamily: HEAD }}>YOUR ORDER</h3>
          {cart.items.map((i) => (
            <div key={i.key} className="flex gap-3 mb-3 min-w-0">
              <Plate product={i.product} showSig={false} style={{ width: 46, height: 46, borderRadius: 3, flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] truncate" style={{ fontFamily: HEAD }}>{i.name}</div>
                <div className="text-[11px] text-neutral-500 truncate">{i.summary} · qty {i.qty}</div>
              </div>
              <div className="text-[13px] shrink-0">{money(i.price * i.qty)}</div>
            </div>
          ))}
          <div className="mt-4 pt-3" style={{ borderTop: `1px solid ${C.line}` }}>
            <Row l="Subtotal" v={money(cart.subtotal)} />
            <Row
              l="Shipping"
              v={
                step >= 2
                  ? (quotedCheckout
                    ? money(quotedShipping)
                    : (shippingQuoted ? "Quoted on request" : (shipCost === 0 ? "Free" : money(shipCost))))
                  : "—"
              }
            />
            {taxEnabled && step >= 2 && !shippingQuoted && quotedCheckout == null && (
              <Row l={`${taxLabel} (${storeSettings.tax.ratePct}%)`} v={money(taxCost)} />
            )}
            <div className="mt-2" />
            <Row
              l="Total"
              v={shippingQuoted && !quotedCheckout ? `${money(cart.subtotal)} + shipping` : money(step >= 2 ? total : cart.subtotal)}
              bold
            />
            {isForeign && step >= 2 && (!shippingQuoted || quotedCheckout) && (
              <p className="text-[11px] text-neutral-500 mt-2">
                Approximate {code}. You&apos;ll be charged {zar(total)}.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeliveryStep({
  addr,
  setAddr,
  ship,
  setShip,
  subtotal,
  shippingCfg,
  cartItems,
  destination,
  setDestination,
  onBack,
  onNext,
  onRequestQuote,
  placing,
}) {
  const international = destination === "international";
  const [f, setF] = useState(() => ({
    ...emptyAddress(),
    ...(addr || {}),
    destination: destination || addr?.destination || "za",
  }));

  useEffect(() => {
    setF((prev) => ({ ...prev, destination }));
  }, [destination]);

  const framed = useMemo(
    () => (international && shippingCfg.internationalUnframedOnly ? framedCartItems(cartItems) : []),
    [international, shippingCfg.internationalUnframedOnly, cartItems]
  );
  const framedBlocked = framed.length > 0;

  const ready = international
    ? Boolean(f.street && f.city && f.country && !framedBlocked)
    : Boolean(f.street && f.city && f.postal);

  const note = internationalShippingNote(shippingCfg);

  const chooseDestination = (id) => {
    setDestination(id);
    setShip("standard");
    setF((prev) => ({ ...prev, destination: id }));
  };

  const onDestinationHint = (hint) => {
    if (hint === destination) return;
    chooseDestination(hint);
  };

  return (
    <div>
      <h3 className="text-[14px] tracking-[.1em] mb-3" style={{ fontFamily: HEAD }}>DESTINATION</h3>
      <div className="grid sm:grid-cols-2 gap-2 mb-6">
        {[
          ["za", "South Africa", "Free shipping nationwide"],
          ["international", "International", "Quoted before payment"],
        ].map(([id, title, hint]) => (
          <button
            key={id}
            type="button"
            onClick={() => chooseDestination(id)}
            className="text-left p-3"
            style={{
              border: `1px solid ${destination === id ? C.green : C.line}`,
              borderRadius: 4,
              background: destination === id ? C.greenSoft : "#fff",
            }}
          >
            <div className="text-[14px]" style={{ fontFamily: HEAD }}>{title}</div>
            <div className="text-[12px] text-neutral-500 mt-0.5">{hint}</div>
          </button>
        ))}
      </div>

      <AddressFields
        value={f}
        onChange={setF}
        international={international}
        onDestinationHint={onDestinationHint}
        notesPlaceholder={international ? "Anything we should know for the quote (optional)" : "Delivery notes (optional)"}
      />

      {international ? (
        <div className="mt-6 p-4 rounded" style={{ background: "#faf9f6", border: `1px solid ${C.line}` }}>
          <div className="flex items-start gap-2 mb-2">
            <Truck size={17} color={C.green} className="mt-0.5 shrink-0" />
            <div>
              <div className="text-[14px]" style={{ fontFamily: HEAD }}>International shipping</div>
              <p className="text-[13px] text-neutral-600 mt-1">
                {note || "Submit your order and we'll email a shipping quote. You can confirm or decline before paying."}
              </p>
              {shippingCfg.internationalUnframedOnly && (
                <p className="text-[12px] text-neutral-500 mt-2">Overseas orders are unframed prints only.</p>
              )}
            </div>
          </div>
          {framedBlocked && (
            <div className="mt-3 p-3 text-[13px] rounded" style={{ background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412" }}>
              Remove or change framed items before requesting a quote:
              <ul className="mt-1 list-disc pl-5">
                {framed.map((i) => (
                  <li key={i.key}>{i.name} — {i.summary}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <>
          <h3 className="text-[14px] tracking-[.1em] mt-8 mb-3" style={{ fontFamily: HEAD }}>SHIPPING</h3>
          <div
            className="flex items-center justify-between p-3 mb-2"
            style={{ border: `1px solid ${C.green}`, borderRadius: 4, background: C.greenSoft }}
          >
            <div className="flex items-center gap-3">
              <Truck size={17} color={C.green} />
              <div>
                <div className="text-[14px]" style={{ fontFamily: HEAD }}>Free shipping</div>
                <div className="text-[12px] text-neutral-600">
                  Delivered within 14 days from order date and payment processed
                </div>
              </div>
            </div>
            <span className="text-[14px]" style={{ fontFamily: HEAD }}>Free</span>
          </div>
        </>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
        <button type="button" onClick={onBack} className="text-[13px] text-neutral-500 text-center sm:text-left">← Account</button>
        {international ? (
          <Pill
            onClick={() => {
              if (!ready || placing) return;
              const delivery = { ...f, destination: "international" };
              setAddr(delivery);
              onRequestQuote?.(delivery);
            }}
            style={{ opacity: ready && !placing ? 1 : 0.5, pointerEvents: ready && !placing ? "auto" : "none", width: "100%", maxWidth: 360 }}
          >
            {placing ? "Submitting…" : "Request shipping quote →"}
          </Pill>
        ) : (
          <Pill
            onClick={() => { if (ready) { setAddr({ ...f, destination: "za" }); onNext({ ...f, destination: "za" }); } }}
            style={{ opacity: ready ? 1 : 0.5, pointerEvents: ready ? "auto" : "none", width: "100%", maxWidth: 360 }}
          >
            Continue to payment →
          </Pill>
        )}
      </div>
    </div>
  );
}

function orderHeroImage(items) {
  for (const i of items || []) {
    const src = i.product?.image || i.image;
    if (src) return src;
  }
  return siteImage("elephant-plains.jpg");
}

export function Confirmation() {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [awaitingQuote, setAwaitingQuote] = useState(false);
  useEffect(() => {
    try {
      const s = localStorage.getItem("dg_last_order");
      if (s) setOrder(JSON.parse(s));
    } catch {}
    try {
      setAwaitingQuote(new URLSearchParams(window.location.search).get("quote") === "1");
    } catch {}
  }, []);

  if (!order) {
    return (
      <div>
        <section className="relative overflow-hidden" style={{ minHeight: 220 }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${siteImage("elephant-plains.jpg")})`,
              backgroundSize: "cover",
              backgroundPosition: "center 40%",
              filter: "grayscale(1) contrast(1.05)",
              transform: "scale(1.04)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg,rgba(20,20,18,.45) 0%,rgba(20,20,18,.72) 100%)" }}
          />
          <div className="relative max-w-[1240px] mx-auto px-5 py-12 sm:py-16">
            <p className="text-[11px] tracking-[.28em] mb-3" style={{ fontFamily: HEAD, color: C.green }}>
              DORON GOLDSTEIN · WILDLIFE PHOTOGRAPHY
            </p>
            <h1 className="text-white text-[36px] sm:text-[52px] leading-[0.95] font-light mb-4" style={{ fontFamily: HEAD }}>
              Order confirmed
            </h1>
            <p className="text-white/75 text-[15px] sm:text-[17px] max-w-[520px] leading-relaxed" style={{ fontFamily: HEAD, fontWeight: 300 }}>
              No recent order found on this device. Browse the collection to find your next print.
            </p>
          </div>
        </section>
        <div className="max-w-[640px] mx-auto px-5 py-16 text-center">
          <Pill onClick={() => router.push("/shop")}>Browse the collection</Pill>
        </div>
      </div>
    );
  }

  const items = order.items || order.lines || [];
  const city = order.delivery?.city;
  const itemCount = items.reduce((n, i) => n + (i.qty || 1), 0);
  const heroBg = orderHeroImage(items);
  const isQuote = awaitingQuote
    || order.rawStatus === "awaiting_quote"
    || String(order.status || "").toLowerCase().includes("waiting on shipping");

  return (
    <div>
      <section className="relative overflow-hidden" style={{ minHeight: 220 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            filter: "grayscale(1) contrast(1.05)",
            transform: "scale(1.04)",
            animation: "orderBannerIn .55s ease",
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg,rgba(20,20,18,.45) 0%,rgba(20,20,18,.72) 100%)" }}
        />
        <div className="relative max-w-[1240px] mx-auto px-5 py-12 sm:py-16">
          <p className="text-[11px] tracking-[.28em] mb-3" style={{ fontFamily: HEAD, color: C.green }}>
            DORON GOLDSTEIN · WILDLIFE PHOTOGRAPHY
          </p>
          <h1
            className="text-white text-[36px] sm:text-[52px] leading-[0.95] font-light mb-4"
            style={{ fontFamily: HEAD, animation: "orderTitleIn .4s ease" }}
          >
            {isQuote ? "Quote requested" : "Thank you"}
          </h1>
          <p className="text-white/75 text-[15px] sm:text-[17px] max-w-[520px] leading-relaxed" style={{ fontFamily: HEAD, fontWeight: 300 }}>
            {isQuote
              ? `Order ${order.id} is waiting on a shipping quote. We'll email you the amount to confirm before payment.`
              : `Order ${order.id} is confirmed.${city ? ` We'll deliver to ${city}.` : ""} A receipt is on its way to your inbox.`}
          </p>
          <p className="mt-5 text-[13px] text-white/55" style={{ fontFamily: HEAD }}>
            {itemCount} print{itemCount === 1 ? "" : "s"}
            {isQuote ? ` · ${zar(order.subtotal || order.total)} + shipping` : ` · ${zar(order.total)} paid`}
          </p>
        </div>
        <style>{`
          @keyframes orderBannerIn {
            from { opacity: 0; transform: scale(1.08); }
            to { opacity: 1; transform: scale(1.04); }
          }
          @keyframes orderTitleIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </section>

      <div className="max-w-[640px] mx-auto px-5 pt-12 pb-24">
        <Reveal>
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: C.greenSoft }}
            >
              <Check size={18} color={C.green} strokeWidth={2.25} />
            </div>
            <div>
              <p className="text-[14px]" style={{ fontFamily: HEAD }}>
                {isQuote ? "Waiting on shipping quote" : "Order confirmed"}
              </p>
              <p className="text-[12px] text-neutral-500">We’ll email tracking once your print ships.</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="mb-10">
            <div className="flex items-baseline justify-between mb-1">
              <h2 className="text-[12px] tracking-[.16em] text-neutral-500" style={{ fontFamily: HEAD }}>YOUR PRINTS</h2>
              <span className="text-[12px] text-neutral-400" style={{ fontFamily: HEAD }}>{order.id}</span>
            </div>
            <div>
              {items.map((i, idx) => {
                const product = i.product || {
                  name: i.name,
                  image: i.image,
                  colour: i.colour || i.printColour || "bw",
                  ratio: i.ratio || "landscape",
                  grad: i.grad || ["#333", "#9a9a97"],
                  angle: i.angle || 120,
                };
                return (
                  <div
                    key={i.key || `${i.name}-${idx}`}
                    className="flex gap-4 py-4"
                    style={{ borderTop: `1px solid ${C.line}` }}
                  >
                    <Plate
                      product={product}
                      printColour={i.printColour || i.colour}
                      showSig={false}
                      style={{ width: 72, height: 72, borderRadius: 3, flexShrink: 0 }}
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <div className="text-[15px] truncate" style={{ fontFamily: HEAD }}>{i.name}</div>
                      <div className="text-[12px] text-neutral-500 mt-1 leading-relaxed">{i.summary}</div>
                      <div className="text-[12px] text-neutral-400 mt-1">Qty {i.qty}</div>
                    </div>
                    <div className="text-[14px] shrink-0 pt-0.5" style={{ fontFamily: HEAD }}>
                      {zar(i.price * i.qty)}
                    </div>
                  </div>
                );
              })}
              <div className="pt-4 space-y-1.5" style={{ borderTop: `1px solid ${C.line}` }}>
                <div className="flex justify-between text-[13px]">
                  <span className="text-neutral-500">Shipping</span>
                  <span>{order.shipping === 0 ? "Free" : zar(order.shipping)}</span>
                </div>
                {order.tax > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-neutral-500">{order.taxLabel || "VAT"}</span>
                    <span>{zar(order.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[16px] pt-2" style={{ fontFamily: HEAD, fontWeight: 500 }}>
                  <span>Total paid</span>
                  <span>{zar(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={160}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Pill onClick={() => router.push("/shop")}>Continue shopping</Pill>
            <Pill variant="outline" onClick={() => router.push("/account")}>View orders</Pill>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
