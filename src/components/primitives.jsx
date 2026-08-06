"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { C, HEAD, BODY, RATIOS, SCALE, FRAME_COLOURS } from "@/lib/pricing";

export function Plate({ product, className, style, showSig = true }) {
  const bw = product.colour === "bw";
  if (product.image) {
    return (
      <div className={className} style={{ position: "relative", overflow: "hidden", backgroundImage: `url(${product.image})`, backgroundSize: "cover", backgroundPosition: "center", filter: bw ? "grayscale(1) contrast(1.03)" : "none", ...style }}>
        {showSig && <span style={sigStyle}>Doron Goldstein ©</span>}
      </div>
    );
  }
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden", backgroundImage: `linear-gradient(${product.angle || 120}deg, ${product.grad[0]}, ${product.grad[1]})`, filter: bw ? "grayscale(1) contrast(1.05)" : "saturate(1.05)", ...style }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px)", backgroundSize: "3px 3px", opacity: .5 }} />
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "7%" }}>
        <span style={{ fontFamily: HEAD, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(255,255,255,.82)", fontSize: "clamp(9px,1.5vw,15px)", fontWeight: 300 }}>{product.name}</span>
      </div>
      {showSig && <span style={sigStyle}>Doron Goldstein ©</span>}
    </div>
  );
}
const sigStyle = { position: "absolute", top: "6%", left: "6%", fontFamily: "'Segoe Script',cursive", fontStyle: "italic", fontSize: 11, color: "rgba(255,255,255,.6)" };

export function Scene({ room }) {
  const wall = { position: "absolute", inset: 0, background: C.wall };
  if (room === "gallery") return (<><div style={wall} /><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "10%", background: "#dfdcd6" }} /></>);
  if (room === "bedroom") return (<><div style={wall} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "20%", background: C.floor }} />
    <div style={{ position: "absolute", left: "12%", right: "12%", bottom: "6%", height: "26%", background: "#d9d6cf", borderRadius: "8px 8px 3px 3px" }} />
    <div style={{ position: "absolute", left: "12%", right: "12%", bottom: "26%", height: "10%", background: "#c7c3ba", borderRadius: "8px 8px 0 0" }} />
    <div style={{ position: "absolute", left: "17%", bottom: "20%", width: "22%", height: "9%", background: "#efeee9", borderRadius: 8, transform: "rotate(-2deg)" }} />
    <div style={{ position: "absolute", right: "17%", bottom: "20%", width: "22%", height: "9%", background: "#efeee9", borderRadius: 8, transform: "rotate(2deg)" }} /></>);
  if (room === "study") return (<><div style={wall} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "18%", background: C.floor }} />
    <div style={{ position: "absolute", left: "18%", right: "18%", bottom: "14%", height: "5%", background: "#7c6a52", borderRadius: 3 }} />
    <div style={{ position: "absolute", left: "20%", bottom: 0, width: "3%", height: "16%", background: "#6e5d47" }} />
    <div style={{ position: "absolute", right: "20%", bottom: 0, width: "3%", height: "16%", background: "#6e5d47" }} />
    <div style={{ position: "absolute", left: "44%", bottom: "18%", width: "12%", height: "18%", background: "#3f3f3d", borderRadius: "8px 8px 4px 4px" }} /></>);
  return (<><div style={wall} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "26%", background: C.floor }} />
    <div style={{ position: "absolute", left: "14%", right: "14%", bottom: "5%", height: "17%", background: "#e5e2db", borderRadius: 999, filter: "blur(1px)" }} />
    <div style={{ position: "absolute", left: "16%", right: "16%", bottom: "8%", height: "20%", background: "#d7d3cb", borderRadius: "14px 14px 6px 6px" }} />
    <div style={{ position: "absolute", left: "20%", bottom: "17%", width: "16%", height: "9%", background: "#cbc6bd", borderRadius: 8 }} />
    <div style={{ position: "absolute", right: "20%", bottom: "17%", width: "16%", height: "9%", background: "#cbc6bd", borderRadius: 8 }} />
    <div style={{ position: "absolute", left: "5%", bottom: "26%", width: "9%", height: "22%" }}>
      <div style={{ position: "absolute", bottom: 0, left: "30%", width: "40%", height: "28%", background: "#d8d4cc", borderRadius: 3 }} />
      <div style={{ position: "absolute", bottom: "22%", left: 0, right: 0, height: "78%", background: C.green, opacity: .5, borderRadius: "50% 50% 40% 40%" }} />
    </div>
    <div style={{ position: "absolute", right: "7%", bottom: "26%", width: "1.5%", height: "34%", background: "#8b8b88" }} />
    <div style={{ position: "absolute", right: "4.5%", bottom: "58%", width: "7%", height: "5%", background: "#9a9a96", borderRadius: "50% 50% 8px 8px" }} /></>);
}

export const artworkStyle = (matId, frameCol) => {
  const c = FRAME_COLOURS.find((f) => f.id === frameCol)?.c || "#141414";
  switch (matId) {
    case "paper": return { padding: 6, background: "#fff", boxShadow: "0 14px 30px rgba(0,0,0,.18)", border: "1px solid #ececec" };
    case "paper_framed": return { border: `11px solid ${c}`, background: "#fff", padding: 10, boxShadow: "0 18px 42px rgba(0,0,0,.30)" };
    case "canvas_rolled": return { boxShadow: "0 12px 26px rgba(0,0,0,.20)" };
    case "canvas_framed": return { border: `9px solid ${c}`, padding: 4, background: c, boxShadow: "0 18px 42px rgba(0,0,0,.30)" };
    case "canvas_mounted": return { boxShadow: "6px 6px 0 rgba(0,0,0,.12), 0 20px 40px rgba(0,0,0,.28)" };
    default: return {};
  }
};

export function RoomPreview({ product, size, material, frameCol, room, onZoom }) {
  return (
    <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", overflow: "hidden", borderRadius: 4, border: `1px solid ${C.line}` }}>
      <Scene room={room} />
      <button onClick={onZoom} title="Zoom" style={{ position: "absolute", top: 12, right: 12, zIndex: 5, width: 40, height: 40, borderRadius: "50%", background: "#fff", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,.15)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Search size={17} color={C.ink} />
      </button>
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-52%)", width: `${SCALE[size]}%`, transition: "all .4s ease" }}>
        <div style={artworkStyle(material, frameCol)}>
          <Plate product={product} style={{ width: "100%", aspectRatio: RATIOS[product.ratio].ar }} />
        </div>
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

export function Pill({ children, onClick, variant = "solid", size = "md", style, type }) {
  const base = { fontFamily: HEAD, letterSpacing: ".06em", cursor: "pointer", borderRadius: 999, transition: "all .2s", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 };
  const pad = size === "sm" ? "8px 18px" : "13px 30px";
  const v = variant === "solid" ? { background: C.green, color: "#fff", border: "none" }
    : variant === "outline" ? { background: "transparent", color: C.ink, border: `1px solid ${C.ink}` }
      : { background: "#fff", color: C.ink, border: `1px solid ${C.line}` };
  return <button type={type} onClick={onClick} style={{ ...base, padding: pad, ...v, ...style }}
    onMouseEnter={(e) => { if (variant === "solid") e.currentTarget.style.background = C.greenDark; }}
    onMouseLeave={(e) => { if (variant === "solid") e.currentTarget.style.background = C.green; }}>{children}</button>;
}

export const Row = ({ l, v, bold }) => (
  <div className="flex justify-between py-1 text-[14px]" style={{ fontFamily: bold ? HEAD : BODY, fontWeight: bold ? 600 : 400 }}>
    <span className={bold ? "" : "text-neutral-600"}>{l}</span><span>{v}</span>
  </div>
);
export function StatusBadge({ s }) {
  const map = { Delivered: C.green, Shipped: "#2563eb", Processing: "#b45309" };
  return <span className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: `${map[s]}18`, color: map[s], fontFamily: HEAD }}>{s}</span>;
}
