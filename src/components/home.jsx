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
  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "min(78vh, 720px)", minHeight: 420, background: "#101010" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, k) => (
        <div key={k} className="absolute inset-0" style={{ opacity: k === i ? 1 : 0, transition: "opacity 1.1s ease", pointerEvents: k === i ? "auto" : "none" }}>
          <div className="absolute inset-0" style={{ backgroundImage: `url(${s.image})`, backgroundSize: "cover", backgroundPosition: "center", filter: "grayscale(1) contrast(1.03)", transform: k === i ? "scale(1.04)" : "scale(1)", transition: "transform 7s ease" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,.25) 45%,rgba(0,0,0,.65) 100%)" }} />
          <div className="relative h-full max-w-[1240px] mx-auto px-5 sm:px-14 flex flex-col justify-end sm:justify-center pb-24 sm:pb-0">
            <p
              className="tracking-[.22em] sm:tracking-[.3em] text-[11px] sm:text-[13px] mb-2 sm:mb-3 text-white/90"
              style={{ fontFamily: HEAD, textShadow: "0 1px 12px rgba(0,0,0,.55)" }}
            >
              {s.tag}
            </p>
            <h3 className="text-white text-[26px] sm:text-[52px] leading-[1.05] font-light mb-5 sm:mb-6 pr-2" style={{ fontFamily: HEAD, maxWidth: 560 }}>
              {s.cap}
            </h3>
            <div className="w-full max-w-[280px] sm:max-w-none">
              <Link href="/shop"><Pill style={{ width: "100%", maxWidth: 280 }}>Explore the collection →</Pill></Link>
            </div>
          </div>
        </div>
      ))}
      {/* Desktop side arrows */}
      <button
        type="button"
        aria-label="Previous"
        onClick={() => go(i - 1)}
        className="hidden sm:flex absolute top-1/2 -translate-y-1/2 left-0 z-10 w-11 h-11 items-center justify-center"
        style={{ background: C.green, color: "#fff" }}
      >
        <ChevronLeft size={22} />
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => go(i + 1)}
        className="hidden sm:flex absolute top-1/2 -translate-y-1/2 right-0 z-10 w-11 h-11 items-center justify-center"
        style={{ background: C.green, color: "#fff" }}
      >
        <ChevronRight size={22} />
      </button>
      {/* Mobile: arrows + dots sit below the copy */}
      <div className="absolute bottom-5 left-0 right-0 z-10 flex items-center justify-center gap-4 px-5 sm:bottom-6">
        <button
          type="button"
          aria-label="Previous"
          onClick={() => go(i - 1)}
          className="sm:hidden w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.35)" }}
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-2">
          {slides.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Slide ${k + 1}`}
              onClick={() => setI(k)}
              style={{ width: k === i ? 26 : 8, height: 8, borderRadius: 999, background: k === i ? C.green : "rgba(255,255,255,.65)", border: "none", cursor: "pointer", transition: "all .3s" }}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next"
          onClick={() => go(i + 1)}
          className="sm:hidden w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,.18)", color: "#fff", border: "1px solid rgba(255,255,255,.35)" }}
        >
          <ChevronRight size={18} />
        </button>
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

const TRUST_LINES = [
  "Signed, limited-edition prints",
  "Archival paper & canvas",
  "Shipped nationwide",
];

const HOW_STEPS = [
  { n: "01", title: "Choose your print", body: "Browse the collection and find the frame that belongs on your wall." },
  { n: "02", title: "Size & finish", body: "Select paper or canvas, framing, and colour or black & white where offered." },
  { n: "03", title: "Delivered to you", body: "Archival production and careful packing — couriered across South Africa." },
];

export function Home({ products, featured = [] }) {
  const heroP = { image: siteImage("hero.jpg"), colour: "bw", name: "Wildebeest at Dawn" };
  const aboutP = { image: siteImage("about.jpg"), colour: "colour", name: "Doron Goldstein", grad: ["#2f2f2d", "#a9a49b"], angle: 120 };
  const categories = onePerCategory(products);
  const featuredPrints = (featured?.length ? featured : products.slice(0, 6)).slice(0, 6);
  const panels = [
    { image: siteImage("elephant-plains.jpg"), name: "Lone Bull", slug: "lone-bull", tag: "ELEPHANTS", cap: "A lone bull on the endless plains" },
    { image: siteImage("wildebeest-herd.jpg"), name: "Wildebeest Herd", slug: "wildebeest-herd", tag: "PLAINS GAME", cap: "The herd moves as one" },
    { image: siteImage("elephant-herd.jpg"), name: "Elephant Herd", slug: "elephant-herd", tag: "THE KRUGER", cap: "Strength in numbers" },
  ];

  return (
    <div className="overflow-x-clip">
      <section className="relative overflow-hidden" style={{ height: "calc(100dvh - 68px)", minHeight: 480 }}>
        <Parallax speed={0.3} className="absolute inset-0 overflow-hidden" style={{ top: "-8%", height: "116%" }}>
          <Plate product={heroP} showSig={false} style={{ width: "100%", height: "100%" }} />
        </Parallax>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-5 sm:px-6" style={{ background: "linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.5))" }}>
          <Reveal>
            <p className="text-white/90 tracking-[.2em] sm:tracking-[.28em] text-[11px] sm:text-[15px] mb-3 sm:mb-4" style={{ fontFamily: HEAD }}>
              FOR THE LOVE OF WILDLIFE
            </p>
          </Reveal>
          <Reveal delay={120}>
            <h1 className="text-white text-[36px] sm:text-[76px] leading-[.95] font-light" style={{ fontFamily: HEAD, letterSpacing: ".02em" }}>
              DORON<br />GOLDSTEIN
            </h1>
          </Reveal>
          <Reveal delay={240}>
            <div className="flex items-center justify-center gap-2 sm:gap-4 my-5 sm:my-6 max-w-full px-1">
              <span className="hidden sm:block shrink-0" style={{ width: 40, height: 1, background: C.green }} />
              <span className="text-[11px] sm:text-[17px] tracking-[.12em] sm:tracking-[.25em]" style={{ fontFamily: HEAD, color: C.green }}>
                WILDLIFE PHOTOGRAPHY
              </span>
              <span className="hidden sm:block shrink-0" style={{ width: 40, height: 1, background: C.green }} />
            </div>
          </Reveal>
          <Reveal delay={360}>
            <Link href="/shop"><Pill>View the Collection →</Pill></Link>
          </Reveal>
        </div>
        <div className="absolute bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce" style={{ pointerEvents: "none" }}>
          <span className="text-white/80 text-[10px] sm:text-[11px] tracking-[.25em]" style={{ fontFamily: HEAD }}>SCROLL</span>
          <ChevronDown size={18} color="rgba(255,255,255,.8)" />
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

          {categories.length === 0 ? (
            <p className="text-[14px] text-neutral-500 text-center py-8">New prints are on their way — check back soon.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
              {categories.map((p, i) => <CollectionPanel key={p.id} p={p} delay={i * 70} />)}
            </div>
          )}
        </div>
      </section>

      {/* Trust band — between categories and featured */}
      <section style={{ background: C.dark, color: "#cfcfcb" }}>
        <div className="max-w-[1240px] mx-auto px-5 py-8 sm:py-10">
          <Reveal>
            <ul className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-5 sm:gap-x-12 sm:gap-y-3 text-center">
              {TRUST_LINES.map((line) => (
                <li key={line} className="text-[12px] sm:text-[13px] tracking-[.14em] uppercase flex items-center justify-center gap-3" style={{ fontFamily: HEAD }}>
                  <span className="hidden sm:block shrink-0" style={{ width: 18, height: 1, background: C.green }} />
                  <span className="text-white/85">{line}</span>
                  <span className="hidden sm:block shrink-0" style={{ width: 18, height: 1, background: C.green }} />
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Featured prints */}
      {featuredPrints.length > 0 && (
        <section className="bg-white">
          <div className="max-w-[1240px] mx-auto px-5 py-14 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-8 sm:mb-10">
              <Reveal>
                <div>
                  <p className="text-[11px] tracking-[.22em] mb-1.5" style={{ fontFamily: HEAD, color: C.green }}>NEW & FEATURED</p>
                  <h2 className="text-[26px] sm:text-[34px] leading-none" style={{ fontFamily: HEAD, fontWeight: 300 }}>Prints to start with</h2>
                </div>
              </Reveal>
              <Reveal delay={60}>
                <Link href="/shop"><Pill variant="outline" size="sm">SHOP ALL</Pill></Link>
              </Reveal>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 sm:gap-x-8 sm:gap-y-12">
              {featuredPrints.map((p, i) => (
                <Reveal key={p.id} delay={i * 50}>
                  <Card p={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <Slideshow slides={panels} />

      {/* How it works */}
      <section style={{ background: `linear-gradient(180deg, #fff 0%, #f7f5f0 100%)` }}>
        <div className="max-w-[1100px] mx-auto px-5 py-16 sm:py-24">
          <Reveal>
            <p className="text-[11px] tracking-[.22em] mb-1.5 text-center" style={{ fontFamily: HEAD, color: C.green }}>FROM BUSH TO WALL</p>
          </Reveal>
          <Reveal delay={60}>
            <h2 className="text-[26px] sm:text-[34px] leading-none text-center mb-10 sm:mb-14" style={{ fontFamily: HEAD, fontWeight: 300 }}>
              How it works
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-10 md:gap-8">
            {HOW_STEPS.map((step, i) => (
              <Reveal key={step.n} delay={80 + i * 80}>
                <div className="text-center md:text-left">
                  <div className="text-[12px] tracking-[.2em] mb-3" style={{ fontFamily: HEAD, color: C.green }}>{step.n}</div>
                  <h3 className="text-[20px] sm:text-[22px] mb-3" style={{ fontFamily: HEAD, fontWeight: 400 }}>{step.title}</h3>
                  <p className="text-[14px] sm:text-[15px] leading-relaxed text-neutral-600">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* About teaser */}
      <section className="relative overflow-hidden" style={{ background: C.dark }}>
        <div className="max-w-[1240px] mx-auto grid md:grid-cols-2 min-h-[480px]">
          <div className="relative min-h-[320px] md:min-h-0 order-1 md:order-none">
            <Parallax speed={0.18} className="absolute inset-0" style={{ top: "-8%", height: "116%" }}>
              <Plate product={aboutP} showSig={false} style={{ width: "100%", height: "100%" }} />
            </Parallax>
            <div className="absolute inset-0 md:hidden" style={{ background: "linear-gradient(180deg,transparent 40%,rgba(20,20,18,.85))" }} />
          </div>
          <div className="relative flex flex-col justify-center px-5 py-14 sm:px-12 sm:py-20 text-white order-2">
            <Reveal>
              <p className="text-[11px] tracking-[.22em] mb-3" style={{ fontFamily: HEAD, color: C.green }}>THE PHOTOGRAPHER</p>
            </Reveal>
            <Reveal delay={80}>
              <h2 className="text-[28px] sm:text-[36px] leading-tight mb-5 font-light" style={{ fontFamily: HEAD }}>
                A life behind the lens
              </h2>
            </Reveal>
            <Reveal delay={140}>
              <p className="text-[15px] sm:text-[16px] leading-relaxed text-white/75 mb-8 max-w-md">
                After decades as a dentist, Doron turned a lifelong love of the African bush into signed, limited-edition wildlife photographs — patience and precision, reframed.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <Link href="/about"><Pill variant="outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,.45)" }}>Read Doron’s story →</Pill></Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Light break between dark about + commission bands */}
      <section style={{ background: `linear-gradient(180deg, #f7f5f0 0%, #ebe8e1 100%)` }}>
        <div className="max-w-[720px] mx-auto px-5 py-14 sm:py-16 text-center">
          <Reveal>
            <div className="flex items-center justify-center gap-4 mb-5">
              <span className="hidden sm:block shrink-0" style={{ width: 40, height: 1, background: C.green }} />
              <p className="text-[11px] tracking-[.22em]" style={{ fontFamily: HEAD, color: C.green }}>FOR THE LOVE OF WILDLIFE</p>
              <span className="hidden sm:block shrink-0" style={{ width: 40, height: 1, background: C.green }} />
            </div>
          </Reveal>
          <Reveal delay={80}>
            <p className="text-[18px] sm:text-[22px] leading-relaxed text-neutral-700" style={{ fontFamily: HEAD, fontWeight: 300 }}>
              Every print is produced to archival standards — made to hold its place on your wall for years to come.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Contact / commission CTA */}
      <section className="relative overflow-hidden" style={{ minHeight: 360 }}>
        <Parallax speed={0.22} className="absolute inset-0" style={{ top: "-12%", height: "124%" }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${siteImage("contact2.jpg")})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "grayscale(1) contrast(1.04)",
            }}
          />
        </Parallax>
        <div className="absolute inset-0" style={{ background: "rgba(20,20,18,.7)" }} />
        <div className="relative max-w-[640px] mx-auto px-5 py-20 sm:py-24 text-center text-white">
          <Reveal>
            <p className="text-[11px] tracking-[.22em] mb-3" style={{ fontFamily: HEAD, color: C.green }}>CUSTOM & COMMISSION</p>
          </Reveal>
          <Reveal delay={80}>
            <h2 className="text-[28px] sm:text-[36px] mb-4 font-light" style={{ fontFamily: HEAD }}>
              Need a custom size?
            </h2>
          </Reveal>
          <Reveal delay={140}>
            <p className="text-[15px] text-white/75 mb-8 max-w-md mx-auto">
              Ask about larger formats, framing advice, or a commission — Doron and the team are happy to help.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/contact"><Pill>Get in touch →</Pill></Link>
              <Link href="/shop"><Pill variant="outline" style={{ color: "#fff", borderColor: "rgba(255,255,255,.45)" }}>Browse prints</Pill></Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
