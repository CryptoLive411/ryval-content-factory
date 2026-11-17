/**
 * Download a large Unsplash soccer library into public/stock and write
 * src/data/stock-catalog.json. Skips Unsplash+ premium photos.
 *
 *   bun scripts/build-stock-library.mjs
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const OUT_DIR = join(ROOT, "public/stock");
const CATALOG = join(ROOT, "src/data/stock-catalog.json");
const UA = "RyvalContentFactory/1.0 (https://ryvalcontent.space)";

const TARGET = { women: 320, men: 320, neutral: 170 };

const QUERIES = [
  { q: "women soccer match", gender: "women" },
  { q: "female soccer player kick", gender: "women" },
  { q: "girls soccer game", gender: "women" },
  { q: "women footballer pitch", gender: "women" },
  { q: "women soccer goalkeeper", gender: "women" },
  { q: "women soccer team celebration", gender: "women" },
  { q: "female football match jersey", gender: "women" },
  { q: "men soccer match", gender: "men" },
  { q: "male soccer player kick", gender: "men" },
  { q: "footballer dribbling", gender: "men" },
  { q: "men soccer goalkeeper", gender: "men" },
  { q: "mens soccer celebration", gender: "men" },
  { q: "male footballer header", gender: "men" },
  { q: "soccer player training grass", gender: "men" },
  { q: "soccer stadium night", gender: "neutral" },
  { q: "soccer ball on grass", gender: "neutral" },
  { q: "empty soccer pitch", gender: "neutral" },
  { q: "soccer goal net", gender: "neutral" },
  { q: "football stadium stands", gender: "neutral" },
  { q: "womens college soccer", gender: "women" },
  { q: "woman soccer training", gender: "women" },
  { q: "female soccer tackle", gender: "women" },
  { q: "girls soccer goalkeeper", gender: "women" },
  { q: "women soccer warm up", gender: "women" },
  { q: "female soccer header", gender: "women" },
  { q: "college mens soccer match", gender: "men" },
  { q: "mens soccer tackle", gender: "men" },
  { q: "soccer striker goal", gender: "men" },
  { q: "male soccer warm up", gender: "men" },
  { q: "boys soccer match", gender: "men" },
  { q: "soccer midfielder kick", gender: "men" },
  { q: "soccer corner flag", gender: "neutral" },
  { q: "football pitch aerial", gender: "neutral" },
  { q: "soccer stadium empty", gender: "neutral" },
  { q: "soccer ball close up grass", gender: "neutral" },
  { q: "night soccer stadium lights", gender: "neutral" },
];

const BAD =
  /american football|nfl|quarterback|touchdown|super bowl|rugby|basketball|tennis|golf|baseball|volleyball|hockey|yoga|gym\b|fitness|wedding|illustration|cartoon|vector|logo|helmet|gridiron|cheerleader|swimming|marathon|cricket|boxing|skateboard|snowboard|\bsurf\b|selfie|concert|dj\b|laptop|office|food|coffee|dog|cat|horse|bicycle|cycling|formula|nascar|wrestling|mma|ufc/i;

const SOCCER =
  /soccer|footballer|football match|football player|football game|goalkeeper|goalie|cleats|\bpitch\b|jersey|fifa|\bdribbl|\bkick\b|header|stadium|goal net|penalty/i;

const KNOWN = [
  { id: "1624280157150-4d1ed8632989", tags: ["women", "kick", "jersey", "pitch"], gender: "women" },
  { id: "1629977007398-a17feb6ddf14", tags: ["women", "shot", "goalkeeper", "pitch"], gender: "women" },
  { id: "1528162841823-9e55a8cc2f58", tags: ["women", "match", "team", "pitch"], gender: "women" },
  { id: "1748803070467-449c6a2cab4f", tags: ["women", "compete", "ball", "pitch"], gender: "women" },
  { id: "1603291697926-7e5822ed1ac5", tags: ["women", "run", "jersey", "pitch"], gender: "women" },
  { id: "1770237711452-037a780f2a87", tags: ["women", "kick", "youth", "pitch"], gender: "women" },
  { id: "1527857111305-b7ed945b0f88", tags: ["women", "match", "team", "pitch"], gender: "women" },
  { id: "1542680283-b96aadf08a09", tags: ["women", "kick", "ball", "pitch"], gender: "women" },
  { id: "1574629810360-7efbbe195018", tags: ["men", "match", "kick", "pitch"], gender: "men" },
  { id: "1431324155629-1a6deb1dec8d", tags: ["men", "match", "crowd", "pitch"], gender: "men" },
  { id: "1560272564-c83b66b1ad12", tags: ["men", "dribble", "pitch"], gender: "men" },
  { id: "1553778263-73a83bab9b0c", tags: ["men", "strike", "kick", "pitch"], gender: "men" },
  { id: "1748112200967-a850deb20db6", tags: ["men", "kick", "ball", "pitch"], gender: "men" },
  { id: "1757031298198-79b5e06942f3", tags: ["men", "header", "match", "pitch"], gender: "men" },
  { id: "1748803070462-d31bc19d6693", tags: ["men", "field", "game", "pitch"], gender: "men" },
  { id: "1751394213895-92cc13bae7cf", tags: ["men", "jersey", "celebrate", "pitch"], gender: "men" },
  { id: "1517927033932-b3d18e61fb3a", tags: ["men", "dribble", "match", "pitch"], gender: "men" },
  { id: "1545525201-e1a5a2a18293", tags: ["men", "stadium", "stand", "pitch"], gender: "men" },
  { id: "1779142167168-458a646f596e", tags: ["men", "celebrate", "field", "pitch"], gender: "men" },
  { id: "1522778119026-d647f0596c20", tags: ["stadium", "pitch"], gender: "neutral" },
  { id: "1517747614396-d21a78b850e8", tags: ["stadium", "night", "lights"], gender: "neutral" },
  { id: "1434648957308-5e6a859697e8", tags: ["stadium", "crowd", "fans"], gender: "neutral" },
  { id: "1575361204480-aadea25e6e68", tags: ["ball", "grass", "pitch"], gender: "neutral" },
  { id: "1579952363873-27f3bade9f55", tags: ["ball", "close", "grass"], gender: "neutral" },
  { id: "1570498839593-e565b39455fc", tags: ["ball", "field", "sky"], gender: "neutral" },
  { id: "1486286701208-1d58e9338013", tags: ["ball", "grass"], gender: "neutral" },
  { id: "1551958219-acbc608c6377", tags: ["balls", "training", "pitch"], gender: "neutral" },
  { id: "1543351611-58f69d7c1781", tags: ["field", "wide", "pitch"], gender: "neutral" },
  { id: "1459865264687-595d652de67e", tags: ["field", "line", "grass"], gender: "neutral" },
  { id: "1520481832994-0b9b5984787c", tags: ["stadium", "night", "lineup"], gender: "neutral" },
  { id: "1706675780107-7c43cc487928", tags: ["stadium", "night", "match"], gender: "neutral" },
];

function photoId(urls) {
  const raw = `${urls?.raw ?? ""} ${urls?.full ?? ""} ${urls?.regular ?? ""}`;
  if (/plus\.unsplash\.com|premium_photo/i.test(raw)) return null;
  const match = raw.match(/photo-(\d{10,}-[a-z0-9]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function saysWomen(text) {
  return /\b(women'?s?|woman|female|girls?|ladies)\b/i.test(text);
}
function saysMen(text) {
  return /\b(men'?s?|man\b|boys?|male)\b/i.test(text);
}

function accept(text, gender) {
  const blob = text.replace(/\s+/g, " ").trim();
  if (!blob || BAD.test(blob)) return false;
  if (!SOCCER.test(blob) && !/\bfootball\b/i.test(blob)) return false;
  if (/\bfootball\b/i.test(blob) && !SOCCER.test(blob)) return false;
  const women = saysWomen(blob);
  const men = saysMen(blob);
  if (gender === "women" && men && !women) return false;
  if (gender === "men" && women && !men) return false;
  if (gender === "neutral") {
    if (/\b(player|players|footballer|goalkeeper|goalie|woman|women|man|men|boy|girl|team|jersey)\b/i.test(blob)) {
      return false;
    }
    if (!/\b(stadium|pitch|field|grass|ball|goal|net|stands)\b/i.test(blob)) return false;
  }
  return true;
}

function tagsFor(text, gender) {
  const tags = new Set([gender === "neutral" ? "pitch" : gender]);
  if (/goalkeep|goalie|\bsave\b/i.test(text)) tags.add("goalkeeper");
  if (/celebrat/i.test(text)) tags.add("celebrate");
  if (/stadium|stands|crowd/i.test(text)) tags.add("stadium");
  if (/ball/i.test(text)) tags.add("ball");
  if (/kick|strike/i.test(text)) tags.add("kick");
  if (/dribbl/i.test(text)) tags.add("dribble");
  if (/train|practice/i.test(text)) tags.add("training");
  if (/pitch|field|grass/i.test(text)) tags.add("pitch");
  return [...tags];
}

async function search(query, page) {
  const url = `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=20&page=${page}`;
  const res = await fetch(url, { headers: { Accept: "application/json", "User-Agent": UA } });
  if (!res.ok) throw new Error(`search ${res.status} ${query} p${page}`);
  const json = await res.json();
  return json.results ?? [];
}

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function download(id) {
  const file = join(OUT_DIR, `${id}.jpg`);
  if (await exists(file)) return file;
  const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1080&h=1350&q=70`;
  const res = await fetch(url, { headers: { Accept: "image/jpeg", "User-Agent": UA } });
  if (!res.ok) throw new Error(`download ${res.status} ${id}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 20_000 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error(`not a jpeg ${id} (${buf.length})`);
  }
  await writeFile(file, buf);
  return file;
}

await mkdir(OUT_DIR, { recursive: true });

const chosen = new Map();
let existing = [];
try {
  existing = JSON.parse(await readFile(CATALOG, "utf8"));
} catch {
  existing = [];
}
for (const row of [...KNOWN, ...existing]) {
  if (!row?.id) continue;
  chosen.set(row.id, {
    id: row.id,
    tags: row.tags ?? [row.gender],
    gender: row.gender,
    credit: row.credit ?? "",
  });
}

for (const spec of QUERIES) {
  let have = [...chosen.values()].filter((row) => row.gender === spec.gender).length;
  for (let page = 1; page <= 25 && have < TARGET[spec.gender]; page++) {
    let results = [];
    try {
      results = await search(spec.q, page);
    } catch (e) {
      console.log("search fail", spec.q, page, e instanceof Error ? e.message : e);
      break;
    }
    if (!results.length) break;
    for (const photo of results) {
      if (have >= TARGET[spec.gender]) break;
      const id = photoId(photo.urls);
      if (!id || chosen.has(id)) continue;
      const text = `${photo.alt_description ?? ""} ${photo.description ?? ""} ${photo.slug ?? ""}`;
      if (!accept(text, spec.gender)) continue;
      const women = saysWomen(text);
      const men = saysMen(text);
      let gender = spec.gender;
      if (women && !men) gender = "women";
      else if (men && !women) gender = "men";
      if (spec.gender === "neutral") gender = "neutral";
      if (spec.gender !== "neutral" && gender !== spec.gender) continue;
      chosen.set(id, {
        id,
        tags: tagsFor(text, gender),
        gender,
        credit: photo.user?.name ?? "",
      });
      have += 1;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  console.log(spec.gender, spec.q, "pool", [...chosen.values()].filter((row) => row.gender === spec.gender).length);
}

const rows = [...chosen.values()];
console.log(
  "selected",
  rows.length,
  "women",
  rows.filter((r) => r.gender === "women").length,
  "men",
  rows.filter((r) => r.gender === "men").length,
  "neutral",
  rows.filter((r) => r.gender === "neutral").length,
);

let saved = 0;
let failed = 0;
const kept = [];
const queue = [...rows];
async function worker() {
  for (;;) {
    const row = queue.shift();
    if (!row) return;
    try {
      await download(row.id);
      kept.push(row);
      saved += 1;
      if (saved % 25 === 0) console.log("saved", saved);
    } catch (e) {
      failed += 1;
      console.log("skip", row.id, e instanceof Error ? e.message : e);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, () => worker()));
kept.sort((a, b) => a.gender.localeCompare(b.gender) || a.id.localeCompare(b.id));
await writeFile(CATALOG, JSON.stringify(kept, null, 2) + "\n");
console.log("catalog", kept.length, "failed", failed);
