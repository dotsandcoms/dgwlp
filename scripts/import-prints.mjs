#!/usr/bin/env node
/**
 * Bulk-import Deron Goldstein Wildlife Photography prints from a local folder tree.
 *
 * Usage:
 *   node scripts/import-prints.mjs
 *   node scripts/import-prints.mjs --dry-run
 *   node scripts/import-prints.mjs --dir "/path/to/DGWLP"
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const dirIdx = args.indexOf("--dir");
const SOURCE =
  (dirIdx >= 0 && args[dirIdx + 1]) ||
  path.join(process.env.HOME || "", "Downloads", "Deron website", "DGWLP");

const SKIP_FILES = new Set(["_T5A0427.jpg"]); // already catalogued as "Lion"
const ROOM_IDS = ["lounge", "bedroom", "gallery"];
const MATERIALS = ["paper", "paper_framed", "canvas_rolled", "canvas_framed", "canvas_mounted"];

/** Folder name on disk → category name in Supabase */
const FOLDER_TO_CATEGORY = {
  "HIgh Key": "HIgh Key",
  "Limited edition": "Limited Edition",
  Panoramas: "Panoramas",
  "Browsers and Grazers": "Browsers & Grazers",
  Predators: "Predators",
};

const RATIO_TARGETS = [
  { id: "portrait", r: 3 / 4 },
  { id: "landscape", r: 3 / 2 },
  { id: "pan2", r: 2 / 1 },
  { id: "pano", r: 3 / 1 },
];

function loadEnv() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) throw new Error("Missing .env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\n/)) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[m[1]] = v;
  }
  return env;
}

const slugify = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "print";

function classifyRatio(width, height, filename) {
  const r = width / Math.max(height, 1);
  const fromPixels = () => {
    let best = RATIO_TARGETS[0];
    let bestDist = Infinity;
    for (const t of RATIO_TARGETS) {
      const d = Math.abs(Math.log(r) - Math.log(t.r));
      if (d < bestDist) {
        bestDist = d;
        best = t;
      }
    }
    return best.id;
  };

  // Filename hints only win when they agree with the measured orientation.
  if (/\(3\s*[x×]\s*1\)/i.test(filename) && r > 2.4) return "pano";
  if (/\(2\s*[x×]\s*1\)/i.test(filename) && r > 1.7) return "pan2";
  if (/\(4\s*[x×]\s*3\)/i.test(filename)) return height >= width ? "portrait" : "landscape";
  if (/\(3\s*[x×]\s*4\)/i.test(filename)) return "portrait";

  return fromPixels();
}

/** Average chroma relative to value — low ⇒ B&W. */
async function detectColour(buffer) {
  const { data, info } = await sharp(buffer)
    .resize(64, 64, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let chromaSum = 0;
  const n = info.width * info.height;
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    chromaSum += max === 0 ? 0 : (max - min) / max;
  }
  return chromaSum / n < 0.08 ? "bw" : "colour";
}

async function prepareImage(filePath) {
  const input = fs.readFileSync(filePath);
  const meta = await sharp(input).metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;
  const colour = await detectColour(input);

  // Store as high-quality JPEG in the prints bucket (TIFF → JPEG).
  const jpeg = await sharp(input)
    .rotate() // honour EXIF orientation
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  return { width, height, colour, jpeg, bytes: jpeg.length };
}

function uniqueSlug(base, used) {
  let slug = base;
  let n = 2;
  while (used.has(slug)) {
    slug = `${base}-${n++}`;
  }
  used.add(slug);
  return slug;
}

async function main() {
  const names = JSON.parse(fs.readFileSync(path.join(__dirname, "import-names.json"), "utf8"));
  const env = loadEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }

  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: categories, error: cErr } = await sb.from("categories").select("id,name,slug");
  if (cErr) throw cErr;
  const catByName = new Map((categories || []).map((c) => [c.name, c]));

  const { data: sizes, error: sErr } = await sb.from("sizes").select("id,ratio_id,sort").order("sort");
  if (sErr) throw sErr;
  const sizesByRatio = new Map();
  for (const s of sizes || []) {
    if (!sizesByRatio.has(s.ratio_id)) sizesByRatio.set(s.ratio_id, []);
    sizesByRatio.get(s.ratio_id).push(s.id);
  }

  const { data: priceRows, error: pErr } = await sb.from("price_list").select("size_id,material_id,price_cents");
  if (pErr) throw pErr;
  const priceMap = new Map((priceRows || []).map((r) => [`${r.size_id}:${r.material_id}`, r.price_cents]));

  const { data: existing, error: eErr } = await sb.from("products").select("id,name,slug,sku,hero_image");
  if (eErr) throw eErr;
  const usedSlugs = new Set((existing || []).map((p) => p.slug));
  const existingHero = (existing || []).map((p) => (p.hero_image || "").toLowerCase());

  const jobs = [];
  for (const [folder, fileMap] of Object.entries(names)) {
    const folderPath = path.join(SOURCE, folder);
    if (!fs.existsSync(folderPath)) {
      console.warn(`⚠ Missing folder: ${folderPath}`);
      continue;
    }
    const categoryName = FOLDER_TO_CATEGORY[folder] || folder;
    const category = catByName.get(categoryName);
    if (!category) throw new Error(`Category not found in Supabase: ${categoryName}`);

    for (const [filename, title] of Object.entries(fileMap)) {
      const filePath = path.join(folderPath, filename);
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠ Missing file: ${filePath}`);
        continue;
      }
      if (SKIP_FILES.has(filename)) {
        console.log(`↷ skip duplicate ${filename} (${title || "Lion"})`);
        continue;
      }
      const stem = filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
      if (existingHero.some((h) => h.includes(stem.slice(0, 12)) || h.includes(slugify(filename.replace(/\.[^.]+$/, ""))))) {
        // soft check — Lion uses t5a0427 in path
        const cameraCode = filename.match(/[tTxX0-9A-Za-z]{6,}/)?.[0]?.toLowerCase();
        if (cameraCode && existingHero.some((h) => h.includes(cameraCode.toLowerCase().replace(/^_/, "")))) {
          console.log(`↷ skip likely duplicate of existing hero: ${filename}`);
          continue;
        }
      }
      jobs.push({ folder, folderPath, filename, filePath, title, category, limited: categoryName === "Limited Edition" });
    }
  }

  console.log(`\nImporting ${jobs.length} prints from ${SOURCE}${DRY ? " (dry-run)" : ""}\n`);

  let ok = 0;
  let fail = 0;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const label = `[${i + 1}/${jobs.length}] ${job.category.name} · ${job.filename}`;
    try {
      const prepared = await prepareImage(job.filePath);
      const ratio = classifyRatio(prepared.width, prepared.height, job.filename);
      const enabledSizes = (sizesByRatio.get(ratio) || []).slice(0, 2); // admin default: first 2 sizes
      if (!enabledSizes.length) throw new Error(`No sizes for ratio ${ratio}`);

      const variants = [];
      for (const sizeId of enabledSizes) {
        for (const mat of MATERIALS) {
          const cents = priceMap.get(`${sizeId}:${mat}`);
          if (!cents) continue;
          variants.push({ size_id: sizeId, material_id: mat, price_cents: cents });
        }
      }
      if (!variants.length) throw new Error(`No price variants for ${ratio}`);

      const slug = uniqueSlug(slugify(job.title), usedSlugs);
      const storageName = `${Date.now()}-${slug}.jpg`;

      console.log(
        `${label}\n    → "${job.title}" | ${ratio} ${prepared.width}×${prepared.height} | ${prepared.colour} | ${(prepared.bytes / 1024 / 1024).toFixed(1)}MB | ${variants.length} variants`
      );

      if (DRY) {
        ok++;
        continue;
      }

      const { error: upErr } = await sb.storage.from("prints").upload(storageName, prepared.jpeg, {
        contentType: "image/jpeg",
        upsert: false,
        cacheControl: "3600",
      });
      if (upErr) throw upErr;

      const { data: product, error: insErr } = await sb
        .from("products")
        .insert({
          name: job.title,
          slug,
          sku: slug,
          category_id: job.category.id,
          ratio_id: ratio,
          colour: prepared.colour,
          description: "",
          hero_image: storageName,
          is_published: true,
          is_limited_edition: job.limited,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      const { error: vErr } = await sb
        .from("product_variants")
        .insert(variants.map((v) => ({ ...v, product_id: product.id })));
      if (vErr) throw vErr;

      const { error: rErr } = await sb
        .from("product_rooms")
        .insert(ROOM_IDS.map((room_id) => ({ product_id: product.id, room_id })));
      if (rErr) throw rErr;

      ok++;
    } catch (err) {
      fail++;
      console.error(`✖ ${label}: ${err.message || err}`);
    }
  }

  console.log(`\nDone. imported=${ok} failed=${fail} dry=${DRY}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
