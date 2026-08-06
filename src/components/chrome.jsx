"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ShoppingBag, User, Minus, Plus, Trash2, Check, ShieldCheck, Mail } from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { Plate, Pill, Row } from "./primitives";
import { useCart, useAuth, useToast } from "@/context/providers";

const LINKS = [["HOME", "/"], ["ABOUT", "/about"], ["SHOP", "/shop"], ["CONTACT", "/contact"]];

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const cart = useCart();
  const { user } = useAuth();
  const active = (href) => href === "/" ? path === "/" : path.startsWith(href);
  return (
    <>
      <header className="sticky top-0 z-40" style={{ background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.line}` }}>
        <div className="max-w-[1240px] mx-auto px-5 h-[68px] flex items-center justify-between">
          <Link href="/" style={{ fontFamily: HEAD, fontWeight: 500 }} className="text-[15px] sm:text-[20px] tracking-[.12em]">
            <span style={{ color: C.ink }}>DORON GOLDSTEIN </span><span style={{ color: C.green }}>PHOTOGRAPHY</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8" style={{ fontFamily: HEAD, letterSpacing: ".08em" }}>
            {LINKS.map(([l, href]) => <Link key={href} href={href} className="text-[14px] hover:opacity-60" style={{ color: active(href) ? C.green : C.ink }}>{l}</Link>)}
            <Link href={user ? "/account" : "/auth"} className="hover:opacity-60 flex items-center gap-1 text-[13px]" style={{ fontFamily: HEAD }}><User size={18} />{user ? user.name.split(" ")[0] : ""}</Link>
            <button onClick={() => cart.setOpen(true)} className="relative hover:opacity-60">
              <ShoppingBag size={19} />
              {cart.count > 0 && <span className="absolute -top-2 -right-2 text-[10px] text-white rounded-full w-[17px] h-[17px] flex items-center justify-center" style={{ background: C.green }}>{cart.count}</span>}
            </button>
            <Link href="/admin" className="text-[12px] px-3 py-1.5 rounded-full" style={{ border: `1px solid ${C.line}`, color: active("/admin") ? C.green : C.gray }}>ADMIN</Link>
          </nav>
          <div className="flex items-center gap-4 md:hidden">
            <button onClick={() => cart.setOpen(true)} className="relative"><ShoppingBag size={20} />
              {cart.count > 0 && <span className="absolute -top-2 -right-2 text-[10px] text-white rounded-full w-[16px] h-[16px] flex items-center justify-center" style={{ background: C.green }}>{cart.count}</span>}
            </button>
            <button onClick={() => setOpen(true)}><Menu size={22} /></button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="h-[68px] px-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.line}` }}>
            <span style={{ fontFamily: HEAD }} className="tracking-[.12em] font-medium">MENU</span>
            <button onClick={() => setOpen(false)}><X size={24} /></button>
          </div>
          <div className="flex-1 flex flex-col gap-2 p-6" style={{ fontFamily: HEAD, letterSpacing: ".08em" }}>
            {LINKS.map(([l, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} className="text-left text-[20px] py-3" style={{ borderBottom: `1px solid ${C.line}` }}>{l}</Link>)}
            <Link href={user ? "/account" : "/auth"} onClick={() => setOpen(false)} className="text-left text-[20px] py-3" style={{ borderBottom: `1px solid ${C.line}` }}>{user ? "MY ACCOUNT" : "SIGN IN / REGISTER"}</Link>
            <Link href="/admin" onClick={() => setOpen(false)} className="text-left text-[20px] py-3" style={{ color: C.green }}>ADMIN PANEL</Link>
          </div>
        </div>
      )}
    </>
  );
}

export function CartDrawer() {
  const cart = useCart();
  const { toast } = useToast();
  const router = useRouter();
  const go = () => { cart.setOpen(false); router.push("/checkout"); };
  return (
    <div className="fixed inset-0 z-[55]" style={{ pointerEvents: cart.open ? "auto" : "none" }}>
      <div onClick={() => cart.setOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(20,20,18,.45)", opacity: cart.open ? 1 : 0, transition: "opacity .3s" }} />
      <aside className="absolute top-0 right-0 h-full bg-white flex flex-col" style={{ width: "min(420px,100%)", transform: cart.open ? "translateX(0)" : "translateX(100%)", transition: "transform .35s cubic-bezier(.4,0,.2,1)", boxShadow: "-10px 0 40px rgba(0,0,0,.12)" }}>
        <div className="h-[64px] px-5 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${C.line}` }}>
          <span style={{ fontFamily: HEAD }} className="tracking-[.08em]">YOUR CART ({cart.count})</span>
          <button onClick={() => cart.setOpen(false)}><X size={22} /></button>
        </div>
        {cart.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag size={34} color={C.gray} />
            <p className="text-neutral-500 text-[14px]">Your cart is empty.</p>
            <Pill size="sm" onClick={() => cart.setOpen(false)}>Keep browsing</Pill>
          </div>
        ) : (<>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cart.items.map((i) => (
              <div key={i.key} className="flex gap-3 pb-4" style={{ borderBottom: `1px solid ${C.line}` }}>
                <Plate product={i.product} showSig={false} style={{ width: 72, height: 72, borderRadius: 3, flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] truncate" style={{ fontFamily: HEAD }}>{i.name}</div>
                  <div className="text-[11px] text-neutral-500">{i.summary}</div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center" style={{ border: `1px solid ${C.line}`, borderRadius: 999 }}>
                      <button className="w-7 h-7 flex items-center justify-center" onClick={() => cart.setQty(i.key, -1)}><Minus size={12} /></button>
                      <span className="w-6 text-center text-[12px]">{i.qty}</span>
                      <button className="w-7 h-7 flex items-center justify-center" onClick={() => cart.setQty(i.key, 1)}><Plus size={12} /></button>
                    </div>
                    <button onClick={() => { cart.remove(i.key); toast("Item removed"); }} className="text-neutral-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="text-[14px]" style={{ fontFamily: HEAD }}>{zar(i.price * i.qty)}</div>
              </div>
            ))}
          </div>
          <div className="p-5 shrink-0" style={{ borderTop: `1px solid ${C.line}` }}>
            <Row l="Subtotal" v={zar(cart.subtotal)} bold />
            <p className="text-[11px] text-neutral-500 mb-3">Shipping calculated at checkout · free over R2 500</p>
            <Pill onClick={go} style={{ width: "100%" }}>Secure checkout →</Pill>
          </div>
        </>)}
      </aside>
    </div>
  );
}

export function Toaster() {
  const { toasts } = useToast();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex flex-col gap-2 items-center">
      {toasts.map((t) => (
        <div key={t.id} className="text-white text-[14px] px-5 py-3 rounded-full flex items-center gap-2 shadow-lg" style={{ background: C.ink, fontFamily: HEAD, letterSpacing: ".03em", animation: "dgin .25s ease" }}>
          <Check size={16} color={C.green} /> {t.msg}
        </div>
      ))}
    </div>
  );
}

export function Footer() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  return (
    <footer style={{ background: C.dark, color: "#cfcfcb" }} className="mt-24">
      <div className="max-w-[1240px] mx-auto px-5 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div style={{ fontFamily: HEAD }} className="tracking-[.12em] text-white text-[16px] mb-3">DORON GOLDSTEIN <span style={{ color: C.green }}>PHOTOGRAPHY</span></div>
          <p className="text-[13px] leading-relaxed opacity-80 max-w-sm">For the love of wildlife. Signed, limited-edition fine-art photographs — printed on archival paper and canvas, and shipped across South Africa.</p>
          <div className="flex gap-2 mt-5 max-w-sm">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for new releases" className="flex-1 py-2.5 px-3 text-[13px] outline-none rounded" style={{ background: "#242320", border: "1px solid #333", color: "#fff" }} />
            <Pill size="sm" onClick={() => { setEmail(""); toast("You're on the list ✦"); }}>Join</Pill>
          </div>
        </div>
        <div className="text-[13px]">
          <div style={{ fontFamily: HEAD }} className="tracking-[.14em] text-white mb-3 text-[12px]">EXPLORE</div>
          {[["Shop the collection", "/shop"], ["About Doron", "/about"], ["Contact", "/contact"]].map(([x, href]) => <Link key={href} href={href} className="block py-1 opacity-80 hover:opacity-100">{x}</Link>)}
        </div>
        <div className="text-[13px]">
          <div style={{ fontFamily: HEAD }} className="tracking-[.14em] text-white mb-3 text-[12px]">SECURE CHECKOUT</div>
          <div className="flex items-center gap-2 opacity-80 mb-2"><ShieldCheck size={15} /> PayFast · Paystack</div>
          <div className="flex items-center gap-2 opacity-80"><Mail size={15} /> Receipts via Resend</div>
        </div>
      </div>
      <div className="text-center text-[11px] py-5 opacity-50" style={{ borderTop: "1px solid #333" }}>© 2026 Doron Goldstein Photography</div>
    </footer>
  );
}
