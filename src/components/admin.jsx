"use client";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ImageIcon, Upload, Package, Tag, Plus, Pencil, Trash2, Check, ChevronDown, ChevronLeft, ChevronRight, TrendingUp, CreditCard, Lock, Loader2, Search, Settings, Star, X } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { C, HEAD, zar, RATIOS, MATERIALS, PRICING, ROOMS, CATEGORY_NAMES, rangeOf, artPlacement, colourFromCategory } from "@/lib/pricing";
import { MOCK_PRODUCTS, MOCK_ORDERS, SALES } from "@/lib/mock";
import { hasSupabase, imageUrl } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import * as db from "@/lib/admin-data";
import { Plate, Scene, artworkStyle, Pill, StatusBadge } from "./primitives";
import { LiveSettings, DemoSettings } from "./admin-settings";
import { LiveFeatured, DemoFeatured } from "./admin-featured";
import { LiveOrders } from "./admin-orders";
import { NotFoundView } from "./not-found";
import { useToast, useAuth, useAuthModal } from "@/context/providers";
import { adminPath } from "@/lib/admin-path";

export function AdminApp() {
  // Never expose the demo admin console in production.
  if (hasSupabase) return <LiveAdminGate />;
  if (process.env.NODE_ENV === "production") {
    return <NotFoundView />;
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
  const [localAdmin, setLocalAdmin] = useState(null); // null = checking

  // Re-verify on this page — don't rely only on the header context flag
  useEffect(() => {
    let cancelled = false;
    if (!sessionUser) {
      setLocalAdmin(false);
      return undefined;
    }
    // Keep prior OK state while re-checking so the console doesn't remount / wipe forms
    setLocalAdmin((prev) => (prev === true ? true : null));
    db.checkIsAdmin()
      .then((ok) => { if (!cancelled) setLocalAdmin(ok); })
      .catch(() => { if (!cancelled) setLocalAdmin(false); });
    return () => { cancelled = true; };
  }, [sessionUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!adminReady || (sessionUser && localAdmin === null)) {
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
  const allowed = localAdmin === true || isAdmin === true;
  if (!allowed) {
    return (
      <div className="max-w-[560px] mx-auto px-5 py-24 text-center">
        <Lock size={26} color={C.gray} className="mx-auto mb-4" />
        <h1 className="text-[22px] mb-2" style={{ fontFamily: HEAD }}>Not authorized</h1>
        <p className="text-[14px] text-neutral-600 mb-4">This account does not have access to the store console.</p>
        <p className="text-[12px] text-neutral-400 mb-6">Signed in as {sessionUser.email}. Run <code style={{ fontFamily: "monospace" }}>fix_admin_access.sql</code> in Supabase if this is wrong.</p>
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

  const nav = [["dashboard", "Dashboard", LayoutDashboard], ["products", "Products", ImageIcon], ["featured", "Featured", Star], ["editor", "Add / edit print", Upload], ["orders", "Orders", Package], ["categories", "Categories", Tag], ["settings", "Settings", Settings]];
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
        {view === "dashboard" && <LiveDash products={products} orders={orders} onChanged={reloadOrders} toast={toast} />}
        {view === "products" && <LiveProducts products={products} categories={categories} onEdit={openEditor} onDeleted={reloadProducts} toast={toast} />}
        {view === "featured" && <LiveFeatured products={products} toast={toast} />}
        {view === "editor" && <LiveEditor editingId={editingId} categories={categories} toast={toast} onSaved={() => { reloadProducts(); setView("products"); }} />}
        {view === "orders" && <LiveOrders orders={orders} onChanged={reloadOrders} toast={toast} />}
        {view === "categories" && <LiveCategories categories={categories} onChanged={reloadCategories} toast={toast} />}
        {view === "settings" && <LiveSettings toast={toast} />}
      </>)}
    </div>
  );
}

function LiveDash({ products, orders, onChanged, toast }) {
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
        <LiveOrders orders={orders.slice(0, 6)} compact onChanged={onChanged} toast={toast} />
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
  const [selected, setSelected] = useState(() => new Set());
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);

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
  const pageIds = pageItems.map((p) => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const selectedCount = selected.size;

  useEffect(() => { setPage(1); }, [query, cat]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(products.map((p) => p.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [products]);

  // One-time per browser session: align DB colour with category
  useEffect(() => {
    let cancelled = false;
    try {
      if (sessionStorage.getItem("dg_colour_synced_v1")) return undefined;
    } catch {}
    db.bulkSyncPrintColours()
      .then(({ colour, bw }) => {
        if (cancelled) return;
        try { sessionStorage.setItem("dg_colour_synced_v1", "1"); } catch {}
        toast(`Print colours synced · ${colour} colour · ${bw} black & white`);
        onDeleted();
      })
      .catch((e) => {
        if (!cancelled) toast(friendlyError(e, "Could not sync print colours"));
      });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const selectFiltered = () => {
    setSelected(new Set(filtered.map((p) => p.id)));
  };

  const clearSelection = () => setSelected(new Set());

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    setBusyId(p.id);
    try { await db.deleteProduct(p.id); toast("Print deleted"); onDeleted(); } catch (e) { toast(friendlyError(e, "Delete failed")); } finally { setBusyId(null); }
  };

  const moveSelected = async () => {
    if (!selectedCount) return toast("Select at least one print");
    if (!bulkCategoryId) return toast("Choose a category");
    const dest = categories.find((c) => c.id === bulkCategoryId);
    if (!window.confirm(`Move ${selectedCount} print${selectedCount === 1 ? "" : "s"} to “${dest?.name || "category"}”?`)) return;
    setBulkBusy(true);
    try {
      const n = await db.bulkUpdateProductCategory([...selected], bulkCategoryId);
      toast(`Moved ${n} print${n === 1 ? "" : "s"} to ${dest?.name || "category"}`);
      clearSelection();
      setBulkCategoryId("");
      onDeleted();
    } catch (e) {
      toast(friendlyError(e, "Bulk move failed"));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <span className="text-[14px] text-neutral-500">
          {filtered.length} of {products.length} prints
          {pageCount > 1 ? ` · page ${safePage}/${pageCount}` : ""}
          {selectedCount > 0 ? ` · ${selectedCount} selected` : ""}
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

      {selectedCount > 0 && (
        <div
          className="flex flex-col sm:flex-row sm:items-center gap-3 mb-5 p-3 rounded-lg"
          style={{ background: C.greenSoft, border: `1px solid ${C.line}` }}
        >
          <span className="text-[13px] shrink-0" style={{ fontFamily: HEAD }}>
            {selectedCount} selected
          </span>
          <div className="relative flex-1 min-w-[180px]">
            <select
              value={bulkCategoryId}
              onChange={(e) => setBulkCategoryId(e.target.value)}
              className="w-full appearance-none py-2 pl-3 pr-9 text-[14px] outline-none bg-white"
              style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}
            >
              <option value="">Move to category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={15} className="absolute right-3 top-2.5 pointer-events-none text-neutral-400" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Pill size="sm" onClick={moveSelected} disabled={bulkBusy || !bulkCategoryId}>
              {bulkBusy ? <Loader2 size={14} className="animate-spin" /> : "Move"}
            </Pill>
            {filtered.length > pageIds.length && selectedCount < filtered.length && (
              <button type="button" onClick={selectFiltered} className="text-[12px] text-neutral-600 hover:opacity-70">
                Select all {filtered.length} matching
              </button>
            )}
            <button type="button" onClick={clearSelection} className="text-[12px] text-neutral-500 hover:opacity-70">
              Clear
            </button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-[14px] text-neutral-500 py-8 text-center">No prints yet — add your first one.</p>
      ) : pageItems.length === 0 ? (
        <p className="text-[14px] text-neutral-500 py-8 text-center">No prints match your search or filter.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]" style={{ minWidth: 740 }}>
              <thead>
                <tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>
                  <th className="py-3 font-normal w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected; }}
                      onChange={togglePage}
                      aria-label="Select all on this page"
                    />
                  </th>
                  {["", "NAME", "CATEGORY", "RATIO", "PRICE RANGE", "STATUS", ""].map((h, k) => (
                    <th key={k} className="py-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}`, background: selected.has(p.id) ? `${C.green}0d` : undefined }}>
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleOne(p.id)}
                        aria-label={`Select ${p.name}`}
                      />
                    </td>
                    <td className="py-3">
                      <Plate
                        product={{ image: imageUrl(p.hero_image), colour: "colour", name: p.name, grad: ["#333", "#9a9a97"], angle: 120 }}
                        printColour="colour"
                        showSig={false}
                        style={{ width: 46, height: 46, borderRadius: 3 }}
                      />
                    </td>
                    <td style={{ fontFamily: HEAD }}>{p.name}</td>
                    <td className="text-neutral-600">{p.category_name}</td>
                    <td className="text-neutral-600">{RATIOS[p.ratio_id]?.label || p.ratio_id}</td>
                    <td>{p.min_cents ? `${zar(p.min_cents / 100)} – ${zar(p.max_cents / 100)}` : "No prices set"}</td>
                    <td>
                      <span
                        className="text-[11px] px-2 py-1 rounded-full"
                        style={{ background: p.is_published ? `${C.green}18` : "#f2f2f0", color: p.is_published ? C.green : C.gray, fontFamily: HEAD }}
                      >
                        {p.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap">
                      <button onClick={() => onEdit(p.id)} className="text-neutral-400 hover:text-black mr-3"><Pencil size={15} /></button>
                      <button onClick={() => remove(p)} disabled={busyId === p.id} className="text-neutral-400 hover:text-red-500">
                        {busyId === p.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
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

function LiveCategories({ categories, onChanged, toast }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [savingId, setSavingId] = useState(null);

  const add = async () => {
    if (!val.trim()) return;
    setBusy(true);
    try { await db.createCategory(val.trim()); setVal(""); toast("Category added"); onChanged(); } catch (e) { toast(friendlyError(e, "Failed to add category")); } finally { setBusy(false); }
  };
  const startEdit = (c) => {
    setEditingId(c.id);
    setEditVal(c.name);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditVal("");
  };
  const saveEdit = async (c) => {
    const next = editVal.trim();
    if (!next) return toast("Enter a category name");
    if (next === c.name) { cancelEdit(); return; }
    setSavingId(c.id);
    try {
      await db.updateCategory(c.id, next);
      toast("Category updated");
      cancelEdit();
      onChanged();
    } catch (e) {
      toast(friendlyError(e, "Failed to update category"));
    } finally {
      setSavingId(null);
    }
  };
  const remove = async (c) => {
    try { await db.deleteCategory(c.id); toast("Category removed"); onChanged(); } catch (e) { toast(friendlyError(e, "Failed to remove category")); }
  };
  return (
    <div className="max-w-[520px]">
      <h3 className="text-[15px] mb-4" style={{ fontFamily: HEAD }}>Photo categories</h3>
      {categories.length === 0 && <p className="text-[13px] text-neutral-500 mb-3">No categories yet.</p>}
      {categories.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
          {editingId === c.id ? (
            <input
              autoFocus
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveEdit(c);
                if (e.key === "Escape") cancelEdit();
              }}
              className="flex-1 py-1.5 px-2 text-[14px] outline-none"
              style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}
            />
          ) : (
            <span className="text-[14px] flex-1 min-w-0">{c.name}</span>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {editingId === c.id ? (
              <>
                <button
                  type="button"
                  onClick={() => saveEdit(c)}
                  disabled={savingId === c.id}
                  className="text-neutral-500 hover:text-olive p-1"
                  title="Save"
                  aria-label="Save category"
                >
                  {savingId === c.id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-neutral-400 hover:text-neutral-600 p-1"
                  title="Cancel"
                  aria-label="Cancel edit"
                >
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="text-neutral-400 hover:text-olive p-1"
                  title="Edit"
                  aria-label={`Edit ${c.name}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => remove(c)}
                  className="text-neutral-400 hover:text-red-500 p-1"
                  title="Delete"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-4">
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New category" className="flex-1 py-2.5 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} />
        <Pill size="sm" onClick={add} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : "Add"}</Pill>
      </div>
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
  const [colour, setColour] = useState("colour");
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

  // Print colour follows category — only Black & White is mono
  useEffect(() => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) setColour(colourFromCategory(cat.name));
  }, [categoryId, categories]);

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
  const preview = { image: previewImage, grad: colour === "colour" ? ["#7c5f36", "#d9c39a"] : ["#333", "#9a9a97"], angle: 120, name: name || "New Print", colour, ratio };
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
          <div className="mt-3 text-[14px] text-neutral-600">
            Print colour: <span style={{ fontFamily: HEAD, color: C.ink }}>{colour === "bw" ? "Black & White" : "Colour"}</span>
            <span className="block text-[12px] text-neutral-500 mt-1">Set by category — only “Black & White” prints are mono.</span>
          </div>
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
  const nav = [["dashboard", "Dashboard", LayoutDashboard], ["products", "Products", ImageIcon], ["featured", "Featured", Star], ["editor", "Add / edit print", Upload], ["orders", "Orders", Package], ["categories", "Categories", Tag], ["settings", "Settings", Settings]];
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
      {view === "featured" && <DemoFeatured toast={toast} />}
      {view === "editor" && <DemoEditor toast={toast} />}
      {view === "orders" && <DemoOrders toast={toast} />}
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
      <div className="p-5 rounded-lg" style={{ border: `1px solid ${C.line}` }}><h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>Recent orders</h3><DemoOrders compact toast={toast} /></div>
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
function DemoOrders({ compact, toast }) {
  const [rows, setRows] = useState(MOCK_ORDERS);
  const [selected, setSelected] = useState(null);
  const [status, setStatus] = useState("pending");
  const [tracking, setTracking] = useState("");

  const open = (o) => {
    setSelected(o);
    setStatus(String(o.status || "Processing").toLowerCase());
    setTracking(o.tracking || "");
  };

  const save = () => {
    if (!selected) return;
    setRows((prev) => prev.map((o) => (
      o.id === selected.id
        ? { ...o, status: status[0].toUpperCase() + status.slice(1), tracking: tracking || null }
        : o
    )));
    toast?.(`Order ${selected.id} updated (demo)`);
    setSelected(null);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]" style={{ minWidth: 560 }}>
          {!compact && (
            <thead>
              <tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>
                {["ORDER", "DATE", "ITEMS", "TOTAL", "STATUS", ""].map((h) => <th key={h || "x"} className="py-3 font-normal">{h}</th>)}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((o) => (
              <tr
                key={o.id}
                onClick={() => open(o)}
                className="cursor-pointer hover:bg-black/[0.02]"
                style={{ borderBottom: `1px solid ${C.line}` }}
              >
                <td className="py-3" style={{ fontFamily: HEAD }}>{o.id}</td>
                <td className="text-neutral-600">{o.date}</td>
                <td className="text-neutral-600">{o.itemCount || o.lines?.length || 1} item{(o.itemCount || o.lines?.length || 1) === 1 ? "" : "s"}</td>
                <td>{zar(o.total)}</td>
                <td><StatusBadge s={o.status} /></td>
                {!compact && <td className="text-right text-neutral-400"><ChevronRight size={16} className="inline-block" /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true">
          <div className="absolute inset-0" style={{ background: "rgba(20,20,18,.55)" }} onClick={() => setSelected(null)} />
          <div className="relative w-full sm:max-w-[640px] max-h-[92vh] bg-white flex flex-col overflow-hidden sm:rounded-2xl rounded-t-2xl" style={{ boxShadow: "0 24px 80px rgba(0,0,0,.28)" }}>
            <div className="px-6 pt-5 pb-4 flex justify-between" style={{ borderBottom: `1px solid ${C.line}`, background: `linear-gradient(180deg, ${C.greenSoft}, #fff 88%)` }}>
              <div>
                <p className="text-[11px] tracking-[.2em] mb-1" style={{ fontFamily: HEAD, color: C.green }}>ORDER DETAIL</p>
                <h2 className="text-[26px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>{selected.id}</h2>
                <p className="text-[13px] text-neutral-500 mt-2">{selected.date} · {selected.itemCount || selected.lines?.length || 0} items</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div className="p-4 space-y-3" style={{ background: "#faf9f6", borderRadius: 8 }}>
                <label className="block">
                  <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>STATUS</span>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full py-2.5 px-3 text-[14px] outline-none bg-white" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>
                    {["pending", "paid", "shipped", "delivered", "cancelled", "refunded"].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-[11px] tracking-[.08em] text-neutral-500 mb-1.5" style={{ fontFamily: HEAD }}>TRACKING</span>
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)} className="w-full py-2.5 px-3 text-[14px] outline-none bg-white" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} placeholder="Tracking number" />
                </label>
              </div>
              <div className="space-y-3">
                {(selected.lines || []).map((line, i) => (
                  <div key={i} className="flex gap-3 p-3" style={{ background: "#faf9f6", borderRadius: 6 }}>
                    <Plate product={line} showSig={false} style={{ width: 64, height: 64, borderRadius: 4, flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px]" style={{ fontFamily: HEAD }}>{line.name}</div>
                      <div className="text-[12px] text-neutral-500">{line.summary}</div>
                    </div>
                    <div style={{ fontFamily: HEAD }}>{zar(line.price * (line.qty || 1))}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-4 flex justify-between" style={{ borderTop: `1px solid ${C.line}` }}>
              <button type="button" onClick={() => setSelected(null)} className="text-[13px] text-neutral-500">Close</button>
              <Pill onClick={save}>Save changes</Pill>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
function DemoCategories({ toast }) {
  const [cats, setCats] = useState(CATEGORY_NAMES);
  const [val, setVal] = useState("");
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  return (
    <div className="max-w-[520px]">
      <h3 className="text-[15px] mb-4" style={{ fontFamily: HEAD }}>Photo categories</h3>
      {cats.map((c) => (
        <div key={c} className="flex items-center justify-between gap-3 py-3" style={{ borderBottom: `1px solid ${C.line}` }}>
          {editing === c ? (
            <input
              autoFocus
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && editVal.trim()) {
                  setCats(cats.map((x) => (x === c ? editVal.trim() : x)));
                  setEditing(null);
                  toast("Category updated");
                }
                if (e.key === "Escape") setEditing(null);
              }}
              className="flex-1 py-1.5 px-2 text-[14px] outline-none"
              style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}
            />
          ) : (
            <span className="text-[14px] flex-1 min-w-0">{c}</span>
          )}
          <div className="flex items-center gap-1.5 shrink-0">
            {editing === c ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (!editVal.trim()) return;
                    setCats(cats.map((x) => (x === c ? editVal.trim() : x)));
                    setEditing(null);
                    toast("Category updated");
                  }}
                  className="text-neutral-500 hover:text-olive p-1"
                  title="Save"
                >
                  <Check size={15} />
                </button>
                <button type="button" onClick={() => setEditing(null)} className="text-neutral-400 hover:text-neutral-600 p-1" title="Cancel">
                  <X size={15} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setEditing(c); setEditVal(c); }}
                  className="text-neutral-400 hover:text-olive p-1"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => { setCats(cats.filter((x) => x !== c)); toast("Category removed"); }}
                  className="text-neutral-400 hover:text-red-500 p-1"
                  title="Delete"
                >
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-4">
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="New category" className="flex-1 py-2.5 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} />
        <Pill size="sm" onClick={() => { if (val) { setCats([...cats, val]); setVal(""); toast("Category added"); } }}>Add</Pill>
      </div>
    </div>
  );
}

function DemoEditor({ toast }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [ratio, setRatio] = useState("landscape");
  const [colour, setColour] = useState(() => colourFromCategory(CATEGORY_NAMES[0]));
  const [desc, setDesc] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState({});
  const [enabledMats, setEnabledMats] = useState({ paper: true, paper_framed: true, canvas_rolled: true, canvas_framed: true, canvas_mounted: true });
  const [prices, setPrices] = useState({});
  const [rooms, setRooms] = useState({ lounge: true, bedroom: true, study: false, gallery: true });

  useEffect(() => {
    setColour(colourFromCategory(category));
  }, [category]);

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

  const preview = { grad: colour === "colour" ? ["#7c5f36", "#d9c39a"] : ["#333", "#9a9a97"], angle: 120, name: name || "New Print", colour, ratio };
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
          <div className="mt-3 text-[14px] text-neutral-600">
            Print colour: <span style={{ fontFamily: HEAD, color: C.ink }}>{colour === "bw" ? "Black & White" : "Colour"}</span>
            <span className="block text-[12px] text-neutral-500 mt-1">Set by category — only “Black & White” prints are mono.</span>
          </div>
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
