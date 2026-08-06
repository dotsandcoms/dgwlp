"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, ImageIcon, Upload, Package, Tag, Plus, Pencil, Trash2, Check, ChevronDown, TrendingUp, CreditCard } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { C, HEAD, zar, RATIOS, MATERIALS, PRICING, SCALE, ROOMS, CATEGORY_NAMES, rangeOf } from "@/lib/pricing";
import { MOCK_PRODUCTS, MOCK_ORDERS, SALES } from "@/lib/mock";
import { Plate, Scene, artworkStyle, Pill, StatusBadge } from "./primitives";
import { useToast } from "@/context/providers";

export function AdminApp() {
  const router = useRouter();
  const { toast } = useToast();
  const [view, setView] = useState("dashboard");
  const nav = [["dashboard", "Dashboard", LayoutDashboard], ["products", "Products", ImageIcon], ["editor", "Add / edit print", Upload], ["orders", "Orders", Package], ["categories", "Categories", Tag]];
  return (
    <div className="max-w-[1240px] mx-auto px-5 py-8">
      <div className="mb-4 p-3 rounded text-[12px]" style={{ background: C.greenSoft, color: C.greenDark }}>Demo admin — running on sample data. Connect Supabase to manage real products & orders.</div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px]" style={{ fontFamily: HEAD, fontWeight: 400 }}>Store Admin</h1>
        <button onClick={() => router.push("/")} className="text-[13px] text-neutral-500">← Back to store</button>
      </div>
      <div className="flex gap-2 flex-wrap mb-8 overflow-x-auto no-scrollbar">
        {nav.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setView(id)} className="flex items-center gap-2 text-[13px] px-4 py-2 rounded-full shrink-0" style={{ background: view === id ? C.green : "#fff", color: view === id ? "#fff" : C.ink, border: `1px solid ${view === id ? C.green : C.line}`, fontFamily: HEAD }}><Icon size={15} /> {label}</button>
        ))}
      </div>
      {view === "dashboard" && <Dash />}
      {view === "products" && <Products onEdit={() => setView("editor")} />}
      {view === "editor" && <Editor toast={toast} />}
      {view === "orders" && <Orders />}
      {view === "categories" && <Categories toast={toast} />}
    </div>
  );
}

function Kpi({ label, value, sub, Icon }) {
  return (
    <div className="p-5 rounded-lg" style={{ border: `1px solid ${C.line}` }}>
      <div className="flex items-center justify-between text-neutral-500 mb-2"><span className="text-[12px] tracking-[.05em]">{label}</span><Icon size={16} color={C.green} /></div>
      <div className="text-[26px]" style={{ fontFamily: HEAD }}>{value}</div><div className="text-[12px] mt-1" style={{ color: C.green }}>{sub}</div>
    </div>
  );
}
function Dash() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="REVENUE (JUL)" value="R47 200" sub="▲ 50% vs Jun" Icon={TrendingUp} />
        <Kpi label="ORDERS" value="29" sub="▲ 7 this week" Icon={Package} />
        <Kpi label="AVG ORDER" value="R1 628" sub="▲ 11%" Icon={CreditCard} />
        <Kpi label="PRINTS SOLD" value="46" sub="Top: Elephant Herd" Icon={ImageIcon} />
      </div>
      <div className="p-5 rounded-lg" style={{ border: `1px solid ${C.line}` }}>
        <h3 className="text-[15px] mb-4" style={{ fontFamily: HEAD }}>Sales — last 6 months</h3>
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <AreaChart data={SALES} margin={{ left: -8, right: 10, top: 5 }}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.35} /><stop offset="100%" stopColor={C.green} stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="m" tick={{ fontSize: 12 }} stroke="#bbb" /><YAxis tick={{ fontSize: 11 }} stroke="#bbb" tickFormatter={(v) => "R" + v / 1000 + "k"} />
              <Tooltip formatter={(v) => zar(v)} />
              <Area type="monotone" dataKey="v" stroke={C.green} strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="p-5 rounded-lg" style={{ border: `1px solid ${C.line}` }}><h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>Recent orders</h3><Orders compact /></div>
    </div>
  );
}
function Products({ onEdit }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4"><span className="text-[14px] text-neutral-500">{MOCK_PRODUCTS.length} prints</span><Pill size="sm" onClick={onEdit}><Plus size={14} /> New print</Pill></div>
      <div className="overflow-x-auto">
        <table className="w-full text-[14px]" style={{ minWidth: 640 }}>
          <thead><tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>{["", "NAME", "CATEGORY", "RATIO", "PRICE RANGE", ""].map((h, k) => <th key={k} className="py-3 font-normal">{h}</th>)}</tr></thead>
          <tbody>{MOCK_PRODUCTS.map((p) => { const [min, max] = rangeOf(p); return (
            <tr key={p.id} style={{ borderBottom: `1px solid ${C.line}` }}>
              <td className="py-3"><Plate product={p} showSig={false} style={{ width: 46, height: 46, borderRadius: 3 }} /></td>
              <td style={{ fontFamily: HEAD }}>{p.name}</td><td className="text-neutral-600">{p.category}</td>
              <td className="text-neutral-600">{RATIOS[p.ratio].label}</td><td>{zar(min)} – {zar(max)}</td>
              <td><button onClick={onEdit} className="text-neutral-400 hover:text-black"><Pencil size={15} /></button></td>
            </tr>); })}</tbody>
        </table>
      </div>
    </div>
  );
}
function Orders({ compact }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[14px]" style={{ minWidth: 560 }}>
        {!compact && <thead><tr className="text-left text-neutral-500 text-[12px]" style={{ borderBottom: `1px solid ${C.line}` }}>{["ORDER", "DATE", "ITEMS", "TOTAL", "STATUS"].map((h) => <th key={h} className="py-3 font-normal">{h}</th>)}</tr></thead>}
        <tbody>{MOCK_ORDERS.map((o) => (
          <tr key={o.id} style={{ borderBottom: `1px solid ${C.line}` }}>
            <td className="py-3" style={{ fontFamily: HEAD }}>{o.id}</td><td className="text-neutral-600">{o.date}</td>
            <td className="text-neutral-600">{o.items}</td><td>{zar(o.total)}</td><td><StatusBadge s={o.status} /></td>
          </tr>))}</tbody>
      </table>
    </div>
  );
}
function Categories({ toast }) {
  const [cats, setCats] = useState(CATEGORY_NAMES); const [val, setVal] = useState("");
  return (
    <div className="max-w-[520px]">
      <h3 className="text-[15px] mb-4" style={{ fontFamily: HEAD }}>Photo categories</h3>
      {cats.map((c) => (<div key={c} className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${C.line}` }}><span className="text-[14px]">{c}</span><button onClick={() => { setCats(cats.filter((x) => x !== c)); toast("Category removed"); }} className="text-neutral-400 hover:text-red-500"><Trash2 size={15} /></button></div>))}
      <div className="flex gap-2 mt-4"><input value={val} onChange={(e) => setVal(e.target.value)} placeholder="New category" className="flex-1 py-2.5 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} /><Pill size="sm" onClick={() => { if (val) { setCats([...cats, val]); setVal(""); toast("Category added"); } }}>Add</Pill></div>
    </div>
  );
}

function Editor({ toast }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORY_NAMES[0]);
  const [ratio, setRatio] = useState("landscape");
  const [colour, setColour] = useState("bw");
  const [desc, setDesc] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [enabledSizes, setEnabledSizes] = useState({});
  const [enabledMats, setEnabledMats] = useState({ paper: true, paper_framed: true, canvas_rolled: true, canvas_framed: true, canvas_mounted: true });
  const [prices, setPrices] = useState({});
  const [rooms, setRooms] = useState({ lounge: true, bedroom: true, study: false, gallery: true });

  useEffect(() => {
    const es = {}; const pr = {};
    RATIOS[ratio].sizes.forEach((s, idx) => { es[s] = idx < 2; PRICING[s].forEach((v, mi) => { pr[`${s}:${mi}`] = v; }); });
    setEnabledSizes(es); setPrices(pr);
  }, [ratio]);

  const onSizes = RATIOS[ratio].sizes.filter((s) => enabledSizes[s]);
  const onMats = MATERIALS.filter((m) => enabledMats[m.id]);
  const range = useMemo(() => {
    const vals = [];
    onSizes.forEach((s) => onMats.forEach((m) => { const v = Number(prices[`${s}:${m.i}`]); if (v) vals.push(v); }));
    return vals.length ? [Math.min(...vals), Math.max(...vals)] : [0, 0];
  }, [onSizes, onMats, prices]);

  const preview = { grad: colour === "colour" ? ["#7c5f36", "#d9c39a"] : ["#333", "#9a9a97"], angle: 120, name: name || "New Print", colour, ratio };
  const firstRoom = Object.keys(rooms).find((r) => rooms[r]) || "gallery";

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-8">
        <div>
          <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>1 · Upload the photograph</h3>
          <button onClick={() => { setUploaded(true); toast("Image uploaded"); }} className="w-full flex flex-col items-center justify-center py-12 rounded-lg" style={{ border: `2px dashed ${uploaded ? C.green : C.line}`, background: uploaded ? C.greenSoft : "#fafafa" }}>
            {uploaded ? <><Check size={26} color={C.green} /><span className="text-[14px] mt-2" style={{ fontFamily: HEAD }}>photograph.jpg uploaded</span><span className="text-[12px] text-neutral-500">Room mock-ups auto-generated for enabled scenes</span></>
              : <><Upload size={26} color={C.gray} /><span className="text-[14px] mt-2" style={{ fontFamily: HEAD }}>Drag & drop or click to upload</span><span className="text-[12px] text-neutral-500">High-res JPG/PNG · we handle resizing & watermarking</span></>}
          </button>
        </div>
        <div>
          <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>2 · Details</h3>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Print name (e.g. Leopard — Colour)" className="w-full py-3 px-3 text-[14px] outline-none mb-3" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} />
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <div className="relative"><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full appearance-none py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>{CATEGORY_NAMES.map((c) => <option key={c}>{c}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-3.5 pointer-events-none" /></div>
            <div className="relative"><select value={ratio} onChange={(e) => setRatio(e.target.value)} className="w-full appearance-none py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>{Object.entries(RATIOS).map(([id, r]) => <option key={id} value={id}>{r.label}</option>)}</select><ChevronDown size={16} className="absolute right-3 top-3.5 pointer-events-none" /></div>
          </div>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" rows={3} className="w-full py-3 px-3 text-[14px] outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }} />
          <div className="flex gap-4 mt-3">{[["bw", "Black & White"], ["colour", "Colour"]].map(([k, l]) => (<label key={k} className="flex items-center gap-2 text-[14px]"><input type="radio" checked={colour === k} onChange={() => setColour(k)} /> {l}</label>))}</div>
        </div>
        <div>
          <h3 className="text-[15px] mb-1" style={{ fontFamily: HEAD }}>3 · Sizes & finishes — set a price for each</h3>
          <p className="text-[12px] text-neutral-500 mb-3">Prices are pre-filled from your price list — edit any cell.</p>
          <div className="flex gap-4 flex-wrap mb-3">{MATERIALS.map((m) => (<label key={m.id} className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={enabledMats[m.id]} onChange={(e) => setEnabledMats({ ...enabledMats, [m.id]: e.target.checked })} /> {m.label}</label>))}</div>
          <div className="overflow-x-auto">
            <table className="text-[13px]" style={{ minWidth: 620 }}>
              <thead><tr className="text-neutral-500 text-[11px]"><th className="text-left font-normal py-2 pr-3">SIZE</th>{onMats.map((m) => <th key={m.id} className="font-normal py-2 px-2 text-center">{m.label.replace("Canvas — ", "Cv ").replace("Paper — ", "Pa ")}</th>)}</tr></thead>
              <tbody>{RATIOS[ratio].sizes.map((s) => (
                <tr key={s} style={{ borderTop: `1px solid ${C.line}`, opacity: enabledSizes[s] ? 1 : .45 }}>
                  <td className="py-2 pr-3"><label className="flex items-center gap-2"><input type="checkbox" checked={!!enabledSizes[s]} onChange={(e) => setEnabledSizes({ ...enabledSizes, [s]: e.target.checked })} /><span style={{ fontFamily: HEAD }}>{s}</span></label></td>
                  {onMats.map((m) => (<td key={m.id} className="py-1.5 px-2"><div className="flex items-center gap-0.5"><span className="text-[11px] text-neutral-400">R</span><input type="number" disabled={!enabledSizes[s]} value={prices[`${s}:${m.i}`] ?? ""} onChange={(e) => setPrices({ ...prices, [`${s}:${m.i}`]: e.target.value })} className="w-16 py-1 px-1 text-[12px] text-right outline-none" style={{ border: `1px solid ${C.line}`, borderRadius: 3 }} /></div></td>))}
                </tr>))}</tbody>
            </table>
          </div>
        </div>
        <div>
          <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>4 · Room previews to show</h3>
          <div className="flex gap-4 flex-wrap">{ROOMS.map((r) => (<label key={r.id} className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={!!rooms[r.id]} onChange={(e) => setRooms({ ...rooms, [r.id]: e.target.checked })} /> {r.label}</label>))}</div>
        </div>
        <Pill onClick={() => toast("Print saved & published")}>Save & publish print</Pill>
      </div>

      <div className="lg:sticky lg:top-24 h-fit">
        <h3 className="text-[13px] tracking-[.1em] mb-3 text-neutral-500" style={{ fontFamily: HEAD }}>LIVE CUSTOMER PREVIEW</h3>
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
          <div style={{ position: "relative", width: "100%", aspectRatio: "4/3" }}>
            <Scene room={firstRoom} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-52%)", width: `${SCALE[onSizes[onSizes.length - 1] || RATIOS[ratio].sizes[0]] || 50}%` }}>
              <div style={artworkStyle(onMats.find((m) => m.framed) ? "paper_framed" : "paper", "black")}><Plate product={preview} showSig={false} style={{ width: "100%", aspectRatio: RATIOS[ratio].ar }} /></div>
            </div>
          </div>
          <div className="p-4">
            <div className="text-[16px]" style={{ fontFamily: HEAD, color: C.green }}>{(name || "New Print").toUpperCase()}</div>
            <div className="text-[15px] mt-1" style={{ fontFamily: HEAD }}>{onSizes.length ? `${zar(range[0])} – ${zar(range[1])}` : "Enable a size"}</div>
            <div className="text-[12px] text-neutral-500 mt-2">{RATIOS[ratio].label} · {onSizes.length} sizes · {onMats.length} finishes · {Object.values(rooms).filter(Boolean).length} rooms</div>
          </div>
        </div>
        <p className="text-[12px] text-neutral-400 mt-3">Exactly what shoppers see. Price range updates live as you edit the grid.</p>
      </div>
    </div>
  );
}
