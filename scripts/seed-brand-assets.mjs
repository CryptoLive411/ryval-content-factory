#!/usr/bin/env node
/**
 * Seed brand_assets from the school catalog: fetch each real logo, pull the
 * program colours out of its pixels, and record a confidence score.
 * Usage: node scripts/seed-brand-assets.mjs [limit]
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { brandAssetFromSchool, dominantColors } from "../src/lib/brand-assets.ts";

const require = createRequire(import.meta.url);
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "RyvalContentFactory/1.0 (https://ryvalcontent.space)";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function logoPixels(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "image/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const img = await loadImage(Buffer.from(await res.arrayBuffer()));
    if (!img?.width) return null;
    const size = 96;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);
    return ctx.getImageData(0, 0, size, size).data;
  } catch {
    return null;
  }
}

async function main() {
  const limit = Number(process.argv[2] ?? 60);
  const schools = JSON.parse(readFileSync(join(root, "src/data/schools.json"), "utf8"));
  const ncaa = schools.filter((s) => s.association === "NCAA" && s.logoUrl).slice(0, limit);

  const rows = [];
  let resolved = 0;
  const LANES = 8;
  let cursor = 0;
  await Promise.all(
    Array.from({ length: LANES }, async () => {
      while (cursor < ncaa.length) {
        const school = ncaa[cursor++];
        const pixels = await logoPixels(school.logoUrl);
        const colors = pixels ? dominantColors(pixels) : { primary: null, secondary: null };
        if (pixels) resolved += 1;
        rows.push(
          brandAssetFromSchool(school, {
            primaryColor: colors.primary,
            secondaryColor: colors.secondary,
            logoResolved: Boolean(pixels),
          }),
        );
      }
    }),
  );

  let saved = 0;
  for (let i = 0; i < rows.length; i += 200) {
    const { data, error } = await db
      .from("brand_assets")
      .upsert(rows.slice(i, i + 200), { onConflict: "program_name,team", ignoreDuplicates: false })
      .select("id");
    if (error) throw new Error(error.message);
    saved += data?.length ?? 0;
  }

  console.log(JSON.stringify({ attempted: ncaa.length, logosResolved: resolved, saved }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
