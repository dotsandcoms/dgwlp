"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Truck, ShieldCheck, ShoppingBag, ChevronDown, Mail } from "lucide-react";
import { C, HEAD, zar, PROVINCES } from "@/lib/pricing";
import { Plate, Pill, Row } from "./primitives";
import { RegisterForm, LoginForm } from "./forms";
import { useCart, useAuth, useToast } from "@/context/providers";

const inp = { className: "w-full py-3 px-3 text-[14px] outline-none", style: { border: `1px solid ${C.line}`, borderRadius: 4 } };

export function CheckoutFlow() {
  const cart = useCart();
  const { user, register, login, setUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [authTab, setAuthTab] = useState("register");
  const [ship, setShip] = useState("standard");
  const [pay, setPay] = useState("payfast");
  const [addr, setAddr] = useState(null);

  useEffect(() => { if (user) { setStep((s) => (s === 1 ? 2 : s)); setAddr(user.address || null); } }, [user]);

  const shipCost = ship === "express" ? 300 : (cart.subtotal >= 2500 ? 0 : 150);
  const total = cart.subtotal + shipCost;
  const steps = ["Account", "Delivery", "Payment"];

  const place = async () => {
    const order = {
      id: "DG-" + Math.floor(1000 + Math.random() * 9000),
      items: cart.items, subtotal: cart.subtotal, shipping: shipCost, total,
      delivery: addr, pay, email: user?.email,
    };
    try { localStorage.setItem("dg_last_order", JSON.stringify(order)); } catch {}
    // Fire the receipt email (no-op unless RESEND_API_KEY is set)
    try { await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "receipt", order }) }); } catch {}
    cart.clear();
    toast("Order placed — thank you!");
    router.push("/order/success");
  };

  if (cart.items.length === 0) return (
    <div className="max-w-[600px] mx-auto px-5 py-24 text-center">
      <ShoppingBag size={40} color={C.gray} className="mx-auto mb-5" />
      <h2 className="text-[26px] mb-3" style={{ fontFamily: HEAD, fontWeight: 300 }}>Your cart is empty</h2>
      <Pill onClick={() => router.push("/shop")}>Browse the collection</Pill>
    </div>
  );

  return (
    <div className="max-w-[1040px] mx-auto px-5 py-12">
      <h1 className="text-[34px] mb-6" style={{ fontFamily: HEAD, fontWeight: 300 }}>CHECKOUT</h1>
      <div className="flex items-center gap-2 mb-10">
        {steps.map((s, i) => {
          const n = i + 1, active = step === n, done = step > n;
          return (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px]" style={{ background: done ? C.green : active ? C.ink : "#fff", color: done || active ? "#fff" : C.gray, border: `1px solid ${done || active ? "transparent" : C.line}`, fontFamily: HEAD }}>{done ? <Check size={14} /> : n}</div>
                <span className="text-[13px] hidden sm:inline" style={{ fontFamily: HEAD, color: active ? C.ink : C.gray }}>{s}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px" style={{ background: C.line }} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2">
          {step === 1 && (
            <div>
              <div className="flex gap-2 mb-6">
                {[["register", "New customer"], ["login", "I have an account"]].map(([id, l]) => (
                  <button key={id} onClick={() => setAuthTab(id)} className="text-[13px] px-4 py-2 rounded-full" style={{ background: authTab === id ? C.green : "transparent", color: authTab === id ? "#fff" : C.gray, border: `1px solid ${authTab === id ? C.green : C.line}`, fontFamily: HEAD }}>{l}</button>
                ))}
              </div>
              {authTab === "register"
                ? <RegisterForm compact onDone={async (d) => { await register(d); setAddr(d.address); setStep(2); toast("Account created"); }} />
                : <LoginForm onDone={async (d) => { await login(d); setStep(2); toast("Welcome back"); }} />}
            </div>
          )}

          {step === 2 && <DeliveryStep addr={addr || user?.address} setAddr={setAddr} ship={ship} setShip={setShip} subtotal={cart.subtotal} onBack={() => setStep(user ? 2 : 1)} onNext={() => setStep(3)} />}

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
                  <button onClick={() => setStep(2)} className="text-[12px] mt-1" style={{ color: C.green }}>Edit</button>
                </div>
              )}
              <div className="flex items-center justify-between mt-6">
                <button onClick={() => setStep(2)} className="text-[13px] text-neutral-500">← Delivery</button>
                <Pill onClick={place}>Pay {zar(total)} with {pay === "payfast" ? "PayFast" : "Paystack"}</Pill>
              </div>
              <p className="text-[11px] text-neutral-500 mt-3 flex items-center gap-1"><ShieldCheck size={13} /> You'll be redirected to complete payment securely.</p>
            </div>
          )}
        </div>

        <div className="h-fit p-6" style={{ background: C.greenSoft, borderRadius: 6 }}>
          <h3 className="text-[16px] mb-4 tracking-[.08em]" style={{ fontFamily: HEAD }}>YOUR ORDER</h3>
          {cart.items.map((i) => (
            <div key={i.key} className="flex gap-3 mb-3">
              <Plate product={i.product} showSig={false} style={{ width: 46, height: 46, borderRadius: 3, flexShrink: 0 }} />
              <div className="flex-1 min-w-0"><div className="text-[13px] truncate" style={{ fontFamily: HEAD }}>{i.name} × {i.qty}</div><div className="text-[11px] text-neutral-500 truncate">{i.summary}</div></div>
              <div className="text-[13px]">{zar(i.price * i.qty)}</div>
            </div>
          ))}
          <div className="my-3" style={{ borderTop: "1px solid #d6dcc9" }} />
          <Row l="Subtotal" v={zar(cart.subtotal)} />
          <Row l="Shipping" v={step >= 2 ? (shipCost === 0 ? "Free" : zar(shipCost)) : "—"} />
          <div className="my-2" style={{ borderTop: "1px solid #d6dcc9" }} />
          <Row l="Total" v={zar(step >= 2 ? total : cart.subtotal)} bold />
        </div>
      </div>
    </div>
  );
}

function DeliveryStep({ addr, setAddr, ship, setShip, subtotal, onBack, onNext }) {
  const [f, setF] = useState(addr || { street: "", suburb: "", city: "", province: PROVINCES[0], postal: "", notes: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const ready = f.street && f.city && f.postal;
  return (
    <div>
      <h3 className="text-[14px] tracking-[.1em] mb-4" style={{ fontFamily: HEAD }}>DELIVERY DETAILS</h3>
      <input placeholder="Street address" value={f.street} onChange={set("street")} {...inp} />
      <div className="grid sm:grid-cols-2 gap-3 my-3">
        <input placeholder="Suburb" value={f.suburb} onChange={set("suburb")} {...inp} />
        <input placeholder="City" value={f.city} onChange={set("city")} {...inp} />
        <div className="relative">
          <select value={f.province} onChange={set("province")} className="w-full appearance-none py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>
          <ChevronDown size={15} className="absolute right-3 top-3.5 pointer-events-none" />
        </div>
        <input placeholder="Postal code" value={f.postal} onChange={set("postal")} {...inp} />
      </div>
      <input placeholder="Delivery notes (optional)" value={f.notes} onChange={set("notes")} {...inp} />

      <h3 className="text-[14px] tracking-[.1em] mt-8 mb-3" style={{ fontFamily: HEAD }}>SHIPPING METHOD</h3>
      {[["standard", "Standard courier", "2–4 working days", subtotal >= 2500 ? 0 : 150], ["express", "Express courier", "1–2 working days", 300]].map(([id, n, d, cost]) => (
        <label key={id} className="flex items-center justify-between p-3 mb-2 cursor-pointer" style={{ border: `1px solid ${ship === id ? C.green : C.line}`, borderRadius: 4 }}>
          <div className="flex items-center gap-3"><input type="radio" checked={ship === id} onChange={() => setShip(id)} /><Truck size={17} color={C.green} /><div><div className="text-[14px]" style={{ fontFamily: HEAD }}>{n}</div><div className="text-[12px] text-neutral-500">{d}</div></div></div>
          <span className="text-[14px]" style={{ fontFamily: HEAD }}>{cost === 0 ? "Free" : zar(cost)}</span>
        </label>
      ))}
      <div className="flex items-center justify-between mt-6">
        <button onClick={onBack} className="text-[13px] text-neutral-500">← Account</button>
        <Pill onClick={() => { if (ready) { setAddr(f); onNext(); } }} style={{ opacity: ready ? 1 : .5, pointerEvents: ready ? "auto" : "none" }}>Continue to payment →</Pill>
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
          <div className="flex justify-between text-[14px] pt-2" style={{ fontFamily: HEAD, fontWeight: 600 }}><span>Total paid</span><span>{zar(order.total)}</span></div>
          <p className="text-[12px] text-neutral-500 mt-4">We'll send a separate shipping confirmation with tracking once your print is on its way. 🐆</p>
        </div>
      </div>
      <div className="mt-8"><Pill variant="outline" onClick={() => router.push("/shop")}>Continue shopping</Pill></div>
    </div>
  );
}
