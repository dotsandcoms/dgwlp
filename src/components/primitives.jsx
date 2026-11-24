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

function lighten(hex, pct) {
  return mixHex(hex, "#ffffff", pct / 100);
}
function darken(hex, pct) {
  return mixHex(hex, "#000000", pct / 100);
}
function mixHex(a, b, t) {
  const pa = parseHex(a);
  const pb = parseHex(b);
  if (!pa || !pb) return a;
  const m = (i) => Math.round(pa[i] + (pb[i] - pa[i]) * t);
  return `#${[m(0), m(1), m(2)].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
function parseHex(hex) {
  const h = String(hex || "").replace("#", "");
  if (h.length !== 6) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** Painted moulding face (CSS bevel — used when no photo border). */
function paintedMoulding(frame) {
  const base = frame?.c || "#141414";
  return {
    background: `linear-gradient(145deg,
      ${lighten(base, 28)} 0%,
      ${lighten(base, 10)} 22%,
      ${base} 48%,
      ${darken(base, 12)} 78%,
      ${darken(base, 22)} 100%)`,
  };
}

/**
 * Gallery frame. Photo mouldings use border-image; paint finishes use CSS bevel.
 * Paper → white mat. Canvas framed → floater gap (dark channel) like Pixalot.
 */
function FrameShell({
  frame,
  facePx = 16,
  hasMat = false,
  floater = false,
  matPad,
  children,
  compact = false,
}) {
  const face = Math.max(compact ? 9 : 12, facePx);
  const isWhite = frame?.id === "white";
  const hasPhotoMoulding = Boolean(frame?.borderImage);
  const mat = hasMat ? (matPad ?? (compact ? 14 : "clamp(16px, 6.5%, 44px)")) : 0;
  // Recessed channel between moulding and canvas (floater frame)
  const floatGap = floater ? (compact ? 5 : 8) : 0;
  const drop = compact
    ? "0 10px 24px rgba(0,0,0,.22), 0 2px 6px rgba(0,0,0,.12)"
    : "0 20px 44px rgba(0,0,0,.24), 0 4px 10px rgba(0,0,0,.1)";

  const art = floater ? (
    <div
      style={{
        // Warm cream reveal (Wild Ginga-style) — not a black channel
        background: "#f8f7f3",
        padding: floatGap,
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)",
      }}
    >
      <div
        style={{
          // Soft depth so the canvas reads as floating in the tray
          boxShadow: compact
            ? "0 1px 2px rgba(0,0,0,.12)"
            : "0 2px 5px rgba(0,0,0,.14)",
        }}
      >
        {children}
      </div>
    </div>
  ) : (
    <div
      style={{
        background: hasMat ? "#fff" : "transparent",
        padding: mat,
        boxShadow: hasMat
          ? "inset 0 0 0 1px rgba(0,0,0,.28)"
          : "inset 0 0 0 1px rgba(0,0,0,.45)",
      }}
    >
      {children}
    </div>
  );

  if (hasPhotoMoulding) {
    const slice = Number(frame.borderSlice) || 128;
    return (
      <div
        style={{
          width: "100%",
          boxSizing: "border-box",
          borderStyle: "solid",
          borderWidth: face,
          borderColor: frame.c || "#141414",
          borderImageSource: `url(${frame.borderImage})`,
          borderImageSlice: slice,
          borderImageWidth: face,
          borderImageRepeat: "stretch",
          boxShadow: drop,
        }}
      >
        {art}
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        boxSizing: "border-box",
        padding: face,
        ...paintedMoulding(frame),
        boxShadow: compact
          ? `${drop},
             inset 0 1px 0 ${isWhite ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.28)"},
             inset 0 -1px 0 ${isWhite ? "rgba(0,0,0,.1)" : "rgba(0,0,0,.4)"},
             inset 1px 0 0 ${isWhite ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.12)"},
             inset -1px 0 0 ${isWhite ? "rgba(0,0,0,.08)" : "rgba(0,0,0,.35)"}`
          : `${drop},
             inset 0 1.5px 0 ${isWhite ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.3)"},
             inset 0 -1.5px 0 ${isWhite ? "rgba(0,0,0,.12)" : "rgba(0,0,0,.45)"},
             inset 1.5px 0 0 ${isWhite ? "rgba(255,255,255,.6)" : "rgba(255,255,255,.14)"},
             inset -1.5px 0 0 ${isWhite ? "rgba(0,0,0,.1)" : "rgba(0,0,0,.4)"}`,
        outline: isWhite ? "1px solid #c8c8c4" : "none",
      }}
    >
      {art}
    </div>
  );
}

/** @deprecated Prefer PrintPreview — kept for any residual callers. */
export const artworkStyle = (matId, frameCol) => {
  const frame = FRAME_COLOURS.find((f) => f.id === frameCol) || FRAME_COLOURS[0];
  const c = frame.c || "#141414";
  switch (matId) {
    case "paper":
      return { boxShadow: "0 14px 30px rgba(0,0,0,.18), 0 2px 6px rgba(0,0,0,.08)" };
    case "paper_framed":
      return { border: `11px solid ${c}`, background: "#fff", padding: 10, boxShadow: "0 18px 42px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.1)" };
    case "canvas_rolled":
      return { boxShadow: "0 12px 26px rgba(0,0,0,.20)" };
    case "canvas_framed":
      return { border: `9px solid ${c}`, padding: 4, background: c, boxShadow: "0 18px 42px rgba(0,0,0,.28)" };
    case "canvas_mounted":
      return { boxShadow: "6px 6px 0 rgba(0,0,0,.1), 0 20px 40px rgba(0,0,0,.26)" };
    default:
      return {};
  }
};

/**
 * Gallery frame preview: white mat on paper; floater gap on canvas framed.
 */
export function PrintPreview({
  product,
  material,
  frameCol,
  printColour,
  aspectRatio = "3 / 2",
  className,
  style,
  onClick,
  title,
  compact = false,
}) {
  const frame = FRAME_COLOURS.find((f) => f.id === frameCol) || FRAME_COLOURS[0];
  const matId = material || "paper";
  const isPaperFramed = matId === "paper_framed";
  const isCanvasFramed = matId === "canvas_framed";
  const isMounted = matId === "canvas_mounted";
  const framed = isPaperFramed || isCanvasFramed;
  const Tag = onClick ? "button" : "div";

  const facePx = compact ? (isPaperFramed ? 11 : 10) : (isPaperFramed ? 20 : 16);

  const piece = (() => {
    if (framed) {
      return (
        <FrameShell
          frame={frame}
          facePx={facePx}
          hasMat={isPaperFramed}
          floater={isCanvasFramed}
          compact={compact}
        >
          <Plate
            product={product}
            printColour={printColour}
            fit="cover"
            style={{ width: "100%", aspectRatio, display: "block" }}
          />
        </FrameShell>
      );
    }

    if (isMounted) {
      return (
        <div
          style={{
            width: "100%",
            background: "#111",
            boxShadow: "8px 8px 0 rgba(0,0,0,.12), 0 20px 40px rgba(0,0,0,.24)",
          }}
        >
          <Plate
            product={product}
            printColour={printColour}
            fit="cover"
            style={{ width: "100%", aspectRatio, display: "block" }}
          />
        </div>
      );
    }

    // Unframed / rolled — full-bleed image, soft paper shadow
    return (
      <div style={{ boxShadow: "0 12px 28px rgba(0,0,0,.16), 0 2px 6px rgba(0,0,0,.06)" }}>
        <Plate
          product={product}
          printColour={printColour}
          fit="cover"
          style={{ width: "100%", aspectRatio, display: "block" }}
        />
      </div>
    );
  })();

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={className}
      style={{
        display: "block",
        width: "100%",
        margin: 0,
        padding: 0,
        border: "none",
        borderRadius: 0,
        background: "transparent",
        boxShadow: "none",
        outline: "none",
        appearance: "none",
        WebkitAppearance: "none",
        cursor: onClick ? "zoom-in" : "default",
        textAlign: "left",
        ...style,
      }}
    >
      {piece}
    </Tag>
  );
}

export function RoomPreview({ product, size, material, frameCol, room, onZoom, printColour }) {
  const place = artPlacement(size, room, product.ratio);
  const ar = RATIOS[product.ratio]?.ar || "3 / 2";
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
        <PrintPreview
          product={product}
          material={material}
          frameCol={frameCol}
          printColour={printColour}
          aspectRatio={ar}
          compact
        />
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
        {place.printW / 10} × {place.printH / 10} cm
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

/** Button group for product options (size, finish, frame colour). */
export function OptionButtons({ label, value, options, onChange }) {
  if (!options?.length) return null;
  return (
    <div className="mb-7">
      <div
        className="text-[11px] tracking-[.18em] uppercase mb-3"
        style={{ fontFamily: HEAD, color: C.gray }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const active = o.value === value;
          const hasSwatch = Boolean(o.swatch || o.color);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={active}
              className="inline-flex items-center gap-2.5 text-[13px] sm:text-[14px] px-4 py-2.5 transition-all duration-200"
              style={{
                fontFamily: HEAD,
                letterSpacing: ".03em",
                borderRadius: 8,
                background: active ? C.green : "#fff",
                color: active ? "#fff" : C.ink,
                border: `1px solid ${active ? C.green : C.line}`,
                boxShadow: active ? "0 6px 18px rgba(85,107,47,.22)" : "none",
              }}
              onMouseEnter={(e) => {
                if (active) return;
                e.currentTarget.style.borderColor = C.green;
                e.currentTarget.style.background = C.greenSoft;
              }}
              onMouseLeave={(e) => {
                if (active) return;
                e.currentTarget.style.borderColor = C.line;
                e.currentTarget.style.background = "#fff";
              }}
            >
              {hasSwatch && (
                <span
                  aria-hidden
                  className="shrink-0 overflow-hidden"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    border: active ? "1px solid rgba(255,255,255,.45)" : `1px solid ${C.line}`,
                    background: o.color || "#ddd",
                    backgroundImage: o.swatch ? `url(${o.swatch})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    boxShadow:
                      o.color === "#fdfdfd" || o.color === "#e8e8e6"
                        ? "inset 0 0 0 1px rgba(0,0,0,.14)"
                        : undefined,
                  }}
                />
              )}
              <span>{o.label}</span>
            </button>
          );
        })}
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
    awaiting_quote: "#b45309",
    quote_sent: "#2563eb",
    quote_accepted: C.green,
    "Waiting on shipping quote": "#b45309",
    "Shipping quote sent": "#2563eb",
    "Quote accepted — pay now": C.green,
  };
  const labels = {
    awaiting_quote: "Waiting on shipping quote",
    quote_sent: "Shipping quote sent",
    quote_accepted: "Quote accepted — pay now",
  };
  const colour = map[s] || C.gray;
  const label = labels[s] || (/^[a-z]/.test(s || "") ? s[0].toUpperCase() + s.slice(1) : s);
  return <span className="text-[12px] px-2.5 py-1 rounded-full" style={{ background: `${colour}18`, color: colour, fontFamily: HEAD }}>{label}</span>;
}
