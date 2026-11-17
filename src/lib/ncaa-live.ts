import type { School } from "@/lib/schools";

const NCAA_API = "https://ncaa-api.henrygd.me";
const UA = "RyvalContentForge/1.0 (https://ryvalcontent.space; college soccer stats)";
const TTL_MS = 4 * 60 * 60 * 1000;

export type NcaaDivision = "d1" | "d2" | "d3";
export type NcaaSport = "men" | "women";

export type NcaaTeamRecord = {
  team: string;
  won: number;
  loss: number;
  tied: number;
  pct: string;
  record: string;
  rank: string;
  division: NcaaDivision;
};

export type NcaaPlayer = {
  name: string;
  team: string;
  classYear: string;
  games: string;
  goals?: string;
  assists?: string;
  points?: string;
  stat: string;
};

export type NcaaNewsItem = {
  title: string;
  link: string;
  description: string;
  image: string | null;
  pubDate: string;
};

export type NcaaLivePack = {
  updated: string | null;
  division: NcaaDivision | null;
  record: NcaaTeamRecord | null;
  ranking: { rank: string; record: string; points: string } | null;
  players: NcaaPlayer[];
  news: NcaaNewsItem[];
  source: string | null;
};

type CacheEntry<T> = { at: number; value: T };
const cache = new Map<string, CacheEntry<unknown>>();

const inflight = new Map<string, Promise<unknown>>();

function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.at < TTL_MS) return Promise.resolve(hit.value);
  const running = inflight.get(key) as Promise<T> | undefined;
  if (running) return running;
  const job = loader()
    .then((value) => {
      cache.set(key, { at: Date.now(), value });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, job);
  return job;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 428 means we asked too fast. Back off and retry instead of losing the whole stats pull. */
async function ncaaJson(path: string, attempt = 0): Promise<Record<string, unknown>> {
  const res = await fetch(`${NCAA_API}${path}`, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(15000),
  });
  if (res.status === 428 || res.status === 429 || res.status >= 500) {
    if (attempt < 4) {
      await sleep(800 * 2 ** attempt);
      return ncaaJson(path, attempt + 1);
    }
  }
  if (!res.ok) throw new Error(`NCAA ${res.status} ${path}`);
  return res.json() as Promise<Record<string, unknown>>;
}

const STAT_IDS = {
  men: { wlt: "33", goals: "573", points: "570", assists: "568" },
  women: { wlt: "60", goals: "579", points: "578", assists: "580" },
} as const;

function sportSlug(sport: NcaaSport) {
  return sport === "women" ? "soccer-women" : "soccer-men";
}

export function ncaaDivisionOf(school: School): NcaaDivision[] {
  if (school.association !== "NCAA") return [];
  const d = school.division.replace(/\s+/g, " ");
  if (/\bIII\b/i.test(d)) return ["d3"];
  if (/\bII\b/i.test(d) && !/\bIII\b/i.test(d)) return ["d2"];
  if (/\bI\b/i.test(d) && !/\bII\b/i.test(d)) return ["d1"];
  return ["d1", "d2", "d3"];
}

function normName(raw: string) {
  return raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\./g, "")
    .replace(/['’]/g, "")
    .replace(/\buniv(ersity)?\b/g, "")
    .replace(/\bcollege\b/g, "")
    .replace(/\bthe\b/g, "")
    .replace(/\bstate\b/g, "st")
    .replace(/\bsaint\b/g, "st")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameVariants(school: School) {
  const base = [school.shortName, school.name, school.id.replace(/-/g, " ")];
  const extra: string[] = [];
  for (const n of base) {
    extra.push(n.replace(/\bSt\.?\s*$/i, "State"));
    extra.push(n.replace(/\bState\s*$/i, "St."));
    extra.push(n.replace(/\bSaint\s+/i, "St. "));
  }
  return [...new Set([...base, ...extra].map((s) => s.trim()).filter(Boolean))];
}

export function matchNcaaTeam(school: School, teamName: string) {
  const team = normName(teamName);
  if (!team) return 0;
  let best = 0;
  for (const variant of nameVariants(school)) {
    const v = normName(variant);
    if (!v) continue;
    if (v === team) return 100;
    if (v.startsWith(team) || team.startsWith(v)) best = Math.max(best, 80);
    const vt = new Set(v.split(" ").filter((w) => w.length > 1));
    const tt = new Set(team.split(" ").filter((w) => w.length > 1));
    if (!vt.size || !tt.size) continue;
    let inter = 0;
    for (const w of vt) if (tt.has(w)) inter += 1;
    const jaccard = inter / new Set([...vt, ...tt]).size;
    if (jaccard >= 0.66) best = Math.max(best, Math.round(60 + jaccard * 30));
  }
  return best;
}

function pickTeam(school: School, rows: NcaaTeamRecord[]) {
  let best: { row: NcaaTeamRecord; score: number } | null = null;
  for (const row of rows) {
    const score = matchNcaaTeam(school, row.team);
    if (score < 70) continue;
    if (!best || score > best.score) best = { row, score };
  }
  return best?.row ?? null;
}

function mentionsSchool(school: School, text: string) {
  const hay = text.toLowerCase();
  return nameVariants(school).some((n) => n.length > 3 && hay.includes(n.toLowerCase()));
}

function num(v: string | undefined) {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Sequential and fault-tolerant: a missing page costs us rows, not the whole table. */
async function fetchAllPages(path: string) {
  const first = await ncaaJson(path);
  const pages = Math.min(10, Number(first.pages) || 1);
  const rows = [...((first.data as unknown[]) ?? [])];
  for (let page = 2; page <= pages; page++) {
    try {
      const next = await ncaaJson(`${path}${path.includes("?") ? "&" : "?"}page=${page}`);
      rows.push(...((next.data as unknown[]) ?? []));
    } catch (e) {
      console.warn(`ncaa page ${page} skipped`, e instanceof Error ? e.message : e);
    }
  }
  return { meta: first, rows };
}

async function teamRecords(sport: NcaaSport, division: NcaaDivision): Promise<{ updated: string; rows: NcaaTeamRecord[] }> {
  return cached(`wlt:${sport}:${division}`, async () => {
    const id = STAT_IDS[sport].wlt;
    const { meta, rows } = await fetchAllPages(`/stats/${sportSlug(sport)}/${division}/current/team/${id}`);
    return {
      updated: String(meta.updated ?? ""),
      rows: rows.map((raw) => {
        const r = raw as Record<string, string>;
        const won = num(r.Won);
        const loss = num(r.Loss);
        const tied = num(r.Tied);
        return {
          team: r.Team ?? "",
          won,
          loss,
          tied,
          pct: r["Pct."] ?? "",
          record: `${won}–${loss}–${tied}`,
          rank: r.Rank && r.Rank !== "-" ? r.Rank : "",
          division,
        };
      }),
    };
  });
}

async function leaderboard(sport: NcaaSport, division: NcaaDivision, kind: "goals" | "points" | "assists") {
  return cached(`ldr:${sport}:${division}:${kind}`, async () => {
    const id = STAT_IDS[sport][kind];
    const { meta, rows } = await fetchAllPages(`/stats/${sportSlug(sport)}/${division}/current/individual/${id}`);
    const players: NcaaPlayer[] = rows.map((raw) => {
      const r = raw as Record<string, string>;
      return {
        name: r.Name ?? "",
        team: r.Team ?? "",
        classYear: r.Cl ?? "",
        games: r.Games ?? "",
        goals: r.Goals,
        assists: r.Assists,
        points: r.Points,
        stat: kind,
      };
    });
    return { updated: String(meta.updated ?? ""), players };
  });
}

async function rankings(sport: NcaaSport, division: NcaaDivision) {
  return cached(`rk:${sport}:${division}`, async () => {
    try {
      const data = await ncaaJson(`/rankings/${sportSlug(sport)}/${division}/united-soccer-coaches`);
      const rows = ((data.data as unknown[]) ?? []).map((raw) => {
        const r = raw as Record<string, string>;
        return {
          school: r.SCHOOL ?? r.School ?? "",
          rank: r.RANK ?? r.Rank ?? "",
          record: r.RECORD ?? r.Record ?? "",
          points: r.POINTS ?? r.Points ?? "",
        };
      });
      return { updated: String(data.updated ?? ""), rows };
    } catch {
      return { updated: "", rows: [] as Array<{ school: string; rank: string; record: string; points: string }> };
    }
  });
}

export async function ncaaNews(sport: NcaaSport, division: NcaaDivision = "d1") {
  return cached(`news:${sport}:${division}`, async () => {
    try {
      const data = await ncaaJson(`/news/${sportSlug(sport)}/${division}`);
      const items = ((data.items as unknown[]) ?? []).map((raw) => {
        const r = raw as Record<string, string>;
        const image = r.enclosure || r.image || "";
        return {
          title: r.title ?? "",
          link: r.link ?? "",
          description: r.description ?? "",
          image: image.startsWith("https://") ? image : null,
          pubDate: r.pubDate ?? "",
        } satisfies NcaaNewsItem;
      });
      return items.filter((i) => i.title);
    } catch {
      return [] as NcaaNewsItem[];
    }
  });
}

export type NcaaSeasonBoard = {
  updated: string | null;
  sport: NcaaSport;
  topTeams: NcaaTeamRecord[];
  ranked: Array<{ school: string; rank: string; record: string; points: string }>;
  scorers: NcaaPlayer[];
  playmakers: NcaaPlayer[];
  news: NcaaNewsItem[];
  source: string;
};

/** National D1 picture for this week: unbeaten teams, top scorers, top assist men/women. */
export async function fetchNcaaSeasonBoard(sport: NcaaSport): Promise<NcaaSeasonBoard> {
  const table = await teamRecords(sport, "d1").catch(() => ({ updated: "", rows: [] as NcaaTeamRecord[] }));
  const rk = await rankings(sport, "d1").catch(() => ({ updated: "", rows: [] }));
  const goals = await leaderboard(sport, "d1", "goals").catch(() => ({ updated: "", players: [] }));
  const assists = await leaderboard(sport, "d1", "assists").catch(() => ({ updated: "", players: [] }));
  const news = await ncaaNews(sport, "d1").catch(() => [] as NcaaNewsItem[]);

  const played = table.rows.filter((r) => r.won + r.loss + r.tied >= 6);
  const topTeams = [...played]
    .sort((a, b) => Number(b.pct || 0) - Number(a.pct || 0) || b.won - a.won)
    .slice(0, 6);

  return {
    updated: table.updated || rk.updated || goals.updated || null,
    sport,
    topTeams,
    ranked: rk.rows.filter((r) => r.school && r.rank).slice(0, 10),
    scorers: goals.players.filter((p) => p.name && p.team).slice(0, 6),
    playmakers: assists.players.filter((p) => p.name && p.team).slice(0, 6),
    news: news.slice(0, 4),
    source: `https://www.ncaa.com/stats/${sportSlug(sport)}/d1`,
  };
}

export async function fetchNcaaLive(school: School, sport: NcaaSport): Promise<NcaaLivePack> {
  const empty: NcaaLivePack = {
    updated: null,
    division: null,
    record: null,
    ranking: null,
    players: [],
    news: [],
    source: null,
  };
  const divisions = ncaaDivisionOf(school);
  if (!divisions.length) return empty;

  try {
    let record: NcaaTeamRecord | null = null;
    let updated: string | null = null;
    let usedDiv: NcaaDivision | null = null;
    for (const division of divisions) {
      const table = await teamRecords(sport, division);
      const hit = pickTeam(school, table.rows);
      if (hit) {
        record = hit;
        updated = table.updated || null;
        usedDiv = division;
        break;
      }
    }
    const division = usedDiv ?? divisions[0]!;
    // Sequential: parallel leaderboard pulls are what trip the 428 rate limit.
    const rk = await rankings(sport, division).catch(() => ({ updated: "", rows: [] }));
    const goals = await leaderboard(sport, division, "goals").catch(() => ({ updated: "", players: [] }));
    const points = await leaderboard(sport, division, "points").catch(() => ({ updated: "", players: [] }));
    const assists = await leaderboard(sport, division, "assists").catch(() => ({ updated: "", players: [] }));
    const news = await ncaaNews(sport, division === "d1" ? "d1" : division).catch(() => []);
    if (!updated) updated = rk.updated || goals.updated || null;

    const rankingRow = rk.rows.find((r) => matchNcaaTeam(school, r.school) >= 80) ?? null;
    const fromLeaders = [...points.players, ...goals.players, ...assists.players].filter(
      (p) => matchNcaaTeam(school, p.team) >= 80,
    );
    const byName = new Map<string, NcaaPlayer>();
    for (const p of fromLeaders) {
      const prev = byName.get(p.name);
      if (!prev) {
        byName.set(p.name, { ...p });
        continue;
      }
      byName.set(p.name, {
        ...prev,
        goals: prev.goals || p.goals,
        assists: prev.assists || p.assists,
        points: prev.points || p.points,
      });
    }
    const players = [...byName.values()].slice(0, 4);
    const schoolNews = news.filter((n) => mentionsSchool(school, `${n.title} ${n.description}`)).slice(0, 3);

    return {
      updated,
      division,
      record,
      ranking: rankingRow
        ? { rank: rankingRow.rank, record: rankingRow.record, points: rankingRow.points }
        : null,
      players,
      news: schoolNews,
      source: `https://www.ncaa.com/stats/${sportSlug(sport)}/${division}`,
    };
  } catch (error) {
    console.warn("ncaa live stats failed", error);
    return empty;
  }
}
