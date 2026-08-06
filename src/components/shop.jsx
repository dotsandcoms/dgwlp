"use client";
import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { C, HEAD } from "@/lib/pricing";
import { Reveal } from "./primitives";
import { Card } from "./home";
import { useToast } from "@/context/providers";

export function ShopClient({ products, categories }) {
  const [cat, setCat] = useState("All");
  const [wish, setWish] = useState([]);
  const { toast } = useToast();
  useEffect(() => { try { const s = localStorage.getItem("dg_wish"); if (s) setWish(JSON.parse(s)); } catch {} }, []);
  const toggle = (id) => setWish((w) => { const n = w.includes(id) ? w.filter((x) => x !== id) : [...w, id]; try { localStorage.setItem("dg_wish", JSON.stringify(n)); } catch {} toast(w.includes(id) ? "Removed from wishlist" : "Saved to wishlist"); return n; });
  const list = cat === "All" ? products : products.filter((p) => p.category === cat);
  return (
    <div className="max-w-[1240px] mx-auto px-5 py-12">
      <h1 className="text-[38px] sm:text-[46px] mb-2" style={{ fontFamily: HEAD, fontWeight: 300 }}>SHOP</h1>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8" style={{ borderBottom: `1px solid ${C.line}`, paddingBottom: 14 }}>
        <div className="flex flex-wrap gap-2" style={{ fontFamily: HEAD, letterSpacing: ".04em" }}>
          {["All", ...categories].map((c) => (
            <button key={c} onClick={() => setCat(c)} className="text-[13px] px-3 py-1.5 rounded-full" style={{ background: cat === c ? C.green : "transparent", color: cat === c ? "#fff" : C.gray, border: `1px solid ${cat === c ? C.green : C.line}` }}>{c}</button>
          ))}
        </div>
        <span className="text-[13px] text-neutral-500">Showing {list.length} results</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
        {list.map((p, i) => (
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
    </div>
  );
}
