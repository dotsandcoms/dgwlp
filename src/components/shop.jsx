"use client";
import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Heart, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { C, HEAD } from "@/lib/pricing";
import { siteImage } from "@/lib/supabase";
import { Reveal } from "./primitives";
import { Card } from "./home";
import { useToast } from "@/context/providers";

const PAGE_SIZE = 20;

function matchQuery(p, q) {
  if (!q.trim()) return true;
  const hay = `${p.name || ""} ${p.category || ""} ${p.desc || ""} ${p.sku || ""}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}

/**
 * Expanding bush gallery — atmosphere after the print grid.
 */
function WildMoments() {
  const frames = [
    { src: siteImage("1.jpg"), label: "Canopy Light", n: "01" },
    { src: siteImage("2.jpg"), label: "Through the Leaves", n: "02" },
    { src: siteImage("3.jpg"), label: "Direct Gaze", n: "03" },
    { src: siteImage("4.jpg"), label: "Wild Quiet", n: "04" },
    { src: siteImage("5.jpg"), label: "First Light", n: "05" },
  ];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((i) => (i + 1) % frames.length), 4200);
    return () => clearInterval(t);
  }, [paused, frames.length]);

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: C.dark }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative max-w-[1240px] mx-auto px-5 pt-12 sm:pt-14 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[.28em] mb-2" style={{ fontFamily: HEAD, color: C.green }}>FROM THE BUSH</p>
          <h2 className="text-white text-[28px] sm:text-[40px] leading-none font-light" style={{ fontFamily: HEAD }}>
            Moments that hold still.
          </h2>
        </div>
        <Link href="/about" className="text-[13px] tracking-[.08em] text-white/70 hover:text-white" style={{ fontFamily: HEAD }}>
          THE STORY BEHIND THE LENS →
        </Link>
      </div>

      <div
        className="hidden sm:flex gap-1.5 px-2 sm:px-3 pb-3"
        style={{ height: "min(56vh, 560px)", minHeight: 320 }}
      >
        {frames.map((f, i) => {
          const on = i === active;
          return (
            <button
              key={f.n}
              type="button"
              aria-label={f.label}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className="relative overflow-hidden"
              style={{
                flex: on ? 3.4 : 0.85,
                transition: "flex .75s cubic-bezier(.2,.7,.2,1)",
                minWidth: 0,
                border: "none",
                padding: 0,
                cursor: "pointer",
                background: "#111",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${f.src})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  transform: on ? "scale(1.06)" : "scale(1.12)",
                  transition: "transform 4.2s ease-out",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background: on
                    ? "linear-gradient(180deg,rgba(20,20,18,.05) 30%,rgba(20,20,18,.72))"
                    : "linear-gradient(180deg,rgba(20,20,18,.25),rgba(20,20,18,.55))",
                  transition: "background .5s ease",
                }}
              />
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 text-left">
                <div className="text-white/50 text-[11px] tracking-[.2em] mb-1" style={{ fontFamily: HEAD }}>{f.n}</div>
                <div
                  className="text-white text-[15px] sm:text-[18px] leading-tight"
                  style={{
                    fontFamily: HEAD,
                    opacity: on ? 1 : 0.55,
                    transform: on ? "translateY(0)" : "translateY(6px)",
                    transition: "opacity .4s ease, transform .4s ease",
                  }}
                >
                  {f.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div
        className="sm:hidden flex gap-2 px-4 pb-4 overflow-x-auto snap-x snap-mandatory no-scrollbar"
        onTouchStart={() => setPaused(true)}
      >
        {frames.map((f, i) => (
          <button
            key={f.n}
            type="button"
            onClick={() => setActive(i)}
            className="relative shrink-0 snap-center overflow-hidden"
            style={{
              width: "82vw",
              height: "52vh",
              minHeight: 300,
              border: "none",
              padding: 0,
              background: "#111",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${f.src})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                transform: i === active ? "scale(1.04)" : "scale(1)",
                transition: "transform 3s ease",
              }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 40%,rgba(20,20,18,.75))" }} />
            <div className="absolute inset-x-0 bottom-0 p-5 text-left">
              <div className="text-white/50 text-[11px] tracking-[.2em] mb-1" style={{ fontFamily: HEAD }}>{f.n}</div>
              <div className="text-white text-[18px]" style={{ fontFamily: HEAD }}>{f.label}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center gap-2 pb-10 sm:pb-12">
        {frames.map((f, i) => (
          <button
            key={f.n}
            type="button"
            aria-label={`Show ${f.label}`}
            onClick={() => setActive(i)}
            style={{
              width: i === active ? 28 : 8,
              height: 8,
              borderRadius: 999,
              border: "none",
              background: i === active ? C.green : "rgba(255,255,255,.35)",
              transition: "all .3s ease",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </section>
  );
}

export function ShopClient({ products, categories }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const gridRef = useRef(null);

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

  const scrollToGrid = () => {
    gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectCat = (c) => {
    setCat(c);
    setPage(1);
    syncUrl(c, query);
    requestAnimationFrame(scrollToGrid);
  };
  const onSearch = (val) => { setQuery(val); setPage(1); };
  const commitSearch = () => syncUrl(cat, query);

  const goPage = (n) => {
    setPage(n);
    scrollToGrid();
  };

  const bannerByCategory = useMemo(() => {
    const map = {};
    for (const p of products) {
      const key = p.category || "Uncategorised";
      if (!map[key] && p.image) map[key] = p.image;
    }
    return map;
  }, [products]);

  const heroBg =
    (cat !== "All" && bannerByCategory[cat]) ||
    products.find((p) => p.image)?.image ||
    siteImage("elephant-plains.jpg");

  const catCount = cat === "All"
    ? products.length
    : products.filter((p) => p.category === cat).length;

  const heading = cat === "All" ? "The Collection" : cat;
  const sub =
    cat === "All"
      ? "Fine-art wildlife prints from the Kruger, Kgalagadi and Timbivati — choose your size, finish and frame."
      : `Browse ${cat.toLowerCase()} prints — each available in multiple sizes and finishes.`;

  return (
    <div>
      <section className="relative overflow-hidden" style={{ minHeight: 220 }}>
        <div
          key={heroBg}
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${heroBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            filter: "grayscale(1) contrast(1.05)",
            transform: "scale(1.04)",
            animation: "shopBannerIn .55s ease",
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
            key={heading}
            className="text-white text-[36px] sm:text-[52px] leading-[0.95] font-light mb-4"
            style={{ fontFamily: HEAD, animation: "shopTitleIn .4s ease" }}
          >
            {heading}
          </h1>
          <p className="text-white/75 text-[15px] sm:text-[17px] max-w-[520px] leading-relaxed" style={{ fontFamily: HEAD, fontWeight: 300 }}>
            {sub}
          </p>
          <p className="mt-5 text-[13px] text-white/55" style={{ fontFamily: HEAD }}>
            {catCount} print{catCount === 1 ? "" : "s"} available
          </p>
        </div>
        <style>{`
          @keyframes shopBannerIn {
            from { opacity: 0; transform: scale(1.08); }
            to { opacity: 1; transform: scale(1.04); }
          }
          @keyframes shopTitleIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </section>

      <div
        className="sticky top-[68px] z-20 backdrop-blur-md"
        style={{ background: "rgba(255,255,255,.92)", borderBottom: `1px solid ${C.line}` }}
      >
        <div className="max-w-[1240px] mx-auto px-5 py-3 sm:py-3.5 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2 px-3 bg-white" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>
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

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5" style={{ fontFamily: HEAD, letterSpacing: ".04em" }}>
            {["All", ...categories].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => selectCat(c)}
                className="text-[13px] px-3 py-1.5 rounded-full shrink-0 transition-colors"
                style={{
                  background: cat === c ? C.green : "transparent",
                  color: cat === c ? "#fff" : C.gray,
                  border: `1px solid ${cat === c ? C.green : C.line}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div ref={gridRef} className="max-w-[1240px] mx-auto px-5 pt-10 sm:pt-12 pb-16 sm:pb-20" style={{ scrollMarginTop: 140 }}>
        {pageItems.length === 0 ? (
          <p className="text-[14px] text-neutral-500 py-20 text-center">
            {query.trim() ? `No prints match “${query.trim()}”.` : "No prints in this category yet."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 sm:gap-x-7 gap-y-10 sm:gap-y-14">
              {pageItems.map((p, i) => (
                <Reveal key={p.id} delay={(i % 4) * 70}>
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => toggle(p.id)}
                      className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                      title="Wishlist"
                    >
                      <Heart size={16} color={wish.includes(p.id) ? "#c0392b" : C.gray} fill={wish.includes(p.id) ? "#c0392b" : "none"} />
                    </button>
                    <Card p={p} />
                  </div>
                </Reveal>
              ))}
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-center gap-3 mt-14 sm:mt-16">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => goPage(Math.max(1, safePage - 1))}
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
                      onClick={() => goPage(n)}
                      className="w-9 h-9 rounded-full text-[13px]"
                      style={{
                        background: n === safePage ? C.green : "transparent",
                        color: n === safePage ? "#fff" : C.ink,
                        border: `1px solid ${n === safePage ? C.green : C.line}`,
                        fontFamily: HEAD,
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={safePage >= pageCount}
                  onClick={() => goPage(Math.min(pageCount, safePage + 1))}
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

      <WildMoments />
    </div>
  );
}
