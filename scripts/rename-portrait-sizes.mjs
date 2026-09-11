#!/usr/bin/env node
/**
 * Flip portrait size IDs from landscape-style (400x300) to portrait (300x400).
 * Updates sizes, price_list, product_variants, and order_items.
 *
 * Usage: node scripts/rename-portrait-sizes.mjs [--dry-run]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry-run");

const MAP = [
  ["400x300", "300x400"],
  ["800x600", "600x800"],
  ["1200x900", "900x1200"],
  ["1600x1200", "1200x1600"],
];

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

  const { data: sizes, error } = await sb.from("sizes").select("*").order("sort");
  if (error) throw error;
  console.log("sizes before:", JSON.stringify(sizes, null, 2));

  for (const [from, to] of MAP) {
    const row = (sizes || []).find((s) => s.id === from);
    if (!row) {
      const already = (sizes || []).find((s) => s.id === to);
      console.log(already ? `  already ${to}` : `  missing ${from}`);
      continue;
    }

    const [w, h] = to.split("x").map(Number);
    console.log(`  ${from} → ${to} (${w}×${h} mm)`);
    if (DRY) continue;

    const { error: insErr } = await sb.from("sizes").insert({
      ...row,
      id: to,
      width_mm: w,
      height_mm: h,
    });
    if (insErr) throw insErr;

    for (const table of ["price_list", "product_variants", "order_items"]) {
      const { error: uErr, count } = await sb.from(table).update({ size_id: to }, { count: "exact" }).eq("size_id", from);
      if (uErr) throw new Error(`${table}: ${uErr.message}`);
      console.log(`    ${table}: ${count ?? "?"} rows`);
    }

    const { error: delErr } = await sb.from("sizes").delete().eq("id", from);
    if (delErr) throw delErr;
  }

  const { data: after } = await sb.from("sizes").select("id,ratio_id,sort").eq("ratio_id", "portrait").order("sort");
  console.log("portrait sizes after:", after);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
