"use client";
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { C, HEAD, BODY, RATIOS, FRAME_COLOURS, artPlacement } from "@/lib/pricing";

export function Plate({ product, className, style, showSig = true, printColour }) {
  // printColour ('bw' | 'colour') overrides product.colour — used when product offers both.
  const mode = printColour || (product.colour === "both" ? "colour" : product.colour);
  const bw = mode === "bw";
  if (product.image) {
    return (
      <div className={className} style={{ position: "relative", overflow: "hidden", backgroundImage: `url(${product.image})`, backgroundSize: "cover", backgroundPosition: "center", filter: bw ? "grayscale(1) contrast(1.03)" : "none", transition: "filter .35s ease", ...style }}>
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

/** Soft grain overlay for walls / floors. */
function Grain({ opacity = 0.04 }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        pointerEvents: "none",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        backgroundSize: "140px 140px",
        mixBlendMode: "multiply",
      }}
    />
  );
}

/** Lifelike room backdrop — depth, lighting, and furniture scaled to a ~3m wall. */
export function Scene({ room }) {
  const floorWood = {
    background: `
      linear-gradient(90deg, rgba(0,0,0,.04) 0 1px, transparent 1px),
      linear-gradient(180deg, #c4b49a 0%, #b8a68a 40%, #a99578 100%)
    `,
    backgroundSize: "7% 100%, 100% 100%",
  };

  if (room === "gallery") {
    return (
      <>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#f3f1ec 0%,#e8e5df 55%,#ddd9d1 100%)" }} />
        <Grain opacity={0.035} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%,rgba(255,255,255,.45),transparent 55%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "12%", ...floorWood, boxShadow: "inset 0 8px 18px rgba(0,0,0,.08)" }} />
        <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "11.5%", height: 3, background: "rgba(0,0,0,.06)", borderRadius: 2 }} />
      </>
    );
  }

  if (room === "bedroom") {
    return (
      <>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg,#ebe6dc 0%,#e4dfd4 45%,#d9d3c6 100%)" }} />
        <Grain />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(255,255,255,.2),transparent 35%,transparent 70%,rgba(0,0,0,.04))" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "18%", ...floorWood }} />
        {/* Headboard + bed */}
        <div style={{ position: "absolute", left: "10%", right: "10%", bottom: "14%", height: "28%", background: "linear-gradient(180deg,#d2ccc0,#c5beaf)", borderRadius: "10px 10px 4px 4px", boxShadow: "0 10px 28px rgba(0,0,0,.12)" }} />
        <div style={{ position: "absolute", left: "10%", right: "10%", bottom: "36%", height: "11%", background: "linear-gradient(180deg,#b7b0a0,#a89f8e)", borderRadius: "8px 8px 0 0", boxShadow: "0 -2px 10px rgba(0,0,0,.06)" }} />
        <div style={{ position: "absolute", left: "16%", bottom: "30%", width: "24%", height: "10%", background: "linear-gradient(180deg,#f4f1ea,#ebe6dc)", borderRadius: 10, boxShadow: "0 4px 10px rgba(0,0,0,.08)", transform: "rotate(-1.5deg)" }} />
        <div style={{ position: "absolute", right: "16%", bottom: "30%", width: "24%", height: "10%", background: "linear-gradient(180deg,#f4f1ea,#ebe6dc)", borderRadius: 10, boxShadow: "0 4px 10px rgba(0,0,0,.08)", transform: "rotate(1.5deg)" }} />
        {/* Side table + lamp glow */}
        <div style={{ position: "absolute", left: "4%", bottom: "18%", width: "8%", height: "9%", background: "#8a7460", borderRadius: 3, boxShadow: "0 6px 14px rgba(0,0,0,.15)" }} />
        <div style={{ position: "absolute", left: "6.2%", bottom: "27%", width: "3.5%", height: "14%", background: "#6e5d4d", borderRadius: 2 }} />
        <div style={{ position: "absolute", left: "4.5%", bottom: "40%", width: "7%", height: "5%", background: "rgba(255,236,200,.55)", borderRadius: "50%", filter: "blur(6px)" }} />
      </>
    );
  }

  if (room === "study") {
    return (
      <>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,#e7e2d8 0%,#ddd6ca 100%)" }} />
        <Grain />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 70% 20%,rgba(255,248,230,.35),transparent 50%)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "16%", ...floorWood }} />
        {/* Desk */}
        <div style={{ position: "absolute", left: "16%", right: "16%", bottom: "14%", height: "4.5%", background: "linear-gradient(180deg,#8b7355,#6f5a42)", borderRadius: 3, boxShadow: "0 8px 18px rgba(0,0,0,.18)" }} />
        <div style={{ position: "absolute", left: "18%", bottom: 0, width: "2.5%", height: "14.5%", background: "#5c4a36" }} />
        <div style={{ position: "absolute", right: "18%", bottom: 0, width: "2.5%", height: "14.5%", background: "#5c4a36" }} />
        {/* Chair */}
        <div style={{ position: "absolute", left: "42%", bottom: "16%", width: "16%", height: "20%", background: "linear-gradient(180deg,#3a3a38,#2c2c2a)", borderRadius: "10px 10px 4px 4px", boxShadow: "0 8px 16px rgba(0,0,0,.2)" }} />
        <div style={{ position: "absolute", left: "45%", bottom: "14%", width: "10%", height: "4%", background: "#2a2a28", borderRadius: 2 }} />
        {/* Books on desk */}
        <div style={{ position: "absolute", left: "22%", bottom: "18.5%", width: "8%", height: "2.2%", background: "#556B2F", borderRadius: 1 }} />
        <div style={{ position: "absolute", left: "23%", bottom: "20.5%", width: "6%", height: "1.8%", background: "#7a6548", borderRadius: 1 }} />
      </>
    );
  }

  // Lounge (default)
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg,#f0ebe3 0%,#e6e0d6 42%,#dcd5c9 100%)" }} />
      <Grain />
      {/* Window light wash */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg,rgba(255,255,255,.28) 0%,transparent 32%,transparent 68%,rgba(0,0,0,.05) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "24%", ...floorWood, boxShadow: "inset 0 12px 24px rgba(0,0,0,.06)" }} />
      {/* Sofa shadow */}
      <div style={{ position: "absolute", left: "14%", right: "14%", bottom: "5%", height: "8%", background: "rgba(0,0,0,.12)", borderRadius: "50%", filter: "blur(10px)" }} />
      {/* Sofa body */}
      <div style={{
        position: "absolute", left: "15%", right: "15%", bottom: "7%", height: "19%",
        background: "linear-gradient(180deg,#ddd8cf 0%,#cfc9be 55%,#bfb8ab 100%)",
        borderRadius: "18px 18px 8px 8px",
        boxShadow: "0 14px 32px rgba(0,0,0,.14)",
      }} />
      {/* Sofa back */}
      <div style={{
        position: "absolute", left: "15%", right: "15%", bottom: "20%", height: "10%",
        background: "linear-gradient(180deg,#d4cfc6,#c4bdb0)",
        borderRadius: "14px 14px 0 0",
      }} />
      {/* Cushions */}
      <div style={{ position: "absolute", left: "19%", bottom: "16%", width: "17%", height: "9%", background: "linear-gradient(160deg,#ccc6bb,#bdb6a9)", borderRadius: 10, boxShadow: "0 3px 8px rgba(0,0,0,.1)" }} />
      <div style={{ position: "absolute", right: "19%", bottom: "16%", width: "17%", height: "9%", background: "linear-gradient(200deg,#ccc6bb,#bdb6a9)", borderRadius: 10, boxShadow: "0 3px 8px rgba(0,0,0,.1)" }} />
      {/* Plant */}
      <div style={{ position: "absolute", left: "4%", bottom: "24%", width: "10%", height: "28%" }}>
        <div style={{ position: "absolute", bottom: 0, left: "28%", width: "44%", height: "22%", background: "linear-gradient(180deg,#e8e2d8,#d4cdc2)", borderRadius: "2px 2px 4px 4px", boxShadow: "0 4px 10px rgba(0,0,0,.12)" }} />
        <div style={{ position: "absolute", bottom: "18%", left: "8%", right: "8%", height: "78%", background: "radial-gradient(ellipse at 50% 60%,#6a8240 0%,#4a5e2c 70%)", borderRadius: "46% 54% 40% 40%", boxShadow: "inset -6px -8px 16px rgba(0,0,0,.15)" }} />
        <div style={{ position: "absolute", bottom: "40%", left: "0%", width: "42%", height: "38%", background: "radial-gradient(ellipse,#62803c,#456028)", borderRadius: "50%", opacity: .9 }} />
      </div>
      {/* Floor lamp */}
      <div style={{ position: "absolute", right: "6.5%", bottom: "24%", width: "1.4%", height: "36%", background: "linear-gradient(90deg,#7a7a76,#9a9a96,#7a7a76)", borderRadius: 2, boxShadow: "1px 0 4px rgba(0,0,0,.1)" }} />
      <div style={{ position: "absolute", right: "3.8%", bottom: "58%", width: "7%", height: "7%", background: "linear-gradient(180deg,#cfcbc3,#a8a49c)", borderRadius: "50% 50% 8px 8px", boxShadow: "0 6px 14px rgba(0,0,0,.15)" }} />
      <div style={{ position: "absolute", right: "2%", bottom: "52%", width: "11%", height: "14%", background: "radial-gradient(ellipse,rgba(255,236,200,.4),transparent 70%)", filter: "blur(4px)" }} />
    </>
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
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `scale(${place.roomScale})`,
          transformOrigin: "50% 100%",
          transition: "transform .45s cubic-bezier(.2,.7,.2,1)",
        }}
      >
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
        Shown to scale · {place.printW} × {place.printH} mm
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
