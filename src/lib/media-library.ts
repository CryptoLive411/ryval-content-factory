export type MediaOrigin =
  | "ryval_owned"
  | "player_submitted"
  | "licensed_stock"
  | "school_media"
  | "generic_stock";

export type MediaBestUse = "background" | "player_spotlight" | "news" | "carousel" | "cta";

export type MediaAsset = {
  id: string;
  url: string;
  source_url: string | null;
  credit: string | null;
  license: string | null;
  license_status: string;
  origin: MediaOrigin;
  tags: string[];
  subject_people: string[];
  subject_program: string | null;
  sport: string | null;
  orientation: string;
  best_use: string[];
  safe_to_use: boolean;
  use_count: number;
  notes?: string | null;
};

/** Ryval's own assets first, generic soccer backgrounds only as a last resort. */
export const ORIGIN_PRIORITY: MediaOrigin[] = [
  "ryval_owned",
  "player_submitted",
  "licensed_stock",
  "school_media",
  "generic_stock",
];

/** Commons licences we can publish. Anything else stays unsafe until reviewed. */
const PUBLISHABLE_LICENCE =
  /^(cc[ -]?by([ -]sa)?([ -]\d(\.\d)?)?|cc0|public domain|pd[- ]?\w*|no restrictions)$/i;

export function licenceStatusFor(license: string | null | undefined) {
  const value = (license ?? "").trim();
  if (!value) return { status: "unknown", safe: false };
  if (/^cc0$|public domain|no restrictions/i.test(value)) {
    return { status: "rights_cleared", safe: true };
  }
  if (PUBLISHABLE_LICENCE.test(value)) return { status: "attribution_required", safe: true };
  return { status: "unknown", safe: false };
}

export function orientationOf(width?: number | null, height?: number | null) {
  if (!width || !height) return "horizontal";
  const ratio = width / height;
  if (ratio < 0.9) return "vertical";
  if (ratio > 1.1) return "horizontal";
  return "square";
}

const TAG_RULES: Array<[RegExp, string]> = [
  [/goalkeep|keeper|\bsave\b|shootout/i, "goalkeeper"],
  [/celebrat|cheer|scores?\b/i, "celebration"],
  [/train|drill|practice|cones?\b/i, "training"],
  [/stadium|arena|crowd|stands/i, "stadium"],
  [/pitch|field|grass|turf/i, "field"],
  [/\bball\b/i, "ball"],
  [/locker|dressing room/i, "locker room"],
  [/coach|manager|sideline/i, "coach"],
  [/campus|chapel|hall|library|building|quad/i, "campus"],
  [/women|female|girls/i, "women's soccer"],
  [/\bmen\b|male|boys/i, "men's soccer"],
  [/college|university|ncaa/i, "college soccer"],
  [/kick|dribble|tackle|header|run|match|game/i, "player action"],
];

/** Derive searchable tags from a filename, caption or Commons title. */
export function tagsFromText(text: string, extra: string[] = []) {
  const tags = new Set(extra);
  for (const [re, tag] of TAG_RULES) {
    if (re.test(text)) tags.add(tag);
  }
  return [...tags];
}

export type PickCriteria = {
  count: number;
  bestUse?: MediaBestUse;
  program?: string | null;
  sport?: "men" | "women" | null;
  tags?: string[];
  /** Ids or urls already used in this carousel so slides never repeat a photo. */
  exclude?: string[];
};

function scoreAsset(asset: MediaAsset, want: PickCriteria) {
  let score = (ORIGIN_PRIORITY.length - ORIGIN_PRIORITY.indexOf(asset.origin)) * 100;
  if (want.program && asset.subject_program === want.program) score += 400;
  if (want.bestUse && asset.best_use.includes(want.bestUse)) score += 60;
  if (want.sport && asset.sport === want.sport) score += 40;
  for (const tag of want.tags ?? []) {
    if (asset.tags.includes(tag)) score += 15;
  }
  // Spread usage so the same photo does not headline every post.
  score -= Math.min(80, asset.use_count * 8);
  return score;
}

const NOT_A_SOCCER_SCENE =
  /\b(chapel|cathedral|church|statue|sculpture|bust|door|doorway|knocker|library|quad|bell tower|rotunda|dorm|hallway|cloister|stained glass|nave|portrait)\b/i;

/** Campus architecture is not a slide background. Soccer, a pitch, or a stadium is. */
export function assetIsSoccer(asset: Pick<MediaAsset, "notes" | "tags" | "url" | "origin" | "best_use">) {
  if ((asset.best_use ?? []).length === 1 && asset.best_use[0] === "cta") return false;
  const blob = `${asset.notes ?? ""} ${asset.tags.join(" ")} ${asset.url}`;
  if (NOT_A_SOCCER_SCENE.test(blob)) return false;
  if (asset.origin === "licensed_stock" || asset.origin === "generic_stock" || asset.origin === "ryval_owned") {
    return true;
  }
  // "college soccer" gets tagged onto any university photo. The note or file has to actually be soccer.
  const notes = `${asset.notes ?? ""} ${asset.url}`;
  return /\b(soccer|pitch|goalkeeper|cleats?|match|fixture|soccer ball)\b/i.test(notes);
}

/**
 * Pick distinct, publishable images in the spec's priority order. Returns fewer
 * than requested rather than repeating one image across slides.
 */
export async function pickMediaAssets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: { from: (table: string) => any },
  want: PickCriteria,
): Promise<MediaAsset[]> {
  let query = db.from("media_assets").select("*").eq("safe_to_use", true);
  if (want.program) {
    // Program shots plus a generic pool to fall back on within one round trip.
    query = query.or(`subject_program.eq.${want.program},subject_program.is.null`);
  }
  const { data, error } = await query.limit(400);
  if (error) throw new Error(error.message);

  const excluded = new Set(want.exclude ?? []);
  const pool = ((data ?? []) as MediaAsset[]).filter((asset) => {
    if (excluded.has(asset.id) || excluded.has(asset.url)) return false;
    if (want.bestUse && !asset.best_use.includes(want.bestUse)) return false;
    if (!assetIsSoccer(asset)) return false;
    if (want.sport && asset.sport && asset.sport !== want.sport) return false;
    return true;
  });
  pool.sort((a, b) => scoreAsset(b, want) - scoreAsset(a, want));

  const chosen: MediaAsset[] = [];
  const seenUrls = new Set<string>();
  for (const asset of pool) {
    if (seenUrls.has(asset.url)) continue;
    seenUrls.add(asset.url);
    chosen.push(asset);
    if (chosen.length >= want.count) break;
  }
  return chosen;
}

/** Record usage so the picker rotates through the library instead of favouring one shot. */
export async function markAssetsUsed(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: { from: (table: string) => any },
  assets: MediaAsset[],
) {
  const now = new Date().toISOString();
  for (const asset of assets) {
    await db
      .from("media_assets")
      .update({ use_count: asset.use_count + 1, last_used_at: now })
      .eq("id", asset.id);
  }
}
