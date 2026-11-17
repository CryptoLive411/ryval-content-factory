import { fetchNcaaLive, type NcaaLivePack } from "@/lib/ncaa-live";
import { fetchSchoolPhotos, type SchoolShot } from "@/lib/school-photos";
import type { School } from "@/lib/schools";

const WIKI_UA = "RyvalContentForge/1.0 (https://ryvalcontent.space; school facts)";
const SEASON_YEAR = new Date().getFullYear();

export type SchoolSeasonFacts = {
  year: string;
  record: string;
  conference: string;
  conferenceRecord: string;
  coach: string;
  stadium: string;
  tournament: string;
};

export type SchoolFactPack = {
  school: School;
  sport: "men" | "women";
  seasonYear: number;
  wikiTitle: string | null;
  wikiUrl: string | null;
  extract: string;
  season: SchoolSeasonFacts | null;
  live: NcaaLivePack;
  photos: SchoolShot[];
  staticFacts: string[];
};

function sportPhrase(sport: "men" | "women") {
  return sport === "women" ? "women's soccer" : "men's soccer";
}

function stripWiki(value: string) {
  return value
    .replace(/\{\{[^}]*\}\}/g, " ")
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'''|''/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function wikiJson(url: URL) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": WIKI_UA },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

function scoreHit(title: string, school: School, year: number, sport: "men" | "women") {
  const t = title.toLowerCase();
  let score = 0;
  if (/soccer|association football/.test(t)) score += 8;
  if (t.includes("season") || /\bteam\b/.test(t)) score += 5;
  if (t.includes(String(year))) score += 8;
  else if (t.includes(String(year - 1))) score += 6;
  else if (/\b20\d{2}\b/.test(t)) score += 4;
  if (/\b20\d{2}\b/.test(t) && /soccer/.test(t)) score += 6;
  const nameBits = [school.shortName, school.nickname, school.mascot ?? ""].filter(Boolean);
  if (nameBits.some((b) => t.includes(b.toLowerCase()))) score += 6;
  if (t.includes(school.name.toLowerCase())) score += 4;
  const wantsWomen = sport === "women";
  if (t.includes("women") === wantsWomen) score += 3;
  else score -= 8;
  if (/national (soccer|football) team/.test(t)) score -= 25;
  if (/high school/.test(t)) score -= 15;
  return score;
}

async function searchWiki(query: string): Promise<Array<{ title: string }>> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("list", "search");
  url.searchParams.set("srsearch", query);
  url.searchParams.set("srlimit", "8");
  url.searchParams.set("utf8", "1");
  url.searchParams.set("format", "json");
  const data = await wikiJson(url);
  const queryObj = data.query as { search?: Array<{ title: string }> } | undefined;
  return queryObj?.search ?? [];
}

async function extractWiki(title: string): Promise<{ extract: string; url: string } | null> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("prop", "extracts|info");
  url.searchParams.set("exintro", "1");
  url.searchParams.set("explaintext", "1");
  url.searchParams.set("inprop", "url");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("titles", title);
  url.searchParams.set("format", "json");
  const data = await wikiJson(url);
  const pages = (
    data.query as {
      pages?: Record<string, { extract?: string; fullurl?: string; missing?: string }>;
    }
  )?.pages;
  const page = pages ? Object.values(pages)[0] : null;
  if (!page?.extract || "missing" in page) return null;
  return { extract: page.extract.slice(0, 1800), url: page.fullurl ?? "" };
}

function parseInfobox(wikitext: string): SchoolSeasonFacts | null {
  const box = wikitext.match(/\{\{Infobox[\s\S]*?\n\}\}/);
  if (!box) return null;
  const fields: Record<string, string> = {};
  for (const line of box[0].split("\n")) {
    const m = line.match(/^\|\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const val = stripWiki(m[2]);
    if (val) fields[m[1].toLowerCase()] = val;
  }
  const record = fields.record ?? "";
  const looksRecord = /\d/.test(record) && /[-–]/.test(record);
  if (!looksRecord && !fields.conference && !fields.head_coach) return null;
  return {
    year: fields.year ?? "",
    record: looksRecord ? record : "",
    conference: fields.conference ?? fields.short_conf ?? "",
    conferenceRecord: fields.conf_record ?? fields.conference_record ?? "",
    coach: fields.head_coach ?? "",
    stadium: fields.stadium ?? "",
    tournament: [fields.tourney, fields.tourney_result, fields.champion].filter(Boolean).join(" — "),
  };
}

async function infoboxFor(title: string): Promise<SchoolSeasonFacts | null> {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("redirects", "1");
  url.searchParams.set("format", "json");
  const data = await wikiJson(url);
  const parse = data.parse as { wikitext?: { ["*"]?: string } } | undefined;
  const wt = parse?.wikitext?.["*"];
  if (!wt) return null;
  return parseInfobox(wt);
}

function staticFacts(school: School, sport: "men" | "women"): string[] {
  const facts: string[] = [];
  facts.push(`${school.name} is ${school.association}${school.division ? ` ${school.division}` : ""}.`);
  if (school.conference && !/^NCAA Division/i.test(school.conference)) {
    facts.push(`Listed conference: ${school.conference}.`);
  }
  if (school.city || school.state) facts.push(`Campus: ${[school.city, school.state].filter(Boolean).join(", ")}.`);
  if (school.nickname) facts.push(`Nickname / mascot: ${school.nickname}.`);
  facts.push(`This post is about ${sportPhrase(sport)}.`);
  if (school.admitRate) facts.push(`Admission rate about ${Math.round(school.admitRate)}%.`);
  if (school.gpa) facts.push(`Average incoming GPA about ${school.gpa}.`);
  if (school.sat25 && school.sat75) facts.push(`SAT middle 50% about ${school.sat25}–${school.sat75}.`);
  if (school.enroll) facts.push(`Enrollment about ${school.enroll.toLocaleString()}.`);
  if (school.athleticsUrl) facts.push(`Athletics site: ${school.athleticsUrl}`);
  return facts;
}

async function fetchWikiContext(school: School, sport: "men" | "women", budget: number) {
  const phrase = sportPhrase(sport);
  const queries = [
    `${SEASON_YEAR} ${school.shortName} ${phrase} team`,
    `${SEASON_YEAR - 1} ${school.shortName} ${phrase} team`,
    `${school.shortName} ${phrase}`,
    `${school.name} ${phrase}`,
  ];
  let wikiTitle: string | null = null;
  let wikiUrl: string | null = null;
  let extract = "";
  let season: SchoolSeasonFacts | null = null;
  let bestScore = -99;
  let fetches = 0;
  for (const query of queries) {
    if (fetches >= budget) break;
    try {
      const hits = await searchWiki(query);
      const ranked = hits
        .map((h) => ({ ...h, score: scoreHit(h.title, school, SEASON_YEAR, sport) }))
        .filter((h) => h.score > 0)
        .sort((a, b) => b.score - a.score);
      for (const hit of ranked.slice(0, 2)) {
        if (fetches >= budget) break;
        fetches += 1;
        if (hit.score < bestScore) continue;
        const page = await extractWiki(hit.title);
        if (!page?.extract) continue;
        const box = await infoboxFor(hit.title).catch(() => null);
        wikiTitle = hit.title;
        wikiUrl = page.url;
        extract = page.extract;
        season = box;
        bestScore = hit.score;
        if (box?.record || /soccer|season|record/i.test(page.extract)) {
          if (hit.title.toLowerCase().includes("soccer")) break;
        }
      }
      if (season?.record) break;
    } catch {
      continue;
    }
  }
  return { wikiTitle, wikiUrl, extract, season };
}

export async function fetchSchoolFactPack(
  school: School,
  sport: "men" | "women",
): Promise<SchoolFactPack> {
  const live = await fetchNcaaLive(school, sport).catch(() => ({
    updated: null,
    division: null,
    record: null,
    ranking: null,
    players: [],
    news: [],
    source: null,
  }));
  const wikiBudget = live.record ? 2 : 4;
  const wiki = await fetchWikiContext(school, sport, wikiBudget);
  const photos = await fetchSchoolPhotos({
    school,
    sport,
    players: live.players,
    stadium: wiki.season?.stadium,
    news: live.news,
  }).catch(() => []);

  const season: SchoolSeasonFacts | null = live.record
    ? {
        year: String(SEASON_YEAR),
        record: live.record.record,
        conference: wiki.season?.conference ?? "",
        conferenceRecord: wiki.season?.conferenceRecord ?? "",
        coach: wiki.season?.coach ?? "",
        stadium: wiki.season?.stadium ?? "",
        tournament: live.ranking?.rank ? `United Soccer Coaches #${live.ranking.rank}` : wiki.season?.tournament ?? "",
      }
    : wiki.season;

  return {
    school,
    sport,
    seasonYear: SEASON_YEAR,
    wikiTitle: wiki.wikiTitle,
    wikiUrl: wiki.wikiUrl,
    extract: wiki.extract,
    season,
    live,
    photos,
    staticFacts: staticFacts(school, sport),
  };
}

export function factPackPrompt(pack: SchoolFactPack) {
  const live = pack.live;
  const liveLines = live.record
    ? [
        `CURRENT NCAA ${live.division?.toUpperCase() ?? ""} STATS through ${live.updated ?? "this week"} — these numbers beat Wikipedia if they conflict.`,
        `CURRENT OVERALL RECORD (do not change): ${live.record.record} (${live.record.won} wins, ${live.record.loss} losses, ${live.record.tied} ties, ${live.record.pct} win pct).`,
        live.ranking?.rank ? `UNITED SOCCER COACHES RANK: #${live.ranking.rank} (${live.ranking.record || live.record.record}).` : "",
        live.players.length
          ? `HOT PLAYERS (use these names and numbers):\n${live.players
              .map((p) => {
                const bits = [
                  p.goals ? `${p.goals} goals` : "",
                  p.assists ? `${p.assists} assists` : "",
                  p.points ? `${p.points} points` : "",
                  p.games ? `${p.games} games` : "",
                  p.classYear,
                ].filter(Boolean);
                return `- ${p.name} (${bits.join(", ")})`;
              })
              .join("\n")}`
          : "",
        live.news.length
          ? `RECENT NCAA.COM NEWS:\n${live.news.map((n) => `- ${n.title}: ${n.description}`).join("\n")}`
          : "",
      ]
    : ["No current NCAA.com W-L found for this school. Do not invent a live record."];
  const seasonLines = pack.season
    ? [
        pack.season.conference ? `SOCCER CONFERENCE: ${pack.season.conference}` : "",
        pack.season.conferenceRecord && !live.record
          ? `OLDER CONFERENCE RECORD: ${pack.season.conferenceRecord}`
          : "",
        pack.season.coach ? `HEAD COACH: ${pack.season.coach}` : "",
        pack.season.stadium ? `HOME FIELD: ${pack.season.stadium}` : "",
      ]
    : [];
  const lines = [
    `SCHOOL: ${pack.school.name}`,
    `ASSOCIATION: ${pack.school.association} ${pack.school.division}`.trim(),
    ...liveLines,
    ...seasonLines,
    ...pack.staticFacts,
    pack.extract
      ? `WIKIPEDIA CONTEXT (history only — ignore its W-L if CURRENT NCAA STATS exist):\n${pack.extract}`
      : "",
    live.source ? `Live source: ${live.source}` : "",
    pack.wikiUrl ? `Wikipedia: ${pack.wikiUrl}` : "",
    pack.school.athleticsUrl ? `Athletics: ${pack.school.athleticsUrl}` : "",
  ];
  return lines.filter(Boolean).join("\n");
}
