import { proxiedSchoolLogo } from "@/lib/school-logo";
import type { NcaaNewsItem, NcaaPlayer, NcaaSport } from "@/lib/ncaa-live";
import type { School } from "@/lib/schools";

const WIKI_UA = "RyvalContentForge/1.0 (https://ryvalcontent.space; school photos)";
const MIN_YEAR = 2012;

export type SchoolShotKind = "news" | "match" | "player" | "facility";

export type SchoolShot = {
  url: string;
  kind: SchoolShotKind;
  label: string;
};

async function wikiJson(url: URL) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": WIKI_UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Wiki media ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

function yearsIn(text: string) {
  return [...text.matchAll(/\b(18\d{2}|19\d{2}|20\d{2})\b/g)].map((m) => Number(m[1]));
}

function metaValue(info: Record<string, unknown>, key: string) {
  const meta = info.extmetadata as Record<string, { value?: string }> | undefined;
  return meta?.[key]?.value ?? "";
}

/** Title and caption only. Commons categories name the stadium even when the photo is another sport. */
function captionBlob(title: string, info: Record<string, unknown>) {
  return [title, metaValue(info, "ImageDescription"), metaValue(info, "ObjectName")]
    .filter(Boolean)
    .join(" ")
    .replace(/<[^>]+>/g, " ");
}

function originalYear(info: Record<string, unknown>) {
  const raw = metaValue(info, "DateTimeOriginal") || metaValue(info, "Date") || "";
  const years = yearsIn(String(raw));
  return years.length ? Math.max(...years) : null;
}

function subjectIsOpponent(school: School, blob: string) {
  const scored = blob.match(/winning goal for (?:the )?(.{3,48}?) to defeat/i);
  if (scored && !photoMentionsSchool(school, scored[1] ?? "")) return true;
  const beat = blob.match(/\b([a-z][a-z .']{2,40}?) (?:beat|defeated|defeat) (?:the )?(.{3,48})/i);
  if (!beat) return false;
  const winner = beat[1] ?? "";
  const loser = beat[2] ?? "";
  return photoMentionsSchool(school, loser) && !photoMentionsSchool(school, winner);
}

const WEAK_SHORT_NAMES = new Set([
  "north carolina",
  "south carolina",
  "west virginia",
  "new hampshire",
  "new jersey",
  "new mexico",
  "north dakota",
  "south dakota",
  "rhode island",
  "washington",
  "georgia",
  "virginia",
  "maryland",
  "indiana",
  "kentucky",
  "tennessee",
  "alabama",
  "arizona",
  "colorado",
  "florida",
  "illinois",
  "michigan",
  "minnesota",
  "missouri",
  "montana",
  "nebraska",
  "nevada",
  "ohio",
  "oregon",
  "texas",
  "utah",
  "wisconsin",
  "wyoming",
  "kansas",
  "iowa",
  "idaho",
  "hawaii",
  "alaska",
  "arkansas",
  "oklahoma",
  "pennsylvania",
  "massachusetts",
  "connecticut",
  "delaware",
  "mississippi",
  "louisiana",
]);

const SCHOOL_ALIASES: Record<string, string[]> = {
  "north-carolina": ["university of north carolina", "tar heel", "chapel hill", "dorrance field"],
  stanford: ["cagan stadium", "maloney field"],
  duke: ["duke university", "blue devil", "koskinen stadium", "duke chapel", "west campus"],
};

const KNOWN_FIELDS: Record<string, string> = {
  "north-carolina": "Dorrance Field",
  stanford: "Cagan Stadium",
  duke: "Koskinen Stadium",
};

const OTHER_SPORT =
  /\b(lacrosse|\blax\b|basketball|baseball|softball|volleyball|field hockey|ice hockey|\btennis\b|\bgolf\b|wrestling|swimming|gymnastics|track and field)\b/i;

/** A door, chapel or statue is not a soccer graphic. */
const NOT_A_SOCCER_SCENE =
  /\b(chapel|cathedral|church|statue|sculpture|bust|door|doorway|knocker|library|quad|bell tower|rotunda|dorm|hallway|cloister|stained glass|nave|organ|archway|courtyard|fountain|tower|gate|skyline|building interior|portrait)\b/i;

const SOCCER_SCENE =
  /\b(soccer|pitch|goalkeeper|cleats?|kickoff|corner kick|free kick|penalty|match|fixture|training|soccer ball|eleven|keeper)\b/i;

const CEREMONY =
  /\b(kerry|pose for a photo|people-to-people|vice premier|signs a (soccer )?ball|signing a (soccer )?ball|white house|diplomatic|consultation on)\b/i;

/** Hospitals and garages sit on campus but say nothing about the program. */
const OFF_CAMPUS =
  /\b(hospital|medical cent(er|re)|clinic|health system|parking (garage|lot)|construction site|dental|pharmacy school)\b/i;

/** Commons often returns six near-identical uploads of one building. Keep one per subject. */
function photoSubject(label: string) {
  return label
    .replace(/\.(jpe?g|png|webp)$/i, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d{4,}\b/g, " ")
    .replace(/\b(in|on|at|of|the|a)\b/gi, " ")
    .replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase()
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 3)
    .join(" ");
}

export function distinctSchoolShots(shots: SchoolShot[]): SchoolShot[] {
  const bySubject = new Map<string, SchoolShot>();
  for (const shot of shots) {
    const key = photoSubject(shot.label) || shot.url;
    if (!bySubject.has(key)) bySubject.set(key, shot);
  }
  return [...bySubject.values()];
}

function isServiceAcademy(school: School) {
  return /army|navy|air-force|west-point|vmi|citadel|coast-guard/.test(school.id);
}

function isMilitaryNoise(school: School, blob: string) {
  if (isServiceAcademy(school)) return false;
  return /\b(u\.?s\.?\s*)?(army|navy|air force|west point|rotc|military academy|camouflage|\bcamo\b|marines?|national guard|cadets?|olive drab)\b/i.test(
    blob,
  );
}

function photoMentionsSchool(school: School, blob: string, stadium?: string) {
  const t = blob.toLowerCase();
  if (school.name.length >= 10 && t.includes(school.name.toLowerCase())) return true;
  if (school.nickname && school.nickname.length >= 4 && t.includes(school.nickname.toLowerCase())) return true;
  if ((SCHOOL_ALIASES[school.id] ?? []).some((a) => t.includes(a))) return true;
  if (school.id === "north-carolina" && /\bunc\b/.test(t)) return true;
  if (stadium && stadium.length > 3 && t.includes(stadium.toLowerCase())) return true;
  const short = school.shortName.toLowerCase();
  if (WEAK_SHORT_NAMES.has(short)) {
    return t.includes(`university of ${short}`) || t.includes(`${short} university`);
  }
  return short.length >= 5 && t.includes(short);
}

function classifyKind(title: string, fallback: SchoolShotKind): SchoolShotKind {
  const t = title.toLowerCase();
  if (/stadium|field|venue|complex|arena|maloney|cagan|dorrance|koskinen|facility|campus|pitch|chapel|quad/i.test(t) && !/match|vs\.|v\./i.test(t)) {
    return "facility";
  }
  if (/soccer|football|match|kick|goal/i.test(t)) return "match";
  return fallback;
}

function usablePhoto(
  title: string,
  info: Record<string, unknown>,
  school: School,
  sport: NcaaSport,
  stadium?: string,
) {
  const t = title.toLowerCase();
  const blob = captionBlob(title, info).toLowerCase();
  if (/kit (body|shorts|socks)|wordmark|crest|seal|coat of arms|logo|flag of|svg/.test(t)) return false;
  if (
    /historic|vintage|yearbook|alumni|sepia|black and white|black-and-white|b&w|monochrome|portrait of|headshot|bust of|statue|class of|circa\b|undated|team photo|group photo|roster|photosphere|equirectangular|spherical panorama/.test(
      blob,
    )
  ) {
    return false;
  }
  if (OTHER_SPORT.test(blob) || CEREMONY.test(blob)) return false;
  if (OFF_CAMPUS.test(blob)) return false;
  if (NOT_A_SOCCER_SCENE.test(blob)) return false;
  if (subjectIsOpponent(school, blob)) return false;
  if (isMilitaryNoise(school, blob)) return false;
  if (/\bfootball\b/.test(blob) && /stadium/.test(blob) && !/soccer/.test(blob)) return false;
  if (/\b(american football|nfl|football team|football game|rose.?bowl|stamford bridge|basketball|baseball)\b/.test(blob) && !/soccer/.test(blob)) {
    return false;
  }
  const soccerHit = SOCCER_SCENE.test(blob);
  const ownStadium = Boolean(stadium && stadium.length > 3 && blob.includes(stadium.toLowerCase()) && /soccer|pitch|match/.test(blob));
  if (!soccerHit && !ownStadium) return false;
  if (!photoMentionsSchool(school, blob, stadium)) return false;
  if (sport === "men" && /women'?s soccer/.test(blob)) return false;
  if (sport === "women" && /men'?s soccer/.test(blob) && !/women/.test(blob)) return false;
  const titleYears = yearsIn(t);
  if (titleYears.some((y) => y < MIN_YEAR)) return false;
  const shotYear = originalYear(info);
  if (shotYear && shotYear < MIN_YEAR) return false;
  const mime = String(info.mime ?? "");
  if (mime && !/image\/(jpeg|jpg|png|webp)/i.test(mime)) return false;
  const w = Number(info.thumbwidth || info.width || 0);
  if (w && w < 640) return false;
  return true;
}

function pickUrl(info: Record<string, unknown>) {
  const thumb = typeof info.thumburl === "string" ? info.thumburl : "";
  const url = typeof info.url === "string" ? info.url : "";
  const src = thumb || url;
  if (!src.startsWith("https://")) return null;
  return src;
}

type CommonsPage = {
  title?: string;
  imageinfo?: Array<Record<string, unknown>>;
};

async function commonsSearch(
  query: string,
  limit: number,
  kind: SchoolShotKind,
  school: School,
  sport: NcaaSport,
  stadium?: string,
): Promise<SchoolShot[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", `${query} filemime:image/jpeg`);
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrlimit", String(limit));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "1080");
  const data = await wikiJson(url);
  const pages = (data.query as { pages?: Record<string, CommonsPage> })?.pages;
  if (!pages) return [];
  const shots: SchoolShot[] = [];
  for (const page of Object.values(pages)) {
    const title = page.title ?? "";
    const info = page.imageinfo?.[0];
    if (!info || !usablePhoto(title, info, school, sport, stadium)) continue;
    const src = pickUrl(info);
    if (!src) continue;
    shots.push({
      url: src,
      kind: classifyKind(title, kind),
      label: title.replace(/^File:/, ""),
    });
  }
  return shots;
}

function newsShots(news: NcaaNewsItem[], school: School): SchoolShot[] {
  return news
    .filter((n) => {
      const blob = `${n.title} ${n.description}`;
      return (
        n.image &&
        photoMentionsSchool(school, blob) &&
        !isMilitaryNoise(school, blob) &&
        !OTHER_SPORT.test(blob) &&
        !CEREMONY.test(blob)
      );
    })
    .map((n) => ({
      url: n.image as string,
      kind: "news" as const,
      label: n.title,
    }));
}

export type SlideNeed = "facility" | "action" | "player" | "cinematic";

export function slidePhotoNeed(text: string): SlideNeed {
  const t = text.toLowerCase();
  if (!t.trim()) return "cinematic";
  if (
    /stadium|home field|soccer field|playing field|facility|facilities|campus|venue|locker|training ground|cagan|maloney|arena|complex/.test(
      t,
    )
  ) {
    return "facility";
  }
  if (/\bcoach\b|head coach/.test(t)) return "facility";
  if (/gpa|sat\b|admit|academic|tuition|classroom|ranking of the school/.test(t)) return "facility";
  if (/\b(goals?|assists?|points?|freshman|sophomore|junior|senior)\b/.test(t) && /[A-Z][a-z]+ [A-Z]/.test(text)) {
    return "player";
  }
  if (/record|win|loss|tied|rank|season|goal|player|match|score/.test(t)) return "action";
  return "action";
}

function scoreShot(shot: SchoolShot, need: SlideNeed, text: string) {
  const hay = `${shot.label} ${shot.kind}`.toLowerCase();
  const t = text.toLowerCase();
  let score = 0;
  if (need === "facility" && shot.kind === "facility") score += 8;
  if (need === "action" && (shot.kind === "match" || shot.kind === "news")) score += 8;
  if (need === "action" && shot.kind === "facility") score += 4;
  if (need === "player" && shot.kind === "player") score += 10;
  if (need === "facility" && /stadium|field|campus|venue|facility|chapel/.test(hay)) score += 6;
  if (/chapel|west campus|koskinen|dorrance|cagan/.test(hay)) score += 4;
  if (need === "action" && /soccer|match|goal|kick/.test(hay)) score += 3;
  if (shot.kind === "player" && shot.label && t.includes(shot.label.toLowerCase())) score += 12;
  if (need !== "player" && shot.kind === "player") score -= 6;
  const tokens = t.match(/\b[a-z]{4,}\b/g) ?? [];
  for (const token of tokens) {
    if (/stadium|field|complex|maloney|cagan/.test(token) && hay.includes(token)) score += 6;
  }
  return score;
}

export async function fetchSchoolPhotos(opts: {
  school: School;
  sport: NcaaSport;
  players: NcaaPlayer[];
  stadium?: string | null;
  news: NcaaNewsItem[];
}): Promise<SchoolShot[]> {
  const { school, sport, players, news } = opts;
  const stadiumName =
    (opts.stadium ?? KNOWN_FIELDS[school.id] ?? "").replace(/\[\[|\]\]/g, "").split("|").pop()?.trim() || "";
  const queryName = school.name.length >= 8 ? school.name : school.shortName;
  const jobs: Array<Promise<SchoolShot[]>> = [
    Promise.resolve(newsShots(news, school)),
    commonsSearch(`"${queryName}" ${sport === "women" ? "women's" : "men's"} soccer`, 8, "match", school, sport, stadiumName).catch(() => []),
    commonsSearch(`"${queryName}" soccer match`, 8, "match", school, sport, stadiumName).catch(() => []),
    commonsSearch(`"${queryName}" soccer stadium`, 6, "facility", school, sport, stadiumName).catch(() => []),
    commonsSearch(`"${queryName}" intitle:soccer`, 8, "match", school, sport, stadiumName).catch(() => []),
  ];
  if (stadiumName && stadiumName.length > 3) {
    jobs.push(
      commonsSearch(`"${stadiumName}"`, 8, "facility", school, sport, stadiumName).catch(() => []),
    );
  }
  for (const player of players.slice(0, 2)) {
    jobs.push(
      commonsSearch(`"${player.name}" soccer ${queryName}`, 3, "player", school, sport, stadiumName)
        .then((shots) => shots.map((s) => ({ ...s, kind: "player" as const, label: player.name })))
        .catch(() => []),
    );
  }

  if (stadiumName && stadiumName.length > 3) {
    jobs.push(
      commonsSearch(`"${stadiumName}" ${queryName}`, 6, "facility", school, sport, stadiumName).catch(() => []),
    );
  }
  const batches = await Promise.all(jobs);
  const seen = new Set<string>();
  const out: SchoolShot[] = [];
  for (const batch of batches) {
    for (const shot of batch) {
      const key = shot.url.split("?")[0];
      if (seen.has(key)) continue;
      seen.add(key);
      const proxied = proxiedSchoolLogo(shot.url);
      if (!proxied) continue;
      out.push({ ...shot, url: proxied });
    }
  }
  return distinctSchoolShots(out).slice(0, 12);
}

export function assignSchoolPhotos(
  slideCount: number,
  shots: SchoolShot[],
  slideTexts: string[],
  _cinematicFallback?: (i: number, need: SlideNeed) => string,
): string[] {
  const unused = [...shots];
  const urls: string[] = [];
  for (let i = 0; i < slideCount; i++) {
    const text = slideTexts[i] ?? "";
    if (!text.trim()) {
      urls[i] = "";
      continue;
    }
    const need: SlideNeed = i === 0 ? "facility" : slidePhotoNeed(text);
    if (need === "facility") {
      let best = -1;
      let bestScore = 0;
      for (let s = 0; s < unused.length; s++) {
        const shot = unused[s]!;
        const hay = `${shot.label} ${shot.kind}`.toLowerCase();
        if (shot.kind !== "facility" && !/stadium|field|campus|venue|complex|dorrance|maloney|cagan/.test(hay)) {
          continue;
        }
        const score = scoreShot(shot, "facility", text);
        if (score > bestScore) {
          bestScore = score;
          best = s;
        }
      }
      urls[i] = best >= 0 ? unused.splice(best, 1)[0]!.url : shots.length ? shots[i % shots.length]!.url : "";
      continue;
    }
    let best = -1;
    let bestScore = 3;
    for (let s = 0; s < unused.length; s++) {
      const score = scoreShot(unused[s]!, need, text);
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    if (best >= 0) {
      urls[i] = unused.splice(best, 1)[0]!.url;
    } else {
      urls[i] = shots.length ? shots[i % shots.length]!.url : "";
    }
  }
  return urls;
}
