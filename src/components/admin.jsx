"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ImageIcon, Upload, Package, Tag, Plus, Pencil, Trash2, Check, ChevronDown, ChevronLeft, ChevronRight, TrendingUp, CreditCard, Lock, Loader2, Search, Settings } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { C, HEAD, zar, RATIOS, MATERIALS, PRICING, ROOMS, CATEGORY_NAMES, rangeOf, artPlacement } from "@/lib/pricing";
import { MOCK_PRODUCTS, MOCK_ORDERS, SALES } from "@/lib/mock";
import { hasSupabase, imageUrl } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import * as db from "@/lib/admin-data";
import { Plate, Scene, artworkStyle, Pill, StatusBadge } from "./primitives";
import { LiveSettings, DemoSettings } from "./admin-settings";
import { useToast, useAuth, useAuthModal } from "@/context/providers";
import { adminPath } from "@/lib/admin-path";

export function AdminApp() {
  // Never expose the demo admin console in production.
  if (hasSupabase) return <LiveAdminGate />;
  if (process.env.NODE_ENV === "production") {
    return (
      <div className="max-w-[520px] mx-auto px-5 py-24 text-center">
        <Lock size={26} color={C.gray} className="mx-auto mb-4" />
        <h1 className="text-[22px] mb-2" style={{ fontFamily: HEAD }}>Not found</h1>
        <p className="text-[14px] text-neutral-600">This page is not available.</p>
      </div>
    );
  }
  return <DemoAdminApp />;
}

/* =====================================================================
   LIVE — backed by the real Supabase project
   ===================================================================== */
function LiveAdminGate() {
  const router = useRouter();
  const { sessionUser, isAdmin, adminReady } = useAuth();
  const { openAuth } = useAuthModal();

  if (!adminReady) {
    return <div className="max-w-[1240px] mx-auto px-5 py-24 text-center text-neutral-500 text-[14px] flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> Checking access…</div>;
  }
  if (!sessionUser) {
    return (
      <div className="max-w-[520px] mx-auto px-5 py-24 text-center">
        <Lock size={26} color={C.gray} className="mx-auto mb-4" />
        <h1 className="text-[22px] mb-2" style={{ fontFamily: HEAD }}>Sign in required</h1>
        <p className="text-[14px] text-neutral-600 mb-6">Sign in with an admin account to manage products &amp; orders.</p>
        <Pill onClick={() => openAuth("login", adminPath())}>Sign in →</Pill>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="max-w-[560px] mx-auto px-5 py-24 text-center">
        <Lock size={26} color={C.gray} className="mx-auto mb-4" />
        <h1 className="text-[22px] mb-2" style={{ fontFamily: HEAD }}>Not authorized</h1>
        <p className="text-[14px] text-neutral-600 mb-4">This account does not have access to the store console.</p>
        <Pill onClick={() => router.push("/")}>Back to site</Pill>
      </div>
    );
  }
  return <LiveAdminApp />;
}

function LiveAdminApp() {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState("dashboard");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);

  const reloadProducts = useCallback(() => db.fetchProducts().then(setProducts).catch((e) => toast(friendlyError(e, "Failed to load products"))), [toast]);
  const reloadCategories = useCallback(() => db.fetchCategories().then(setCategories).catch((e) => toast(friendlyError(e, "Failed to load categories"))), [toast]);
  const reloadOrders = useCallback(() => db.fetchOrders().then(setOrders).catch((e) => toast(friendlyError(e, "Failed to load orders"))), [toast]);

  useEffect(() => {
    setLoading(true);
    Promise.all([db.fetchProducts(), db.fetchCategories(), db.fetchOrders()])
      .then(([p, c, o]) => { setProducts(p); setCategories(c); setOrders(o); })
      .catch((e) => toast(friendlyError(e, "Failed to load admin data")))
      .finally(() => setLoading(false));
  }, [toast]);

  const nav = [["dashboard", "Dashboard", LayoutDashboard], ["products", "Products", ImageIcon], ["editor", "Add / edit print", Upload], ["orders", "Orders", Package], ["categories", "Categories", Tag], ["settings", "Settings", Settings]];
  const openEditor = (id = null) => { setEditingId(id); setView("editor"); };

  return (
    <div className="max-w-[1240px] mx-auto px-5 py-8">
      <div className="mb-4 p-3 rounded text-[12px]" style={{ background: C.greenSoft, color: C.greenDark }}>Connected to Supabase — changes here affect the live store.</div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px]" style={{ fontFamily: HEAD, fontWeight: 400 }}>Store Admin</h1>
        <button onClick={() => router.push("/")} className="text-[13px] text-neutral-500">← Back to store</button>
      </div>
      <div className="flex gap-2 flex-wrap mb-8 overflow-x-auto no-scrollbar">
        {nav.map(([id, label, Icon]) => (
          <button key={id} onClick={() => (id === "editor" ? openEditor(null) : setView(id))} className="flex items-center gap-2 text-[13px] px-4 py-2 rounded-full shrink-0" style={{ background: view === id ? C.green : "#fff", color: view === id ? "#fff" : C.ink, border: `1px solid ${view === id ? C.green : C.line}`, fontFamily: HEAD }}><Icon size={15} /> {label}</button>
        ))}
      </div>
      {loading ? (
        <div className="py-24 flex items-center justify-center gap-2 text-neutral-500 text-[14px]"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      ) : (<>
        {view === "dashboard" && <LiveDash products={products} orders={orders} />}
        {view === "products" && <LiveProducts products={products} categories={categories} onEdit={openEditor} onDeleted={reloadProducts} toast={toast} />}
        {view === "editor" && <LiveEditor editingId={editingId} categories={categories} toast={toast} onSaved={() => { reloadProducts(); setView("products"); }} />}
        {view === "orders" && <LiveOrders orders={orders} onChanged={reloadOrders} toast={toast} />}
        {view === "categories" && <LiveCategories categories={categories} onChanged={reloadCategories} toast={toast} />}
        {view === "settings" && <LiveSettings toast={toast} />}
      </>)}
    </div>
  );
}

function LiveDash({ products, orders }) {
  const settled = orders.filter((o) => ["paid", "shipped", "delivered"].includes(o.status));
  const revenue = settled.reduce((n, o) => n + o.total_cents, 0) / 100;
  const avg = settled.length ? revenue / settled.length : 0;
  const printsSold = orders.reduce((n, o) => n + o.item_count, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="REVENUE (PAID+)" value={zar(revenue)} sub={`${settled.length} settled orders`} Icon={TrendingUp} />
        <Kpi label="ORDERS" value={orders.length} sub={`${orders.filter((o) => o.status === "pending").length} pending`} Icon={Package} />
        <Kpi label="AVG ORDER" value={zar(avg)} sub="of settled orders" Icon={CreditCard} />
        <Kpi label="PRINTS SOLD" value={printsSold} sub={`${products.length} listed`} Icon={ImageIcon} />
      </div>
      <div className="p-5 rounded-lg" style={{ border: `1px solid ${C.line}` }}>
        <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>Recent orders</h3>
        <LiveOrders orders={orders.slice(0, 6)} compact />
      </div>
    </div>
  );
}

function LiveProducts({ products, categories = [], onEdit, onDeleted, toast }) {
  const PAGE_SIZE = 20;
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("All");
  const [page, setPage] = useState(1);

  const categoryNames = categories.map((c) => c.name);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== "All" && p.category_name !== cat) return false;
      if (!q) return true;
      const hay = `${p.name || ""} ${p.category_name || ""} ${p.sku || ""} ${p.slug || ""}`.toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [products, query, cat]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [query, cat]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    setBusyId(p.id);
    try { await db.deleteProduct(p.id); toast("Print deleted"); onDeleted(); } catch (e) { toast(friendlyError(e, "Delete failed")); } finally { setBusyId(null); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <span className="text-[14px] text-neutral-500">
          {filtered.length} of {products.length} prints
          {pageCount > 1 ? ` · page ${safePage}/${pageCount}` : ""}
        </span>
        <Pill size="sm" onClick={() => onEdit(null)}><Plus size={14} /> New print</Pill>
      </div>

      <div className="flex flex-col lg:flex-row gap-3 mb-5">
        <div className="flex-1 flex items-center gap-2 px-3" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>
          <Search size={15} color={C.gray} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, category, SKU…"
            className="flex-1 py-2.5 text-[14px] outline-none bg-transparent"
          />
          {query && <button type="button" onClick={() => setQuery("")} className="text-[12px] text-neutral-500">Clear</button>}
        </div>
        <div className="relative min-w-[200px]">
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            className="w-full appearance-none py-2.5 pl-3 pr-9 text-[14px] outline-none"
            style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}
          >
            <option value="All">All categories</option>
            {categoryNames.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
          <ChevronDown size={15} className="absolute right-3 top-3.5 pointer-events-none text-neutral-400" />
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-[14px] text-neutral-500 py-8 text-center">No prints yet — add your first one.</p>
      ) : pageItems.length === 0 ? (
        <p className="text-[14px] text-neutral-500 py-8 text-center">No prints match your search or filter.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]" style={{ minWidth: 700 }}>
              <thead><tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>{["", "NAME", "CATEGORY", "RATIO", "PRICE RANGE", "STATUS", ""].map((h, k) => <th key={k} className="py-3 font-normal">{h}</th>)}</tr></thead>
              <tbody>{pageItems.map((p) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
                  <td className="py-3"><Plate product={{ image: imageUrl(p.hero_image), colour: p.colour === "both" ? "colour" : p.colour, name: p.name, grad: ["#333", "#9a9a97"], angle: 120 }} showSig={false} style={{ width: 46, height: 46, borderRadius: 3 }} /></td>
                  <td style={{ fontFamily: HEAD }}>{p.name}</td><td className="text-neutral-600">{p.category_name}</td>
                  <td className="text-neutral-600">{RATIOS[p.ratio_id]?.label || p.ratio_id}</td>
                  <td>{p.min_cents ? `${zar(p.min_cents / 100)} – ${zar(p.max_cents / 100)}` : "No prices set"}</td>
                  <td><span className="text-[11px] px-2 py-1 rounded-full" style={{ background: p.is_published ? `${C.green}18` : "#f2f2f0", color: p.is_published ? C.green : C.gray, fontFamily: HEAD }}>{p.is_published ? "Published" : "Draft"}</span></td>
                  <td className="whitespace-nowrap">
                    <button onClick={() => onEdit(p.id)} className="text-neutral-400 hover:text-black mr-3"><Pencil size={15} /></button>
                    <button onClick={() => remove(p)} disabled={busyId === p.id} className="text-neutral-400 hover:text-red-500">{busyId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}</button>
                  </td>
                </tr>))}</tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="flex items-center gap-1 text-[13px] px-3 py-2 rounded-full disabled:opacity-40" style={{ border: `1px solid ${C.line}`, fontFamily: HEAD }}>
                <ChevronLeft size={15} /> Prev
              </button>
              <div className="flex flex-wrap justify-center gap-1">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button key={n} type="button" onClick={() => setPage(n)} className="w-9 h-9 rounded-full text-[13px]" style={{ background: n === safePage ? C.green : "transparent", color: n === safePage ? "#fff" : C.ink, border: `1px solid ${n === safePage ? C.green : C.line}`, fontFamily: HEAD }}>{n}</button>
                ))}
              </div>
              <button type="button" disabled={safePage >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))} className="flex items-center gap-1 text-[13px] px-3 py-2 rounded-full disabled:opacity-40" style={{ border: `1px solid ${C.line}`, fontFamily: HEAD }}>
                Next <ChevronRight size={15} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LiveOrders({ orders, compact, onChanged, toast }) {
  const STATUSES = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"];
  const [busyId, setBusyId] = useState(null);
  const changeStatus = async (o, status) => {
    setBusyId(o.id);
    try { await db.updateOrderStatus(o.id, status); toast(`Order ${o.order_no} marked ${status}`); onChanged?.(); } catch (e) { toast(friendlyError(e, "Update failed")); } finally { setBusyId(null); }
  };
  if (orders.length === 0) return <p className="text-[14px] text-neutral-500 py-8 text-center">No orders yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]" style={{ minWidth: 620 }}>
        {!compact && <thead><tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>{["ORDER", "DATE", "ITEMS", "TOTAL", "STATUS"].map((h) => <th key={h} className="py-3 font-normal">{h}</th>)}</tr></thead>}
        <tbody>{orders.map((o) => (
          <tr key={o.id} style={{ borderBottom: `1px solid ${C.line}` }}>
            <td className="py-3" style={{ fontFamily: HEAD }}>{o.order_no}</td>
            <td className="text-neutral-600">{new Date(o.created_at).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}</td>
            <td className="text-neutral-600">{o.item_count} item{o.item_count === 1 ? "" : "s"}</td>
            <td>{zar(o.total_cents / 100)}</td>
            <td>
              {compact || !onChanged ? <StatusBadge s={o.status} /> : (
                <div className="relative inline-block">
                  <select value={o.status} disabled={busyId === o.id} onChange={(e) => changeStatus(o, e.target.value)} className="text-[12px] py-1 pl-2 pr-6 rounded-full appearance-none outline-none" style={{ border: `1px solid ${C.line}`, fontFamily: HEAD }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              )}
            </td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}

function LiveCategories({ categories, onChanged, toast }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!val.trim()) return;
    setBusy(true);
    try { await db.createCategory(val.trim()); setVal(""); toast("Category added"); onChanged(); } catch (e) { toast(friendlyError(e, "Failed to add category")); } finally { setBusy(false); }
  };
  const remove = async (c) => {
    try { await db.deleteCategory(c.id); toast("Category removed"); onChanged(); } catch (e) { toast(friendlyError(e, "Failed to remove category")); }
  };
  return (
    <div className="max-w-[520px]">
      <h3 className="text-[15px] mb-4" style={{ fontFamily: HEAD }}>Photo categories</h3>
      {categories.length === 0 && <p className="text-[13px] text-neutral-500 mb-3">No categories yet.</p>}
      {categories.map((c) => (<div key={c.id} className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.line}` }}><span className="text-[14px]">{c.name}</span><button onClick={() => remove(c)} className="text-neutral-400 hover:text-red-500"><Trash2 size={15} /></button></div>))}
      <div className="flex gap-2 mt-4"><input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New category" className="flex-1 py-2.5 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} /><Pill size="sm" onClick={add} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : "Add"}</Pill></div>
    </div>
  );
}

function LiveEditor({ editingId, categories, toast, onSaved }) {
  const fileRef = useRef(null);
  const [loadingProduct, setLoadingProduct] = useState(Boolean(editingId));
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [ratio, setRatio] = useState("landscape");
  const [colour, setColour] = useState("bw");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [existingImage, setExistingImage] = useState(null); // hero_image path already on the product
  const [enabledSizes, setEnabledSizes] = useState({});
  const [enabledMats, setEnabledMats] = useState({ paper: true, paper_framed: true, canvas_rolled: true, canvas_framed: true, canvas_mounted: true });
  const [prices, setPrices] = useState({});
  const [rooms, setRooms] = useState({ lounge: true, bedroom: true, study: false, gallery: true });

  useEffect(() => {
    if (!categoryId && categories.length) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  // Default price grid for the chosen ratio (only when not editing an existing product)
  useEffect(() => {
    if (editingId) return;
    const es = {}; const pr = {};
    RATIOS[ratio].sizes.forEach((s) => { es[s] = true; PRICING[s].forEach((v, mi) => { pr[`${s}:${mi}`] = v; }); });
    setEnabledSizes(es); setPrices(pr);
  }, [ratio, editingId]);

  useEffect(() => {
    if (!editingId) return;
    setLoadingProduct(true);
    db.fetchProductForEdit(editingId).then(({ product, variants, roomIds }) => {
      setName(product.name);
      setCategoryId(product.category_id || "");
      setRatio(product.ratio_id);
      setColour(product.colour);
      setDesc(product.description || "");
      setExistingImage(product.hero_image || null);
      const es = {}; const pr = {};
      variants.forEach((v) => {
        es[v.size_id] = true;
        const mi = MATERIALS.find((m) => m.id === v.material_id)?.i;
        if (mi != null) pr[`${v.size_id}:${mi}`] = v.price_cents / 100;
      });
      setEnabledSizes(es); setPrices(pr);
      const rm = { lounge: false, bedroom: false, study: false, gallery: false };
      roomIds.forEach((r) => { rm[r] = true; });
      setRooms(rm);
    }).catch((e) => toast(friendlyError(e, "Failed to load print"))).finally(() => setLoadingProduct(false));
  }, [editingId, toast]);

  const onSizes = RATIOS[ratio].sizes.filter((s) => enabledSizes[s]);
  const onMats = MATERIALS.filter((m) => enabledMats[m.id]);
  const range = useMemo(() => {
    const vals = [];
    onSizes.forEach((s) => onMats.forEach((m) => { const v = Number(prices[`${s}:${m.i}`]); if (v) vals.push(v); }));
    return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 0];
  }, [onSizes, onMats, prices]);

  const previewImage = file ? URL.createObjectURL(file) : imageUrl(existingImage);
  const preview = { image: previewImage, grad: colour === "colour" || colour === "both" ? ["#7c5f36", "#d9c39a"] : ["#333", "#9a9a97"], angle: 120, name: name || "New Print", colour: colour === "both" ? "colour" : colour, ratio };
  const firstRoom = Object.keys(rooms).find((r) => rooms[r]) || "gallery";

  const save = async () => {
    if (!name.trim()) return toast("Give the print a name");
    if (!categoryId) return toast("Choose a category");
    if (!file && !existingImage) return toast("Upload a photograph");
    if (onSizes.length === 0) return toast("Enable at least one size");
    const variants = [];
    onSizes.forEach((s) => onMats.forEach((m) => {
      const v = Number(prices[`${s}:${m.i}`]);
      if (v > 0) variants.push({ size_id: s, material_id: m.id, price_cents: Math.round(v * 100) });
    }));
    if (variants.length === 0) return toast("Set at least one price");
    setSaving(true);
    try {
      let heroImage = existingImage;
      if (file) heroImage = await db.uploadPrintImage(file);
      const slug = db.slugify(name);
      await db.saveProduct({
        id: editingId,
        fields: { name, slug, sku: slug, category_id: categoryId, ratio_id: ratio, colour, description: desc, hero_image: heroImage, is_published: true },
        variants,
        roomIds: Object.keys(rooms).filter((r) => rooms[r]),
      });
      toast(editingId ? "Print updated" : "Print saved & published");
      onSaved();
    } catch (e) {
      toast(friendlyError(e, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  if (loadingProduct) return <div className="py-24 flex items-center justify-center gap-2 text-neutral-500 text-[14px]"><Loader2 size={16} className="animate-spin" /> Loading print…</div>;

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>1 · Upload the photograph</h3>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button onClick={() => fileRef.current?.click()} className="w-full flex flex-col items-center justify-center py-12 rounded-lg" style={{ border: `2px dashed ${file || existingImage ? C.green : C.line}`, background: file || existingImage ? C.greenSoft : "#fafafa" }}>
            {file || existingImage ? <><Check size={26} color={C.green} /><span className="text-[14px] mt-2" style={{ fontFamily: HEAD }}>{file ? file.name : "Current photograph"} {file ? "selected" : ""}</span><span className="text-[12px] text-neutral-500">Click to {existingImage ? "replace" : "choose"} a file</span></>
              : <><Upload size={26} color={C.gray} /><span className="text-[14px] mt-2" style={{ fontFamily: HEAD }}>Click to upload</span><span className="text-[12px] text-neutral-500">High-res JPG/PNG — uploaded to the `prints` bucket</span></>}
          </button>
        </div>
        <div>
          <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>2 · Details</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Print name (e.g. Leopard — Colour)" className="w-full py-3 px-3 text-[14px] outline-none mb-3" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} />
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div className="relative"><select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full appearance-none py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-3.5 pointer-events-none" /></div>
            <div className="relative"><select value={ratio} onChange={(e) => setRatio(e.target.value)} className="w-full appearance-none py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>{Object.entries(RATIOS).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-3.5 pointer-events-none" /></div>
          </div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={3} className="w-full py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} />
          <div className="flex flex-wrap gap-4 mt-3">{[["bw", "Black & White"], ["colour", "Colour"], ["both", "Both"]].map(([k, l]) => (<label key={k} className="flex items-center gap-2 text-[14px]"><input type="radio" checked={colour === k} onChange={() => setColour(k)} /> {l}</label>))}</div>
          {colour === "both" && <p className="text-[12px] text-neutral-500 mt-2">Shoppers can choose Black &amp; White or Colour — the same upload is shown with a B&amp;W filter when they pick mono.</p>}
        </div>
        <div>
          <h3 className="text-[15px] mb-1" style={{ fontFamily: HEAD }}>3 · Sizes &amp; finishes — set a price for each</h3>
          <p className="text-[12px] text-neutral-500 mb-3">Prices are pre-filled from your price list — edit any cell. Leave blank to skip that combination.</p>
          <div className="flex gap-4 flex-wrap mb-3">{MATERIALS.map((m) => (<label key={m.id} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={enabledMats[m.id]} onChange={(e) => setEnabledMats({ ...enabledMats, [m.id]: e.target.checked })} /> {m.label}</label>))}</div>
          <div className="overflow-x-auto">
            <table className="text-[13px]" style={{ minWidth: 620 }}>
              <thead><tr className="text-neutral-500 text-[11px]"><th className="text-left font-normal py-2 pr-3">SIZE</th>{onMats.map((m) => <th key={m.id} className="font-normal py-2 px-2 text-center">{m.label.replace("Canvas — ", "Cv ").replace("Paper — ", "Pa ")}</th>)}</tr></thead>
              <tbody>{RATIOS[ratio].sizes.map((s) => (
                <tr key={s} style={{ borderTop: `1px solid ${C.line}`, opacity: enabledSizes[s] ? 1 : .45 }}>
                  <td className="py-2 pr-3"><label className="flex items-center gap-2"><input type="checkbox" checked={!!enabledSizes[s]} onChange={(e) => setEnabledSizes({ ...enabledSizes, [s]: e.target.checked })} /><span style={{ fontFamily: HEAD }}>{s}</span></label></td>
                  {onMats.map((m) => (<td key={m.id} className="py-1.5 px-2"><div className="flex items-center gap-0.5"><span className="text-[11px] text-neutral-400">R</span><input type="number" disabled={!enabledSizes[s]} value={prices[`${s}:${m.i}`] ?? ""} onChange={(e) => setPrices({ ...prices, [`${s}:${m.i}`]: e.target.value })} className="w-16 py-1 px-1 text-[12px] text-right outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 3 }} /></div></td>))}
                </tr>))}</tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>4 · Room previews to show</h3>
          <div className="flex gap-4 flex-wrap">{ROOMS.map((r) => (<label key={r.id} className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={!!rooms[r.id]} onChange={(e) => setRooms({ ...rooms, [r.id]: e.target.checked })} /> {r.label}</label>))}</div>
        </div>
        <Pill onClick={save} disabled={saving}>{saving ? <><Loader2 size={14} className="animate-spin inline mr-1" /> Saving…</> : (editingId ? "Save changes" : "Save & publish print")}</Pill>
      </div>

      <div className="lg:sticky lg:top-24 h-fit">
        <h3 className="text-[13px] tracking-[.1em] mb-3 text-neutral-500" style={{ fontFamily: HEAD }}>LIVE CUSTOMER PREVIEW</h3>
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <div style={{ position: "relative", width: "100%", aspectRatio: "4/3" }}>
            <Scene room={firstRoom} />
            {(() => {
              const sz = onSizes[onSizes.length - 1] || RATIOS[ratio].sizes[0];
              const place = artPlacement(sz, firstRoom, ratio);
              return (
                <div style={{ position: "absolute", top: `${place.topPct}%`, left: `${place.leftPct}%`, transform: "translate(-50%,-50%)", width: `${place.widthPct}%` }}>
                  <div style={artworkStyle(onMats.find((m) => m.framed) ? "paper_framed" : "paper", "black")}><Plate product={preview} showSig={false} style={{ width: "100%", aspectRatio: RATIOS[ratio].ar }} /></div>
                </div>
              );
            })()}
          </div>
          <div className="p-4">
            <div className="text-[16px]" style={{ fontFamily: HEAD, color: C.green }}>{(name || "New Print").toUpperCase()}</div>
            <div className="text-[15px] mt-1" style={{ fontFamily: HEAD }}>{onSizes.length ? `${zar(range[0])} – ${zar(range[1])}` : "Enable a size"}</div>
            <div className="text-[12px] text-neutral-500 mt-2">{RATIOS[ratio].label} · {onSizes.length} sizes · {onMats.length} finishes · {Object.values(rooms).filter(Boolean).length} rooms</div>
          </div>
        </div>
        <p className="text-[12px] text-neutral-400 mt-3">Exactly what shoppers see. Price range updates live as you edit the grid.</p>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, Icon }) {
  return (
    <div className="p-5 rounded-lg" style={{ border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between text-neutral-500 mb-2"><span className="text-[12px] tracking-[.05em]">{label}</span><Icon size={16} color={C.green} /></div>
      <div className="text-[26px]" style={{ fontFamily: HEAD }}>{value}</div><div className="text-[12px] mt-1" style={{ color: C.green }}>{sub}</div>
    </div>
  );
}

/* =====================================================================
   DEMO — no Supabase configured, runs entirely on bundled sample data
   ===================================================================== */
function DemoAdminApp() {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState("dashboard");
  const nav = [["dashboard", "Dashboard", LayoutDashboard], ["products", "Products", ImageIcon], ["editor", "Add / edit print", Upload], ["orders", "Orders", Package], ["categories", "Categories", Tag], ["settings", "Settings", Settings]];
  return (
    <div className="max-w-[1240px] mx-auto px-5 py-8">
      <div className="mb-4 p-3 rounded text-[12px]" style={{ background: C.greenSoft, color: C.greenDark }}>Demo admin — running on sample data. Connect Supabase to manage real products & orders.</div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px]" style={{ fontFamily: HEAD, fontWeight: 400 }}>Store Admin</h1>
        <button onClick={() => router.push("/")} className="text-[13px] text-neutral-500">← Back to store</button>
      </div>
      <div className="flex gap-2 flex-wrap mb-8 overflow-x-auto no-scrollbar">
        {nav.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setView(id)} className="flex items-center gap-2 text-[13px] px-4 py-2 rounded-full shrink-0" style={{ background: view === id ? C.green : "#fff", color: view === id ? "#fff" : C.ink, border: `1px solid ${view === id ? C.green : C.line}`, fontFamily: HEAD }}><Icon size={15} /> {label}</button>
        ))}
      </div>
      {view === "dashboard" && <DemoDash />}
      {view === "products" && <DemoProducts onEdit={() => setView("editor")} />}
      {view === "editor" && <DemoEditor toast={toast} />}
      {view === "orders" && <DemoOrders />}
      {view === "categories" && <DemoCategories toast={toast} />}
      {view === "settings" && <DemoSettings toast={toast} />}
    </div>
  );
}

function DemoDash() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="REVENUE (JUL)" value="R47 200" sub="▲ 50% vs Jun" Icon={TrendingUp} />
        <Kpi label="ORDERS" value="29" sub="▲ 7 this week" Icon={Package} />
        <Kpi label="AVG ORDER" value="R1 628" sub="▲ 11%" Icon={CreditCard} />
        <Kpi label="PRINTS SOLD" value="46" sub="Top: Elephant Herd" Icon={ImageIcon} />
      </div>
      <div className="p-5 rounded-lg" style={{ border: `1px solid ${C.line}` }}>
        <h3 className="text-[15px] mb-4" style={{ fontFamily: HEAD }}>Sales — last 6 months</h3>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={SALES} margin={{ left: -8, right: 10, top: 5 }}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.35} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="m" tick={{ fontSize: 12 }} stroke="#bbb" /><YAxis tick={{ fontSize: 11 }} stroke="#bbb" tickFormatter={(v) => "R" + v / 1000 + "k"} />
              <Tooltip formatter={(v) => zar(v)} />
              <Area type="monotone" dataKey="v" stroke={C.green} strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="p-5 rounded-lg" style={{ border: `1px solid ${C.line}` }}><h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>Recent orders</h3><DemoOrders compact /></div>
    </div>
  );
}
function DemoProducts({ onEdit }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4"><span className="text-[14px] text-neutral-500">{MOCK_PRODUCTS.length} prints</span><Pill size="sm" onClick={onEdit}><Plus size={14} /> New print</Pill></div>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]" style={{ minWidth: 640 }}>
          <thead><tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>{["", "NAME", "CATEGORY", "RATIO", "PRICE RANGE", ""].map((h, k) => <th key={k} className="py-3 font-normal">{h}</th>)}</tr></thead>
          <tbody>{MOCK_PRODUCTS.map((p) => { const [min, max] = rangeOf(p); return (
            <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
              <td className="py-3"><Plate product={p} showSig={false} style={{ width: 46, height: 46, borderRadius: 3 }} /></td>
              <td style={{ fontFamily: HEAD }}>{p.name}</td><td className="text-neutral-600">{p.category}</td>
              <td className="text-neutral-600">{RATIOS[p.ratio].label}</td><td>{zar(min)} – {zar(max)}</td>
              <td><button onClick={onEdit} className="text-neutral-400 hover:text-black"><Pencil size={15} /></button></td>
            </tr>); })}</tbody>
        </table>
      </div>
    </div>
  );
}
function DemoOrders({ compact }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]" style={{ minWidth: 560 }}>
        {!compact && <thead><tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>{["ORDER", "DATE", "ITEMS", "TOTAL", "STATUS"].map((h) => <th key={h} className="py-3 font-normal">{h}</th>)}</tr></thead>}
        <tbody>{MOCK_ORDERS.map((o) => (
          <tr key={o.id} style={{ borderBottom: `1px solid ${C.line}` }}>
            <td className="py-3" style={{ fontFamily: HEAD }}>{o.id}</td><td className="text-neutral-600">{o.date}</td>
            <td className="text-neutral-600">{o.itemsSummary || o.items}</td><td>{zar(o.total)}</td><td><StatusBadge s={o.status} /></td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
function DemoCategories({ toast }) {
  const [cats, setCats] = useState(CATEGORY_NAMES); const [val, setVal] = useState("");
  return (
    <div className="max-w-[520px]">
      <h3 className="text-[15px] mb-4" style={{ fontFamily: HEAD }}>Photo categories</h3>
      {cats.map((c) => (<div key={c} className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.line}` }}><span className="text-[14px]">{c}</span><button onClick={() => { setCats(cats.filter((x) => x !== c)); toast("Category removed"); }} className="text-neutral-400 hover:text-red-500"><Trash2 size={15} /></button></div>))}
      <div className="flex gap-2 mt-4"><input value={val} onChange={(e) => setVal(e.target.value)} placeholder="New category" className="flex-1 py-2.5 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} /><Pill size="sm" onClick={() => { if (val) { setCats([...cats, val]); setVal(""); toast("Category added"); } }}>Add</Pill></div>
    </div>
  );
}

function DemoEditor({ toast }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [ratio, setRatio] = useState("landscape");
  const [colour, setColour] = useState("bw");
  const [desc, setDesc] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState({});
  const [enabledMats, setEnabledMats] = useState({ paper: true, paper_framed: true, canvas_rolled: true, canvas_framed: true, canvas_mounted: true });
  const [prices, setPrices] = useState({});
  const [rooms, setRooms] = useState({ lounge: true, bedroom: true, study: false, gallery: true });

  useEffect(() => {
    const es = {}; const pr = {};
    RATIOS[ratio].sizes.forEach((s) => { es[s] = true; PRICING[s].forEach((v, mi) => { pr[`${s}:${mi}`] = v; }); });
    setEnabledSizes(es); setPrices(pr);
  }, [ratio]);

  const onSizes = RATIOS[ratio].sizes.filter((s) => enabledSizes[s]);
  const onMats = MATERIALS.filter((m) => enabledMats[m.id]);
  const range = useMemo(() => {
    const vals = [];
    onSizes.forEach((s) => onMats.forEach((m) => { const v = Number(prices[`${s}:${m.i}`]); if (v) vals.push(v); }));
    return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 0];
  }, [onSizes, onMats, prices]);

  const preview = { grad: colour === "colour" || colour === "both" ? ["#7c5f36", "#d9c39a"] : ["#333", "#9a9a97"], angle: 120, name: name || "New Print", colour: colour === "both" ? "colour" : colour, ratio };
  const firstRoom = Object.keys(rooms).find((r) => rooms[r]) || "gallery";

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>1 · Upload the photograph</h3>
          <button onClick={() => { setUploaded(true); toast("Image uploaded"); }} className="w-full flex flex-col items-center justify-center py-12 rounded-lg" style={{ border: `2px dashed ${uploaded ? C.green : C.line}`, background: uploaded ? C.greenSoft : "#fafafa" }}>
            {uploaded ? <><Check size={26} color={C.green} /><span className="text-[14px] mt-2" style={{ fontFamily: HEAD }}>photograph.jpg uploaded</span><span className="text-[12px] text-neutral-500">Room mock-ups auto-generated for enabled scenes</span></>
              : <><Upload size={26} color={C.gray} /><span className="text-[14px] mt-2" style={{ fontFamily: HEAD }}>Drag & drop or click to upload</span><span className="text-[12px] text-neutral-500">High-res JPG/PNG · we handle resizing & watermarking</span></>}
          </button>
        </div>
        <div>
          <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>2 · Details</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Print name (e.g. Leopard — Colour)" className="w-full py-3 px-3 text-[14px] outline-none mb-3" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} />
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div className="relative"><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full appearance-none py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>{CATEGORY_NAMES.map((c) => <option key={c}>{c}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-3.5 pointer-events-none" /></div>
            <div className="relative"><select value={ratio} onChange={(e) => setRatio(e.target.value)} className="w-full appearance-none py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>{Object.entries(RATIOS).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-3.5 pointer-events-none" /></div>
          </div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={3} className="w-full py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} />
          <div className="flex flex-wrap gap-4 mt-3">{[["bw", "Black & White"], ["colour", "Colour"], ["both", "Both"]].map(([k, l]) => (<label key={k} className="flex items-center gap-2 text-[14px]"><input type="radio" checked={colour === k} onChange={() => setColour(k)} /> {l}</label>))}</div>
          {colour === "both" && <p className="text-[12px] text-neutral-500 mt-2">Shoppers can choose Black &amp; White or Colour — the same upload is shown with a B&amp;W filter when they pick mono.</p>}
        </div>
        <div>
          <h3 className="text-[15px] mb-1" style={{ fontFamily: HEAD }}>3 · Sizes & finishes — set a price for each</h3>
          <p className="text-[12px] text-neutral-500 mb-3">Prices are pre-filled from your price list — edit any cell.</p>
          <div className="flex gap-4 flex-wrap mb-3">{MATERIALS.map((m) => (<label key={m.id} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={enabledMats[m.id]} onChange={(e) => setEnabledMats({ ...enabledMats, [m.id]: e.target.checked })} /> {m.label}</label>))}</div>
          <div className="overflow-x-auto">
            <table className="text-[13px]" style={{ minWidth: 620 }}>
              <thead><tr className="text-neutral-500 text-[11px]"><th className="text-left font-normal py-2 pr-3">SIZE</th>{onMats.map((m) => <th key={m.id} className="font-normal py-2 px-2 text-center">{m.label.replace("Canvas — ", "Cv ").replace("Paper — ", "Pa ")}</th>)}</tr></thead>
              <tbody>{RATIOS[ratio].sizes.map((s) => (
                <tr key={s} style={{ borderTop: `1px solid ${C.line}`, opacity: enabledSizes[s] ? 1 : .45 }}>
                  <td className="py-2 pr-3"><label className="flex items-center gap-2"><input type="checkbox" checked={!!enabledSizes[s]} onChange={(e) => setEnabledSizes({ ...enabledSizes, [s]: e.target.checked })} /><span style={{ fontFamily: HEAD }}>{s}</span></label></td>
                  {onMats.map((m) => (<td key={m.id} className="py-1.5 px-2"><div className="flex items-center gap-0.5"><span className="text-[11px] text-neutral-400">R</span><input type="number" disabled={!enabledSizes[s]} value={prices[`${s}:${m.i}`] ?? ""} onChange={(e) => setPrices({ ...prices, [`${s}:${m.i}`]: e.target.value })} className="w-16 py-1 px-1 text-[12px] text-right outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 3 }} /></div></td>))}
                </tr>))}</tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>4 · Room previews to show</h3>
          <div className="flex gap-4 flex-wrap">{ROOMS.map((r) => (<label key={r.id} className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={!!rooms[r.id]} onChange={(e) => setRooms({ ...rooms, [r.id]: e.target.checked })} /> {r.label}</label>))}</div>
        </div>
        <Pill onClick={() => toast("Print saved & published")}>Save & publish print</Pill>
      </div>

      <div className="lg:sticky lg:top-24 h-fit">
        <h3 className="text-[13px] tracking-[.1em] mb-3 text-neutral-500" style={{ fontFamily: HEAD }}>LIVE CUSTOMER PREVIEW</h3>
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <div style={{ position: "relative", width: "100%", aspectRatio: "4/3" }}>
            <Scene room={firstRoom} />
            {(() => {
              const sz = onSizes[onSizes.length - 1] || RATIOS[ratio].sizes[0];
              const place = artPlacement(sz, firstRoom, ratio);
              return (
                <div style={{ position: "absolute", top: `${place.topPct}%`, left: `${place.leftPct}%`, transform: "translate(-50%,-50%)", width: `${place.widthPct}%` }}>
                  <div style={artworkStyle(onMats.find((m) => m.framed) ? "paper_framed" : "paper", "black")}><Plate product={preview} showSig={false} style={{ width: "100%", aspectRatio: RATIOS[ratio].ar }} /></div>
                </div>
              );
            })()}
          </div>
          <div className="p-4">
            <div className="text-[16px]" style={{ fontFamily: HEAD, color: C.green }}>{(name || "New Print").toUpperCase()}</div>
            <div className="text-[15px] mt-1" style={{ fontFamily: HEAD }}>{onSizes.length ? `${zar(range[0])} – ${zar(range[1])}` : "Enable a size"}</div>
            <div className="text-[12px] text-neutral-500 mt-2">{RATIOS[ratio].label} · {onSizes.length} sizes · {onMats.length} finishes · {Object.values(rooms).filter(Boolean).length} rooms</div>
          </div>
        </div>
        <p className="text-[12px] text-neutral-400 mt-3">Exactly what shoppers see. Price range updates live as you edit the grid.</p>
      </div>
    </div>
  );
}
