"use client";
import React, { useState, useEffect } from "react";
import { X, Minus, Plus, Truck, ShieldCheck, Heart } from "lucide-react";
import { C, HEAD, zar, RATIOS, MATERIALS, FRAME_COLOURS, ROOMS, sizesOf, priceOf, sizeLabel, PRICING } from "@/lib/pricing";
import { Plate, Scene, RoomPreview, Dropdown, Pill } from "./primitives";
import { useCart, useToast } from "@/context/providers";

export function ProductDetail({ product }) {
  const cart = useCart();
  const { toast } = useToast();
  const sizes = sizesOf(product);
  const [size, setSize] = useState(sizes[0]);
  const [material, setMaterial] = useState("paper");
  const [frameCol, setFrameCol] = useState("black");
  const [room, setRoom] = useState("lounge");
  const [qty, setQty] = useState(1);
  const [wish, setWish] = useState(false);
  const [zoom, setZoom] = useState(false);
  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("dg_wish") || "[]"); setWish(s.includes(product.id)); } catch {} }, [product.id]);

  const mat = MATERIALS.find((m) => m.id === material);
  const unit = priceOf(size, material);
  const summary = [sizeLabel(size), mat.label, mat.framed ? FRAME_COLOURS.find((f) => f.id === frameCol)?.label + " frame" : null].filter(Boolean).join(" · ");

  const toggleWish = () => { try { const s = JSON.parse(localStorage.getItem("dg_wish") || "[]"); const n = s.includes(product.id) ? s.filter((x) => x !== product.id) : [...s, product.id]; localStorage.setItem("dg_wish", JSON.stringify(n)); setWish(n.includes(product.id)); toast(n.includes(product.id) ? "Saved to wishlist" : "Removed from wishlist"); } catch {} };

  const addToCart = () => {
    cart.add({ key: Math.random().toString(36).slice(2), id: product.id, product, name: product.name, size, material, frameCol, room, price: unit, qty, summary });
    toast("Added to your cart"); cart.setOpen(true);
  };

  return (
    <div className="max-w-[1240px] mx-auto px-5 py-8">
      <div className="text-[13px] text-neutral-500 mb-6" style={{ fontFamily: HEAD, letterSpacing: ".03em" }}>
        Home / {product.category} / <span style={{ color: C.ink }}>{product.name}</span>
      </div>
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <RoomPreview product={product} size={size} material={material} frameCol={frameCol} room={room} onZoom={() => setZoom(true)} />
          <div className="flex gap-3 mt-4 overflow-x-auto pb-1 no-scrollbar">
            {ROOMS.map((r) => (
              <button key={r.id} onClick={() => setRoom(r.id)} className="shrink-0 rounded overflow-hidden" style={{ width: 88, height: 66, position: "relative", border: `2px solid ${room === r.id ? C.green : C.line}` }}>
                <Scene room={r.id} />
                <span className="absolute bottom-0 left-0 right-0 text-[9px] text-center py-0.5" style={{ background: "rgba(255,255,255,.85)", fontFamily: HEAD, letterSpacing: ".05em" }}>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[30px] sm:text-[38px] mb-3" style={{ fontFamily: HEAD, color: C.green, fontWeight: 400, letterSpacing: ".02em" }}>{product.name.toUpperCase()}</h1>
            <button onClick={toggleWish} className="mt-2 shrink-0" title="Wishlist"><Heart size={22} color={wish ? "#c0392b" : C.gray} fill={wish ? "#c0392b" : "none"} /></button>
          </div>
          <div className="text-[22px] mb-1" style={{ fontFamily: HEAD }}>{zar(unit)}</div>
          <div className="text-[12px] text-neutral-500 mb-5">{RATIOS[product.ratio].label} · limited edition</div>
          <p className="text-[15px] leading-relaxed text-neutral-700 mb-8">{product.desc}</p>

          <Dropdown label="Size" value={size} onChange={setSize} options={sizes.map((s) => ({ value: s, label: `${sizeLabel(s)} — from ${zar(Math.min(...PRICING[s]))}` }))} />
          <Dropdown label="Print & finish" value={material} onChange={setMaterial} options={MATERIALS.map((m) => ({ value: m.id, label: `${m.label} — ${zar(priceOf(size, m.id))}` }))} />
          {mat.framed && <Dropdown label="Frame colour" value={frameCol} onChange={setFrameCol} options={FRAME_COLOURS.map((f) => ({ value: f.id, label: f.label }))} />}

          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center" style={{ border: `1px solid ${C.line}`, borderRadius: 999 }}>
              <button className="w-10 h-11 flex items-center justify-center" onClick={() => setQty((q) => Math.max(1, q - 1))}><Minus size={15} /></button>
              <span className="w-8 text-center text-[15px]">{qty}</span>
              <button className="w-10 h-11 flex items-center justify-center" onClick={() => setQty((q) => q + 1)}><Plus size={15} /></button>
            </div>
            <Pill onClick={addToCart}>Add to cart</Pill>
          </div>

          <div className="mt-8 text-[13px] text-neutral-500 space-y-1">
            <div>SKU: {product.sku}</div>
            <div>Category: {product.category}</div>
            <div className="flex items-center gap-2 pt-2 text-neutral-600"><Truck size={15} /> Free shipping on orders over R2 500</div>
            <div className="flex items-center gap-2 text-neutral-600"><ShieldCheck size={15} /> Signed, limited-edition archival print</div>
          </div>
        </div>
      </div>

      {zoom && (
        <div onClick={() => setZoom(false)} className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: "rgba(15,15,13,.94)" }}>
          <button className="absolute top-5 right-5 text-white" onClick={() => setZoom(false)}><X size={30} /></button>
          <div style={{ maxWidth: 760, width: "100%" }}>
            <Plate product={product} style={{ width: "100%", aspectRatio: RATIOS[product.ratio].ar, borderRadius: 4 }} />
            <p className="text-center text-white/70 text-[13px] mt-4" style={{ fontFamily: HEAD, letterSpacing: ".1em" }}>{product.name.toUpperCase()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
