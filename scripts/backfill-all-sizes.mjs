#!/usr/bin/env node
/**
 * Backfill every published product with the FULL price-list size × finish grid
 * for its ratio (matches Price List Final.xlsx).
 *
 * Usage: node scripts/backfill-all-sizes.mjs [--dry-run]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry-run");
const MATERIALS = ["paper", "paper_framed", "canvas_rolled", "canvas_framed", "canvas_mounted"];

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\n/)) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: products, error: pErr } = await sb.from("products").select("id,name,ratio_id,slug");
  if (pErr) throw pErr;

  const { data: sizes, error: sErr } = await sb.from("sizes").select("id,ratio_id,sort").order("sort");
  if (sErr) throw sErr;
  const sizesByRatio = new Map();
  for (const s of sizes || []) {
    if (!sizesByRatio.has(s.ratio_id)) sizesByRatio.set(s.ratio_id, []);
    sizesByRatio.get(s.ratio_id).push(s.id);
  }

  const { data: priceRows, error: plErr } = await sb.from("price_list").select("size_id,material_id,price_cents");
  if (plErr) throw plErr;
  const priceMap = new Map((priceRows || []).map((r) => [`${r.size_id}:${r.material_id}`, r.price_cents]));

  console.log(`Backfilling ${products.length} products${DRY ? " (dry-run)" : ""}…`);

  let ok = 0;
  let fail = 0;
  for (const p of products) {
    const sizeIds = sizesByRatio.get(p.ratio_id) || [];
    const variants = [];
    for (const sizeId of sizeIds) {
      for (const mat of MATERIALS) {
        const cents = priceMap.get(`${sizeId}:${mat}`);
        if (cents) variants.push({ product_id: p.id, size_id: sizeId, material_id: mat, price_cents: cents });
      }
    }
    console.log(`  ${p.slug} (${p.ratio_id}) → ${sizeIds.length} sizes × ${MATERIALS.length} finishes = ${variants.length} variants`);
    if (DRY) { ok++; continue; }
    try {
      const { error: delErr } = await sb.from("product_variants").delete().eq("product_id", p.id);
      if (delErr) throw delErr;
      const { error: insErr } = await sb.from("product_variants").insert(variants);
      if (insErr) throw insErr;
      ok++;
    } catch (e) {
      fail++;
      console.error(`  ✖ ${p.slug}:`, e.message || e);
    }
  }
  console.log(`Done. updated=${ok} failed=${fail}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
