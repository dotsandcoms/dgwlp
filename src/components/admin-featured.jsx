"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Save, Star, ChevronUp, ChevronDown, Search, X } from "lucide-react";
import { C, HEAD, zar } from "@/lib/pricing";
import { imageUrl } from "@/lib/supabase";
import { friendlyError } from "@/lib/errors";
import * as db from "@/lib/admin-data";
import { Plate, Pill } from "./primitives";

/**
 * Pick up to FEATURED_MAX published prints for the home “New & Featured” strip.
 */
export function LiveFeatured({ products = [], toast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ids, setIds] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    db.fetchFeaturedIds()
      .then((list) => { if (!cancelled) setIds(list); })
      .catch((e) => toast(friendlyError(e, "Could not load featured prints")))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [toast]);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const selected = ids.map((id) => byId.get(id)).filter(Boolean);
  const selectedSet = useMemo(() => new Set(ids), [ids]);

  const available = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products
      .filter((p) => p.is_published)
      .filter((p) => !selectedSet.has(p.id))
      .filter((p) => {
        if (!term) return true;
        return (
          (p.name || "").toLowerCase().includes(term) ||
          (p.category_name || "").toLowerCase().includes(term) ||
          (p.slug || "").toLowerCase().includes(term)
        );
      });
  }, [products, selectedSet, q]);

  const add = (id) => {
    if (ids.length >= db.FEATURED_MAX) {
      toast(`You can feature up to ${db.FEATURED_MAX} prints`);
      return;
    }
    if (ids.includes(id)) return;
    setIds([...ids, id]);
  };

  const remove = (id) => setIds(ids.filter((x) => x !== id));

  const move = (index, dir) => {
    const next = [...ids];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setIds(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const saved = await db.saveFeaturedIds(ids);
      setIds(saved);
      toast("Featured prints saved");
    } catch (e) {
      toast(friendlyError(e, "Could not save featured prints"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-neutral-500 text-[14px] flex items-center justify-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Loading featured…
      </div>
    );
  }

  return (
    <div className="max-w-[900px]">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-[20px] mb-1" style={{ fontFamily: HEAD }}>Featured prints</h2>
          <p className="text-[13px] text-neutral-500 max-w-lg">
            Choose up to {db.FEATURED_MAX} published prints for the home page “New &amp; Featured” section. Order here is the order on the site.
          </p>
        </div>
        <Pill onClick={save} disabled={saving}>
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save featured</>}
        </Pill>
      </div>

      <section className="p-5 sm:p-6 mb-6 bg-white" style={{ border: `1px solid ${C.line}`, borderRadius: 8 }}>
        <div className="flex items-center gap-2 mb-4">
          <Star size={16} color={C.green} />
          <h3 className="text-[15px]" style={{ fontFamily: HEAD }}>
            On the home page ({selected.length}/{db.FEATURED_MAX})
          </h3>
        </div>
        {selected.length === 0 ? (
          <p className="text-[13px] text-neutral-500 py-4">
            None selected yet — the home page will show the newest prints until you save a selection.
          </p>
        ) : (
          <ul className="space-y-2">
            {selected.map((p, i) => (
              <li
                key={p.id}
                className="flex items-center gap-3 p-2 sm:p-3"
                style={{ border: `1px solid ${C.line}`, borderRadius: 6 }}
              >
                <span className="text-[12px] text-neutral-400 w-5 shrink-0" style={{ fontFamily: HEAD }}>{i + 1}</span>
                <Plate
                  product={{ image: imageUrl(p.hero_image), colour: p.colour === "both" ? "colour" : p.colour, name: p.name, grad: ["#333", "#9a9a97"], angle: 120 }}
                  showSig={false}
                  style={{ width: 48, height: 48, borderRadius: 3, flexShrink: 0 }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] truncate" style={{ fontFamily: HEAD }}>{p.name}</div>
                  <div className="text-[12px] text-neutral-500 truncate">
                    {p.category_name}
                    {p.min_cents ? ` · ${zar(p.min_cents / 100)} – ${zar(p.max_cents / 100)}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-neutral-400 hover:text-black disabled:opacity-30">
                    <ChevronUp size={16} />
                  </button>
                  <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="p-1.5 text-neutral-400 hover:text-black disabled:opacity-30">
                    <ChevronDown size={16} />
                  </button>
                  <button type="button" aria-label="Remove" onClick={() => remove(p.id)} className="p-1.5 text-neutral-400 hover:text-red-500">
                    <X size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="p-5 sm:p-6 bg-white" style={{ border: `1px solid ${C.line}`, borderRadius: 8 }}>
        <h3 className="text-[15px] mb-3" style={{ fontFamily: HEAD }}>Add from catalogue</h3>
        <div className="flex items-center gap-2 mb-4 px-3 py-2.5" style={{ border: `1px solid ${C.line}`, borderRadius: 4 }}>
          <Search size={15} color={C.gray} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search published prints…"
            className="flex-1 text-[14px] outline-none bg-transparent"
          />
        </div>
        {available.length === 0 ? (
          <p className="text-[13px] text-neutral-500 py-4">
            {ids.length >= db.FEATURED_MAX ? "Featured list is full — remove one to add another." : "No matching published prints."}
          </p>
        ) : (
          <ul className="space-y-2 max-h-[420px] overflow-y-auto">
            {available.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 p-2 sm:p-3"
                style={{ border: `1px solid ${C.line}`, borderRadius: 6 }}
              >
                <Plate
                  product={{ image: imageUrl(p.hero_image), colour: p.colour === "both" ? "colour" : p.colour, name: p.name, grad: ["#333", "#9a9a97"], angle: 120 }}
                  showSig={false}
                  style={{ width: 44, height: 44, borderRadius: 3, flexShrink: 0 }}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] truncate" style={{ fontFamily: HEAD }}>{p.name}</div>
                  <div className="text-[12px] text-neutral-500 truncate">{p.category_name}</div>
                </div>
                <button
                  type="button"
                  onClick={() => add(p.id)}
                  disabled={ids.length >= db.FEATURED_MAX}
                  className="text-[12px] px-3 py-1.5 rounded-full disabled:opacity-40"
                  style={{ border: `1px solid ${C.green}`, color: C.green, fontFamily: HEAD }}
                >
                  Add
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function DemoFeatured({ toast }) {
  // Demo mode has no catalogue wired here — still exercises localStorage save.
  return <LiveFeatured products={[]} toast={toast} />;
}
