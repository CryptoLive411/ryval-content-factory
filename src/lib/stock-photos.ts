/** Curated Unsplash soccer photos — pitch, jersey, ball, stadium. No gym / yoga / studio. */

import { nextUnusedAll } from "@/lib/rotation";
import catalog from "@/data/stock-catalog.json";

export type PhotoGender = "women" | "men" | "neutral";
/** What a slide is allowed to show. People shots are college or pro age only. */
export type ShotKind = "women" | "men" | "stadium" | "field" | "ball";
export type StockShot = { id: string; tags: string[]; gender: PhotoGender; kind: ShotKind; src?: string };

type CatalogRow = { id: string; tags: string[]; gender: PhotoGender; credit?: string };

/** Sideline coaches and referees inside an otherwise good women's match set. */
const COACH_FRAMES = new Set([
  "1527771210328-6a64f86774d2",
  "1532304468308-5ad4c9a7a2ed",
  "1553518923-c4567179ead7",
  "1553997457-24d39ee4be39",
  "1554029414-afbbc7d52746",
  "1554686177-87b3c0e1a575",
  "1554687138-f22ad1697d3c",
]);

/** College men's matches (Spartans and Georgetown). The rest of the men's library was rec-league or youth. */
const COLLEGE_MEN = new Set([
  "1543326280-b1bbbffa3557",
  "1543326440-f55a1740a988",
  "1543326727-cf6c39e8f84c",
  "1543371762-62120292ff06",
]);

/** Looks like a stadium in the tags, but the ground is not soccer. */
const NOT_SOCCER = new Set([
  "1517137879134-48acfbe3be13", // oval, not a soccer ground
  "1519932067260-478c655454f9", // city skyline, not a field
]);

function shotKind(row: CatalogRow): ShotKind | null {
  if (COACH_FRAMES.has(row.id) || NOT_SOCCER.has(row.id)) return null;
  if (COLLEGE_MEN.has(row.id)) return "men";
  const credit = (row.credit ?? "").trim().toLowerCase();
  if (credit === "jeffrey f lin") return "women";
  if (row.gender !== "neutral") return null;
  const tags = row.tags ?? [];
  if (tags.includes("ball") || tags.includes("balls")) return "ball";
  if (tags.includes("stadium")) return "stadium";
  return "field";
}

function genderForKind(kind: ShotKind): PhotoGender {
  if (kind === "women" || kind === "men") return kind;
  return "neutral";
}

/**
 * Only three kinds of picture: a college-age player, a stadium, a field, or a ball.
 * Rec-league, youth, and masters shoots are not in this list.
 */
export const SOCCER_SHOTS: StockShot[] = (catalog as CatalogRow[]).flatMap((row) => {
  const kind = shotKind(row);
  if (!kind) return [];
  return [
    {
      id: row.id,
      tags: row.tags,
      gender: genderForKind(kind),
      kind,
    },
  ];
});

/** Photos already used on recent posts, so the next carousel does not open on the same shot. */
const rotationMemory: string[] = [];

export function primeStockRotation(ids: Array<string | null | undefined>) {
  for (const id of ids) {
    if (!id || rotationMemory.includes(id)) continue;
    rotationMemory.push(id);
  }
  if (rotationMemory.length > 500) rotationMemory.splice(0, rotationMemory.length - 500);
}

const WOMEN_RE = /\b(women'?s?|woman|girls?|female|ladies)\b/i;
const MEN_RE = /\b(men'?s?|man\b|boys?|male|guys)\b/i;

export function inferPhotoGender(...parts: Array<string | null | undefined>): PhotoGender {
  const t = parts.filter(Boolean).join(" ").toLowerCase();
  const women = (t.match(/\b(women'?s?|woman|girls?|female|ladies)\b/g) ?? []).length;
  const men = (t.match(/\b(men'?s?|man\b|boys?|male|guys)\b/g) ?? []).length;
  if (women && men && women === men) return "neutral";
  if (WOMEN_RE.test(t) && women > men) return "women";
  if (MEN_RE.test(t) && men > women) return "men";
  return "neutral";
}

export function genderPromptLine(gender: PhotoGender): string {
  if (gender === "women") {
    return "Women's soccer on a grass pitch. Jersey, cleats, ball or goal visible. No gym, yoga, studio, or fashion.";
  }
  if (gender === "men") {
    return "Men's soccer on a grass pitch. Jersey, cleats, ball or goal visible. No gym, yoga, studio, or fashion.";
  }
  return "Soccer pitch, stadium, or match ball. No gym, yoga, studio, or fashion.";
}

export function extractStockPhotoId(url: string | null | undefined): string | null {
  if (!url) return null;
  const stockPath = url.match(/stock-(\d{10,}-[a-z0-9]+)/i);
  if (stockPath) return stockPath[1];
  const local = url.match(/\/stock\/(\d{10,}-[a-z0-9]+)/i);
  if (local) return local[1];
  const unsplash = url.match(/photo-(\d{10,}-[a-z0-9]+)/i);
  return unsplash?.[1] ?? null;
}

export function collectStockPhotoIds(urls: Array<string | null | undefined>): string[] {
  const ids: string[] = [];
  for (const url of urls) {
    const id = extractStockPhotoId(url);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

export function genderForStockId(id: string | null | undefined): PhotoGender {
  if (!id) return "neutral";
  return SOCCER_SHOTS.find((s) => s.id === id)?.gender ?? "neutral";
}

function photoUrl(id: string) {
  return `/stock/${id}.jpg`;
}

export function unsplashPhotoUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1080&h=1350&q=80`;
}

/** Preview/export src. Prefer same-origin files; fall back to Unsplash. */
export function displayPhotoSrc(url: string | null | undefined): string | null {
  if (!url || url.startsWith("data:")) return url || null;
  const id = extractStockPhotoId(url);
  if (!id) return url;
  if (url.startsWith("/stock/") || url.includes("/stock/")) return `/stock/${id}.jpg`;
  return `/stock/${id}.jpg`;
}

export function stockPhotoSrc(shot: StockShot | string) {
  if (typeof shot === "string") {
    const row = SOCCER_SHOTS.find((s) => s.id === shot);
    if (row?.src) return row.src;
    if (shot.startsWith("/") || shot.startsWith("http") || shot.startsWith("data:")) return shot;
    return photoUrl(shot);
  }
  return shot.src || photoUrl(shot.id);
}

export function isMissingSlidePhoto(url: string | null | undefined) {
  return !url || url.startsWith("data:");
}

/** Generic soccer stock. Fine for recruiting facts, wrong on a school spotlight. */
export function isGenericCampusPhoto(url: string | null | undefined) {
  if (!url || url.startsWith("data:")) return true;
  const u = url.toLowerCase();
  return (
    u.startsWith("/stock/") ||
    u.includes("/stock/") ||
    u.startsWith("/cta-bg/") ||
    u.includes("/cta-bg/") ||
    u.includes("images.unsplash.com")
  );
}

export function pickCinematicFieldPhoto(
  _salt = 0,
  excludeIds: string[] = [],
  prefer: "stadium" | "ball" | "any" = "any",
): { photoId: string; url: string } {
  const all = SOCCER_SHOTS.filter((s) => s.gender === "neutral");
  const tagged =
    prefer === "stadium"
      ? all.filter((s) => s.tags.includes("stadium") || s.tags.includes("field"))
      : prefer === "ball"
        ? all.filter((s) => s.tags.includes("ball") || s.tags.includes("balls"))
        : all;
  const pool = tagged.length ? tagged : all;
  const used = new Set(excludeIds.filter(Boolean));
  const unused = pool.filter((s) => !used.has(s.id));
  const queue = unused.length ? unused : pool;
  const shot = queue[Math.abs(_salt) % queue.length] ?? queue[0];
  if (!shot) throw new Error("No cinematic soccer field photo");
  return { photoId: shot.id, url: stockPhotoSrc(shot) };
}

/** Pick the picture that fits the sentence, and never a person who is not college age. */
export function shotKindFor(text: string, gender: PhotoGender = "neutral"): ShotKind {
  const t = text.toLowerCase();
  if (/\b(balls?|cleats?)\b/.test(t)) return "ball";
  if (/\b(stadium|stands|crowd|matchday|game day|under the lights)\b/.test(t)) return "stadium";
  if (/\b(visa|permit|paperwork|eligibility|scholarship|gpa|clock|passport|i-20|amateur)\b/.test(t)) {
    return "stadium";
  }
  const aboutAPlayer =
    /\b(goalkeepers?|goalies?|keepers?|forwards?|midfielders?|wingers?|fullbacks?|strikers?|center backs?)\b/.test(t) ||
    /\b(film|tape|clips?|highlights?|minutes|showcase|scout)\b/.test(t);
  if (aboutAPlayer) {
    if (gender === "women") return "women";
    if (gender === "men") return "men";
  }
  if (/\b(fields?|pitch|grass|training)\b/.test(t)) return "field";
  return gender === "women" ? "women" : "field";
}

function sceneryShots(): StockShot[] {
  return SOCCER_SHOTS.filter((shot) => shot.kind === "field" || shot.kind === "stadium" || shot.kind === "ball");
}

function shotsFor(kind: ShotKind): StockShot[] {
  const exact = SOCCER_SHOTS.filter((shot) => shot.kind === kind);
  // One verified college men's match. After that photo is used, show a field, stadium, or ball.
  if (kind === "men") {
    const seen = new Set<string>();
    const out: StockShot[] = [];
    for (const shot of [...exact, ...sceneryShots()]) {
      if (seen.has(shot.id)) continue;
      seen.add(shot.id);
      out.push(shot);
    }
    return out;
  }
  if (exact.length) return exact;
  return sceneryShots();
}

export function pickStockPhoto(
  query: string,
  _salt = 0,
  excludeIds: string[] = [],
  gender?: PhotoGender,
  hardExcludeIds: string[] = [],
): { photoId: string; url: string } {
  const resolved = gender ?? inferPhotoGender(query);
  const kind = shotKindFor(query, resolved);
  let pool = shotsFor(kind);
  if (kind === "men") {
    const blocked = new Set([...excludeIds, ...hardExcludeIds].filter(Boolean));
    const freshMen = SOCCER_SHOTS.filter((shot) => shot.kind === "men" && !blocked.has(shot.id));
    if (freshMen.length) pool = freshMen;
  }
  const start = pool.length ? Math.abs(_salt) % pool.length : 0;
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  const photoId = nextUnusedAll(
    rotated.map((shot) => shot.id),
    [...excludeIds, ...rotationMemory],
    hardExcludeIds,
  );
  if (!rotationMemory.includes(photoId)) rotationMemory.unshift(photoId);
  const shot = pool.find((row) => row.id === photoId) ?? rotated[0];
  if (!shot) throw new Error("No soccer stock photo in the pool");
  return { photoId: shot.id, url: stockPhotoSrc(shot) };
}

/** One carousel should not repeat a frame. Kinds rotate so a list does not sit on the same pitch. */
export function pickVariedSlidePhotos(opts: {
  slideCount: number;
  gender: "men" | "women";
  excludeIds?: string[];
}): string[] {
  const cycle: ShotKind[] =
    opts.gender === "women"
      ? ["women", "stadium", "ball", "field", "women", "stadium"]
      : ["stadium", "men", "ball", "field", "stadium", "ball"];
  const used = new Set(opts.excludeIds ?? []);
  const urls: string[] = [];
  for (let i = 0; i < opts.slideCount; i++) {
    const preferred = cycle[i % cycle.length];
    const kinds: ShotKind[] = [
      preferred,
      "stadium",
      "field",
      "ball",
      opts.gender === "women" ? "women" : "men",
    ];
    let chosen: StockShot | null = null;
    for (const kind of kinds) {
      const pool = kind === "men" ? shotsFor("men").filter((shot) => shot.kind === "men") : shotsFor(kind);
      const fresh = pool.find((shot) => !used.has(shot.id));
      if (fresh) {
        chosen = fresh;
        break;
      }
    }
    if (!chosen) {
      const stadiums = shotsFor("stadium");
      chosen = stadiums[i % stadiums.length] ?? shotsFor("field")[0];
    }
    if (!chosen) throw new Error("No soccer stock photo in the pool");
    used.add(chosen.id);
    urls.push(stockPhotoSrc(chosen));
  }
  return urls;
}

export async function fetchStockPhotoBytes(
  query: string,
  _salt = 0,
  excludeIds: string[] = [],
  gender?: PhotoGender,
  hardExcludeIds: string[] = [],
) {
  const resolved = gender ?? inferPhotoGender(query);
  const pool = shotsFor(shotKindFor(query, resolved));
  const hard = new Set(hardExcludeIds.filter(Boolean));
  const used = new Set(excludeIds.filter(Boolean));

  const unused = pool.filter((s) => !used.has(s.id) && !hard.has(s.id));
  const recycled = pool.filter((s) => !hard.has(s.id));
  const queue = unused.length ? unused : recycled.length ? recycled : pool;

  let lastErr = "No unused soccer photo";
  for (const shot of queue) {
    try {
      const r = await fetch(unsplashPhotoUrl(shot.id), {
        headers: { Accept: "image/*", "User-Agent": "RyvalContentFactory/1.0" },
      });
      const mime = r.headers.get("content-type") || "";
      if (!r.ok || !mime.startsWith("image/")) {
        lastErr = `Stock ${r.status}`;
        continue;
      }
      const buf = new Uint8Array(await r.arrayBuffer());
      return {
        bytes: buf,
        mime,
        ext: mime.includes("png") ? "png" : "jpg",
        photoId: shot.id,
      };
    } catch (e) {
      lastErr = e instanceof Error ? e.message : "fetch failed";
    }
  }
  throw new Error(lastErr);
}

export function peekNextStockId(
  gender: PhotoGender,
  excludeIds: string[],
  hardExcludeIds: string[] = [],
) {
  return nextUnusedAll(
    shotsFor(gender === "women" ? "women" : gender === "men" ? "men" : "field").map((s) => s.id),
    excludeIds,
    hardExcludeIds,
  );
}
