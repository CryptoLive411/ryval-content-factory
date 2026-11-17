import {
  licenceStatusFor,
  orientationOf,
  tagsFromText,
  type MediaOrigin,
} from "@/lib/media-library";

const UA = "RyvalContentFactory/1.0 (https://ryvalcontent.space)";
const COMMONS = "https://commons.wikimedia.org/w/api.php";

export type AssetInsert = {
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
  width: number | null;
  height: number | null;
  notes: string | null;
};

/** Ryval app screens, CTA plates and the mark. We own these outright. */
export function ryvalOwnedAssets(files: {
  appScreens: string[];
  ctaBackgrounds: string[];
  marks: string[];
}): AssetInsert[] {
  const base = {
    source_url: null,
    credit: "Ryval Sports",
    license: "Ryval owned",
    license_status: "owned",
    origin: "ryval_owned" as MediaOrigin,
    subject_people: [],
    subject_program: null,
    safe_to_use: true,
    width: null,
    height: null,
    notes: null,
  };
  return [
    ...files.appScreens.map((url) => ({
      ...base,
      url,
      tags: tagsFromText(url, ["Ryval app screen", "phone mockup"]),
      sport: null,
      orientation: "vertical",
      best_use: ["cta"],
    })),
    ...files.ctaBackgrounds.map((url) => ({
      ...base,
      url,
      tags: tagsFromText(url, ["stadium", "background"]),
      sport: null,
      orientation: "horizontal",
      best_use: ["cta", "background"],
    })),
    ...files.marks.map((url) => ({
      ...base,
      url,
      tags: ["Ryval logo"],
      sport: null,
      orientation: "square",
      best_use: ["background"],
    })),
  ];
}

/** The Unsplash-licensed soccer pool already shipped in public/stock. */
export function licensedStockAssets(
  shots: Array<{ url: string; tags: string[]; gender: string }>,
): AssetInsert[] {
  return shots.map((shot) => ({
    url: shot.url,
    source_url: "https://unsplash.com",
    credit: "Unsplash contributors",
    license: "Unsplash License",
    license_status: "rights_cleared",
    origin: "licensed_stock",
    tags: tagsFromText(shot.tags.join(" "), [...shot.tags, "soccer"]),
    subject_people: [],
    subject_program: null,
    sport: shot.gender === "neutral" ? null : shot.gender,
    orientation: "horizontal",
    best_use: ["background", "carousel", "news"],
    safe_to_use: true,
    width: null,
    height: null,
    notes: "Generic soccer stock. Never used on a school or player spotlight.",
  }));
}

type CommonsImage = {
  title: string;
  url: string;
  width: number;
  height: number;
  license: string;
  credit: string;
  description: string;
  descriptionUrl: string;
};

async function commonsSearch(query: string, limit: number): Promise<CommonsImage[]> {
  const url = new URL(COMMONS);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("origin", "*");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `filetype:bitmap ${query}`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", String(limit));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "1600");

  const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    query?: { pages?: Record<string, { title?: string; imageinfo?: Array<Record<string, unknown>> }> };
  };
  const out: CommonsImage[] = [];
  for (const page of Object.values(json.query?.pages ?? {})) {
    const info = page.imageinfo?.[0];
    if (!info) continue;
    const meta = (info.extmetadata ?? {}) as Record<string, { value?: string }>;
    const src = String(info.thumburl ?? info.url ?? "");
    if (!src) continue;
    out.push({
      title: String(page.title ?? "").replace(/^File:/, ""),
      url: src,
      width: Number(info.thumbwidth ?? info.width ?? 0),
      height: Number(info.thumbheight ?? info.height ?? 0),
      license: (meta.LicenseShortName?.value ?? "").replace(/<[^>]+>/g, "").trim(),
      credit: (meta.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim(),
      description: (meta.ImageDescription?.value ?? "").replace(/<[^>]+>/g, "").trim(),
      descriptionUrl: String(info.descriptionurl ?? ""),
    });
  }
  return out;
}

const OFF_TOPIC =
  /\b(lacrosse|basketball|baseball|softball|volleyball|field hockey|ice hockey|tennis|golf|wrestling|swimming|gymnastics|track and field|cricket|rugby)\b/i;

/** Commons is full of incidental campus photos. A truck or a flower is not a backdrop. */
const JUNK_SUBJECT =
  /\b(truck|bus|van|car|bicycle|flower|magnolia|squirrel|bird|insect|tree|leaf|leaves|sign|plaque|map|diagram|logo|seal|coat of arms|portrait of|headstone|grave|parking|dumpster|bench|manhole|fire hydrant|construction|scaffold|interior of a|document|letter|poster|chapel|cathedral|church|statue|sculpture|bust|door|doorway|library|quad|dorm)\b/i;

const NOT_A_SOCCER_SCENE = JUNK_SUBJECT;

/** Something worth putting behind a headline: a pitch, a match, or a soccer stadium. */
const GOOD_SUBJECT =
  /\b(soccer|pitch|goalkeeper|cleats?|match|fixture|training|soccer ball|stadium)\b/i;

/**
 * Real photos of named people, with the licence recorded. Only soccer photos of
 * that person are kept, and only licences we are allowed to publish.
 */
export async function importPersonPhotos(args: {
  name: string;
  program?: string | null;
  sport?: "men" | "women" | null;
  limit?: number;
}): Promise<AssetInsert[]> {
  const images = await commonsSearch(`"${args.name}" soccer`, args.limit ?? 6);
  const out: AssetInsert[] = [];
  const surname = args.name.split(" ").slice(-1)[0] ?? args.name;

  for (const image of images) {
    const blob = `${image.title} ${image.description}`;
    if (OFF_TOPIC.test(blob)) continue;
    // The photo must actually be of this person, not a match they played in.
    if (!new RegExp(`\\b${surname}\\b`, "i").test(blob)) continue;
    const licence = licenceStatusFor(image.license);
    out.push({
      url: image.url,
      source_url: image.descriptionUrl || null,
      credit: image.credit || null,
      license: image.license || null,
      license_status: licence.status,
      origin: "school_media",
      tags: tagsFromText(blob, ["player action", "college soccer"]),
      subject_people: [args.name],
      subject_program: args.program ?? null,
      sport: args.sport ?? null,
      orientation: orientationOf(image.width, image.height),
      best_use: ["player_spotlight", "news", "carousel"],
      safe_to_use: licence.safe,
      width: image.width || null,
      height: image.height || null,
      notes: licence.safe ? null : `Licence "${image.license}" not cleared for publishing`,
    });
  }
  return out;
}

/** Campus and stadium photos for one program, licence recorded the same way. */
export async function importProgramPhotos(args: {
  program: string;
  queries: string[];
  /** The photo must name one of these, or it is some other university entirely. */
  mustMention: string[];
  limit?: number;
}): Promise<AssetInsert[]> {
  const out: AssetInsert[] = [];
  const seen = new Set<string>();
  const mentions = args.mustMention
    .filter((m) => m.trim().length > 2)
    .map((m) => new RegExp(`\\b${m.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));

  for (const query of args.queries) {
    for (const image of await commonsSearch(query, args.limit ?? 8)) {
      if (seen.has(image.url)) continue;
      seen.add(image.url);
      const blob = `${image.title} ${image.description}`;
      if (!mentions.some((re) => re.test(blob))) continue;
      if (OFF_TOPIC.test(blob) || JUNK_SUBJECT.test(blob) || NOT_A_SOCCER_SCENE.test(blob)) continue;
      if (!GOOD_SUBJECT.test(blob)) continue;
      // Archive scans look nothing like the campus a recruit would visit today.
      const year = Number(blob.match(/\b(18|19|20)\d{2}\b/)?.[0] ?? 0);
      if (year && year < 2010) continue;
      // Panoramas and tiny thumbnails both render badly at 1080x1350.
      if (image.width && image.height && image.width / image.height > 2.4) continue;
      if (image.width && image.width < 900) continue;
      const licence = licenceStatusFor(image.license);
      out.push({
        url: image.url,
        source_url: image.descriptionUrl || null,
        credit: image.credit || null,
        license: image.license || null,
        license_status: licence.status,
        origin: "school_media",
        tags: tagsFromText(blob, ["campus", "college soccer"]),
        subject_people: [],
        subject_program: args.program,
        sport: null,
        orientation: orientationOf(image.width, image.height),
        best_use: ["background", "carousel", "news"],
        safe_to_use: licence.safe,
        width: image.width || null,
        height: image.height || null,
        notes: licence.safe ? null : `Licence "${image.license}" not cleared for publishing`,
      });
    }
  }
  return out;
}
