"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User, LogOut, MapPin, Package, Heart, ChevronRight, X,
  Truck, CreditCard, CheckCircle2, Circle, ShoppingBag, Pencil, Loader2,
} from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { Pill, StatusBadge, Plate, Reveal } from "./primitives";
import { AddressFields } from "./address-fields";
import { emptyAddress } from "@/lib/address";
import { useAuth, useToast, useAuthModal } from "@/context/providers";
import { friendlyError } from "@/lib/errors";
import { fetchMyOrders } from "@/lib/orders";

/** Opens the auth modal from /auth?tab=&next= then returns to the previous page (or home). */
export function AuthView() {
  const { openAuth } = useAuthModal();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    const rawNext = searchParams.get("next") || "/account";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/account";
    const mode = tab === "register" ? "register" : "login";
    openAuth(mode, next);
    router.replace("/");
  }, [openAuth, router, searchParams]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-[14px] text-neutral-500">
      Opening…
    </div>
  );
}

/** Normalise a checkout localStorage order into the account order shape. */
function fromLastOrder(raw) {
  if (!raw?.id) return null;
  const lines = (raw.items || []).map((i) => ({
    name: i.name || i.product?.name || "Print",
    summary: i.summary || "",
    qty: i.qty || 1,
    price: i.price || 0,
    colour: i.product?.colour || "bw",
    ratio: i.product?.ratio || "landscape",
    image: i.product?.image || null,
    grad: i.product?.grad || ["#333", "#9a9a97"],
    angle: i.product?.angle || 120,
  }));
  return {
    id: raw.id,
    date: raw.date || new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    itemsSummary: lines.map((l) => l.name).join(" · ") || "Your order",
    itemCount: lines.reduce((n, l) => n + (l.qty || 1), 0),
    subtotal: raw.subtotal ?? raw.total ?? 0,
    shipping: raw.shipping ?? 0,
    total: raw.total ?? 0,
    status: raw.status || "Processing",
    pay: raw.pay === "paystack" ? "Paystack" : raw.pay === "payfast" ? "PayFast" : (raw.pay || "Card"),
    tracking: raw.tracking || null,
    delivery: raw.delivery || null,
    lines,
  };
}

/** Fallback when Supabase has no rows yet (e.g. offline demo / last checkout). */
function loadLocalOrders() {
  try {
    const last = fromLastOrder(JSON.parse(localStorage.getItem("dg_last_order") || "null"));
    return last ? [last] : [];
  } catch {
    return [];
  }
}

function statusSteps(status) {
  const order = ["Processing", "Paid", "Shipped", "Delivered"];
  const normalised = {
    pending: "Processing", processing: "Processing", paid: "Paid",
    shipped: "Shipped", delivered: "Delivered",
  }[String(status || "").toLowerCase()] || status;
  const idx = Math.max(0, order.indexOf(normalised));
  return order.map((label, i) => ({ label, done: i <= idx, current: i === idx }));
}

function ProfileEditModal({ user, form, setForm, saving, onSave, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !saving) onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose, saving]);

  const inp = {
    className: "w-full py-3 px-3 text-[14px] outline-none bg-white",
    style: { border: `1px solid ${C.line}`, borderRadius: 4 },
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="profile-edit-title">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: "rgba(20,20,18,.45)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        onClick={() => { if (!saving) onClose(); }}
      />
      <div
        className="relative w-full sm:max-w-[520px] max-h-[92vh] bg-white flex flex-col overflow-hidden sm:rounded-2xl rounded-t-2xl"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}
      >
        <div className="shrink-0 px-5 sm:px-6 pt-5 pb-4 flex items-start justify-between gap-4" style={{ borderBottom: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.greenSoft}, #fff 88%)` }}>
          <div>
            <p className="text-[11px] tracking-[.2em] mb-1" style={{ fontFamily: HEAD, color: C.green }}>COLLECTOR ACCOUNT</p>
            <h2 id="profile-edit-title" className="text-[26px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>Edit profile</h2>
            <p className="text-[13px] text-neutral-500 mt-2">Update your details and default delivery address.</p>
          </div>
          <button type="button" onClick={() => { if (!saving) onClose(); }} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 shrink-0">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
          <label className="block mb-3">
            <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>FULL NAME</span>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} {...inp} />
          </label>
          <label className="block mb-3">
            <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>EMAIL</span>
            <input value={user.email} disabled className={inp.className} style={{ ...inp.style, opacity: 0.6, background: "#f7f7f5" }} />
          </label>
          <label className="block mb-5">
            <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>MOBILE</span>
            <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Mobile number" {...inp} />
          </label>

          <AddressFields
            key="account-edit-address"
            value={form.address}
            onChange={(address) => setForm((prev) => ({ ...prev, address }))}
          />
        </div>

        <div className="shrink-0 px-5 sm:px-6 py-4 flex flex-wrap gap-2" style={{ borderTop: `1px solid ${C.line}`, background: "#fff" }}>
          <Pill onClick={onSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            {saving ? "Saving…" : "Save changes"}
          </Pill>
          <Pill variant="outline" onClick={onClose} disabled={saving}>Cancel</Pill>
        </div>
      </div>
    </div>
  );
}

function OrderModal({ order, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  if (!order) return null;
  const steps = statusSteps(order.status);
  const d = order.delivery;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
      <div className="absolute inset-0" style={{ background: "rgba(20,20,18,.55)" }} onClick={onClose} />
      <div className="relative w-full sm:max-w-[640px] max-h-[92vh] bg-white flex flex-col overflow-hidden sm:rounded-2xl rounded-t-2xl"
        style={{ boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}>
        <div className="shrink-0 px-6 pt-5 pb-4 flex items-start justify-between gap-4" style={{ borderBottom: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.greenSoft}, #fff 88%)` }}>
          <div>
            <p className="text-[11px] tracking-[.2em] mb-1" style={{ fontFamily: HEAD, color: C.green }}>ORDER DETAIL</p>
            <h2 id="order-modal-title" className="text-[26px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>{order.id}</h2>
            <p className="text-[13px] text-neutral-500 mt-2">{order.date} · {order.itemCount || order.lines?.length || 0} {(order.itemCount || 1) === 1 ? "item" : "items"}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge s={order.status} />
            <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          <div>
            <div className="flex items-center justify-between gap-2">
              {steps.map((s, i) => (
                <React.Fragment key={s.label}>
                  <div className="flex flex-col items-center gap-1.5 min-w-0">
                    {s.done
                      ? <CheckCircle2 size={18} color={C.green} />
                      : <Circle size={18} color={C.line} />}
                    <span className="text-[10px] sm:text-[11px] tracking-[.06em] text-center" style={{ fontFamily: HEAD, color: s.done ? C.ink : C.gray }}>{s.label}</span>
                  </div>
                  {i < steps.length - 1 && <div className="flex-1 h-px mb-5" style={{ background: steps[i + 1].done || s.current ? C.green : C.line }} />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[12px] tracking-[.14em] mb-3 text-neutral-500" style={{ fontFamily: HEAD }}>ITEMS</h3>
            <div className="space-y-3">
              {(order.lines || []).map((line, i) => (
                <div key={`${line.name}-${i}`} className="flex gap-3 p-3" style={{ background: "#faf9f6", borderRadius: 6 }}>
                  <Plate product={line} showSig={false} style={{ width: 64, height: 64, borderRadius: 4, flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] truncate" style={{ fontFamily: HEAD }}>{line.name}</div>
                    <div className="text-[12px] text-neutral-500 mt-0.5">{line.summary}</div>
                    <div className="text-[12px] text-neutral-500 mt-1">Qty {line.qty}</div>
                  </div>
                  <div className="text-[14px] shrink-0" style={{ fontFamily: HEAD }}>{zar(line.price * (line.qty || 1))}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <h3 className="text-[12px] tracking-[.14em] mb-2 text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}><MapPin size={13} /> DELIVERY</h3>
              {d ? (
                <p className="text-[13px] text-neutral-700 leading-relaxed">
                  {d.street}<br />
                  {d.suburb && <>{d.suburb}<br /></>}
                  {d.city}, {d.province}<br />
                  {d.postal}
                  {d.notes && <span className="block text-neutral-500 mt-2">{d.notes}</span>}
                </p>
              ) : (
                <p className="text-[13px] text-neutral-500">No address on file for this order.</p>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-[12px] tracking-[.14em] mb-2 text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}><CreditCard size={13} /> PAYMENT</h3>
                <p className="text-[13px] text-neutral-700">{order.pay || "Card"}</p>
              </div>
              {order.tracking && (
                <div>
                  <h3 className="text-[12px] tracking-[.14em] mb-2 text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}><Truck size={13} /> TRACKING</h3>
                  <p className="text-[13px] text-neutral-700" style={{ fontFamily: HEAD }}>{order.tracking}</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2" style={{ borderTop: `1px solid ${C.line}` }}>
            <div className="flex justify-between text-[13px] py-1"><span className="text-neutral-500">Subtotal</span><span>{zar(order.subtotal ?? order.total)}</span></div>
            <div className="flex justify-between text-[13px] py-1"><span className="text-neutral-500">Shipping</span><span>{(order.shipping ?? 0) === 0 ? "Free" : zar(order.shipping)}</span></div>
            <div className="flex justify-between text-[16px] pt-2" style={{ fontFamily: HEAD, fontWeight: 600 }}><span>Total</span><span>{zar(order.total)}</span></div>
          </div>
        </div>

        <div className="shrink-0 px-6 py-4 flex flex-wrap gap-3 justify-between items-center" style={{ borderTop: `1px solid ${C.line}` }}>
          <button onClick={onClose} className="text-[13px] text-neutral-500">Close</button>
          <Link href="/shop"><Pill size="sm">Continue shopping</Pill></Link>
        </div>
      </div>
    </div>
  );
}

export function AccountView() {
  const { user, logout, updateProfile } = useAuth();
  const { toast } = useToast();
  const { openAuth } = useAuthModal();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [wishCount, setWishCount] = useState(0);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: emptyAddress() });

  useEffect(() => {
    try {
      const w = JSON.parse(localStorage.getItem("dg_wish") || "[]");
      setWishCount(Array.isArray(w) ? w.length : 0);
    } catch { setWishCount(0); }
  }, []);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchMyOrders();
        if (cancelled) return;
        if (rows.length) {
          setOrders(rows);
          return;
        }
        setOrders(loadLocalOrders());
      } catch {
        if (!cancelled) setOrders(loadLocalOrders());
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setForm({
      name: user.name || "",
      phone: user.phone || "",
      address: { ...emptyAddress(), ...(user.address || {}) },
    });
  }, [user]);

  const closeModal = useCallback(() => setSelected(null), []);

  const startEdit = () => {
    setForm({
      name: user.name || "",
      phone: user.phone || "",
      address: { ...emptyAddress(), ...(user.address || {}) },
    });
    setEditing(true);
  };

  const saveProfile = async () => {
    if (!form.name.trim()) {
      toast("Please enter your name");
      return;
    }
    const a = form.address || {};
    if (a.street || a.city || a.postal) {
      if (!a.street?.trim() || !a.city?.trim() || !a.postal?.trim()) {
        toast("Please complete street, city and postal code");
        return;
      }
    }
    setSaving(true);
    try {
      await updateProfile({
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: {
          street: (a.street || "").trim(),
          suburb: (a.suburb || "").trim(),
          city: (a.city || "").trim(),
          province: a.province || "",
          postal: (a.postal || "").trim(),
          notes: (a.notes || "").trim(),
        },
      });
      toast("Profile saved");
      setEditing(false);
    } catch (e) {
      toast(friendlyError(e, "Could not save profile — run fix_register_profile_address.sql if needed"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return (
    <div className="max-w-[560px] mx-auto px-5 py-24 text-center">
      <User size={38} color={C.gray} className="mx-auto mb-5" />
      <h2 className="text-[26px] mb-3" style={{ fontFamily: HEAD, fontWeight: 300 }}>You're not signed in</h2>
      <div className="flex flex-wrap justify-center gap-3">
        <Pill onClick={() => openAuth("login", "/account")}>Sign in</Pill>
        <Pill variant="outline" onClick={() => openAuth("register", "/account")}>Create account</Pill>
      </div>
    </div>
  );

  const first = user.name?.split(" ")[0] || "there";
  const delivered = orders.filter((o) => /delivered/i.test(o.status)).length;
  const inTransit = orders.filter((o) => /shipped|processing|paid|pending/i.test(o.status)).length;

  return (
    <div>
      <section className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${C.greenSoft} 0%, #f7f5f0 48%, #ebe8e1 100%)` }}>
        <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: "radial-gradient(rgba(85,107,47,.12) 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative max-w-[1100px] mx-auto px-5 pt-12 pb-10">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
            <div>
              <p className="text-[12px] tracking-[.28em] mb-2" style={{ fontFamily: HEAD, color: C.green }}>COLLECTOR ACCOUNT</p>
              <h1 className="text-[36px] sm:text-[48px] leading-[0.95]" style={{ fontFamily: HEAD, fontWeight: 300 }}>Welcome back,<br />{first}.</h1>
              <p className="text-neutral-600 text-[14px] mt-3 max-w-md">Your prints, deliveries and saved favourites — all in one place.</p>
            </div>
            <button onClick={async () => { await logout(); toast("Signed out"); router.push("/"); }}
              className="flex items-center gap-2 text-[13px] text-neutral-600 px-3 py-2 rounded-full hover:bg-white/70" style={{ border: `1px solid ${C.line}` }}>
              <LogOut size={15} /> Sign out
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Orders", value: orders.length, Icon: Package },
              { label: "In progress", value: inTransit, Icon: Truck },
              { label: "Wishlist", value: wishCount, Icon: Heart },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="bg-white/80 backdrop-blur px-4 py-4 sm:px-5 sm:py-5" style={{ border: `1px solid ${C.line}`, borderRadius: 8 }}>
                <div className="flex items-center gap-2 text-neutral-500 mb-2">
                  <Icon size={15} color={C.green} />
                  <span className="text-[11px] tracking-[.12em]" style={{ fontFamily: HEAD }}>{label.toUpperCase()}</span>
                </div>
                <div className="text-[28px] sm:text-[34px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-[1100px] mx-auto px-5 py-10 sm:py-14">
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
          <aside className="lg:col-span-4 space-y-5">
            <Reveal>
              <div className="p-6" style={{ border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff" }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: C.greenSoft, color: C.green }}>
                    <User size={22} />
                  </div>
                  <button
                    type="button"
                    onClick={startEdit}
                    className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full"
                    style={{ border: `1px solid ${C.line}`, fontFamily: HEAD, color: C.ink }}
                  >
                    <Pencil size={12} /> Edit
                  </button>
                </div>
                <h3 className="text-[12px] tracking-[.14em] mb-3 text-neutral-500" style={{ fontFamily: HEAD }}>PROFILE</h3>
                <div className="text-[18px] mb-1" style={{ fontFamily: HEAD }}>{user.name}</div>
                <div className="text-[13px] text-neutral-600">{user.email}</div>
                {user.phone
                  ? <div className="text-[13px] text-neutral-600 mt-0.5">{user.phone}</div>
                  : <div className="text-[12px] text-neutral-400 mt-1">No mobile number yet</div>}
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="p-6" style={{ border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff" }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-[12px] tracking-[.14em] text-neutral-500 flex items-center gap-1.5" style={{ fontFamily: HEAD }}><MapPin size={13} /> DEFAULT DELIVERY</h3>
                  <button type="button" onClick={startEdit} className="text-[12px]" style={{ color: C.green, fontFamily: HEAD }}>
                    {user.address ? "Edit" : "Add"}
                  </button>
                </div>
                {user.address?.street ? (
                  <div className="text-[13px] text-neutral-700 leading-relaxed">
                    {user.address.street}<br />
                    {user.address.suburb && <>{user.address.suburb}<br /></>}
                    {user.address.city}{user.address.province ? `, ${user.address.province}` : ""}<br />
                    {user.address.postal}
                    {user.address.notes && <div className="text-neutral-500 mt-2">{user.address.notes}</div>}
                  </div>
                ) : (
                  <p className="text-[13px] text-neutral-500">No delivery address yet — tap Add to save one for checkout.</p>
                )}
              </div>
            </Reveal>

            <Reveal delay={140}>
              <div className="p-6" style={{ background: C.greenSoft, borderRadius: 8 }}>
                <h3 className="text-[14px] mb-2" style={{ fontFamily: HEAD }}>Continue collecting</h3>
                <p className="text-[13px] text-neutral-600 mb-4">Browse the latest wildlife prints from the Kruger, Kgalagadi and beyond.</p>
                <Link href="/shop"><Pill size="sm">View the shop</Pill></Link>
              </div>
            </Reveal>
          </aside>

          <div className="lg:col-span-8">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <h2 className="text-[22px] sm:text-[26px]" style={{ fontFamily: HEAD, fontWeight: 300 }}>Order history</h2>
                <p className="text-[13px] text-neutral-500 mt-1">Click an order to view the full receipt and delivery details.</p>
              </div>
              {delivered > 0 && <span className="text-[12px] text-neutral-500 hidden sm:inline">{delivered} delivered</span>}
            </div>

            {orders.length === 0 ? (
              <div className="py-16 text-center px-6" style={{ border: `1px dashed ${C.line}`, borderRadius: 8 }}>
                <ShoppingBag size={32} color={C.gray} className="mx-auto mb-4" />
                <p className="text-[15px] mb-2" style={{ fontFamily: HEAD }}>No orders yet</p>
                <p className="text-[13px] text-neutral-500 mb-5">When you place a print order, it will appear here.</p>
                <Link href="/shop"><Pill size="sm">Browse the collection</Pill></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o, i) => (
                  <Reveal key={o.id} delay={i * 60}>
                    <button
                      type="button"
                      onClick={() => setSelected(o)}
                      className="w-full text-left group p-4 sm:p-5 transition-colors hover:bg-[#faf9f6]"
                      style={{ border: `1px solid ${C.line}`, borderRadius: 8, background: "#fff" }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="hidden sm:flex gap-1.5 shrink-0">
                          {(o.lines || []).slice(0, 2).map((line, li) => (
                            <Plate key={li} product={line} showSig={false} style={{ width: 52, height: 52, borderRadius: 4 }} />
                          ))}
                          {(o.lines || []).length > 2 && (
                            <div className="w-[52px] h-[52px] rounded flex items-center justify-center text-[12px] text-neutral-500" style={{ background: C.greenSoft, fontFamily: HEAD }}>
                              +{(o.lines || []).length - 2}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1">
                            <span className="text-[16px]" style={{ fontFamily: HEAD }}>{o.id}</span>
                            <StatusBadge s={o.status} />
                          </div>
                          <div className="text-[13px] text-neutral-600 truncate">{o.itemsSummary || o.items}</div>
                          <div className="text-[12px] text-neutral-500 mt-1">{o.date} · {o.itemCount || o.lines?.length || 1} {(o.itemCount || 1) === 1 ? "item" : "items"}</div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pl-2">
                          <span className="text-[15px]" style={{ fontFamily: HEAD }}>{zar(o.total)}</span>
                          <ChevronRight size={18} className="text-neutral-400 group-hover:text-neutral-700 transition-colors" />
                        </div>
                      </div>
                    </button>
                  </Reveal>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && <OrderModal order={selected} onClose={closeModal} />}
      {editing && (
        <ProfileEditModal
          user={user}
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={saveProfile}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
