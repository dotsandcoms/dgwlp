"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Heart, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { C, HEAD } from "@/lib/pricing";
import { Reveal } from "./primitives";
import { Card } from "./home";
import { useToast } from "@/context/providers";

const PAGE_SIZE = 20;

function matchQuery(p, q) {
  if (!q.trim()) return true;
  const hay = `${p.name || ""} ${p.category || ""} ${p.desc || ""} ${p.sku || ""}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

export function ShopClient({ products, categories }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const initialCat = (() => {
    const q = searchParams.get("category");
    if (q && categories.includes(q)) return q;
    return "All";
  })();
  const initialQ = searchParams.get("q") || "";

  const [cat, setCat] = useState(initialCat);
  const [query, setQuery] = useState(initialQ);
  const [page, setPage] = useState(1);
  const [wish, setWish] = useState([]);

  useEffect(() => {
    const c = searchParams.get("category");
    setCat(c && categories.includes(c) ? c : "All");
    setQuery(searchParams.get("q") || "");
    setPage(1);
  }, [searchParams, categories]);

  useEffect(() => { try { const s = localStorage.getItem("dg_wish"); if (s) setWish(JSON.parse(s)); } catch {} }, []);

  const syncUrl = (nextCat, nextQ) => {
    const params = new URLSearchParams();
    if (nextCat && nextCat !== "All") params.set("category", nextCat);
    if (nextQ.trim()) params.set("q", nextQ.trim());
    const qs = params.toString();
    router.replace(qs ? `/shop?${qs}` : "/shop", { scroll: false });
  };

  const toggle = (id) => setWish((w) => {
    const n = w.includes(id) ? w.filter((x) => x !== id) : [...w, id];
    try { localStorage.setItem("dg_wish", JSON.stringify(n)); } catch {}
    toast(w.includes(id) ? "Removed from wishlist" : "Saved to wishlist");
    return n;
  });

  const filtered = useMemo(() => {
    return products.filter((p) => (cat === "All" || p.category === cat) && matchQuery(p, query));
  }, [products, cat, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const selectCat = (c) => { setCat(c); setPage(1); syncUrl(c, query); };
  const onSearch = (val) => { setQuery(val); setPage(1); };
  const commitSearch = () => syncUrl(cat, query);

  return (
    <div className="max-w-[1240px] mx-auto px-5 py-12">
      <h1 className="text-[38px] sm:text-[46px] mb-6" style={{ fontFamily: HEAD, fontWeight: 300 }}>SHOP</h1>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 px-3" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>
          <Search size={16} color={C.gray} />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && commitSearch()}
            onBlur={commitSearch}
            placeholder="Search prints…"
            className="flex-1 py-2.5 text-[14px] outline-none bg-transparent"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setPage(1); syncUrl(cat, ""); }} className="text-[12px] text-neutral-500">Clear</button>
          )}
        </div>
        <span className="text-[13px] text-neutral-500 shrink-0">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
          {pageCount > 1 ? ` · page ${safePage} of ${pageCount}` : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 14 }}>
        <div className="flex flex-wrap gap-2" style={{ fontFamily: HEAD, letterSpacing: ".04em" }}>
          {["All", ...categories].map((c) => (
            <button key={c} onClick={() => selectCat(c)} className="text-[13px] px-3 py-1.5 rounded-full" style={{ background: cat === c ? C.green : "transparent", color: cat === c ? "#fff" : C.gray, border: `1px solid ${cat === c ? C.green : C.line}` }}>{c}</button>
          ))}
        </div>
      </div>

      {pageItems.length === 0 ? (
        <p className="text-[14px] text-neutral-500 py-16 text-center">
          {query.trim() ? `No prints match “${query.trim()}”.` : "No prints in this category yet."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
            {pageItems.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 80}>
                <div className="relative">
                  <button onClick={() => toggle(p.id)} className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow" title="Wishlist">
                    <Heart size={16} color={wish.includes(p.id) ? "#c0392b" : C.gray} fill={wish.includes(p.id) ? "#c0392b" : "none"} />
                  </button>
                  <Card p={p} />
                </div>
              </Reveal>
            ))}
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 mt-14">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex items-center gap-1 text-[13px] px-3 py-2 rounded-full disabled:opacity-40"
                style={{ border: `1px solid ${C.line}`, fontFamily: HEAD }}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div className="flex flex-wrap justify-center gap-1">
                {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => { setPage(n); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="w-9 h-9 rounded-full text-[13px]"
                    style={{ background: n === safePage ? C.green : "transparent", color: n === safePage ? "#fff" : C.ink, border: `1px solid ${n === safePage ? C.green : C.line}`, fontFamily: HEAD }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={safePage >= pageCount}
                onClick={() => { setPage((p) => Math.min(pageCount, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="flex items-center gap-1 text-[13px] px-3 py-2 rounded-full disabled:opacity-40"
                style={{ border: `1px solid ${C.line}`, fontFamily: HEAD }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
