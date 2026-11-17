import { allSchools, type School } from "@/lib/schools";

export type BrandAsset = {
  id: string;
  school_id: string | null;
  program_name: string;
  conference: string | null;
  division: string | null;
  association: string | null;
  team: string | null;
  primary_logo_url: string | null;
  secondary_logo_url: string | null;
  wordmark_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  governing_logo_url: string | null;
  source_url: string | null;
  permission_status: string;
  safe_to_use: boolean;
  confidence: number;
  last_verified_at: string | null;
};

export type BrandAssetInsert = Omit<BrandAsset, "id">& { notes?: string | null };

/** NCAA partnership covers the member programs we publish about. */
const PARTNERSHIP_ASSOCIATIONS = new Set(["NCAA"]);

/**
 * Confidence in the branding we are about to stamp on a graphic: a real logo
 * from an allowed host, plus conference and division context, plus usable colours.
 */
export function brandConfidence(args: {
  hasLogo: boolean;
  logoResolved: boolean;
  hasColors: boolean;
  hasConference: boolean;
  hasDivision: boolean;
}) {
  let score = 0;
  if (args.hasLogo) score += 30;
  if (args.logoResolved) score += 30;
  if (args.hasColors) score += 20;
  if (args.hasConference) score += 10;
  if (args.hasDivision) score += 10;
  return Math.min(100, score);
}

/**
 * The catalog's conference column often just repeats the division, so treat
 * those as missing rather than stamping "NCAA Division II" on a graphic.
 */
export function realConference(value: string | null | undefined) {
  const conference = (value ?? "").trim();
  if (!conference) return null;
  if (/^(NCAA|NAIA|NJCAA)?\s*Division\s/i.test(conference)) return null;
  return conference;
}

export function brandAssetFromSchool(
  school: School,
  extra: { primaryColor?: string | null; secondaryColor?: string | null; logoResolved?: boolean } = {},
): BrandAssetInsert {
  const hasColors = Boolean(extra.primaryColor);
  const conference = realConference(school.conference);
  const division = school.division?.trim() || null;
  const confidence = brandConfidence({
    hasLogo: Boolean(school.logoUrl),
    logoResolved: Boolean(extra.logoResolved),
    hasColors,
    hasConference: Boolean(conference),
    hasDivision: Boolean(division),
  });
  const partnership = PARTNERSHIP_ASSOCIATIONS.has(school.association);
  return {
    school_id: school.id,
    program_name: school.name,
    conference,
    division,
    association: school.association || null,
    team: "",
    primary_logo_url: school.logoUrl || null,
    secondary_logo_url: null,
    wordmark_url: null,
    primary_color: extra.primaryColor ?? null,
    secondary_color: extra.secondaryColor ?? null,
    governing_logo_url: partnership ? "/brand/ncaa.svg" : null,
    source_url: school.athleticsUrl || school.website || null,
    permission_status: partnership ? "ncaa_partnership" : "fair_use_editorial",
    // Only stamp branding we actually resolved and can colour-match.
    safe_to_use: Boolean(extra.logoResolved) && confidence >= 60,
    confidence,
    last_verified_at: extra.logoResolved ? new Date().toISOString() : null,
    notes: null,
  };
}

const TOO_PALE = 0.88;
const TOO_DARK = 0.1;

/** Pull the two strongest non-neutral colours out of a logo's pixels. */
export function dominantColors(
  pixels: Uint8ClampedArray,
  opts: { buckets?: number } = {},
): { primary: string | null; secondary: string | null } {
  const step = opts.buckets ?? 24;
  const counts = new Map<string, { n: number; r: number; g: number; b: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]!;
    if (a < 200) continue;
    const r = pixels[i]!;
    const g = pixels[i + 1]!;
    const b = pixels[i + 2]!;
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    if (max > TOO_PALE && max - min < 0.08) continue; // near-white
    if (max < TOO_DARK) continue; // near-black
    const key = [Math.round(r / step), Math.round(g / step), Math.round(b / step)].join(",");
    const hit = counts.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    hit.n += 1;
    hit.r += r;
    hit.g += g;
    hit.b += b;
    counts.set(key, hit);
  }

  const ranked = [...counts.values()]
    .filter((c) => c.n > 8)
    .sort((a, b) => b.n - a.n)
    .map((c) => hex(Math.round(c.r / c.n), Math.round(c.g / c.n), Math.round(c.b / c.n)));

  const primary = ranked[0] ?? null;
  // Skip near-duplicates so the secondary is a genuinely different colour.
  const secondary = ranked.slice(1).find((c) => primary && colorDistance(c, primary) > 60) ?? null;
  return { primary, secondary };
}

function hex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function colorDistance(a: string, b: string) {
  const parse = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [r1, g1, b1] = parse(a) as [number, number, number];
  const [r2, g2, b2] = parse(b) as [number, number, number];
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

/** Stories name programs the way headlines do, so aliases must resolve to one catalog entry. */
const ALIAS_TO_PROGRAM = (() => {
  const map = new Map<string, string>();
  for (const school of allSchools()) {
    const trimmed = school.name
      .replace(/^University of\s+/i, "")
      .replace(/\s+(University|College)$/i, "")
      .trim();
    for (const alias of [school.name, school.shortName, trimmed]) {
      const key = (alias ?? "").trim().toLowerCase();
      if (key && !map.has(key)) map.set(key, school.name);
    }
  }
  return map;
})();

export function programNameFor(alias: string | null | undefined) {
  return ALIAS_TO_PROGRAM.get((alias ?? "").trim().toLowerCase()) ?? null;
}

type BrandDb = { from: (table: string) => any };

/** The branding for a program named in a story, or null when we cannot verify it. */
export async function findBrandAsset(db: BrandDb, alias: string | null | undefined) {
  const program = programNameFor(alias);
  if (!program) return null;
  const { data } = await db
    .from("brand_assets")
    .select("*")
    .eq("program_name", program)
    .order("confidence", { ascending: false })
    .limit(1);
  const row = (data ?? [])[0] as BrandAsset | undefined;
  return row?.safe_to_use ? row : null;
}

export async function brandAssetById(db: BrandDb, id: string | null | undefined) {
  if (!id) return null;
  const { data } = await db.from("brand_assets").select("*").eq("id", id).limit(1);
  return ((data ?? [])[0] as BrandAsset | undefined) ?? null;
}

/** The note lines the renderer reads to stamp real logos and program colours. */
export function brandNotes(brand: BrandAsset | null, showLogos = true) {
  if (!brand) return [] as string[];
  return [
    `brand_asset:${brand.id}`,
    `brand_program:${brand.program_name}`,
    showLogos && brand.primary_logo_url ? `brand_logo:${brand.primary_logo_url}` : "",
    brand.primary_color ? `brand_primary:${brand.primary_color}` : "",
    brand.secondary_color ? `brand_secondary:${brand.secondary_color}` : "",
    showLogos ? "" : "show_logos:false",
  ].filter(Boolean);
}

const PROGRAM_ALIASES = (() => {
  const map = new Map<string, string[]>();
  for (const [alias, program] of ALIAS_TO_PROGRAM) map.set(program, [...(map.get(program) ?? []), alias]);
  return map;
})();

/**
 * The program the story is actually about. A poll article names twenty-five
 * schools, and only the one in the headline should carry the logo.
 */
export function headlineProgram(title: string, schools: string[]) {
  const headline = (title ?? "").toLowerCase();
  for (const school of schools) {
    const program = programNameFor(school);
    if (!program) continue;
    const aliases = PROGRAM_ALIASES.get(program) ?? [program.toLowerCase()];
    if (aliases.some((alias) => new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(headline))) {
      return school;
    }
  }
  return null;
}
