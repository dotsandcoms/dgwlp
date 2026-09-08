#!/usr/bin/env node
/**
 * Backfill products.animal_tags by looking at each print (vision-identified).
 * Only fills empty tags unless --force is passed.
 *
 * Usage:
 *   node scripts/backfill-animal-tags.mjs --dry-run
 *   node scripts/backfill-animal-tags.mjs
 *   node scripts/backfill-animal-tags.mjs --force
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DRY = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

/** slug → animal tags (from photograph identification) */
const TAGS_BY_SLUG = {
  "amber-ambush": ["lion"],
  "amber-stride": ["lion"],
  "amber-upward-gaze": ["leopard"],
  "among-giants": ["elephant"],
  "ancient-armor": ["rhino"],
  "ancient-trio": ["rhino"],
  "canopy-sentinel": ["leopard"],
  "canopy-vigil": ["leopard"],
  "cheetah-cub-s-embrace": ["cheetah"],
  "cheetah-in-grass": ["cheetah"],
  "cooling-giant": ["elephant"],
  "crossed-tusks": ["elephant"],
  "crossing-the-current": ["lion"],
  "dust-and-gold": ["cheetah"],
  "elephant-family": ["elephant"],
  "emerging-mane": ["lion"],
  "ethereal-quartet": ["giraffe"],
  "eye-through-leaves": ["leopard"],
  "forehead-touch": ["warthog"],
  "golden-branch-repose": ["leopard"],
  "golden-grass-vigil": ["cheetah"],
  "golden-hour-pair": ["leopard"],
  "golden-lookback": ["lion", "lioness"],
  "golden-vigil": ["lion", "lioness"],
  "grassland-prowl": ["leopard"],
  "grassline-watch": ["lion"],
  "herd-beneath-giants": ["wildebeest"],
  "high-limb-vigil": ["leopard"],
  "horizon-sentinel": ["cheetah"],
  "iron-profile": ["buffalo"],
  "ivory-curves": ["elephant"],
  "ivory-passage": ["elephant"],
  "kindred-greeting": ["lion"],
  "knowing-presence": ["hyena"],
  "leopard-in-shadow": ["leopard"],
  lion: ["lion", "lioness"],
  "lion-through-grass": ["lion"],
  "lioness-in-light": ["lion", "lioness"],
  "lone-horizon": ["elephant"],
  "luminous-mane": ["zebra"],
  "meeting-of-horns": ["rhino"],
  "midnight-regard": ["giraffe"],
  "nursing-elephant-calf": ["elephant"],
  "open-maw": ["hippo"],
  "over-the-shoulder": ["leopard"],
  "painted-dog-at-dusk": ["wild dog"],
  "painted-gaze": ["wild dog"],
  "painted-vigil": ["wild dog"],
  "paired-procession": ["giraffe"],
  "pale-procession": ["wildebeest"],
  "quiet-alliance": ["giraffe"],
  "quiet-drink": ["leopard"],
  "quiet-waters": ["hippo"],
  "regal-profile": ["lion"],
  "river-contenders": ["elephant"],
  "riverbank-browse": ["elephant"],
  "shadowed-colossus": ["elephant"],
  "shadowed-king": ["lion"],
  "shared-shoulder": ["zebra"],
  "shared-vigil": ["impala"],
  "soft-repose": ["zebra"],
  "spiral-crown": ["kudu"],
  "stark-perch": ["leopard"],
  "stormfront-sovereign": ["elephant"],
  "stripe-tapestry": ["zebra"],
  "striped-vigil": ["zebra"],
  "the-long-march": ["elephant"],
  "through-the-leaves": ["leopard"],
  "toward-light": ["elephant"],
  "weathered-boss": ["buffalo"],
  "weathered-perch": ["leopard"],
  "weathered-trunk": ["elephant"],
  "young-lion-profile": ["lion"],
  "young-sovereign": ["lion"],
  "youthful-intent": ["lion"],
};

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

  const { data: products, error } = await sb.from("products").select("id,name,slug,animal_tags").order("name");
  if (error) throw error;

  let updated = 0;
  let skipped = 0;
  let missing = 0;
  const counts = {};

  console.log(`Products: ${products.length}${DRY ? " (dry-run)" : ""}${FORCE ? " (force)" : ""}`);

  for (const p of products) {
    const tags = TAGS_BY_SLUG[p.slug];
    if (!tags?.length) {
      missing++;
      console.log(`  ? no mapping: ${p.name} (${p.slug})`);
      continue;
    }

    const has = Array.isArray(p.animal_tags) && p.animal_tags.length > 0;
    if (has && !FORCE) {
      skipped++;
      console.log(`  · keep ${p.slug} → [${p.animal_tags.join(", ")}]`);
      for (const t of p.animal_tags) counts[t] = (counts[t] || 0) + 1;
      continue;
    }

    console.log(`  ${has ? "↻" : "+"} ${p.slug} → [${tags.join(", ")}]`);
    for (const t of tags) counts[t] = (counts[t] || 0) + 1;

    if (DRY) {
      updated++;
      continue;
    }

    const { error: uErr } = await sb.from("products").update({ animal_tags: tags }).eq("id", p.id);
    if (uErr) throw uErr;
    updated++;
  }

  console.log("\nDone.");
  console.log(`  updated=${updated} skipped=${skipped} missing=${missing}`);
  console.log("  counts:", Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1])));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
