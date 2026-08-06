"use client";
import React from "react";
import Link from "next/link";
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

function ShowPanel({ product, tag, caption, reverse }) {
  return (
    <section className="relative flex items-center overflow-hidden" style={{ minHeight: "100vh", background: "#101010" }}>
      <div className="absolute inset-0 overflow-hidden">
        <Parallax speed={0.22} className="absolute" style={{ inset: "-14%" }}>
          <Plate product={product} showSig={false} style={{ width: "100%", height: "100%" }} />
        </Parallax>
        <div className="absolute inset-0" style={{ background: reverse ? "linear-gradient(270deg,rgba(0,0,0,.15),rgba(0,0,0,.75))" : "linear-gradient(90deg,rgba(0,0,0,.15),rgba(0,0,0,.75))" }} />
      </div>
      <div className={`relative max-w-[1240px] mx-auto px-8 w-full flex ${reverse ? "justify-end text-right" : "justify-start"}`}>
        <div style={{ maxWidth: 460 }}>
          <Reveal><p className="tracking-[.3em] text-[13px] mb-3" style={{ fontFamily: HEAD, color: C.green }}>{tag}</p></Reveal>
          <Reveal delay={100}><h3 className="text-white text-[34px] sm:text-[52px] leading-[1.02] font-light mb-6" style={{ fontFamily: HEAD }}>{caption}</h3></Reveal>
          <Reveal delay={220}><Link href={`/product/${product.slug}`}><Pill>View “{product.name}” →</Pill></Link></Reveal>
        </div>
      </div>
    </section>
  );
}

export function Home({ products }) {
  const heroP = { image: siteImage("hero.jpg"), colour: "bw", name: "Wildebeest at Dawn" };
  const panels = [
    { image: siteImage("elephant-plains.jpg"), name: "Lone Bull", slug: "lone-bull", tag: "ELEPHANTS", cap: "A lone bull on the endless plains" },
    { image: siteImage("wildebeest-herd.jpg"), name: "Wildebeest Herd", slug: "wildebeest-herd", tag: "PLAINS GAME", cap: "The herd moves as one" },
    { image: siteImage("elephant-herd.jpg"), name: "Elephant Herd", slug: "elephant-herd", tag: "THE KRUGER", cap: "Strength in numbers" },
  ];
  return (
    <div>
      <section className="relative overflow-hidden" style={{ height: "88vh", minHeight: 520 }}>
        <Parallax speed={0.3} className="absolute inset-0" style={{ top: "-12%", height: "124%" }}>
          <Plate product={heroP} showSig={false} style={{ width: "100%", height: "100%" }} />
        </Parallax>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6" style={{ background: "linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,.5))" }}>
          <Reveal><p className="text-white/90 tracking-[.28em] text-[12px] sm:text-[15px] mb-4" style={{ fontFamily: HEAD }}>FOR THE LOVE OF WILDLIFE</p></Reveal>
          <Reveal delay={120}><h1 className="text-white text-[42px] sm:text-[76px] leading-[.95] font-light" style={{ fontFamily: HEAD, letterSpacing: ".02em" }}>DORON<br />GOLDSTEIN</h1></Reveal>
          <Reveal delay={240}><div className="flex items-center gap-4 my-6"><span style={{ width: 60, height: 1, background: C.green }} /><span className="text-[13px] sm:text-[17px] tracking-[.25em]" style={{ fontFamily: HEAD, color: C.green }}>WILDLIFE PHOTOGRAPHY</span><span style={{ width: 60, height: 1, background: C.green }} /></div></Reveal>
          <Reveal delay={360}><Link href="/shop"><Pill>View the Collection →</Pill></Link></Reveal>
        </div>
      </section>

      <section className="max-w-[820px] mx-auto px-5 py-20 text-center">
        <Reveal><p className="text-[18px] sm:text-[22px] leading-relaxed text-neutral-700" style={{ fontFamily: HEAD, fontWeight: 300 }}>
          Over sixty years behind the lens in the Kruger, Kgalagadi and Timbivati — every frame a window into the animal world, printed to last a lifetime.
        </p></Reveal>
      </section>

      {panels.map((s, k) => <ShowPanel key={k} product={{ image: s.image, colour: "bw", name: s.name, slug: s.slug }} tag={s.tag} caption={s.cap} reverse={k % 2 === 1} />)}

      <section className="max-w-[1240px] mx-auto px-5 py-20 text-center">
        <Reveal><h2 className="text-[30px] sm:text-[42px] mb-2" style={{ fontFamily: HEAD, color: C.green, letterSpacing: ".04em" }}>LATEST COLLECTION</h2></Reveal>
        <div className="flex justify-center mb-12"><Link href="/shop"><Pill variant="outline" size="sm">VIEW ALL</Pill></Link></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
          {products.slice(0, 4).map((p, i) => <Reveal key={p.id} delay={i * 90}><Card p={p} /></Reveal>)}
        </div>
      </section>
    </div>
  );
}
