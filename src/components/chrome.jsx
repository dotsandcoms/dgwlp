"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ShoppingBag, User, Minus, Plus, Trash2, Check, ShieldCheck, Search } from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { Plate, Pill, Row } from "./primitives";
import { useCart, useAuth, useToast, useAuthModal } from "@/context/providers";
import { browserClient, hasSupabase, imageUrl } from "@/lib/supabase";
import { MOCK_PRODUCTS } from "@/lib/mock";
import { adminPath } from "@/lib/admin-path";

const LINKS = [["HOME", "/"], ["ABOUT", "/about"], ["SHOP", "/shop"], ["CONTACT", "/contact"]];

/** Person icon menu — Register / Sign in when logged out; account links when signed in. */
function AccountMenu({ align = "right" }) {
  const { user, logout, isAdmin, adminReady, ready } = useAuth();
  const { toast } = useToast();
  const { openAuth } = useAuthModal();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  // Null until auth has hydrated — keeps SSR HTML matching the first client paint
  const liveUser = ready ? user : null;
  const showAdmin = Boolean(liveUser && adminReady && isAdmin);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const go = (href) => {
    setOpen(false);
    router.push(href);
  };

  const openForm = (mode) => {
    setOpen(false);
    openAuth(mode, "/account");
  };

  const signOut = async () => {
    setOpen(false);
    try {
      await logout();
      toast("Signed out");
      router.push("/");
    } catch {
      toast("Could not sign out");
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover:opacity-60 flex items-center gap-1 text-[13px]"
        style={{ fontFamily: HEAD }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={liveUser ? "Account menu" : "Sign in or register"}
      >
        <User size={18} />
        {liveUser ? <span className="hidden sm:inline">{(liveUser.name || "").split(" ")[0] || "Account"}</span> : null}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-full mt-2 min-w-[180px] py-1.5 bg-white shadow-lg z-[60]"
          style={{
            [align === "left" ? "left" : "right"]: 0,
            border: `1px solid ${C.line}`,
            borderRadius: 6,
          }}
        >
          {liveUser ? (
            <>
              <button type="button" role="menuitem" onClick={() => go("/account")} className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-neutral-50" style={{ fontFamily: HEAD }}>
                My account
              </button>
              {showAdmin && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => go(adminPath())}
                  className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-neutral-50"
                  style={{ fontFamily: HEAD, color: C.green }}
                >
                  Admin
                </button>
              )}
              <button type="button" role="menuitem" onClick={signOut} className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-neutral-50 text-neutral-600" style={{ fontFamily: HEAD }}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button type="button" role="menuitem" onClick={() => openForm("register")} className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-neutral-50" style={{ fontFamily: HEAD }}>
                Register
              </button>
              <button type="button" role="menuitem" onClick={() => openForm("login")} className="w-full text-left px-4 py-2.5 text-[13px] hover:bg-neutral-50" style={{ fontFamily: HEAD }}>
                Sign in
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function matchQuery(p, q) {
  if (!q) return true;
  const hay = `${p.name || ""} ${p.category || ""} ${p.desc || p.description || ""} ${p.sku || ""}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

function SiteSearch({ open, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [q, setQ] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQ("");
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (hasSupabase) {
          const sb = browserClient();
          const { data } = await sb.from("products")
            .select("id,slug,name,sku,colour,hero_image,description,categories(name)")
            .eq("is_published", true)
            .order("name");
          if (cancelled) return;
          setProducts((data || []).map((row) => ({
            id: row.id,
            slug: row.slug,
            name: row.name,
            sku: row.sku,
            colour: row.colour,
            desc: row.description || "",
            category: row.categories?.name || "",
            image: imageUrl(row.hero_image),
            grad: ["#333", "#9a9a97"],
            angle: 120,
          })));
        } else {
          setProducts(MOCK_PRODUCTS);
        }
      } catch {
        if (!cancelled) setProducts(MOCK_PRODUCTS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    return products.filter((p) => matchQuery(p, q)).slice(0, 12);
  }, [products, q]);

  const goShop = () => {
    const term = q.trim();
    onClose();
    router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" role="dialog" aria-modal="true" aria-label="Search prints">
      <div className="absolute inset-0" style={{ background: "rgba(20,20,18,.5)" }} onClick={onClose} />
      <div className="relative bg-white shadow-lg" style={{ borderBottom: `1px solid ${C.line}` }}>
        <div className="max-w-[720px] mx-auto px-5 py-5">
          <div className="flex items-center gap-3" style={{ borderBottom: `1px solid ${C.ink}` }}>
            <Search size={20} color={C.gray} />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") goShop(); }}
              placeholder="Search prints, categories…"
              className="flex-1 py-3 text-[18px] outline-none bg-transparent"
              style={{ fontFamily: HEAD }}
            />
            <button onClick={onClose} aria-label="Close search" className="p-1 text-neutral-500 hover:text-black"><X size={22} /></button>
          </div>

          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            {loading && <p className="text-[13px] text-neutral-500 py-6">Loading catalogue…</p>}
            {!loading && q.trim() && results.length === 0 && (
              <p className="text-[14px] text-neutral-500 py-6">No prints match “{q.trim()}”.</p>
            )}
            {!loading && results.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.slug}`}
                onClick={onClose}
                className="flex items-center gap-3 py-3 hover:bg-[#faf9f6] px-1"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <Plate product={p} showSig={false} style={{ width: 48, height: 48, borderRadius: 4, flexShrink: 0 }} />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] truncate" style={{ fontFamily: HEAD }}>{p.name}</div>
                  <div className="text-[12px] text-neutral-500">{p.category}</div>
                </div>
              </Link>
            ))}
            {!loading && q.trim() && (
              <button onClick={goShop} className="w-full text-left py-4 text-[13px]" style={{ fontFamily: HEAD, color: C.green }}>
                View all results in shop →
              </button>
            )}
            {!loading && !q.trim() && (
              <p className="text-[13px] text-neutral-500 py-6">Type a print name or category — or browse the <Link href="/shop" onClick={onClose} style={{ color: C.green }}>shop</Link>.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const cart = useCart();
  const { user, isAdmin, adminReady, ready: authReady } = useAuth();
  const { openAuth } = useAuthModal();
  const active = (href) => href === "/" ? path === "/" : path.startsWith(href);
  const liveUser = authReady ? user : null;
  const showAdmin = Boolean(liveUser && adminReady && isAdmin);
  return (
    <>
      <header className="sticky top-0 z-50" style={{ background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${C.line}` }}>
        <div className="w-full px-4 sm:px-8 h-[68px] flex items-center justify-between gap-3 min-w-0">
          <Link href="/" style={{ fontFamily: HEAD, fontWeight: 500 }} className="text-[13px] sm:text-[20px] tracking-[.08em] sm:tracking-[.12em] min-w-0 leading-tight">
            <span style={{ color: C.ink }}>DORON GOLDSTEIN </span><span className="whitespace-nowrap" style={{ color: C.green }}>PHOTOGRAPHY</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8" style={{ fontFamily: HEAD, letterSpacing: ".08em" }}>
            {LINKS.map(([l, href]) => <Link key={href} href={href} className="text-[14px] hover:opacity-60" style={{ color: active(href) ? C.green : C.ink }}>{l}</Link>)}
            <button onClick={() => setSearchOpen(true)} className="hover:opacity-60" aria-label="Search" title="Search"><Search size={18} /></button>
            <AccountMenu />
            <button onClick={() => cart.setOpen(true)} className="relative hover:opacity-60">
              <ShoppingBag size={19} />
              {cart.count > 0 && <span className="absolute -top-2 -right-2 text-[10px] text-white rounded-full w-[17px] h-[17px] flex items-center justify-center" style={{ background: C.green }}>{cart.count}</span>}
            </button>
          </nav>
          <div className="flex items-center gap-3 sm:gap-4 md:hidden shrink-0">
            <AccountMenu />
            <button onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={20} /></button>
            <button onClick={() => cart.setOpen(true)} className="relative"><ShoppingBag size={20} />
              {cart.count > 0 && <span className="absolute -top-2 -right-2 text-[10px] text-white rounded-full w-[16px] h-[16px] flex items-center justify-center" style={{ background: C.green }}>{cart.count}</span>}
            </button>
            <button onClick={() => setOpen(true)} aria-label="Menu"><Menu size={22} /></button>
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
            <button onClick={() => { setOpen(false); setSearchOpen(true); }} className="text-left text-[20px] py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${C.line}` }}><Search size={20} /> SEARCH</button>
            {liveUser ? (
              <>
                <Link href="/account" onClick={() => setOpen(false)} className="text-left text-[20px] py-3" style={{ borderBottom: `1px solid ${C.line}` }}>MY ACCOUNT</Link>
                {showAdmin && (
                  <Link href={adminPath()} onClick={() => setOpen(false)} className="text-left text-[20px] py-3" style={{ borderBottom: `1px solid ${C.line}`, color: C.green }}>
                    ADMIN
                  </Link>
                )}
              </>
            ) : (
              <>
                <button type="button" onClick={() => { setOpen(false); openAuth("register"); }} className="text-left text-[20px] py-3" style={{ borderBottom: `1px solid ${C.line}` }}>REGISTER</button>
                <button type="button" onClick={() => { setOpen(false); openAuth("login"); }} className="text-left text-[20px] py-3" style={{ borderBottom: `1px solid ${C.line}` }}>SIGN IN</button>
              </>
            )}
          </div>
        </div>
      )}

      <SiteSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
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
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[80] flex flex-col gap-2 items-center px-4 w-full max-w-lg pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto text-white text-[14px] px-5 py-3 rounded-full flex items-center gap-2 shadow-lg max-w-full" style={{ background: C.ink, fontFamily: HEAD, letterSpacing: ".03em", animation: "dgin .25s ease" }}>
          <Check size={16} color={C.green} className="shrink-0" /> <span className="truncate">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function Footer() {
  return (
    <footer style={{ background: C.dark, color: "#cfcfcb" }}>
      <div className="max-w-[1240px] mx-auto px-5 py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div style={{ fontFamily: HEAD }} className="tracking-[.12em] text-white text-[16px] mb-3">DORON GOLDSTEIN <span style={{ color: C.green }}>PHOTOGRAPHY</span></div>
          <p className="text-[13px] leading-relaxed opacity-80 max-w-sm">For the love of wildlife. Signed, limited-edition fine-art photographs — printed on archival paper and canvas, and shipped across South Africa.</p>
        </div>
        <div className="text-[13px]">
          <div style={{ fontFamily: HEAD }} className="tracking-[.14em] text-white mb-3 text-[12px]">EXPLORE</div>
          {[["Shop the collection", "/shop"], ["About Doron", "/about"], ["Contact", "/contact"]].map(([x, href]) => <Link key={href} href={href} className="block py-1 opacity-80 hover:opacity-100">{x}</Link>)}
        </div>
        <div className="text-[13px]">
          <div style={{ fontFamily: HEAD }} className="tracking-[.14em] text-white mb-3 text-[12px]">SECURE CHECKOUT</div>
          <div className="flex items-center gap-2 opacity-80"><ShieldCheck size={15} /> PayFast · Paystack</div>
        </div>
      </div>
      <div className="text-center text-[11px] py-5 opacity-50 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3" style={{ borderTop: "1px solid #333" }}>
        <span>© 2026 Doron Goldstein Photography</span>
        <span className="hidden sm:inline opacity-40">·</span>
        <a href="https://dotsandcoms.co.za" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 opacity-80 transition-opacity">
          Developed by Dotsandcoms
        </a>
      </div>
    </footer>
  );
}
