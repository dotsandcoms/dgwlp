"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Truck, ShieldCheck, ShoppingBag, Mail } from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { Plate, Pill, Row } from "./primitives";
import { RegisterForm, LoginForm } from "./forms";
import { AddressFields } from "./address-fields";
import { emptyAddress } from "@/lib/address";
import { DEFAULT_SETTINGS, orderTotals, shippingCost } from "@/lib/settings";
import { useCart, useAuth, useToast } from "@/context/providers";
import { friendlyError } from "@/lib/errors";
import { placeOrder } from "@/lib/orders";

export function CheckoutFlow() {
  const cart = useCart();
  const { user, register, login, updateProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [authTab, setAuthTab] = useState("register");
  const [ship, setShip] = useState("standard");
  const [pay, setPay] = useState("payfast");
  const [addr, setAddr] = useState(null);
  const [storeSettings, setStoreSettings] = useState({
    shipping: DEFAULT_SETTINGS.shipping,
    tax: DEFAULT_SETTINGS.tax,
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
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const totals = useMemo(
    () => orderTotals(storeSettings, { subtotal: cart.subtotal, method: ship }),
    [storeSettings, cart.subtotal, ship]
  );
  const { shipping: shipCost, tax: taxCost, total, taxLabel, taxEnabled } = totals;
  const steps = ["Account", "Delivery", "Payment"];

  /** Persist delivery (including notes) to the signed-in profile. */
  const saveDeliveryToProfile = async (delivery) => {
    if (!user || !delivery?.street) return;
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

  const place = async () => {
    if (!user?.email) {
      toast("Please sign in to place an order");
      setStep(1);
      return;
    }
    try {
      await saveDeliveryToProfile(addr);
      const result = await placeOrder({
        user,
        email: user.email,
        items: cart.items,
        subtotal: cart.subtotal,
        shipping: shipCost,
        total,
        delivery: addr,
        pay,
        shipMethod: ship,
      });
      const order = {
        ...result.order,
        tax: taxCost,
        taxLabel,
        email: user.email,
      };
      try { localStorage.setItem("dg_last_order", JSON.stringify(order)); } catch {}
      try {
        await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "receipt", order }),
        });
      } catch {}
      cart.clear();
      toast(result.localOnly ? "Order placed (demo mode)" : "Order placed — thank you!");
      router.push("/order/success");
    } catch (e) {
      toast(friendlyError(e, "Could not place order"));
    }
  };

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
              onBack={() => setStep(user ? 2 : 1)}
              onNext={async (delivery) => {
                setAddr(delivery);
                await saveDeliveryToProfile(delivery);
                setStep(3);
              }}
            />
          )}

          {step === 3 && (
            <div>
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
                  <div className="text-[13px] text-neutral-700">{addr.street}, {addr.suburb ? addr.suburb + ", " : ""}{addr.city}, {addr.province}, {addr.postal}</div>
                  {addr.notes && <div className="text-[12px] text-neutral-500 mt-1">{addr.notes}</div>}
                  <button onClick={() => setStep(2)} className="text-[12px] mt-1" style={{ color: C.green }}>Edit</button>
                </div>
              )}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6">
                <button onClick={() => setStep(2)} className="text-[13px] text-neutral-500 text-center sm:text-left">← Delivery</button>
                <Pill onClick={place} style={{ width: "100%", maxWidth: 360 }}>Pay {zar(total)} with {pay === "payfast" ? "PayFast" : "Paystack"}</Pill>
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
              <div className="flex-1 min-w-0"><div className="text-[13px] truncate" style={{ fontFamily: HEAD }}>{i.name} × {i.qty}</div><div className="text-[11px] text-neutral-500 truncate">{i.summary}</div></div>
              <div className="text-[13px] shrink-0">{zar(i.price * i.qty)}</div>
            </div>
          ))}
          <div className="my-3" style={{ borderTop: "1px solid #d6dcc9" }} />
          <Row l="Subtotal" v={zar(cart.subtotal)} />
          <Row l="Shipping" v={step >= 2 ? (shipCost === 0 ? "Free" : zar(shipCost)) : "—"} />
          {taxEnabled && step >= 2 && <Row l={`${taxLabel} (${storeSettings.tax.ratePct}%)`} v={zar(taxCost)} />}
          <div className="my-2" style={{ borderTop: "1px solid #d6dcc9" }} />
          <Row l="Total" v={zar(step >= 2 ? total : cart.subtotal)} bold />
        </div>
      </div>
    </div>
  );
}

function DeliveryStep({ addr, setAddr, ship, setShip, subtotal, shippingCfg, onBack, onNext }) {
  const [f, setF] = useState(() => ({ ...emptyAddress(), ...(addr || {}) }));
  const ready = f.street && f.city && f.postal;
  const standardCost = shippingCost(shippingCfg, "standard", subtotal);
  const expressCost = shippingCost(shippingCfg, "express", subtotal);
  return (
    <div>
      <h3 className="text-[14px] tracking-[.1em] mb-4" style={{ fontFamily: HEAD }}>DELIVERY DETAILS</h3>
      <AddressFields
        value={f}
        onChange={setF}
        notesPlaceholder="Delivery notes (optional)"
      />

      <h3 className="text-[14px] tracking-[.1em] mt-8 mb-3" style={{ fontFamily: HEAD }}>SHIPPING METHOD</h3>
      {[
        ["standard", "Standard courier", "2–4 working days", standardCost],
        ["express", "Express courier", "1–2 working days", expressCost],
      ].map(([id, n, d, cost]) => (
        <label key={id} className="flex items-center justify-between p-3 mb-2 cursor-pointer" style={{ border: `1px solid ${ship === id ? C.green : C.line}`, borderRadius: 4 }}>
          <div className="flex items-center gap-3"><input type="radio" checked={ship === id} onChange={() => setShip(id)} /><Truck size={17} color={C.green} /><div><div className="text-[14px]" style={{ fontFamily: HEAD }}>{n}</div><div className="text-[12px] text-neutral-500">{d}</div></div></div>
          <span className="text-[14px]" style={{ fontFamily: HEAD }}>{cost === 0 ? "Free" : zar(cost)}</span>
        </label>
      ))}
      <div className="flex items-center justify-between mt-6">
        <button onClick={onBack} className="text-[13px] text-neutral-500">← Account</button>
        <Pill onClick={() => { if (ready) { setAddr(f); onNext(f); } }} style={{ opacity: ready ? 1 : .5, pointerEvents: ready ? "auto" : "none" }}>Continue to payment →</Pill>
      </div>
    </div>
  );
}

export function Confirmation() {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  useEffect(() => { try { const s = localStorage.getItem("dg_last_order"); if (s) setOrder(JSON.parse(s)); } catch {} }, []);
  if (!order) return (
    <div className="max-w-[600px] mx-auto px-5 py-24 text-center">
      <h2 className="text-[24px] mb-4" style={{ fontFamily: HEAD, fontWeight: 300 }}>No recent order</h2>
      <Pill onClick={() => router.push("/shop")}>Browse the collection</Pill>
    </div>
  );
  return (
    <div className="max-w-[720px] mx-auto px-5 py-14 text-center">
      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-5" style={{ background: C.greenSoft }}><Check size={30} color={C.green} /></div>
      <h1 className="text-[30px] mb-2" style={{ fontFamily: HEAD, fontWeight: 300 }}>Thank you!</h1>
      <p className="text-neutral-600 text-[15px] mb-8">Order <b>{order.id}</b> is confirmed. A receipt is on its way{order.delivery ? ` and we'll deliver to ${order.delivery.city}` : ""}.</p>
      <div className="text-left rounded-lg overflow-hidden mx-auto" style={{ border: `1px solid ${C.line}`, maxWidth: 520 }}>
        <div className="px-5 py-3 flex items-center gap-2 text-[12px] text-neutral-500" style={{ background: "#faf9f6", borderBottom: `1px solid ${C.line}` }}><Mail size={14} /> Automated email · sent via Resend</div>
        <div className="p-6">
          <div style={{ fontFamily: HEAD }} className="tracking-[.12em] text-[14px] mb-1">DORON GOLDSTEIN <span style={{ color: C.green }}>PHOTOGRAPHY</span></div>
          <p className="text-[13px] text-neutral-600 mb-4">Your order receipt — {order.id}</p>
          {order.items.map((i) => (
            <div key={i.key} className="flex justify-between text-[13px] py-1.5" style={{ borderBottom: `1px solid ${C.line}` }}>
              <span>{i.name} <span className="text-neutral-400">({i.summary}) × {i.qty}</span></span><span>{zar(i.price * i.qty)}</span>
            </div>
          ))}
          <div className="flex justify-between text-[13px] py-1.5"><span className="text-neutral-500">Shipping</span><span>{order.shipping === 0 ? "Free" : zar(order.shipping)}</span></div>
          {order.tax > 0 && (
            <div className="flex justify-between text-[13px] py-1.5"><span className="text-neutral-500">{order.taxLabel || "VAT"}</span><span>{zar(order.tax)}</span></div>
          )}
          <div className="flex justify-between text-[14px] pt-2" style={{ fontFamily: HEAD, fontWeight: 600 }}><span>Total paid</span><span>{zar(order.total)}</span></div>
          <p className="text-[12px] text-neutral-500 mt-4">We'll send a separate shipping confirmation with tracking once your print is on its way.</p>
        </div>
      </div>
      <div className="mt-8"><Pill variant="outline" onClick={() => router.push("/shop")}>Continue shopping</Pill></div>
    </div>
  );
}
