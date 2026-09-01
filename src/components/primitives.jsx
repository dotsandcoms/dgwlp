"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { C, HEAD, BODY, RATIOS, FRAME_COLOURS, artPlacement } from "@/lib/pricing";
import { siteImage } from "@/lib/supabase";

const ROOM_PHOTOS = {
  lounge: "room-lounge.jpg",
  bedroom: "room-bedroom.jpg",
  study: "room-study.jpg",
  gallery: "room-gallery.jpg",
};

export function Plate({ product, className, style, showSig = false, printColour, fit = "cover" }) {
  const mode = printColour || (product.colour === "colour" ? "colour" : "bw");
  const bw = mode === "bw";
  const contain = fit === "contain";
  if (product.image) {
    return (
      <div
        className={className}
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundImage: `url(${product.image})`,
          backgroundSize: contain ? "contain" : "cover",
          backgroundPosition: "center",
          backgroundRepeat: contain ? "no-repeat" : undefined,
          backgroundColor: contain ? "#fff" : undefined,
          filter: bw ? "grayscale(1) contrast(1.03)" : "none",
          transition: "filter .35s ease",
          ...style,
        }}
      >
        {showSig && <span style={sigStyle}>Doron Goldstein ©</span>}
      </div>
    );
  }
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", backgroundImage: `linear-gradient(${product.angle || 120}deg, ${product.grad[0]}, ${product.grad[1]})`, filter: bw ? "grayscale(1) contrast(1.05)" : "saturate(1.05)", transition: "filter .35s ease", ...style }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)", backgroundSize: "3px 3px", opacity: .5 }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "7%" }}>
        <span style={{ fontFamily: HEAD, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.82)", fontSize: "clamp(9px,1.5vw,15px)", fontWeight: 300 }}>{product.name}</span>
      </div>
      {showSig && <span style={sigStyle}>Doron Goldstein ©</span>}
    </div>
  );
}
const sigStyle = { position: "absolute", top: "6%", left: "6%", fontFamily: "'Segoe Script',cursive", fontStyle: "italic", fontSize: 11, color: "rgba(255,255,255,.6)" };

/**
 * Photorealistic room backdrop. Artwork is overlaid by RoomPreview using the
 * same artPlacement math — these photos leave a clear center wall for the print.
 */
export function Scene({ room }) {
  const file = ROOM_PHOTOS[room] || ROOM_PHOTOS.lounge;
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `url(${siteImage(file)})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
  );
}

export const artworkStyle = (matId, frameCol) => {
  const c = FRAME_COLOURS.find((f) => f.id === frameCol)?.c || "#141414";
  switch (matId) {
    case "paper": return { padding: 6, background: "#fff", boxShadow: "0 14px 30px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.08)", border: "1px solid #ececec" };
    case "paper_framed": return { border: `11px solid ${c}`, background: "#fff", padding: 10, boxShadow: "0 18px 42px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.1)" };
    case "canvas_rolled": return { boxShadow: "0 12px 26px rgba(0,0,0,.20)" };
    case "canvas_framed": return { border: `9px solid ${c}`, padding: 4, background: c, boxShadow: "0 18px 42px rgba(0,0,0,.28)" };
    case "canvas_mounted": return { boxShadow: "6px 6px 0 rgba(0,0,0,.1), 0 20px 40px rgba(0,0,0,.26)" };
    default: return {};
  }
};

export function RoomPreview({ product, size, material, frameCol, room, onZoom, printColour }) {
  const place = artPlacement(size, room, product.ratio);
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden", borderRadius: 4, border: `1px solid ${C.line}`, background: "#e8e4dc" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <Scene room={room} />
      </div>
      <button onClick={onZoom} title="Zoom" style={{ position: "absolute", top: 12, right: 12, zIndex: 5, width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Search size={17} color={C.ink} />
      </button>
      <div
        style={{
          position: "absolute",
          top: `${place.topPct}%`,
          left: `${place.leftPct}%`,
          transform: "translate(-50%, -50%)",
          width: `${place.widthPct}%`,
          transition: "width .45s cubic-bezier(.2,.7,.2,1), top .45s ease",
          zIndex: 2,
        }}
      >
        <div style={artworkStyle(material, frameCol)}>
          <Plate product={product} printColour={printColour} style={{ width: "100%", aspectRatio: RATIOS[product.ratio].ar }} />
        </div>
      </div>
      <div
        className="absolute bottom-2 left-2 sm:left-3 sm:bottom-3"
        style={{
          zIndex: 4,
          fontFamily: HEAD,
          fontSize: 10,
          letterSpacing: ".06em",
          color: "rgba(20,20,18,.55)",
          background: "rgba(255,255,255,.78)",
          backdropFilter: "blur(4px)",
          padding: "5px 9px",
          borderRadius: 4,
        }}
      >
        {place.capped ? "Large format · " : "Shown to scale · "}
        {place.printW} × {place.printH} mm
      </div>
    </div>
  );
}

export function Reveal({ children, delay = 0, y = 26, className, style }) {
  const ref = useRef(null); const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={className} style={{ opacity: shown ? 1 : 0, transform: shown ? "none" : `translateY(${y}px)`, transition: `opacity .8s ease ${delay}ms, transform .8s cubic-bezier(.2,.7,.2,1) ${delay}ms`, ...style }}>{children}</div>;
}

export function Parallax({ speed = 0.25, children, className, style }) {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const offset = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-offset * speed).toFixed(1)}px, 0)`;
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll); update();
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [speed]);
  return <div ref={ref} className={className} style={style}>{children}</div>;
}

export function Dropdown({ label, value, options, onChange }) {
  return (
    <div className="mb-5">
      <div style={{ fontFamily: HEAD, letterSpacing: ".05em" }} className="text-[15px] mb-2 text-neutral-700">{label}</div>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none bg-transparent py-2 pr-8 text-[15px] outline-none" style={{ borderBottom: `1px solid ${C.ink}`, fontFamily: BODY }}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={16} className="absolute right-1 top-3 pointer-events-none" color={C.ink} />
      </div>
    </div>
  );
}

export function Pill({ children, onClick, variant = "solid", size = "md", style, type, disabled }) {
  const base = { fontFamily: HEAD, letterSpacing: ".06em", cursor: disabled ? "default" : "pointer", borderRadius: 999, transition: "all .2s", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 };
  const pad = size === "sm" ? "8px 18px" : "13px 30px";
  const v = variant === "solid" ? { background: C.green, color: "#fff", border: "none" }
    : variant === "outline" ? { background: "transparent", color: C.ink, border: `1px solid ${C.ink}` }
      : { background: "#fff", color: C.ink, border: `1px solid ${C.line}` };
  return <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, padding: pad, ...v, opacity: disabled ? .6 : 1, ...style }}
    onMouseEnter={(e) => { if (variant === "solid" && !disabled) e.currentTarget.style.background = C.greenDark; }}
    onMouseLeave={(e) => { if (variant === "solid" && !disabled) e.currentTarget.style.background = C.green; }}>{children}</button>;
}

export const Row = ({ l, v, bold }) => (
  <div className="flex justify-between py-1 text-[14px]" style={{ fontFamily: bold ? HEAD : BODY, fontWeight: bold ? 600 : 400 }}>
    <span className={bold ? "" : "text-neutral-600"}>{l}</span><span>{v}</span>
  </div>
);
export function StatusBadge({ s }) {
  const map = {
    Delivered: C.green, Shipped: "#2563eb", Processing: "#b45309",
    pending: "#b45309", paid: C.green, shipped: "#2563eb", delivered: C.green,
    cancelled: "#dc2626", refunded: C.gray,
  };
  const colour = map[s] || C.gray;
  const label = /^[a-z]/.test(s || "") ? s[0].toUpperCase() + s.slice(1) : s;
  return <span className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: `${colour}18`, color: colour, fontFamily: HEAD }}>{label}</span>;
}
