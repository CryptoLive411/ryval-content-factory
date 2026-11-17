import { allSchools } from "@/lib/schools";

const UA = "Mozilla/5.0 RyvalContentForge/1.0 (+https://ryvalcontent.space)";

export type SourceRow = {
  id: string;
  name: string;
  url: string;
  feed_url: string | null;
  category: string;
  source_type: string;
  reliability: string;
  update_frequency_minutes: number;
  last_checked_at: string | null;
  enabled: boolean;
};

export type RawStory = {
  title: string;
  storyUrl: string;
  summary: string;
  publishedAt: string | null;
  imageUrl: string | null;
};

export type NormalizedStory = {
  source_id: string;
  source_name: string;
  source_url: string;
  story_url: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  category: string;
  suggested_format: StoryFormat;
  players: string[];
  schools: string[];
  stats: Record<string, string>;
  image_url: string | null;
  relevance_score: number;
  needs_review: boolean;
  review_reason: string | null;
};

export type StoryFormat =
  | "news_slide"
  | "carousel"
  | "player_spotlight"
  | "program_spotlight"
  | "recruiting_tip"
  | "rules_update"
  | "stats_post";

function strip(html: string) {
  return html
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8216;|&lsquo;/g, "'")
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, name: string) {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m?.[1] ? strip(m[1]) : "";
}

/** Minimal RSS/Atom reader. Feeds here are plain RSS 2.0, so no XML dependency. */
export function parseFeed(xml: string): RawStory[] {
  const blocks = [
    ...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi),
    ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi),
  ].map((m) => m[0]);

  const out: RawStory[] = [];
  for (const block of blocks) {
    const title = tag(block, "title");
    let link = tag(block, "link");
    if (!link) link = block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "";
    if (!title || !link) continue;
    const date = tag(block, "pubDate") || tag(block, "published") || tag(block, "updated");
    const parsed = date ? new Date(date) : null;
    const image =
      block.match(/<media:content[^>]*url="([^"]+)"/i)?.[1] ??
      block.match(/<enclosure[^>]*url="([^"]+)"/i)?.[1] ??
      block.match(/<img[^>]*src="([^"]+)"/i)?.[1] ??
      null;
    out.push({
      title,
      storyUrl: link.trim(),
      summary: tag(block, "description") || tag(block, "summary") || tag(block, "content"),
      publishedAt: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
      imageUrl: image,
    });
  }
  return out;
}

export async function fetchSourceStories(source: SourceRow): Promise<RawStory[]> {
  if (!source.feed_url) return [];
  const res = await fetch(source.feed_url, {
    headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, application/json;q=0.9" },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`${res.status} ${source.feed_url}`);
  const body = await res.text();

  // The ncaa-api mirror serves the NCAA.com RSS as JSON.
  if (body.trimStart().startsWith("{")) {
    const json = JSON.parse(body) as {
      items?: Array<{ title?: string; link?: string; description?: string; pubDate?: string; contentUrl?: string }>;
    };
    return (json.items ?? [])
      .filter((i) => i.title && i.link)
      .map((i) => {
        const when = i.pubDate ? new Date(i.pubDate) : null;
        return {
          title: strip(i.title!),
          storyUrl: i.link!.startsWith("http") ? i.link! : `https://www.ncaa.com${i.link}`,
          summary: strip(i.description ?? ""),
          publishedAt: when && !Number.isNaN(when.getTime()) ? when.toISOString() : null,
          imageUrl: i.contentUrl ?? null,
        };
      });
  }
  return parseFeed(body);
}

const STATES =
  "alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|ohio|oklahoma|oregon|pennsylvania|tennessee|texas|utah|vermont|virginia|washington|wisconsin|wyoming";

/** Words that show up capitalised in headlines but never form a person's name. */
const HEADLINE_WORDS = new Set(
  `soccer week awards top spot poll rankings ranking claims announce announces announced college cup
   final finals championship championships tournament history men mens women womens division conference
   coaches coach player week season game games goal goals assist assists highlights highlight state
   university institute academy north south east west new saint national united athletic club partnership
   trophy award winner winners honors honor teams team results recap preview report update news
   january february march april june july august september october november december monday tuesday
   wednesday thursday friday saturday sunday weekend dominant perfect last first second third
   stuns stunned upsets upset falls claims returns opens hosts visits beats defeats`
    .split(/\s+/)
    .filter(Boolean),
);

const SCHOOL_PATTERNS = (() => {
  const out: Array<{ re: RegExp; name: string }> = [];
  const seen = new Set<string>();
  for (const school of allSchools()) {
    // Headlines say "Michigan State", not "Michigan State University".
    const trimmed = school.name
      .replace(/^University of\s+/i, "")
      .replace(/\s+(University|College)$/i, "")
      .trim();
    // Single-word short names like "Post" or "Union" match far too much prose.
    const names = [school.name, school.shortName, trimmed].filter(
      (n): n is string =>
        Boolean(n) &&
        n.trim().split(/\s+/).length >= 2 &&
        !HEADLINE_WORDS.has(n.trim().toLowerCase()),
    );
    // Headlines lean on acronyms: SMU, UCLA, LSU. Safe to match only case-sensitively.
    const acronym =
      school.shortName && /^[A-Z][A-Za-z]{1,4}$/.test(school.shortName) && school.shortName === school.shortName.toUpperCase()
        ? school.shortName
        : null;
    for (const name of names) {
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        re: new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
        name: school.name,
      });
    }
    if (acronym && !seen.has(acronym)) {
      seen.add(acronym);
      out.push({ re: new RegExp(`\\b${acronym}\\b`), name: school.name });
    }
  }
  return out;
})();

const SCHOOL_NAME_SET = new Set(SCHOOL_PATTERNS.map((p) => p.name.toLowerCase()));

/** Re-runs entity extraction on a stored story after the matchers improve. */
export function extractEntities(title: string, summary: string | null) {
  const text = `${title} ${summary ?? ""}`;
  return { schools: findSchools(text), players: findPlayers(text), stats: findStats(text) };
}

function findSchools(text: string) {
  const hits = new Set<string>();
  for (const { re, name } of SCHOOL_PATTERNS) {
    if (re.test(text)) hits.add(name);
  }
  return [...hits].slice(0, 6);
}

/**
 * Only names the story itself states, and only ones that read like people.
 * A wrong name here would end up on a graphic, so the filter errs toward dropping.
 */
function findPlayers(text: string) {
  const hits = new Set<string>();
  const stateTeam = new RegExp(`^(${STATES})\\s+(state|tech|a&m)$`, "i");
  for (const m of text.matchAll(/\b([A-Z][a-z]{2,})\s([A-Z][a-z']{2,})\b/g)) {
    const first = m[1]!;
    const lastName = m[2]!;
    const name = `${first} ${lastName}`;
    if (HEADLINE_WORDS.has(first.toLowerCase()) || HEADLINE_WORDS.has(lastName.toLowerCase())) continue;
    if (SCHOOL_NAME_SET.has(name.toLowerCase())) continue;
    if (stateTeam.test(name)) continue;
    if (new RegExp(`\\b${name}\\b`, "i").test(SCHOOL_PATTERNS.find((p) => p.re.test(name))?.name ?? "")) continue;
    hits.add(name);
  }
  return [...hits].slice(0, 6);
}

function findStats(text: string) {
  const stats: Record<string, string> = {};
  const record = text.match(/\b(\d{1,2}-\d{1,2}-\d{1,2})\b/);
  if (record) stats.record = record[1]!;
  const goals = text.match(/\b(\d{1,2})\s+goals?\b/i);
  if (goals) stats.goals = goals[1]!;
  const assists = text.match(/\b(\d{1,2})\s+assists?\b/i);
  if (assists) stats.assists = assists[1]!;
  const shutouts = text.match(/\b(\d{1,2})\s+(?:shutouts?|clean sheets?)\b/i);
  if (shutouts) stats.shutouts = shutouts[1]!;
  const rank = text.match(/\bNo\.\s?(\d{1,2})\b/);
  if (rank) stats.rank = rank[1]!;
  return stats;
}

const TOPIC_RULES: Array<{ re: RegExp; category: string; format: StoryFormat; weight: number }> = [
  { re: /\btransfer portal\b|\btransfers?\b|\bcommits?\b|\bcommitment\b|\bsigns? with\b|\bsigning class\b/i,
    category: "Transfers and commitments", format: "carousel", weight: 26 },
  { re: /\brule change\b|\beligibility\b|\broster limit\b|\bscholarship\b|\brecruiting calendar\b|\bNCAA (?:approves|adopts|votes)\b/i,
    category: "NCAA rules and eligibility", format: "rules_update", weight: 30 },
  // A passing "No. 1" is not a rankings story, so this needs poll language.
  { re: /\bpoll\b|\btop 25\b|\brankings?\b|\bmoves? (?:up|down)\b|\bRPI\b/i,
    category: "Rankings", format: "stats_post", weight: 20 },
  { re: /\bgoals?\b|\bassists?\b|\bshutouts?\b|\bclean sheets?\b|\bhat[- ]trick\b|\bscoring leader/i,
    category: "Player performance", format: "player_spotlight", weight: 22 },
  { re: /\bupsets?\b|\bstuns?\b|\bbeats?\b|\bdefeats?\b|\btops\b|\bfalls?\b|\badvances?\b|\bclinch/i,
    category: "Results and upsets", format: "carousel", weight: 18 },
  { re: /\bhead coach\b|\bcoaching change\b|\bhired\b|\bfired\b|\bnamed coach\b/i,
    category: "Program news", format: "program_spotlight", weight: 18 },
  { re: /\brecruit(?:ing|s|ment)?\b|\bhighlight (?:tape|reel)\b|\bID camp\b|\bshowcase\b/i,
    category: "Recruiting education", format: "recruiting_tip", weight: 16 },
  { re: /\bMLS NEXT\b|\bECNL\b|\bUSL Academy\b|\bacademy\b/i,
    category: "Academy and pathway", format: "carousel", weight: 14 },
];

function classify(text: string) {
  for (const rule of TOPIC_RULES) {
    if (rule.re.test(text)) return rule;
  }
  return { category: "College soccer news", format: "news_slide" as StoryFormat, weight: 8 };
}

/**
 * Higher means more worth posting to a recruiting audience: topic fit, named
 * people and programs, hard numbers, freshness, and how much we trust the source.
 */
export function scoreStory(args: {
  topicWeight: number;
  players: string[];
  schools: string[];
  stats: Record<string, string>;
  publishedAt: string | null;
  reliability: string;
  hasImage: boolean;
}) {
  let score = args.topicWeight;
  score += Math.min(12, args.schools.length * 6);
  score += Math.min(12, args.players.length * 4);
  score += Math.min(12, Object.keys(args.stats).length * 4);
  if (args.hasImage) score += 6;
  score += args.reliability === "high" ? 12 : args.reliability === "medium" ? 6 : 0;

  const ageHours = args.publishedAt
    ? (Date.now() - new Date(args.publishedAt).getTime()) / 3_600_000
    : 999;
  if (ageHours <= 24) score += 20;
  else if (ageHours <= 72) score += 12;
  else if (ageHours <= 168) score += 4;
  else score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function normalizeStory(source: SourceRow, raw: RawStory): NormalizedStory {
  const text = `${raw.title} ${raw.summary}`;
  const topic = classify(text);
  const players = findPlayers(text);
  const schools = findSchools(text);
  const stats = findStats(text);
  const relevance = scoreStory({
    topicWeight: topic.weight,
    players,
    schools,
    stats,
    publishedAt: raw.publishedAt,
    reliability: source.reliability,
    hasImage: Boolean(raw.imageUrl),
  });

  // Anything thin or loosely sourced goes to a human before it can become a post.
  const reasons: string[] = [];
  // Highlight reels and video pages carry no reportable detail to build slides from.
  if (/\bhighlights?\b|^watch:|\bfull (?:match|replay)\b|\bextended highlights\b|\bvideo:/i.test(raw.title)) {
    reasons.push("video highlight page, not a reportable story");
  }
  if (source.reliability === "low") reasons.push("low-reliability source");
  if (!raw.publishedAt) reasons.push("no publish date");
  else {
    // News has to be news. Anything from a past season needs a human to okay it.
    const days = (Date.now() - new Date(raw.publishedAt).getTime()) / 86_400_000;
    if (days > 21) reasons.push(`published ${Math.round(days)} days ago`);
  }
  if (!schools.length && !players.length) reasons.push("no named school or player");
  if (raw.summary.length < 60) reasons.push("summary too short to verify");

  return {
    source_id: source.id,
    source_name: source.name,
    source_url: source.url,
    story_url: raw.storyUrl,
    title: raw.title.slice(0, 300),
    summary: raw.summary ? raw.summary.slice(0, 1200) : null,
    published_at: raw.publishedAt,
    category: topic.category,
    suggested_format: players.length && topic.format === "carousel" ? "player_spotlight" : topic.format,
    players,
    schools,
    stats,
    image_url: raw.imageUrl,
    relevance_score: relevance,
    needs_review: reasons.length > 0,
    review_reason: reasons.length ? reasons.join("; ") : null,
  };
}

function isDue(source: SourceRow) {
  if (!source.last_checked_at) return true;
  const elapsed = Date.now() - new Date(source.last_checked_at).getTime();
  return elapsed >= source.update_frequency_minutes * 60_000;
}

/**
 * Poll every due source, normalize what comes back, and upsert on story_url so
 * repeated polls never duplicate the review queue.
 */
export async function ingestStories(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: { from: (table: string) => any };
  force?: boolean;
  onProgress?: (msg: string) => void;
}) {
  const { data: sources, error } = await opts.db
    .from("content_sources")
    .select("*")
    .eq("enabled", true);
  if (error) throw new Error(error.message);

  let inserted = 0;
  let checked = 0;
  for (const source of (sources ?? []) as SourceRow[]) {
    if (!source.feed_url) continue;
    if (!opts.force && !isDue(source)) continue;
    checked += 1;
    let status = "ok";
    try {
      const raws = await fetchSourceStories(source);
      const rows = raws.slice(0, 25).map((raw) => normalizeStory(source, raw));
      if (rows.length) {
        const { data: saved, error: upsertError } = await opts.db
          .from("stories")
          .upsert(rows, { onConflict: "story_url", ignoreDuplicates: true })
          .select("id");
        if (upsertError) throw new Error(upsertError.message);
        inserted += saved?.length ?? 0;
      }
      status = `ok ${rows.length} item(s)`;
      opts.onProgress?.(`${source.name}: ${rows.length} item(s)`);
    } catch (e) {
      status = `error: ${e instanceof Error ? e.message : "failed"}`.slice(0, 200);
      opts.onProgress?.(`${source.name}: ${status}`);
    }
    await opts.db
      .from("content_sources")
      .update({ last_checked_at: new Date().toISOString(), last_status: status })
      .eq("id", source.id);
  }
  return { checked, inserted };
}
