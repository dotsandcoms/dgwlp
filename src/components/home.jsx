"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { C, HEAD, zar, rangeOf } from "@/lib/pricing";
import { siteImage } from "@/lib/supabase";
import { Plate, Parallax, Reveal, Pill } from "./primitives";

export function Card({ p }) {
  const [min, max] = rangeOf(p);
  return (
    <div className="group text-center">
      <Link href={`/product/${p.slug}`} className="block w-full overflow-hidden">
        <Plate product={p} style={{ width: "100%", aspectRatio: "1/1", transition: "transform .6s" }} className="group-hover:scale-[1.05]" />
      </Link>
      <div className="mt-4 text-[16px]" style={{ fontFamily: HEAD }}>{p.name}</div>
      <div className="text-[14px] text-neutral-600 mt-1">{zar(min)} – {zar(max)}</div>
      <div className="mt-3"><Link href={`/product/${p.slug}`}><Pill variant="outline" size="sm">Select options</Pill></Link></div>
    </div>
  );
}

/** Full-bleed category panel — image fills the tile, label sits on the photo. */
function CollectionPanel({ p, delay = 0 }) {
  const category = p.category || "Uncategorised";
  const href = `/shop?category=${encodeURIComponent(category)}`;
  return (
    <Reveal delay={delay} className="min-w-0">
      <Link href={href} className="group relative block overflow-hidden" style={{ aspectRatio: "3/4" }}>
        <Plate
          product={p}
          showSig={false}
          style={{ width: "100%", height: "100%", transition: "transform .7s cubic-bezier(.2,.7,.2,1)" }}
          className="group-hover:scale-[1.06]"
        />
        <div
          className="absolute inset-0 flex flex-col justify-end p-4 sm:p-5"
          style={{ background: "linear-gradient(180deg,transparent 35%,rgba(20,20,18,.78))" }}
        >
          <span className="text-white text-[14px] sm:text-[16px] leading-tight" style={{ fontFamily: HEAD }}>{category}</span>
          <span className="text-white/70 text-[11px] tracking-[.14em] mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: HEAD }}>
            VIEW COLLECTION →
          </span>
        </div>
      </Link>
    </Reveal>
  );
}

function Slideshow({ slides }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [paused, slides.length]);
  const go = (n) => setI((n + slides.length) % slides.length);
  const arrow = { position: "absolute", top: "50%", transform: "translateY(-50%)", zIndex: 10, width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: C.green, color: "#fff", border: "none", cursor: "pointer" };
  return (
    <section className="relative w-full overflow-hidden" style={{ height: "78vh", minHeight: 440, background: "#101010" }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {slides.map((s, k) => (
        <div key={k} className="absolute inset-0" style={{ opacity: k === i ? 1 : 0, transition: "opacity 1.1s ease", pointerEvents: k === i ? "auto" : "none" }}>
          <div className="absolute inset-0" style={{ backgroundImage: `url(${s.image})`, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(1) contrast(1.03)", transform: k === i ? "scale(1.06)" : "scale(1)", transition: "transform 7s ease" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,rgba(0,0,0,.6),rgba(0,0,0,.15) 55%,rgba(0,0,0,.5))" }} />
          <div className="relative h-full max-w-[1240px] mx-auto px-8 sm:px-14 flex flex-col justify-center">
            <p className="tracking-[.3em] text-[12px] sm:text-[13px] mb-3" style={{ fontFamily: HEAD, color: C.green }}>{s.tag}</p>
            <h3 className="text-white text-[30px] sm:text-[52px] leading-[1.02] font-light mb-6" style={{ fontFamily: HEAD, maxWidth: 560 }}>{s.cap}</h3>
            <div><Link href="/shop"><Pill>Explore the collection →</Pill></Link></div>
          </div>
        </div>
      ))}
      <button aria-label="Previous" onClick={() => go(i - 1)} style={{ ...arrow, left: 0 }}><ChevronLeft size={22} /></button>
      <button aria-label="Next" onClick={() => go(i + 1)} style={{ ...arrow, right: 0 }}><ChevronRight size={22} /></button>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {slides.map((_, k) => (
          <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)}
            style={{ width: k === i ? 26 : 8, height: 8, borderRadius: 999, background: k === i ? C.green : "rgba(255,255,255,.65)", border: "none", cursor: "pointer", transition: "all .3s" }} />
        ))}
      </div>
    </section>
  );
}

function onePerCategory(products) {
  const seen = new Set();
  const out = [];
  for (const p of products) {
    const key = p.category || "Uncategorised";
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

export function Home({ products }) {
  const heroP = { image: siteImage("hero.jpg"), colour: "bw", name: "Wildebeest at Dawn" };
  const featured = onePerCategory(products);
  const panels = [
    { image: siteImage("elephant-plains.jpg"), name: "Lone Bull", slug: "lone-bull", tag: "ELEPHANTS", cap: "A lone bull on the endless plains" },
    { image: siteImage("wildebeest-herd.jpg"), name: "Wildebeest Herd", slug: "wildebeest-herd", tag: "PLAINS GAME", cap: "The herd moves as one" },
    { image: siteImage("elephant-herd.jpg"), name: "Elephant Herd", slug: "elephant-herd", tag: "THE KRUGER", cap: "Strength in numbers" },
  ];

  return (
    <div>
      <section className="relative overflow-hidden" style={{ height: "calc(100dvh - 68px)", minHeight: 520 }}>
        <Parallax speed={0.3} className="absolute inset-0" style={{ top: "-12%", height: "124%" }}>
          <Plate product={heroP} showSig={false} style={{ width: "100%", height: "100%" }} />
        </Parallax>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: "linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.5))" }}>
          <Reveal><p className="text-white/90 tracking-[.28em] text-[12px] sm:text-[15px] mb-4" style={{ fontFamily: HEAD }}>FOR THE LOVE OF WILDLIFE</p></Reveal>
          <Reveal delay={120}><h1 className="text-white text-[42px] sm:text-[76px] leading-[.95] font-light" style={{ fontFamily: HEAD, letterSpacing: ".02em" }}>DORON<br />GOLDSTEIN</h1></Reveal>
          <Reveal delay={240}><div className="flex items-center gap-4 my-6"><span style={{ width: 60, height: 1, background: C.green }} /><span className="text-[13px] sm:text-[17px] tracking-[.25em]" style={{ fontFamily: HEAD, color: C.green }}>WILDLIFE PHOTOGRAPHY</span><span style={{ width: 60, height: 1, background: C.green }} /></div></Reveal>
          <Reveal delay={360}><Link href="/shop"><Pill>View the Collection →</Pill></Link></Reveal>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce" style={{ pointerEvents: "none" }}>
          <span className="text-white/80 text-[11px] tracking-[.25em]" style={{ fontFamily: HEAD }}>SCROLL</span>
          <ChevronDown size={20} color="rgba(255,255,255,.8)" />
        </div>
      </section>

      <section style={{ background: `linear-gradient(180deg, #f4f2ed 0%, #fff 55%)` }}>
        <div className="max-w-[1240px] mx-auto px-5 pt-10 sm:pt-12 pb-12 sm:pb-16">
          <Reveal>
            <p className="text-center text-[15px] sm:text-[18px] leading-relaxed text-neutral-700 max-w-[640px] mx-auto mb-8 sm:mb-10" style={{ fontFamily: HEAD, fontWeight: 300 }}>
              Over sixty years behind the lens in the Kruger, Kgalagadi and Timbivati — every frame a window into the animal world, printed to last a lifetime.
            </p>
          </Reveal>

          <div className="flex flex-wrap items-end justify-between gap-3 mb-5 sm:mb-6">
            <Reveal>
              <div>
                <p className="text-[11px] tracking-[.22em] mb-1.5" style={{ fontFamily: HEAD, color: C.green }}>THE COLLECTION</p>
                <h2 className="text-[26px] sm:text-[34px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>Browse by category</h2>
              </div>
            </Reveal>
            <Reveal delay={60}>
              <Link href="/shop"><Pill variant="outline" size="sm">VIEW ALL</Pill></Link>
            </Reveal>
          </div>

          {featured.length === 0 ? (
            <p className="text-[14px] text-neutral-500 text-center py-8">New prints are on their way — check back soon.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {featured.map((p, i) => <CollectionPanel key={p.id} p={p} delay={i * 70} />)}
            </div>
          )}
        </div>
      </section>

      <Slideshow slides={panels} />
    </div>
  );
}
