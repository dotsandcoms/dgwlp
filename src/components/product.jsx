"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Minus, Plus, Truck, Heart, ArrowLeft } from "lucide-react";
import { C, HEAD, RATIOS, MATERIALS, FRAME_COLOURS, sizeLabel, priceOfVariant, availableSizesOf, availableMaterialsFor, colourFromCategory } from "@/lib/pricing";
import { freeShippingLabel, DEFAULT_SETTINGS, internationalShippingNote } from "@/lib/settings";
import { useDisplayCurrency } from "@/lib/use-public-settings";
import { Plate, Dropdown, Pill } from "./primitives";
import { useCart, useToast } from "@/context/providers";

const COLOUR_LABEL = { bw: "Black & White", colour: "Colour" };

const PRINT_TYPES = [
  { id: "paper", label: "Paper" },
  { id: "canvas", label: "Canvas" },
];

/** @returns {"paper"|"canvas"} */
function printTypeOf(matId) {
  return String(matId || "").startsWith("canvas") ? "canvas" : "paper";
}

/** Finish label without the Paper/Canvas prefix. */
function finishLabel(mat) {
  return mat.label.replace(/^(Paper|Canvas)\s*[—–-]\s*/, "");
}

export function ProductDetail({ product }) {
  const router = useRouter();
  const cart = useCart();
  const { toast } = useToast();
  const { money } = useDisplayCurrency();
  const sizes = availableSizesOf(product);
  const printColour = colourFromCategory(product.category);
  const [size, setSize] = useState(sizes[0] || "");
  const matsForSize = availableMaterialsFor(product, size);
  const availableTypes = PRINT_TYPES.filter((t) => matsForSize.some((m) => printTypeOf(m.id) === t.id));
  const [printType, setPrintType] = useState(() => printTypeOf(matsForSize[0]?.id || "paper"));
  const finishesForType = matsForSize.filter((m) => printTypeOf(m.id) === printType);
  const [material, setMaterial] = useState(finishesForType[0]?.id || matsForSize[0]?.id || "paper");
  const [frameCol, setFrameCol] = useState("black");
  const [qty, setQty] = useState(1);
  const [wish, setWish] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [shipNote, setShipNote] = useState("Free shipping on orders over R2 500");
  const [intlNote, setIntlNote] = useState("");

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem("dg_wish") || "[]"); setWish(s.includes(product.id)); } catch {} }, [product.id]);
  useEffect(() => {
    const types = PRINT_TYPES.filter((t) => matsForSize.some((m) => printTypeOf(m.id) === t.id));
    const nextType = types.some((t) => t.id === printType) ? printType : (types[0]?.id || "paper");
    if (nextType !== printType) setPrintType(nextType);
    const finishes = matsForSize.filter((m) => printTypeOf(m.id) === nextType);
    if (!finishes.some((m) => m.id === material)) setMaterial(finishes[0]?.id || matsForSize[0]?.id || "paper");
  }, [size]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const shipping = { ...DEFAULT_SETTINGS.shipping, ...(data?.shipping || {}) };
        const label = freeShippingLabel(shipping);
        setShipNote(label || "Nationwide courier delivery");
        if (shipping.internationalUnframedOnly) {
          setIntlNote(`${internationalShippingNote(shipping)} Unframed prints only for overseas orders.`);
        } else {
          setIntlNote(internationalShippingNote(shipping));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const mat = MATERIALS.find((m) => m.id === material) || MATERIALS[0];
  const unit = priceOfVariant(product, size, material);
  const colourLabel = COLOUR_LABEL[printColour] || COLOUR_LABEL.bw;
  const summary = [
    sizeLabel(size),
    mat.label,
    mat.framed ? FRAME_COLOURS.find((f) => f.id === frameCol)?.label + " frame" : null,
  ].filter(Boolean).join(" · ");

  const shopHref = product.category
    ? `/shop?category=${encodeURIComponent(product.category)}`
    : "/shop";

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(shopHref);
  };

  const openZoom = () => {
    setZoomLevel(1);
    setZoom(true);
    document.body.style.overflow = "hidden";
  };

  const closeZoom = () => {
    setZoom(false);
    setZoomLevel(1);
    document.body.style.overflow = "";
  };

  const toggleZoom = () => {
    setZoomLevel((z) => (z >= 2 ? 1 : 2.5));
  };

  useEffect(() => {
    if (!zoom) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") closeZoom();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [zoom]);

  const toggleWish = () => { try { const s = JSON.parse(localStorage.getItem("dg_wish") || "[]"); const n = s.includes(product.id) ? s.filter((x) => x !== product.id) : [...s, product.id]; localStorage.setItem("dg_wish", JSON.stringify(n)); setWish(n.includes(product.id)); toast(n.includes(product.id) ? "Saved to wishlist" : "Removed from wishlist"); } catch {} };

  const addToCart = () => {
    cart.add({
      key: Math.random().toString(36).slice(2),
      id: product.id,
      product: { ...product, colour: printColour },
      name: product.name,
      size,
      material,
      frameCol,
      printColour,
      price: unit,
      qty,
      summary,
    });
    toast("Added to your cart"); cart.setOpen(true);
  };

  if (sizes.length === 0) {
    return (
      <div className="max-w-[600px] mx-auto px-5 py-24 text-center">
        <h2 className="text-[26px] mb-3" style={{ fontFamily: HEAD, fontWeight: 300 }}>{product.name}</h2>
        <p className="text-[14px] text-neutral-500">This print isn't currently available for order — check back soon.</p>
        <button
          type="button"
          onClick={goBack}
          className="font-head mt-6 inline-flex items-center gap-2 text-[13px] text-olive hover:opacity-70"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1240px] mx-auto px-5 py-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-6">
        <button
          type="button"
          onClick={goBack}
          className="font-head inline-flex items-center gap-1.5 text-[13px] text-olive hover:opacity-70"
        >
          <ArrowLeft size={15} /> Back
        </button>
        <div className="font-head text-[13px] text-neutral-500 tracking-[0.03em]">
          <Link href="/" className="hover:opacity-70">Home</Link>
          {" / "}
          <Link href={shopHref} className="hover:opacity-70">{product.category || "Shop"}</Link>
          {" / "}
          <span className="text-ink">{product.name}</span>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <button
            type="button"
            onClick={openZoom}
            title="View full size"
            className="block w-full overflow-hidden text-left"
            style={{ borderRadius: 4, border: `1px solid ${C.line}`, cursor: "zoom-in" }}
          >
            <Plate
              product={product}
              printColour={printColour}
              style={{ width: "100%", aspectRatio: RATIOS[product.ratio].ar }}
            />
          </button>
        </div>

        <div>
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[30px] sm:text-[38px] mb-3" style={{ fontFamily: HEAD, color: C.green, fontWeight: 400, letterSpacing: ".02em" }}>{product.name.toUpperCase()}</h1>
            <button onClick={toggleWish} className="mt-2 shrink-0" title="Wishlist"><Heart size={22} color={wish ? "#c0392b" : C.gray} fill={wish ? "#c0392b" : "none"} /></button>
          </div>
          <div className="text-[22px] mb-1" style={{ fontFamily: HEAD }}>{money(unit)}</div>
          <div className="text-[12px] text-neutral-500 mb-1">All prices include VAT</div>
          <div className="text-[12px] text-neutral-500 mb-5">Ratio · {RATIOS[product.ratio].label}</div>
          <p className="text-[15px] leading-relaxed text-neutral-700 mb-8">{product.desc}</p>

          <Dropdown label="Size" value={size} onChange={setSize} options={sizes.map((s) => ({ value: s, label: sizeLabel(s) }))} />
          {availableTypes.length > 1 ? (
            <Dropdown
              label="Print"
              value={printType}
              onChange={(v) => {
                setPrintType(v);
                const finishes = matsForSize.filter((m) => printTypeOf(m.id) === v);
                if (!finishes.some((m) => m.id === material)) setMaterial(finishes[0]?.id || "paper");
              }}
              options={availableTypes.map((t) => ({ value: t.id, label: t.label }))}
            />
          ) : availableTypes.length === 1 ? (
            <div className="mb-5">
              <div style={{ fontFamily: HEAD, letterSpacing: ".05em" }} className="text-[15px] mb-2 text-neutral-700">Print</div>
              <div className="text-[15px] py-2" style={{ borderBottom: `1px solid ${C.ink}` }}>{availableTypes[0].label}</div>
            </div>
          ) : null}
          <Dropdown
            label="Finish"
            value={material}
            onChange={setMaterial}
            options={finishesForType.map((m) => ({
              value: m.id,
              label: finishLabel(m),
            }))}
          />
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
            <div className="flex items-center gap-2 pt-2 text-neutral-600"><Truck size={15} /> {shipNote}</div>
            {intlNote && <div className="text-[12px] text-neutral-500 pl-6">{intlNote}</div>}
          </div>
        </div>
      </div>

      {zoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6"
          style={{ background: "rgba(15,15,13,.94)" }}
          role="dialog"
          aria-modal="true"
          onClick={closeZoom}
        >
          <button type="button" className="absolute top-5 right-5 text-white z-10" onClick={closeZoom} aria-label="Close">
            <X size={30} />
          </button>
          <div
            className="w-full max-w-[min(96vw,960px)] overflow-auto"
            style={{ maxHeight: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={toggleZoom}
              className="block w-full"
              style={{ cursor: zoomLevel >= 2 ? "zoom-out" : "zoom-in" }}
              title={zoomLevel >= 2 ? "Zoom out" : "Zoom in"}
              aria-label={zoomLevel >= 2 ? "Zoom out" : "Zoom in"}
            >
              <div
                style={{
                  width: zoomLevel >= 2 ? "250%" : "100%",
                  margin: "0 auto",
                  transition: "width .3s ease",
                }}
              >
                <Plate
                  product={product}
                  printColour={printColour}
                  fit="contain"
                  style={{
                    width: "100%",
                    aspectRatio: RATIOS[product.ratio].ar,
                    borderRadius: 4,
                    backgroundColor: "#1a1a18",
                  }}
                />
              </div>
            </button>
            <p className="text-center text-white/70 text-[13px] mt-4 px-2" style={{ fontFamily: HEAD, letterSpacing: ".1em" }}>
              {product.name.toUpperCase()} · {colourLabel.toUpperCase()}
              {zoomLevel < 2 ? " · Click image to zoom in" : " · Click image to zoom out"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
