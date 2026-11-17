/**
 * College stats posts, built from Ryval's own college soccer data.
 *
 * Source: the public Ryval API (https://api.ryvalsports.app/college-soccer/...), the same numbers the
 * Ryval app and web dashboard show. Season stats come from each school's stat page; daily lines and
 * Team of the Week come from NCAA.com box scores. Nothing here is written by a model.
 *
 * Every post is: a cover with one real number, one or two data slides, and the stats CTA
 * ("Get seen. Get recruited.": college players claim the profile they already have, high school
 * players download Ryval). The structured slides travel on the post row as a `stat_spec:` line in
 * `notes`, which `scripts/render-slides.mjs` draws. The text columns still hold a readable version of
 * the same post for the Library and for duplicate checks.
 *
 * Player photos are never used: names, schools and numbers only. Team marks come from the Ryval logo
 * registry (reviewed PNGs first, then NCAA.com's dark-background set).
 */
import { isSameCarousel } from "@/lib/content-quality";
import type { RecruitingStory, StoryDesk } from "@/lib/recruiting-stories";

export const RYVAL_API_BASE =
  (typeof process !== "undefined" && process.env?.RYVAL_API_BASE?.replace(/\/+$/, "")) ||
  "https://api.ryvalsports.app";

/** Accounts whose slots go to college stats first. The education account keeps its recruiting lessons. */
export const STATS_DESKS: ReadonlySet<StoryDesk> = new Set<StoryDesk>(["ryval", "media"]);

/** Accent per side, as in the graphic videos: men electric blue, women volt. */
const ACCENT = { men: "#4D8DFF", women: "#C6FF3D" } as const;

type Side = "men" | "women";
type ApiGender = "mens" | "womens";
type Division = 1 | 2 | 3;
type Metric = "goals" | "assists" | "points" | "saves" | "keeper_shutouts";

type ApiPlayer = {
  roster_player_id?: string | null;
  name: string;
  jersey_number?: string | null;
  position?: string | null;
  class_year?: string | null;
};
type ApiTeam = {
  sport_program_id?: string | null;
  name: string;
  image_url?: string | null;
  conference?: string | null;
};
type BoardEntry = {
  rank: number;
  tied: boolean;
  value: number;
  display_value: string;
  games?: number | null;
  player?: ApiPlayer | null;
  team: ApiTeam;
};
type Board = {
  status: string;
  entries: BoardEntry[];
  teams_reporting?: number;
  teams_total?: number;
  updated_at?: string | null;
};
type WeekPick = {
  slot: string;
  player: ApiPlayer;
  team: ApiTeam;
  reason?: string | null;
  games?: number;
  goals?: number;
  assists?: number;
  saves?: number;
  clean_sheets?: number;
  score?: number;
  featured?: boolean;
};
type TeamOfWeek = {
  status: string;
  week?: { start: string; end: string; label: string } | null;
  layout?: number[];
  picks?: WeekPick[];
  games_with_box?: number;
  games_total?: number;
};
type Performer = {
  name: string;
  team_name: string;
  sport_program_id?: string | null;
  roster_player_id?: string | null;
  position?: string | null;
  contest_id: number;
  goals: number;
  assists: number;
  points: number;
};
type DayPerformers = {
  date: string;
  performers: Performer[];
  finals: number;
  finals_with_box_score: number;
};
type ContestSide = { name: string; sport_program_id?: string | null; score?: number | null };
type ContestDetail = {
  contest: {
    state: string;
    final_message?: string | null;
    home: ContestSide;
    away: ContestSide;
    tournament_round?: { label?: string | null; competition?: string | null } | null;
  };
};
type LogoRegistry = {
  team_logo_base: string;
  programs: Record<string, string>;
  team_logos: Record<string, string>;
};

// ---------------------------------------------------------------- spec the renderer draws

export type StatRow = {
  rank: string;
  name: string;
  sub: string;
  value: string;
  unit?: string;
  logo: string | null;
  lead?: boolean;
};

export type StatSlide =
  | {
      type: "cover";
      kicker: string;
      big: string;
      unit: string;
      unitSub: string;
      headline: string;
      sub: string;
      teaser: string;
      logo: string | null;
    }
  | { type: "board"; title: string; kicker: string; rows: StatRow[]; note?: string }
  | {
      type: "player";
      kicker: string;
      name: string;
      meta: string;
      logo: string | null;
      stats: { label: string; value: string }[];
      note: string;
    }
  | {
      type: "potw";
      kicker: string;
      name: string;
      meta: string;
      logo: string | null;
      lines: string[];
      teaser: string;
    }
  | {
      type: "xi";
      title: string;
      kicker: string;
      layout: number[];
      picks: { slot: string; name: string; team: string; logo: string | null; featured: boolean }[];
    }
  | { type: "score"; kicker: string; a: GameTeam; b: GameTeam; line: string; teaser: string }
  | { type: "scoreboard"; title: string; kicker: string; games: GameRow[]; note?: string }
  | {
      type: "logowall";
      title: string;
      kicker: string;
      big: string;
      unit: string;
      teams: { name: string; logo: string | null; seed?: string | null }[];
    };

export type GameTeam = {
  name: string;
  logo: string | null;
  score: string | null;
  win: boolean | null;
  seed?: string | null;
};
export type GameRow = { a: GameTeam; b: GameTeam; tag: string };

export type StatCta = {
  /** The line written for this post, right above the brand close. */
  hook: string;
  kicker: string;
  lines: [string, string];
  rows: { tag: string; text: string }[];
  proof: string;
  button: string;
  buttonSub: string;
  phone: string;
  laptop: string;
};

export type StatSpec = {
  v: 1;
  family: Family;
  accent: string;
  side: Side;
  source: string;
  slides: StatSlide[];
  cta: StatCta;
};

export type CollegeStatsStory = RecruitingStory & { spec: StatSpec };

type Family =
  | "leaders"
  | "freshmen"
  | "totw"
  | "performers"
  | "scores"
  | "ncaa"
  | "teams"
  | "streaks"
  | "poll";

// ---------------------------------------------------------------- fetching

// Boards are ~1 MB each. The droplet caps the app at 280 MB, so the cache only lives for one pick
// (pickCollegeStatsStory clears it) and never holds more than a dozen responses.
const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_MS = 10 * 60_000;
const CACHE_MAX = 12;

async function getData<T>(path: string, timeoutMs = 25_000): Promise<T | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as T;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${RYVAL_API_BASE}${path}`, {
      headers: { Accept: "application/json", "User-Agent": "RyvalContentFactory/1.0" },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: T | null; error?: string | null };
    if (body?.error || !body?.data) return null;
    cache.set(path, { at: Date.now(), value: body.data });
    while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
    return body.data;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const apiGender = (side: Side): ApiGender => (side === "men" ? "mens" : "womens");

function fetchBoard(side: Side, division: Division, metric: Metric) {
  return getData<Board>(
    `/college-soccer/rankings/leaders?gender=${apiGender(side)}&division=${division}&metric=${metric}`,
  );
}

let logoRegistry: { at: number; value: LogoRegistry | null } | null = null;
async function logos(): Promise<LogoRegistry | null> {
  if (logoRegistry && Date.now() - logoRegistry.at < 6 * 3600_000) return logoRegistry.value;
  const value = await getData<LogoRegistry>("/college-soccer/logos");
  logoRegistry = { at: Date.now(), value };
  return value;
}

/** Reviewed Ryval PNG first, then NCAA.com's dark-background mark. Never a favicon. */
function logoFor(
  registry: LogoRegistry | null,
  programId: string | null | undefined,
  fallback?: string | null,
) {
  const slug = programId && registry?.programs?.[programId];
  if (slug) {
    const fixed = registry?.team_logos?.[slug];
    if (fixed) return fixed.startsWith("http") ? fixed : `${RYVAL_API_BASE}${fixed}`;
    return `${registry!.team_logo_base}${slug}.svg`;
  }
  if (fallback && /ncaa\.com\/.*\/logos\/schools\//.test(fallback))
    return fallback.replace("/bgl/", "/bgd/");
  return null;
}

// ---------------------------------------------------------------- wording

const DIV = (d: Division) => `D${d}`;
const sideWord = (side: Side) => (side === "men" ? "men's" : "women's");
const SIDE = (side: Side) => (side === "men" ? "MEN'S" : "WOMEN'S");

const METRICS: Record<
  Metric,
  {
    plural: string;
    singular: string;
    title: string;
    keeper: boolean;
    perGame: number;
    boardWord: string;
  }
> = {
  goals: {
    plural: "goals",
    singular: "goal",
    title: "GOALS",
    keeper: false,
    perGame: 2.5,
    boardWord: "scorers",
  },
  assists: {
    plural: "assists",
    singular: "assist",
    title: "ASSISTS",
    keeper: false,
    perGame: 2,
    boardWord: "assist leaders",
  },
  points: {
    plural: "points",
    singular: "point",
    title: "POINTS",
    keeper: false,
    perGame: 6,
    boardWord: "points leaders",
  },
  saves: {
    plural: "saves",
    singular: "save",
    title: "SAVES",
    keeper: true,
    perGame: 13,
    boardWord: "save leaders",
  },
  keeper_shutouts: {
    plural: "shutouts",
    singular: "shutout",
    title: "SHUTOUTS",
    keeper: true,
    perGame: 1,
    boardWord: "shutout leaders",
  },
};

const CLASS_WORD: Record<string, string> = {
  "fr.": "freshman",
  fr: "freshman",
  "so.": "sophomore",
  so: "sophomore",
  "jr.": "junior",
  jr: "junior",
  "sr.": "senior",
  sr: "senior",
  "gr.": "graduate student",
  gr: "graduate student",
};

function classLabel(raw: string | null | undefined) {
  const v = String(raw ?? "").trim();
  if (!v || /^none$/i.test(v)) return "";
  return v;
}
function classWord(raw: string | null | undefined) {
  return (
    CLASS_WORD[
      String(raw ?? "")
        .trim()
        .toLowerCase()
    ] ?? ""
  );
}
const isFreshman = (raw: string | null | undefined) =>
  /^fr\.?$|^freshman$/i.test(String(raw ?? "").trim());

function positionWord(raw: string | null | undefined) {
  const p = String(raw ?? "").toLowerCase();
  if (/goal ?keeper|^gk\b|^g$/.test(p)) return "goalkeeper";
  if (/defen|^d$|back/.test(p)) return "defender";
  if (/mid|^m$/.test(p)) return "midfielder";
  if (/forward|striker|^f$/.test(p)) return "forward";
  return "";
}

function upper(text: string) {
  return text.toUpperCase();
}

function etDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(d);
}
function shortDay(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
function weekday(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}
function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}w${String(week).padStart(2, "0")}`;
}

function countWord(n: number) {
  return ["zero", "one", "two", "three", "four", "five", "six"][n] ?? String(n);
}

function statLine(goals: number, assists: number) {
  const parts: string[] = [];
  if (goals >= 3) parts.push(goals === 3 ? "a hat trick" : `${countWord(goals)} goals`);
  else if (goals === 2) parts.push("two goals");
  else if (goals === 1) parts.push("a goal");
  if (assists) parts.push(assists === 1 ? "an assist" : `${countWord(assists)} assists`);
  return parts.join(" and ");
}

const hashtagsFor = (side: Side, division: Division) =>
  `#collegesoccer #d${division}soccer #${side === "men" ? "menssoccer" : "womenssoccer"} #soccerrecruiting #ryval`;

/** The line above the brand close, written for what the post just showed. */
const CTA_HOOKS: Record<Family, string> = {
  leaders: "Want your name on this list? It starts with college coaches seeing you.",
  freshmen: "A year ago they were the ones getting recruited. Your class is next.",
  performers: "Want to be on this list? It starts with college coaches seeing you.",
  totw: "Want your name in this XI? It starts with college coaches seeing you.",
  scores: "Want to play in games like these? It starts with college coaches seeing you.",
  ncaa: "Want to play in this tournament one day? It starts with college coaches seeing you.",
  teams: "Want to play for a program like this? It starts with college coaches seeing you.",
  streaks: "Want to play for a program like this? It starts with college coaches seeing you.",
  poll: "Want to play for a top-10 program? It starts with college coaches seeing you.",
};

const LAPTOP: Partial<Record<Family, string>> = {
  scores: "/web-screens/college-scores.jpg",
  ncaa: "/web-screens/college-tournament.jpg",
  totw: "/web-screens/college-tournament.jpg",
  performers: "/web-screens/college-scores.jpg",
  teams: "/web-screens/college-rankings.jpg",
  streaks: "/web-screens/college-rankings.jpg",
  poll: "/web-screens/college-rankings.jpg",
};

function ctaFor(side: Side, family: Family, everyoneHasProfile: boolean): StatCta {
  return {
    hook: CTA_HOOKS[family],
    kicker: everyoneHasProfile
      ? "EVERY PLAYER IN THIS POST HAS A RYVAL PROFILE"
      : "FREE TO DOWNLOAD. FREE TO JOIN.",
    lines: ["GET SEEN.", "GET RECRUITED."],
    rows: [
      {
        tag: "HIGH SCHOOL",
        text: "Build your profile, post your film, get on college coaches' radar.",
      },
      { tag: "COLLEGE", text: "Your stats are already on Ryval. Claim your profile." },
    ],
    proof: "1,800+ COLLEGE PROGRAMS · 50,000+ PLAYERS · LIVE NCAA SCORES",
    button: "DOWNLOAD RYVAL FREE",
    buttonSub: "ON THE APP STORE · APP.RYVALSPORTS.APP",
    phone: "/app-screens/college-hub.jpg",
    laptop:
      LAPTOP[family] ??
      (side === "men"
        ? "/web-screens/college-player-stats-men-d1.jpg"
        : "/web-screens/college-player-stats-women-d3.jpg"),
  };
}

const CTA_HEADLINE = "Get seen. Get recruited.";
const CTA_BODY =
  "High school? Build your profile and post your film. College? Your stats are already on Ryval. Download Ryval free.";
const CAPTION_CLOSE = [
  "Want college coaches to see you? Download Ryval free on the App Store. Build your profile, post your film, get seen, get recruited.",
  "Already playing in college? Your stats are already on Ryval. Search your name and claim your profile.",
].join("\n");

/** "West Ala.." -> "West Ala." when a school abbreviation ends a sentence. */
function tidy<T>(value: T): T {
  if (typeof value === "string") return value.replace(/\.{2,}/g, ".") as T;
  if (Array.isArray(value)) return value.map((v) => tidy(v)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tidy(v)])) as T;
  }
  return value;
}

function storyFrom(raw: {
  id: string;
  side: Side;
  division: Division;
  hook: string;
  hookBody: string;
  slides: { headline: string; body: string }[];
  caption: string;
  spec: StatSpec;
}): CollegeStatsStory {
  const opts = tidy(raw);
  return {
    id: opts.id,
    kind: "stats",
    desk: "media",
    gender: opts.side,
    hook: opts.hook,
    hookBody: opts.hookBody,
    slides: opts.slides.slice(0, 4),
    ctaHeadline: CTA_HEADLINE,
    ctaBody: CTA_BODY,
    screen: opts.spec.cta.phone,
    caption: `${opts.caption}\n\n${CAPTION_CLOSE}`,
    hashtags: hashtagsFor(opts.side, opts.division),
    family: opts.spec.family === "performers" || opts.spec.family === "totw" ? "news" : "proof",
    objective: "college stats with a claim / download close",
    closeMode: "product",
    spec: opts.spec,
  };
}

// ---------------------------------------------------------------- checks

/** A board is used only when nearly every team reported and the top rows look like real season lines. */
function usableBoard(board: Board | null, metric: Metric): board is Board {
  if (!board || board.status !== "available" || (board.entries?.length ?? 0) < 5) return false;
  const total = board.teams_total ?? 0;
  if (total && (board.teams_reporting ?? 0) / total < 0.9) return false;
  if (board.updated_at && Date.now() - Date.parse(board.updated_at) > 8 * 86400_000) return false;
  const cap = METRICS[metric].perGame;
  return board.entries.slice(0, 5).every((e) => {
    const games = e.games ?? 0;
    return Boolean(e.player?.name) && games >= 5 && e.value / games <= cap && e.value > 0;
  });
}

const asOfLabel = (board: Board) =>
  board.updated_at ? shortDay(etDate(new Date(board.updated_at))) : shortDay(etDate(new Date()));

function rankLabel(entry: BoardEntry, all: BoardEntry[]) {
  const tied = all.filter((e) => e.value === entry.value).length > 1;
  return `${tied ? "T" : ""}${entry.rank}`;
}

function firstLast(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

/** "Ava de Leest" -> "de Leest", "Max van der Berg" -> "van der Berg", otherwise the last word. */
function surname(name: string) {
  const words = firstLast(name).split(" ");
  let i = words.length - 1;
  while (
    i > 1 &&
    /^(de|da|del|della|der|den|di|do|dos|du|la|le|van|von|st\.?|bin|al|el)$/i.test(words[i - 1]!)
  )
    i -= 1;
  return words.slice(i).join(" ");
}

// ---------------------------------------------------------------- builders

async function buildLeaders(side: Side, division: Division, metric: Metric, id: string) {
  const info = METRICS[metric];
  const [board, registry] = await Promise.all([fetchBoard(side, division, metric), logos()]);
  if (!usableBoard(board, metric)) return null;
  const entries = board.entries;
  const top = entries[0]!;
  const leaders = entries.filter((e) => e.value === top.value);
  // Two names fit a cover; three or more tied leaders read as a list, not a story.
  if (leaders.length > 2) return null;
  const top5 = entries.slice(0, 5);
  const asOf = asOfLabel(board);
  const D = DIV(division);

  // The leader's full line, from the other boards on the same side and division.
  const otherMetrics: Metric[] = info.keeper
    ? ["saves", "keeper_shutouts"]
    : ["goals", "assists", "points"];
  const others = await Promise.all(
    otherMetrics.map((m) => (m === metric ? board : fetchBoard(side, division, m))),
  );
  const lineFor = (playerId: string | null | undefined) => {
    const out: Partial<Record<Metric, number>> = {};
    otherMetrics.forEach((m, i) => {
      const hit = others[i]?.entries?.find((e) => e.player?.roster_player_id === playerId);
      if (hit) out[m] = hit.value;
    });
    return out;
  };

  const rows: StatRow[] = top5.map((e, i) => ({
    rank: rankLabel(e, entries),
    name: upper(firstLast(e.player!.name)),
    sub: [e.team.name, classLabel(e.player?.class_year), e.games ? `${e.games} GP` : ""]
      .filter(Boolean)
      .join(" · "),
    value: e.display_value,
    logo: logoFor(registry, e.team.sport_program_id, e.team.image_url),
    lead: i === 0 || e.value === top.value,
  }));

  const single = leaders.length === 1;
  const leadName = firstLast(top.player!.name);
  const cls = classWord(top.player?.class_year);
  const pos = positionWord(top.player?.position);
  const who = [cls, pos].filter(Boolean).join(" ");
  const value = Number(top.display_value) || top.value;
  const unit = value === 1 ? info.singular : info.plural;

  const hook = single
    ? `${leadName} has ${top.display_value} ${unit}, the most in ${D} ${sideWord(side)} soccer`
    : `${countWord(leaders.length)} players share the ${D} ${sideWord(side)} lead with ${top.display_value} ${unit}`;
  const hookBody = single
    ? `${top.team.name}${who ? ` ${who}` : ""}. The top 5 ${info.boardWord} in ${D} ${sideWord(side)} soccer, from each school's stat page.`
    : `${leaders.map((l) => `${firstLast(l.player!.name)} (${l.team.name})`).join(", ")}. The top 5 ${info.boardWord} in ${D} ${sideWord(side)} soccer.`;

  const slides: StatSlide[] = [
    {
      type: "cover",
      kicker: `${D} ${SIDE(side)} SOCCER · ${info.title} LEADER${single ? "" : "S"}`,
      big: top.display_value,
      unit: upper(unit),
      unitSub: single && top.games ? `IN ${top.games} GAMES` : "TIED FOR THE LEAD",
      headline: single
        ? upper(leadName)
        : leaders.map((l) => upper(l.player!.name.split(" ").slice(-1)[0]!)).join(" · "),
      sub: single
        ? `${top.team.name}${who ? ` ${who}` : ""}. Nobody in ${D} ${sideWord(side)} soccer has more.`
        : `${leaders.map((l) => l.team.name).join(", ")}. Tied for the most in ${D} ${sideWord(side)} soccer.`,
      teaser: `The top 5, from each school's stat page as of ${asOf}.`,
      logo: single ? logoFor(registry, top.team.sport_program_id, top.team.image_url) : null,
    },
    {
      type: "board",
      title: info.title,
      kicker: `${D} ${SIDE(side)} SOCCER · 2026 SEASON · AS OF ${upper(asOf)}`,
      rows,
      note: metric === "points" ? "Points: 2 per goal, 1 per assist (NCAA)." : undefined,
    },
  ];

  const leadLine = lineFor(top.player?.roster_player_id);
  const games = top.games ?? 0;
  const stats = info.keeper
    ? [
        { label: "SAVES", value: String(leadLine.saves ?? (metric === "saves" ? top.value : "–")) },
        {
          label: "SHUTOUTS",
          value: String(
            leadLine.keeper_shutouts ?? (metric === "keeper_shutouts" ? top.value : "–"),
          ),
        },
        { label: "GAMES", value: String(games || "–") },
      ]
    : [
        { label: "GOALS", value: String(leadLine.goals ?? 0) },
        { label: "ASSISTS", value: String(leadLine.assists ?? 0) },
        {
          label: "POINTS",
          value: String(leadLine.points ?? (leadLine.goals ?? 0) * 2 + (leadLine.assists ?? 0)),
        },
        { label: "GAMES", value: String(games || "–") },
      ];
  const known = (list: { label: string; value: string }[]) =>
    list.filter((x) => x.value !== "–" && x.value !== "undefined");
  const perGame = games
    ? (top.value / games).toFixed(metric === "keeper_shutouts" ? 2 : metric === "saves" ? 1 : 2)
    : "";
  if (single) {
    slides.push({
      type: "player",
      kicker: `NO. 1 · ${info.title} · ${D} ${SIDE(side)}`,
      name: upper(leadName),
      meta: [top.team.name, pos, cls].filter(Boolean).map(upper).join(" · "),
      logo: logoFor(registry, top.team.sport_program_id, top.team.image_url),
      stats: known(stats),
      note:
        metric === "keeper_shutouts"
          ? `${top.display_value} shutouts in ${games} games.`
          : perGame
            ? `${perGame} ${info.plural} a game.`
            : "",
    });
  }

  // The best freshman on the same board: the line a high school senior can picture next fall.
  const fresh = entries.find(
    (e, i) => i > 0 && isFreshman(e.player?.class_year) && (e.games ?? 0) >= 5,
  );
  if (
    fresh &&
    fresh.value !== top.value &&
    fresh.rank <= 40 &&
    fresh.value / (fresh.games || 1) <= info.perGame
  ) {
    const freshLine = lineFor(fresh.player?.roster_player_id);
    slides.push({
      type: "player",
      kicker: `TOP TRUE FRESHMAN · ${info.title} · NO. ${rankLabel(fresh, entries)} IN ${D}`,
      name: upper(firstLast(fresh.player!.name)),
      meta: [fresh.team.name, positionWord(fresh.player?.position), "freshman"]
        .filter(Boolean)
        .map(upper)
        .join(" · "),
      logo: logoFor(registry, fresh.team.sport_program_id, fresh.team.image_url),
      stats: known(
        info.keeper
          ? [
              { label: "SAVES", value: String(freshLine.saves ?? "–") },
              { label: "SHUTOUTS", value: String(freshLine.keeper_shutouts ?? "–") },
              { label: "GAMES", value: String(fresh.games ?? "–") },
            ]
          : [
              { label: "GOALS", value: String(freshLine.goals ?? 0) },
              { label: "ASSISTS", value: String(freshLine.assists ?? 0) },
              { label: "POINTS", value: String(freshLine.points ?? 0) },
              { label: "GAMES", value: String(fresh.games ?? "–") },
            ],
      ),
      note: "First college season.",
    });
  }

  const textSlides = [
    {
      headline: `${D} ${sideWord(side)} ${info.boardWord}`,
      body: top5
        .map(
          (e) => `${rankLabel(e, entries)}. ${e.player!.name}, ${e.team.name}: ${e.display_value}`,
        )
        .join(". "),
    },
    ...slides
      .filter((s): s is Extract<StatSlide, { type: "player" }> => s.type === "player")
      .map((s) => ({
        headline: `${s.kicker.split(" · ")[0]}: ${s.name}`,
        body: `${s.meta}. ${s.stats.map((x) => `${x.value} ${x.value === "1" ? x.label.toLowerCase().replace(/s$/, "") : x.label.toLowerCase()}`).join(", ")}. ${s.note}`.trim(),
      })),
  ];

  const caption = single
    ? `${leadName} has ${top.display_value} ${unit} for ${top.team.name} this season, the most in ${D} ${sideWord(side)} soccer. Swipe for the top 5. Stats from each school's stat page as of ${asOf}.`
    : `${leaders.map((l) => firstLast(l.player!.name)).join(" and ")} share the ${D} ${sideWord(side)} lead with ${top.display_value} ${unit}. Swipe for the top 5. Stats from each school's stat page as of ${asOf}.`;

  return storyFrom({
    id,
    side,
    division,
    hook,
    hookBody,
    slides: textSlides,
    caption,
    spec: {
      v: 1,
      family: "leaders",
      accent: ACCENT[side],
      side,
      source: `Each school's stat page · ${asOf}`,
      slides,
      cta: ctaFor(side, "leaders", true),
    },
  });
}

async function buildFreshmen(side: Side, division: Division, id: string) {
  const [points, goals, assists, registry] = await Promise.all([
    fetchBoard(side, division, "points"),
    fetchBoard(side, division, "goals"),
    fetchBoard(side, division, "assists"),
    logos(),
  ]);
  if (!points || points.status !== "available") return null;
  const fresh = points.entries.filter(
    (e) => isFreshman(e.player?.class_year) && (e.games ?? 0) >= 5 && e.value / (e.games || 1) <= 6,
  );
  if (fresh.length < 5) return null;
  const top5 = fresh.slice(0, 5);
  const lead = top5[0]!;
  if (top5.filter((e) => e.value === lead.value).length > 1) return null;
  const find = (board: Board | null, pid?: string | null) =>
    board?.entries?.find((e) => e.player?.roster_player_id === pid)?.value ?? 0;
  const asOf = asOfLabel(points);
  const D = DIV(division);
  const leadName = firstLast(lead.player!.name);
  const g = find(goals, lead.player?.roster_player_id);
  const a = find(assists, lead.player?.roster_player_id);

  const rows: StatRow[] = top5.map((e, i) => {
    const eg = find(goals, e.player?.roster_player_id);
    const ea = find(assists, e.player?.roster_player_id);
    return {
      rank: String(i + 1).padStart(2, "0"),
      name: upper(firstLast(e.player!.name)),
      sub: [e.team.name, `${eg} G · ${ea} A`, e.games ? `${e.games} GP` : ""]
        .filter(Boolean)
        .join(" · "),
      value: e.display_value,
      unit: "PTS",
      logo: logoFor(registry, e.team.sport_program_id, e.team.image_url),
      lead: i === 0,
    };
  });

  const slides: StatSlide[] = [
    {
      type: "cover",
      kicker: `${D} ${SIDE(side)} SOCCER · BEST TRUE FRESHMEN`,
      big: lead.display_value,
      unit: "POINTS",
      unitSub: "AS A FRESHMAN",
      headline: upper(leadName),
      sub: `${lead.team.name}, ${g} goals and ${a} assists. No true freshman in ${D} ${sideWord(side)} soccer has more points.`,
      teaser: `A year ago, most of them were still in high school or club soccer. Top 5 as of ${asOf}.`,
      logo: logoFor(registry, lead.team.sport_program_id, lead.team.image_url),
    },
    {
      type: "board",
      title: "FRESHMEN",
      kicker: `${D} ${SIDE(side)} SOCCER · POINTS · AS OF ${upper(asOf)}`,
      rows,
      note: "Points: 2 per goal, 1 per assist (NCAA). True freshmen (Fr.) as each roster lists them.",
    },
  ];
  return storyFrom({
    id,
    side,
    division,
    hook: `${leadName} has ${lead.display_value} points as a ${D} ${sideWord(side)} freshman`,
    hookBody: `${lead.team.name}. The best true freshmen in ${D} ${sideWord(side)} soccer by points, from each school's stat page.`,
    slides: [
      {
        headline: `${D} ${sideWord(side)} freshmen by points`,
        body: top5
          .map((e, i) => `${i + 1}. ${e.player!.name}, ${e.team.name}: ${e.display_value}`)
          .join(". "),
      },
    ],
    caption: `${leadName} (${lead.team.name}) has ${lead.display_value} points as a freshman: ${g} goals and ${a} assists. The top 5 true freshmen in ${D} ${sideWord(side)} soccer, from each school's stat page as of ${asOf}.`,
    spec: {
      v: 1,
      family: "freshmen",
      accent: ACCENT[side],
      side,
      source: `Each school's stat page · ${asOf}`,
      slides,
      cta: ctaFor(side, "freshmen", true),
    },
  });
}

async function buildTeamOfWeek(side: Side, division: Division, idBase: string) {
  const [totw, registry] = await Promise.all([
    getData<TeamOfWeek>(
      `/college-soccer/rankings/team-of-week?gender=${apiGender(side)}&division=${division}`,
    ),
    logos(),
  ]);
  if (!totw || totw.status !== "available" || !totw.week || !totw.picks?.length) return null;
  if (totw.picks.length !== 11) return null;
  if ((totw.games_total ?? 0) && (totw.games_with_box ?? 0) / (totw.games_total ?? 1) < 0.8)
    return null;
  // Only a finished week, and only while it is news (posted within 9 days of its Sunday).
  const end = Date.parse(`${totw.week.end}T23:59:59-05:00`);
  if (Date.now() < end || Date.now() - end > 9 * 86400_000) return null;
  const star =
    totw.picks.find((p) => p.featured) ??
    [...totw.picks].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0]!;
  const D = DIV(division);
  const id = `${idBase}-${totw.week.start}`;
  const name = firstLast(star.player.name);
  const pos =
    positionWord(star.player.position) ||
    { GK: "goalkeeper", D: "defender", M: "midfielder", F: "forward" }[star.slot] ||
    "";
  const reasonParts = String(star.reason ?? "")
    .split(" · ")
    .filter(Boolean);
  const weekLabel = totw.week.label.replace(/^Week \d+ · /, "");

  const slides: StatSlide[] = [
    {
      type: "potw",
      kicker: `${D} ${SIDE(side)} SOCCER · PLAYER OF THE WEEK · ${upper(weekLabel)}`,
      name: upper(name),
      meta: [star.team.name, pos, classWord(star.player.class_year)]
        .filter(Boolean)
        .map(upper)
        .join(" · "),
      logo: logoFor(registry, star.team.sport_program_id, star.team.image_url),
      lines: reasonParts.slice(0, 3),
      teaser: "Ryval's pick from every NCAA.com box score of the week. Swipe for the full XI.",
    },
    {
      type: "xi",
      title: "TEAM OF THE WEEK",
      kicker: `${D} ${SIDE(side)} SOCCER · ${upper(weekLabel)}`,
      layout: totw.layout?.length ? totw.layout : [1, 4, 3, 3],
      picks: totw.picks.map((p) => ({
        slot: p.slot,
        name: upper(surname(p.player.name)),
        team: p.team.name,
        logo: logoFor(registry, p.team.sport_program_id, p.team.image_url),
        featured: p === star,
      })),
    },
  ];
  return storyFrom({
    id,
    side,
    division,
    hook: `${name} is the ${D} ${sideWord(side)} Player of the Week`,
    hookBody: `${star.team.name}. ${reasonParts[0] ?? ""}. Picked from the week's NCAA.com box scores.`,
    slides: [
      {
        headline: `${D} ${sideWord(side)} Team of the Week`,
        body: totw.picks.map((p) => `${p.slot} ${p.player.name} (${p.team.name})`).join(", "),
      },
    ],
    caption: `${name} (${star.team.name}) is Ryval's ${D} ${sideWord(side)} Player of the Week for ${weekLabel}: ${reasonParts.join(", ")}. Swipe for the full Team of the Week, picked from every NCAA.com box score of the week.`,
    spec: {
      v: 1,
      family: "totw",
      accent: ACCENT[side],
      side,
      source: `NCAA.com box scores · ${weekLabel} · Ryval selection`,
      slides,
      cta: ctaFor(side, "totw", true),
    },
  });
}

async function resultLine(contestId: number, programId: string | null | undefined) {
  const detail = await getData<ContestDetail>(`/college-soccer/live/${contestId}`, 15_000);
  const c = detail?.contest;
  if (!c || c.state !== "final") return null;
  const home = c.home.sport_program_id === programId;
  const us = home ? c.home : c.away;
  const them = home ? c.away : c.home;
  if (us.score == null || them.score == null) return null;
  const pk = /pk|penalt|shootout/i.test(String(c.final_message ?? ""));
  // A shootout game is a tie in NCAA records, so it is written as one.
  const word = us.score > them.score ? "W" : us.score < them.score ? "L" : "T";
  const round = c.tournament_round?.label?.replace(/\bround\b/i, "round") ?? "";
  return {
    short: `${word} ${us.score}-${them.score} ${home ? "vs" : "at"} ${them.name}${pk && word === "T" ? " (PKs)" : ""}`,
    round,
    won: us.score > them.score,
  };
}

async function buildPerformers(side: Side, division: Division, day: string, id: string) {
  const [data, registry] = await Promise.all([
    getData<DayPerformers>(
      `/college-soccer/day-performers?gender=${apiGender(side)}&division=${division}&date=${day}&limit=8`,
    ),
    logos(),
  ]);
  if (!data || data.finals_with_box_score < 3 || data.performers.length < 4) return null;
  const top = data.performers.filter((p) => p.name && p.points >= 2).slice(0, 5);
  if (top.length < 4) return null;
  const results = await Promise.all(top.map((p) => resultLine(p.contest_id, p.sport_program_id)));
  if (results.some((r) => !r)) return null;
  const lead = top[0]!;
  const leadResult = results[0]!;
  const D = DIV(division);
  const dayName = weekday(day);
  const line = statLine(lead.goals, lead.assists);
  const rows: StatRow[] = top.map((p, i) => ({
    rank: String(i + 1).padStart(2, "0"),
    name: upper(firstLast(p.name)),
    sub: [p.team_name, results[i]!.short, results[i]!.round].filter(Boolean).join(" · "),
    value: [p.goals ? `${p.goals}G` : "", p.assists ? `${p.assists}A` : ""]
      .filter(Boolean)
      .join(" "),
    logo: logoFor(registry, p.sport_program_id),
    lead: i === 0,
  }));
  const everyoneHasProfile = top.every((p) => Boolean(p.roster_player_id));
  const slides: StatSlide[] = [
    {
      type: "cover",
      kicker: `${D} ${SIDE(side)} SOCCER · ${upper(dayName)}'S TOP PERFORMERS`,
      big: String(lead.goals || lead.assists),
      unit: lead.goals
        ? lead.goals === 1
          ? "GOAL"
          : "GOALS"
        : lead.assists === 1
          ? "ASSIST"
          : "ASSISTS",
      unitSub:
        lead.goals && lead.assists
          ? `+ ${lead.assists} ASSIST${lead.assists > 1 ? "S" : ""}`
          : upper(shortDay(day)),
      headline: upper(firstLast(lead.name)),
      sub: `${lead.team_name}, ${leadResult.short}${leadResult.round ? ` (${leadResult.round})` : ""}.`,
      teaser: `${dayName}'s best stat lines from the NCAA.com box scores.`,
      logo: logoFor(registry, lead.sport_program_id),
    },
    {
      type: "board",
      title: "TOP PERFORMERS",
      kicker: `${D} ${SIDE(side)} SOCCER · ${upper(dayName)}, ${upper(shortDay(day))}`,
      rows,
      note: "Ranked by NCAA points: 2 per goal, 1 per assist.",
    },
  ];
  return storyFrom({
    id,
    side,
    division,
    hook: `${firstLast(lead.name)} had ${line} for ${lead.team_name} on ${dayName}`,
    hookBody: `${leadResult.short}. ${D} ${sideWord(side)} soccer's top performers on ${dayName}.`,
    slides: [
      {
        headline: `${D} ${sideWord(side)} top performers, ${shortDay(day)}`,
        body: top
          .map(
            (p, i) =>
              `${p.name} (${p.team_name}) ${line && i === 0 ? line : `${p.goals}G ${p.assists}A`}`,
          )
          .join(". "),
      },
    ],
    caption: `${firstLast(lead.name)} had ${line} for ${lead.team_name} on ${dayName} (${leadResult.short}${leadResult.round ? `, ${leadResult.round}` : ""}). ${D} ${sideWord(side)} soccer's top performers from the NCAA.com box scores.`,
    spec: {
      v: 1,
      family: "performers",
      accent: ACCENT[side],
      side,
      source: `NCAA.com box scores · ${shortDay(day)}`,
      slides,
      cta: ctaFor(side, "performers", everyoneHasProfile),
    },
  });
}

// ---------------------------------------------------------------- scores, NCAA tournament, teams, streaks, poll

type LiveTeam = {
  name: string;
  sport_program_id?: string | null;
  image_url?: string | null;
  score?: number | null;
  rank?: number | null;
  rank_source?: string | null;
};
type LiveContest = {
  contest_id: number;
  contest_date: string;
  state: string;
  final_message?: string | null;
  home: LiveTeam;
  away: LiveTeam;
  tournament_round?: { kind?: string | null; label?: string | null; final?: boolean | null } | null;
};
type BracketTeam = {
  sport_program_id?: string | null;
  name: string;
  image_url?: string | null;
  score?: number | null;
  bye?: boolean;
  seed?: string | null;
  advanced?: boolean | null;
};
type BracketGame = {
  id: string;
  game_date?: string | null;
  round_label?: string | null;
  teams: BracketTeam[];
  state?: string | null;
  contest?: { contest_id?: number | null; start_time_epoch?: number | null } | null;
};
type Bracket = {
  status: string;
  title?: string | null;
  field_size?: number | null;
  rounds: { label: string; games: BracketGame[] }[];
  champion?: { name: string; sport_program_id?: string | null } | null;
};
type RecordEntry = {
  rank: number;
  team: ApiTeam;
  count: number;
  first_date: string;
  last_date: string;
  active: boolean;
};
type Records = {
  status: string;
  through_date?: string | null;
  boards: { id: string; label: string; unit: string; entries: RecordEntry[] }[];
};
type PollEntry = {
  rank: number;
  rank_text: string;
  team: ApiTeam;
  record?: string | null;
  points?: number | null;
  first_place_votes?: number | null;
  movement?: { kind: string; places?: number | null } | null;
};
type Poll = {
  status: string;
  release?: { id: number; through_date: string; label: string } | null;
  entries: PollEntry[];
};

const fetchBracket = (side: Side, division: Division) =>
  getData<Bracket>(
    `/college-soccer/rankings/tournament?gender=${apiGender(side)}&division=${division}`,
  );

function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function dayTag(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  return d
    .toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}

const daysFromToday = (iso: string, now = new Date()) =>
  Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${etDate(now)}T12:00:00Z`)) / 86400_000);

/** "NCAA Second round" -> "second round"; "Final" stays. */
function roundWords(label: string | null | undefined) {
  return String(label ?? "")
    .replace(/^ncaa\s+/i, "")
    .trim()
    .toLowerCase();
}

function teamsLeftLabel(n: number) {
  return n === 16
    ? "SWEET 16"
    : n === 8
      ? "ELITE 8"
      : n === 4
        ? "FINAL FOUR"
        : n === 2
          ? "THE FINAL"
          : `${n} LEFT`;
}

async function buildScores(side: Side, division: Division, day: string, id: string) {
  const [live, registry] = await Promise.all([
    getData<{ contests: LiveContest[] }>(
      `/college-soccer/live?gender=${apiGender(side)}&division=${division}&date=${day}`,
    ),
    logos(),
  ]);
  const finals = (live?.contests ?? []).filter(
    (c) =>
      c.state === "final" &&
      c.home.sport_program_id &&
      c.away.sport_program_id &&
      typeof c.home.score === "number" &&
      typeof c.away.score === "number",
  );
  const isNcaa = (c: LiveContest) =>
    c.tournament_round?.kind === "ncaa" || /^ncaa\b/i.test(c.tournament_round?.label ?? "");
  const ncaaGames = finals.filter(isNcaa);
  const ncaa = ncaaGames.length >= 3;
  const games = ncaa ? ncaaGames : finals.length >= 4 ? finals : [];
  if (!games.length) return null;
  const D = DIV(division);
  const round = ncaa ? roundWords(ncaaGames[0]!.tournament_round?.label) : "";

  // A shootout is a tie in the record; the bracket says who went through.
  const advanced = new Map<number, string>();
  if (games.some((c) => /pk/i.test(c.final_message ?? ""))) {
    const bracket = await fetchBracket(side, division);
    for (const r of bracket?.rounds ?? []) {
      for (const g of r.games) {
        const winner = g.teams.find((t) => t.advanced);
        if (g.contest?.contest_id && winner?.sport_program_id)
          advanced.set(g.contest.contest_id, winner.sport_program_id);
      }
    }
  }
  const mapped = games
    .map((c) => {
      const hs = c.home.score!;
      const as = c.away.score!;
      const pk = /pk/i.test(c.final_message ?? "");
      const through = advanced.get(c.contest_id);
      const homeWin = hs > as || (hs === as && through === c.home.sport_program_id);
      const awayWin = as > hs || (hs === as && through === c.away.sport_program_id);
      const team = (t: LiveTeam, win: boolean): GameTeam => ({
        name: t.name,
        logo: logoFor(registry, t.sport_program_id, t.image_url),
        score: String(t.score),
        win: hs === as && !through ? null : win,
      });
      const first = awayWin && !homeWin ? c.away : c.home;
      const second = first === c.home ? c.away : c.home;
      const label = c.tournament_round?.label ?? "";
      const where = isNcaa(c)
        ? `the ${D} ${sideWord(side)} NCAA ${roundWords(label)}`
        : label
          ? `the ${label}`
          : `${D} ${sideWord(side)} soccer on ${weekday(day)}`;
      return {
        row: {
          a: team(first, first === c.home ? homeWin : awayWin),
          b: team(second, second === c.home ? homeWin : awayWin),
          tag: [ncaa ? "" : upper(roundWords(label)), pk ? (through ? "WON ON PKS" : "PKS") : ""]
            .filter(Boolean)
            .join(" · "),
        } as GameRow,
        where,
        margin: Math.abs(hs - as),
        goals: hs + as,
      };
    })
    .sort((x, y) => y.margin - x.margin || y.goals - x.goals)
    .slice(0, 16);
  const rows = mapped.map((m) => m.row);
  const feature = mapped.find((m) => m.row.a.win) ?? mapped[0]!;
  const fa = feature.row.a;
  const fb = feature.row.b;
  const allFinals = games.every((c) => /final/i.test(c.tournament_round?.label ?? ""));
  const title = ncaa ? upper(round) : allFinals ? "CONFERENCE FINALS" : "SCORES";
  const kicker = `${D} ${SIDE(side)} ${ncaa ? "NCAA TOURNAMENT" : "SOCCER"} · ${dayTag(day)}`;
  const slides: StatSlide[] = [
    {
      type: "score",
      kicker,
      a: fa,
      b: fb,
      line: fa.win
        ? `${fa.name} beat ${fb.name} in ${feature.where}.`
        : `${fa.name} and ${fb.name} in ${feature.where}.`,
      teaser: `Every ${ncaa ? `NCAA ${round} ` : ""}result from ${weekday(day)}: ${rows.length} games. Swipe.`,
    },
  ];
  for (let i = 0; i < rows.length; i += 8) {
    slides.push({
      type: "scoreboard",
      title,
      kicker:
        rows.length > 8 ? `${kicker} · ${i / 8 + 1} OF ${Math.ceil(rows.length / 8)}` : kicker,
      games: rows.slice(i, i + 8),
      note: rows.some((r) => r.tag.includes("PKS"))
        ? "Shootouts count as ties in NCAA records."
        : undefined,
    });
  }
  const hook = fa.win
    ? `${fa.name} beat ${fb.name} ${fa.score}-${fb.score} in ${feature.where}`
    : `${fa.name} and ${fb.name} drew ${fa.score}-${fb.score} in ${feature.where}`;
  const what = ncaa ? `NCAA ${round} result` : allFinals ? "conference final" : "result";
  return storyFrom({
    id,
    side,
    division,
    hook,
    hookBody: `Every ${D} ${sideWord(side)} ${what} from ${weekday(day)}.`,
    slides: [
      {
        headline: `${D} ${sideWord(side)} ${ncaa ? round : "scores"}, ${shortDay(day)}`,
        body: rows.map((r) => `${r.a.name} ${r.a.score}, ${r.b.name} ${r.b.score}`).join(". "),
      },
    ],
    caption: `${hook}. Every ${D} ${sideWord(side)} ${what} from ${weekday(day)}, ${shortDay(day)}.`,
    spec: {
      v: 1,
      family: "scores",
      accent: ACCENT[side],
      side,
      source: `NCAA.com scoreboard · ${shortDay(day)}`,
      slides: slides.slice(0, 3),
      cta: ctaFor(side, "scores", false),
    },
  });
}

function gameRowFromBracket(g: BracketGame, registry: LogoRegistry | null): GameRow | null {
  const [a, b] = g.teams;
  if (!a?.name || !b?.name || /^tba$/i.test(a.name) || /^tba$/i.test(b.name)) return null;
  const t = (x: BracketTeam): GameTeam => ({
    name: x.name,
    logo: logoFor(registry, x.sport_program_id, x.image_url),
    score: null,
    win: null,
    seed: x.seed ?? null,
  });
  return { a: t(a), b: t(b), tag: dayTag(g.game_date) };
}

async function buildNcaaNext(side: Side, division: Division, idBase: string, now: Date) {
  const [bracket, registry] = await Promise.all([fetchBracket(side, division), logos()]);
  if (!bracket?.rounds?.length) return null;
  const index = bracket.rounds.findIndex(
    (r) =>
      r.games.length > 0 &&
      r.games.every(
        (g) =>
          g.state === "pre" &&
          g.teams.length === 2 &&
          g.teams.every((t) => t.name && !/^tba$/i.test(t.name)),
      ),
  );
  if (index === -1) return null;
  const round = bracket.rounds[index]!;
  const dates = round.games
    .map((g) => g.game_date)
    .filter((d): d is string => Boolean(d))
    .sort();
  const first = dates[0];
  if (!first) return null;
  const until = daysFromToday(first, now);
  if (until < 0 || until > 6) return null;
  const allRows = round.games
    .map((g) => gameRowFromBracket(g, registry))
    .filter((r): r is GameRow => Boolean(r));
  if (allRows.length !== round.games.length) return null;
  // Two slides hold 16 games. A bigger round (the 64-team first round) shows its seeded matchups.
  const seedOf = (r: GameRow) => Math.min(Number(r.a.seed) || 99, Number(r.b.seed) || 99);
  const rows =
    allRows.length > 16 ? [...allRows].sort((x, y) => seedOf(x) - seedOf(y)).slice(0, 16) : allRows;
  const partial = allRows.length > rows.length;
  const games = allRows.length;
  const D = DIV(division);
  const opening = index === 0;
  const teams = games * 2;
  const field = bracket.field_size ?? null;
  const byes = opening && field && field > teams ? field - teams : 0;
  const label = round.label.toLowerCase();
  const kicker = `${D} ${SIDE(side)} NCAA TOURNAMENT · ${upper(round.label)}`;
  const slides: StatSlide[] = [
    {
      type: "cover",
      kicker,
      big: String(opening && field ? field : teams),
      unit: opening && field ? "TEAMS" : "TEAMS LEFT",
      unitSub: opening ? "ONE TITLE" : teamsLeftLabel(teams),
      headline: opening ? `IT STARTS ${upper(weekday(first))}` : `${upper(round.label)} IS SET`,
      sub: `${games} ${label} games${dates.length && dates[0] !== dates[dates.length - 1] ? ` from ${weekday(first)}, ${shortDay(first)}` : ` on ${weekday(first)}`}.${byes ? ` The top ${byes} seeds wait in the second round.` : ""}`,
      teaser: partial
        ? `The ${rows.length} seeded matchups inside. All ${games} are live on Ryval.`
        : "Every matchup inside. Follow every game live on Ryval.",
      logo: null,
    },
  ];
  for (let i = 0; i < rows.length; i += 8) {
    slides.push({
      type: "scoreboard",
      title: upper(round.label),
      kicker:
        rows.length > 8 ? `${kicker} · ${i / 8 + 1} OF ${Math.ceil(rows.length / 8)}` : kicker,
      games: rows.slice(i, i + 8),
      note: partial
        ? `The ${rows.length} seeded matchups of ${games}. Seeds as NCAA.com publishes them.`
        : rows.some((r) => r.a.seed || r.b.seed)
          ? "Seeds as NCAA.com publishes them."
          : undefined,
    });
  }
  const hook = opening
    ? `The ${D} ${sideWord(side)} NCAA tournament starts ${weekday(first)} with ${games} first-round games`
    : `The ${D} ${sideWord(side)} NCAA ${label} is set: ${games} games starting ${weekday(first)}`;
  return storyFrom({
    id: `${idBase}-next-${slug(round.label)}`,
    side,
    division,
    hook,
    hookBody: `${partial ? "The seeded" : "Every"} ${label} matchups in the ${D} ${sideWord(side)} NCAA tournament.`,
    slides: [
      {
        headline: `${D} ${sideWord(side)} NCAA ${label}`,
        body: rows.map((r) => `${r.a.name} vs ${r.b.name} (${r.tag.toLowerCase()})`).join(". "),
      },
    ],
    caption: `${hook}. Every matchup, from NCAA.com's official bracket. Follow every game live on Ryval.`,
    spec: {
      v: 1,
      family: "ncaa",
      accent: ACCENT[side],
      side,
      source: "NCAA.com official bracket",
      slides: slides.slice(0, 3),
      cta: ctaFor(side, "ncaa", false),
    },
  });
}

async function buildNcaaAlive(side: Side, division: Division, idBase: string, now: Date) {
  const [bracket, registry] = await Promise.all([fetchBracket(side, division), logos()]);
  if (!bracket?.rounds?.length || bracket.champion) return null;
  // The last round that is completely final, played in the last 4 days.
  let done = -1;
  bracket.rounds.forEach((r, i) => {
    if (r.games.length && r.games.every((g) => g.state === "final")) done = i;
  });
  if (done === -1 || done === bracket.rounds.length - 1) return null;
  const last = bracket.rounds[done]!;
  const lastDate = last.games
    .map((g) => g.game_date ?? "")
    .sort()
    .pop();
  if (!lastDate || daysFromToday(lastDate, now) < -4) return null;
  const next = bracket.rounds[done + 1]!;
  const alive = next.games.flatMap((g) => g.teams).filter((t) => t.name && !/^tba$/i.test(t.name));
  if (alive.length !== next.games.length * 2 || alive.length < 2) return null;
  const D = DIV(division);
  const n = alive.length;
  const wall = alive.map((t) => ({
    name: t.name,
    logo: logoFor(registry, t.sport_program_id, t.image_url),
    seed: t.seed ?? null,
  }));
  const rows = next.games
    .map((g) => gameRowFromBracket(g, registry))
    .filter((r): r is GameRow => Boolean(r));
  const kicker = `${D} ${SIDE(side)} NCAA TOURNAMENT · AFTER THE ${upper(last.label)}`;
  const slides: StatSlide[] = [
    {
      type: "cover",
      kicker,
      big: String(n),
      unit: "TEAMS LEFT",
      unitSub: teamsLeftLabel(n),
      headline: teamsLeftLabel(n) === `${n} LEFT` ? `${n} TEAMS LEFT` : teamsLeftLabel(n),
      sub: `The ${D} ${sideWord(side)} NCAA ${roundWords(last.label)} is done. ${next.label}${next.games[0]?.game_date ? ` starts ${weekday(next.games[0].game_date)}` : " is next"}.`,
      teaser: "Every team still alive, then every matchup.",
      logo: null,
    },
    {
      type: "logowall",
      title: teamsLeftLabel(n),
      kicker,
      big: String(n),
      unit: "TEAMS LEFT",
      teams: wall.slice(0, 16),
    },
  ];
  if (rows.length === next.games.length && rows.length <= 8) {
    slides.push({
      type: "scoreboard",
      title: upper(next.label),
      kicker: `${D} ${SIDE(side)} NCAA TOURNAMENT · NEXT`,
      games: rows,
    });
  }
  const hook = `${n} teams are left in the ${D} ${sideWord(side)} NCAA tournament`;
  return storyFrom({
    id: `${idBase}-alive-${n}`,
    side,
    division,
    hook,
    hookBody: `After the ${roundWords(last.label)}. Every team still alive in the ${D} ${sideWord(side)} NCAA tournament.`,
    slides: [
      {
        headline: `${D} ${sideWord(side)}: ${n} teams left`,
        body: alive.map((t) => t.name).join(", "),
      },
    ],
    caption: `${hook}: ${alive.map((t) => t.name).join(", ")}. From NCAA.com's official bracket.`,
    spec: {
      v: 1,
      family: "ncaa",
      accent: ACCENT[side],
      side,
      source: "NCAA.com official bracket",
      slides,
      cta: ctaFor(side, "ncaa", false),
    },
  });
}

type TeamMetric =
  | "goals_per_match"
  | "goals_conceded_per_match"
  | "goal_differential"
  | "shutout_pct"
  | "shot_conversion";
const TEAM_METRICS: Record<
  TeamMetric,
  { title: string; unit: string; best: string; hook: (team: string, v: string) => string }
> = {
  goals_per_match: {
    title: "BEST ATTACK",
    unit: "GOALS A GAME",
    best: "the best attack",
    hook: (t, v) => `${t} scores ${v} goals a game, the most in`,
  },
  goals_conceded_per_match: {
    title: "BEST DEFENSE",
    unit: "GOALS ALLOWED",
    best: "the best defense",
    hook: (t, v) => `${t} allows ${v} goals a game, the fewest in`,
  },
  goal_differential: {
    title: "GOAL DIFFERENCE",
    unit: "GOAL DIFFERENCE",
    best: "the best goal difference",
    hook: (t, v) => `${t} is ${v} in goal difference, the best in`,
  },
  shutout_pct: {
    title: "SHUTOUT RATE",
    unit: "SHUTOUTS",
    best: "the best shutout rate",
    hook: (t, v) => `${t} has kept a shutout in ${v} of its games, the most in`,
  },
  shot_conversion: {
    title: "FINISHING",
    unit: "OF SHOTS SCORED",
    best: "the best finishing",
    hook: (t, v) => `${t} scores on ${v} of its shots, the best rate in`,
  },
};

async function buildTeamBoard(side: Side, division: Division, metric: TeamMetric, id: string) {
  const info = TEAM_METRICS[metric];
  const [board, registry] = await Promise.all([
    getData<Board>(
      `/college-soccer/rankings/leaders?gender=${apiGender(side)}&division=${division}&metric=${metric}`,
    ),
    logos(),
  ]);
  if (!board || board.status !== "available" || board.entries.length < 5) return null;
  if (board.updated_at && Date.now() - Date.parse(board.updated_at) > 8 * 86400_000) return null;
  const entries = board.entries.filter((e) => (e.games ?? 0) >= 10);
  if (entries.length < 5) return null;
  const top = entries[0]!;
  if (entries[1]!.value === top.value) return null;
  const D = DIV(division);
  const asOf = asOfLabel(board);
  const rows: StatRow[] = entries.slice(0, 5).map((e, i) => ({
    rank: String(e.rank),
    name: upper(e.team.name),
    sub: [e.team.conference, e.games ? `${e.games} GP` : ""].filter(Boolean).join(" · "),
    value: e.display_value,
    logo: logoFor(registry, e.team.sport_program_id, e.team.image_url),
    lead: i === 0,
  }));
  const hook = `${info.hook(top.team.name, top.display_value)} ${D} ${sideWord(side)} soccer`;
  return storyFrom({
    id,
    side,
    division,
    hook,
    hookBody: `${top.team.conference ?? ""}. The top 5 in ${D} ${sideWord(side)} soccer, from NCAA.com results.`,
    slides: [
      {
        headline: `${D} ${sideWord(side)}: ${info.best}`,
        body: entries
          .slice(0, 5)
          .map((e) => `${e.rank}. ${e.team.name} ${e.display_value}`)
          .join(". "),
      },
    ],
    caption: `${hook}. The top 5 in ${D} ${sideWord(side)} soccer, from every NCAA.com final as of ${asOf}.`,
    spec: {
      v: 1,
      family: "teams",
      accent: ACCENT[side],
      side,
      source: `NCAA.com results · ${asOf}`,
      slides: [
        {
          type: "cover",
          kicker: `${D} ${SIDE(side)} SOCCER · ${info.title}`,
          big: top.display_value,
          unit: info.unit,
          unitSub: top.games ? `IN ${top.games} GAMES` : "",
          headline: upper(top.team.name),
          sub: `${top.team.conference ? `${top.team.conference}. ` : ""}${info.best[0]!.toUpperCase()}${info.best.slice(1)} in ${D} ${sideWord(side)} soccer.`,
          teaser: `The top 5, from every NCAA.com final as of ${asOf}.`,
          logo: logoFor(registry, top.team.sport_program_id, top.team.image_url),
        },
        {
          type: "board",
          title: info.title,
          kicker: `${D} ${SIDE(side)} SOCCER · ${info.unit} · AS OF ${upper(asOf)}`,
          rows,
        },
      ],
      cta: ctaFor(side, "teams", false),
    },
  });
}

const STREAKS: Record<
  string,
  { unit: string; title: string; hook: (t: string, n: number) => string; min: number }
> = {
  unbeaten: {
    unit: "GAMES UNBEATEN",
    title: "UNBEATEN RUNS",
    hook: (t, n) => `${t} has gone ${n} games without a loss`,
    min: 10,
  },
  win: {
    unit: "STRAIGHT WINS",
    title: "WIN STREAKS",
    hook: (t, n) => `${t} has won ${n} games in a row`,
    min: 7,
  },
  clean_sheets: {
    unit: "STRAIGHT SHUTOUTS",
    title: "SHUTOUT STREAKS",
    hook: (t, n) => `${t} has kept ${n} straight clean sheets`,
    min: 5,
  },
};

async function buildStreak(
  side: Side,
  division: Division,
  boardId: string,
  idBase: string,
  now: Date,
) {
  const info = STREAKS[boardId];
  if (!info) return null;
  const [records, registry] = await Promise.all([
    getData<Records>(
      `/college-soccer/rankings/records?gender=${apiGender(side)}&division=${division}&scope=active`,
    ),
    logos(),
  ]);
  if (!records || records.status !== "available" || !records.through_date) return null;
  if (daysFromToday(records.through_date, now) < -5) return null;
  const board = records.boards.find((b) => b.id === boardId);
  const entries = (board?.entries ?? []).filter((e) => e.active);
  if (entries.length < 5) return null;
  const top = entries[0]!;
  if (top.count < info.min || entries[1]!.count === top.count) return null;
  const D = DIV(division);
  const asOf = shortDay(records.through_date);
  const hook = `${info.hook(top.team.name, top.count)}, the longest active run in ${D} ${sideWord(side)} soccer`;
  return storyFrom({
    id: `${idBase}-${records.through_date}`,
    side,
    division,
    hook,
    hookBody: `Since ${shortDay(top.first_date)}. The longest active runs in ${D} ${sideWord(side)} soccer.`,
    slides: [
      {
        headline: `${D} ${sideWord(side)} ${info.title.toLowerCase()}`,
        body: entries
          .slice(0, 5)
          .map((e) => `${e.team.name} ${e.count}`)
          .join(". "),
      },
    ],
    caption: `${hook}, as of ${asOf}. The top 5 active runs, from the schools' schedules checked against NCAA.com results.`,
    spec: {
      v: 1,
      family: "streaks",
      accent: ACCENT[side],
      side,
      source: `Schools' schedules and NCAA.com results · ${asOf}`,
      slides: [
        {
          type: "cover",
          kicker: `${D} ${SIDE(side)} SOCCER · LONGEST ACTIVE RUN`,
          big: String(top.count),
          unit: info.unit,
          unitSub: `SINCE ${upper(shortDay(top.first_date))}`,
          headline: upper(top.team.name),
          sub: `${top.team.conference ? `${top.team.conference}. ` : ""}Nobody in ${D} ${sideWord(side)} soccer has a longer one going.`,
          teaser: `The top 5 active runs, as of ${asOf}.`,
          logo: logoFor(registry, top.team.sport_program_id, top.team.image_url),
        },
        {
          type: "board",
          title: info.title,
          kicker: `${D} ${SIDE(side)} SOCCER · ACTIVE · AS OF ${upper(asOf)}`,
          rows: entries.slice(0, 5).map((e, i) => ({
            rank: String(e.rank),
            name: upper(e.team.name),
            sub: [e.team.conference, `SINCE ${upper(shortDay(e.first_date))}`]
              .filter(Boolean)
              .join(" · "),
            value: String(e.count),
            logo: logoFor(registry, e.team.sport_program_id, e.team.image_url),
            lead: i === 0,
          })),
          note: "A shootout counts as the tie the school records.",
        },
      ],
      cta: ctaFor(side, "streaks", false),
    },
  });
}

async function buildPoll(side: Side, idBase: string, now: Date) {
  const [poll, registry] = await Promise.all([
    getData<Poll>(`/college-soccer/rankings/poll?gender=${apiGender(side)}&division=1`),
    logos(),
  ]);
  if (!poll || poll.status !== "available" || !poll.release || poll.entries.length < 10)
    return null;
  if (daysFromToday(poll.release.through_date, now) < -14) return null;
  const top = poll.entries[0]!;
  const ten = poll.entries.slice(0, 10);
  const move = (e: PollEntry) =>
    e.movement?.kind === "up"
      ? `UP ${e.movement.places ?? ""}`.trim()
      : e.movement?.kind === "down"
        ? `DOWN ${e.movement.places ?? ""}`.trim()
        : e.movement?.kind === "new"
          ? "NEW"
          : "";
  const hook = `${top.team.name} is No. 1 in the D1 ${sideWord(side)} coaches' poll${top.record ? ` at ${top.record}` : ""}`;
  return storyFrom({
    id: `${idBase}-${poll.release.id}`,
    side,
    division: 1,
    hook,
    hookBody: `The top 10 in the United Soccer Coaches poll, ${poll.release.label}.`,
    slides: [
      {
        headline: `D1 ${sideWord(side)} coaches' poll`,
        body: ten.map((e) => `${e.rank_text}. ${e.team.name} ${e.record ?? ""}`.trim()).join(". "),
      },
    ],
    caption: `${hook}. The top 10 in the United Soccer Coaches poll (${poll.release.label}), as NCAA.com publishes it.`,
    spec: {
      v: 1,
      family: "poll",
      accent: ACCENT[side],
      side,
      source: `United Soccer Coaches poll via NCAA.com · ${poll.release.label}`,
      slides: [
        {
          type: "cover",
          kicker: `D1 ${SIDE(side)} SOCCER · COACHES' POLL · ${upper(poll.release.label)}`,
          big: "1",
          unit: "IN THE POLL",
          unitSub: top.first_place_votes
            ? `${top.first_place_votes} FIRST-PLACE VOTES`
            : "UNITED SOCCER COACHES",
          headline: upper(top.team.name),
          sub: `${top.record ? `${top.record}. ` : ""}${top.team.conference ? `${top.team.conference}.` : ""}`,
          teaser: "The top 10 in the country. Swipe.",
          logo: logoFor(registry, top.team.sport_program_id, top.team.image_url),
        },
        {
          type: "board",
          title: "TOP 10",
          kicker: `D1 ${SIDE(side)} · UNITED SOCCER COACHES · ${upper(poll.release.label)}`,
          rows: ten.map((e, i) => ({
            rank: e.rank_text,
            name: upper(e.team.name),
            sub: [e.team.conference, move(e)].filter(Boolean).join(" · "),
            value: e.record ?? "",
            logo: logoFor(registry, e.team.sport_program_id, e.team.image_url),
            lead: i === 0,
          })),
        },
      ],
      cta: ctaFor(side, "poll", false),
    },
  });
}

// ---------------------------------------------------------------- picking

type Candidate = {
  id: string;
  base: string;
  family: Family;
  build: () => Promise<CollegeStatsStory | null>;
};

/** Timely families first (they are only buildable right after games), then the evergreen boards. */
const FAMILY_CYCLE: Family[] = [
  "scores",
  "ncaa",
  "leaders",
  "teams",
  "performers",
  "streaks",
  "totw",
  "leaders",
  "poll",
  "freshmen",
  "teams",
  "ncaa",
];
const TEAM_METRIC_ORDER: TeamMetric[] = [
  "goals_conceded_per_match",
  "goals_per_match",
  "goal_differential",
  "shutout_pct",
  "shot_conversion",
];
const LEADER_METRICS: Metric[] = ["goals", "assists", "points", "saves", "keeper_shutouts"];

function rotate<T>(list: T[], by: number) {
  const n = list.length;
  const k = ((by % n) + n) % n;
  return [...list.slice(k), ...list.slice(0, k)];
}

function candidates(side: Side, now: Date, statsCount: number): Candidate[] {
  const g = apiGender(side);
  const week = isoWeek(now);
  const divisions = rotate<Division>([1, 2, 3], statsCount);
  const out: Candidate[] = [];
  const yesterday = etDate(new Date(now.getTime() - 86400_000));
  const dayBefore = etDate(new Date(now.getTime() - 2 * 86400_000));
  for (const day of [yesterday, dayBefore]) {
    for (const d of divisions) {
      const base = `cs-performers-${g}-d${d}`;
      out.push({
        id: `${base}-${day}`,
        base,
        family: "performers",
        build: () => buildPerformers(side, d, day, `${base}-${day}`),
      });
    }
  }
  for (const d of divisions) {
    const base = `cs-totw-${g}-d${d}`;
    // The week start is only known after the fetch; the builder adds it to the id.
    out.push({ id: base, base, family: "totw", build: () => buildTeamOfWeek(side, d, base) });
  }
  for (const metric of rotate(LEADER_METRICS, statsCount)) {
    for (const d of divisions) {
      const base = `cs-leaders-${metric}-${g}-d${d}`;
      out.push({
        id: `${base}-${week}`,
        base,
        family: "leaders",
        build: () => buildLeaders(side, d, metric, `${base}-${week}`),
      });
    }
  }
  for (const day of [yesterday, dayBefore]) {
    for (const d of divisions) {
      const base = `cs-scores-${g}-d${d}`;
      out.push({
        id: `${base}-${day}`,
        base,
        family: "scores",
        build: () => buildScores(side, d, day, `${base}-${day}`),
      });
    }
  }
  for (const d of divisions) {
    const base = `cs-ncaa-${g}-d${d}`;
    out.push({
      id: `${base}-next`,
      base,
      family: "ncaa",
      build: () => buildNcaaNext(side, d, base, now),
    });
    out.push({
      id: `${base}-alive`,
      base,
      family: "ncaa",
      build: () => buildNcaaAlive(side, d, base, now),
    });
  }
  for (const metric of rotate(TEAM_METRIC_ORDER, statsCount)) {
    for (const d of divisions) {
      const base = `cs-team-${metric}-${g}-d${d}`;
      out.push({
        id: `${base}-${week}`,
        base,
        family: "teams",
        build: () => buildTeamBoard(side, d, metric, `${base}-${week}`),
      });
    }
  }
  for (const board of rotate(Object.keys(STREAKS), statsCount)) {
    for (const d of divisions) {
      const base = `cs-streak-${board}-${g}-d${d}`;
      out.push({
        id: base,
        base,
        family: "streaks",
        build: () => buildStreak(side, d, board, base, now),
      });
    }
  }
  {
    const base = `cs-poll-${g}-d1`;
    out.push({ id: base, base, family: "poll", build: () => buildPoll(side, base, now) });
  }
  for (const d of divisions) {
    const base = `cs-freshmen-${g}-d${d}`;
    out.push({
      id: `${base}-${week}`,
      base,
      family: "freshmen",
      build: () => buildFreshmen(side, d, `${base}-${week}`),
    });
  }
  return out;
}

/**
 * The next college stats post for this side, or null (then the caller falls back to a story).
 * Same id inside the memory window is never repeated; a board can return the next week with new numbers,
 * least recently used first. A leader who headlined one of the last 6 posts is skipped.
 */
export async function pickCollegeStatsStory(opts: {
  side: Side;
  recentIds: string[];
  recentHooks: string[];
  /** The account voice the slot belongs to; written on the post as desk:<desk>. */
  desk?: StoryDesk;
  now?: Date;
  maxBuilds?: number;
}): Promise<CollegeStatsStory | null> {
  const now = opts.now ?? new Date();
  cache.clear();
  try {
    return await pickInner(opts, now);
  } finally {
    cache.clear();
  }
}

async function pickInner(
  opts: {
    side: Side;
    recentIds: string[];
    recentHooks: string[];
    desk?: StoryDesk;
    maxBuilds?: number;
  },
  now: Date,
): Promise<CollegeStatsStory | null> {
  const used = new Set(opts.recentIds);
  const statsIds = opts.recentIds.filter((id) => id.startsWith("cs-"));
  const statsCount = statsIds.length;
  const lastUse = (base: string) => {
    const i = statsIds.findIndex((id) => id.startsWith(`${base}-`) || id === base);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };
  const all = candidates(opts.side, now, statsCount);
  const cycle = rotate(FAMILY_CYCLE, statsCount);
  const recentHeadlines = opts.recentHooks.slice(0, 6).join(" \n ").toLowerCase();
  let builds = 0;
  const maxBuilds = opts.maxBuilds ?? 14;
  for (const family of [...new Set(cycle)]) {
    const pool = all
      .filter((c) => c.family === family && !used.has(c.id))
      .sort((a, b) => lastUse(b.base) - lastUse(a.base));
    for (const c of pool) {
      if (builds >= maxBuilds) return null;
      builds += 1;
      const story = await c.build().catch(() => null);
      if (!story || used.has(story.id)) continue;
      const leadName = story.hook.split(" ").slice(0, 2).join(" ").toLowerCase();
      if (leadName && recentHeadlines.includes(leadName)) continue;
      if (isSameCarousel(story.hook, opts.recentHooks.slice(0, 40))) continue;
      return opts.desk ? { ...story, desk: opts.desk } : story;
    }
  }
  return null;
}

/** Every buildable post right now, for previews. Not used by autopilot. */
export async function previewCollegeStats(
  side: Side,
  opts: { limit?: number; seed?: number; families?: Family[]; match?: string } = {},
) {
  const limit = opts.limit ?? 6;
  const out: CollegeStatsStory[] = [];
  for (const c of candidates(side, new Date(), opts.seed ?? 0)) {
    if (out.length >= limit) break;
    if (opts.families && !opts.families.includes(c.family)) continue;
    if (opts.match && !c.id.includes(opts.match)) continue;
    if (out.some((s) => s.spec.family === c.family && c.family !== "leaders")) continue;
    const story = await c.build().catch(() => null);
    if (story) out.push(story);
  }
  return out;
}

/** The single line the renderer reads. JSON never contains a raw newline. */
export function statSpecNote(spec: StatSpec) {
  return `stat_spec:${JSON.stringify(spec)}`;
}
