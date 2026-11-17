import { chatCompletions } from "@/lib/ai-client";
import { nextCtaBackground, RYVAL_MARK_SRC } from "@/lib/brand";
import {
  editorialTitle,
  packEditorial,
  parseEditorial,
  postProcessBrandPost,
  stampSportSide,
  type SlideFields,
} from "@/lib/content-quality";
import { editorialImagePrompt } from "@/lib/editorial";
import { RYVAL_CTAS } from "@/lib/ryval-product";
import { unsupportedFacts } from "@/lib/fact-check";
import { fetchNcaaSeasonBoard, type NcaaSeasonBoard } from "@/lib/ncaa-live";
import { pickStockPhoto } from "@/lib/stock-photos";

export const SEASON_LANE = "lane:season-board";

const TEAM_STOP = new Set(["men", "the", "and", "for", "st", "state", "university", "college"]);

function teamTokens(team: string) {
  const raw = team.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  const tokens = new Set(raw.split(" ").filter((word) => word.length >= 3 && !TEAM_STOP.has(word)));
  if (raw === "smu" || raw.includes("methodist")) tokens.add("smu");
  if (raw.length >= 2 && raw.length <= 6) tokens.add(raw);
  return [...tokens];
}

function teamAlreadyCovered(team: string, hooks: string[]) {
  const tokens = teamTokens(team).filter((token) => token.length >= 3);
  if (!tokens.length) return false;
  return hooks.some((hook) => tokens.some((token) => hook.includes(token)));
}

function rotateRows<T>(rows: T[], salt: number): T[] {
  if (rows.length < 2) return rows;
  const start = ((salt % rows.length) + rows.length) % rows.length;
  return [...rows.slice(start), ...rows.slice(0, start)];
}

function boardPrompt(board: NcaaSeasonBoard, salt = 0) {
  const sport = board.sport === "women" ? "women's" : "men's";
  const topTeams = rotateRows(board.topTeams, salt);
  const scorers = rotateRows(board.scorers, salt + 1);
  const playmakers = rotateRows(board.playmakers, salt + 2);
  const ranked = rotateRows(board.ranked, salt);
  const lines = [
    `CURRENT NCAA DIVISION I ${sport.toUpperCase()} SOCCER — ${board.updated ?? "this week"}.`,
    `These numbers are the only source of truth. Never change or invent one.`,
    `LEAD WITH THE FIRST TEAM AND THE FIRST GOAL LEADER. Do not open on a team you already used in another post.`,
    topTeams.length
      ? `BEST RECORDS:\n${topTeams.map((t) => `- ${t.team}: ${t.record} (win pct ${t.pct})`).join("\n")}`
      : "",
    ranked.length
      ? `UNITED SOCCER COACHES POLL:\n${ranked.map((r) => `- #${r.rank} ${r.school} (${r.record})`).join("\n")}`
      : "",
    scorers.length
      ? `GOAL LEADERS:\n${scorers
          .map((p) => `- ${p.name}, ${p.team}, ${p.goals} goals in ${p.games} games (${p.classYear})`)
          .join("\n")}`
      : "",
    playmakers.length
      ? `ASSIST LEADERS:\n${playmakers
          .map((p) => `- ${p.name}, ${p.team}, ${p.assists} assists in ${p.games} games (${p.classYear})`)
          .join("\n")}`
      : "",
    board.news.length ? `NCAA.COM HEADLINES:\n${board.news.map((n) => `- ${n.title}`).join("\n")}` : "",
    `Source: ${board.source}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function punchSeasonCover(
  hook: string,
  team: { team: string; record: string },
  sport: "women" | "men",
  updated: string | null | undefined,
) {
  const sideWord = sport === "women" ? "Women's" : "Men's";
  const first = team.team.split(/\s+/)[0] || team.team;
  const escaped = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const title = editorialTitle(hook);
  const hasTeam = new RegExp(`\\b${escaped}\\b`, "i").test(title);
  const dryRecord = hasTeam && /\bis\b/i.test(title) && /\d/.test(title) && title.split(/\s+/).length <= 8;
  const label = /\b(dominates|rankings|facts about|things you still get wrong)\b/i.test(title);
  let next = hook;
  if (!hasTeam || dryRecord || label) {
    const record = team.record.replace(/[–—]/g, "-");
    const losses = record.match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
    const unbeaten = losses ? Number(losses[2]) === 0 : false;
    const headline = unbeaten ? `${team.team} still hasn't lost` : `${team.team} is ${team.record}`;
    const ed = parseEditorial(hook);
    const when = updated
      ? ` through ${updated.replace(/^.*?Through games\s*/i, "").replace(/\.$/, "")}`
      : "";
    const fallback = `${sideWord} ${team.team} is ${team.record}${when}, and the next slides name who else is up there.`;
    const keepBody = Boolean(ed.body && (ed.body.toLowerCase().includes(first.toLowerCase()) || /\d/.test(ed.body)));
    let body = keepBody ? ed.body : fallback;
    if (keepBody && !/swipe/i.test(body) && body.split(/\s+/).length <= 16) {
      body = `${body.replace(/[.]+$/, "")}. Swipe for the rest.`;
    }
    next = packEditorial(headline, body, "");
  }
  return stampSportSide(next, sport);
}

const slideObj = (desc: string) => ({
  type: "object",
  properties: {
    headline: { type: "string", description: `${desc} 6 plain words max. No punctuation at the end.` },
    body: {
      type: "string",
      description:
        "ONE sentence, 12 to 22 words. Name the real team or player with their real number, then the takeaway. Never two sentences.",
    },
    tip: { type: "string", description: "Leave empty." },
  },
  required: ["headline", "body", "tip"],
  additionalProperties: false,
});

/**
 * A weekly Division I read: who is winning, who is scoring, and what a recruit
 * should do about it. Every number comes from the live NCAA leaderboards.
 */
export async function generateSeasonBoardPost(data: {
  sport: "men" | "women";
  slidesPerPost: number;
  variantIndex?: number;
  avoidHooks?: string[];
}) {
  const board = await fetchNcaaSeasonBoard(data.sport);
  if (!board.scorers.length && !board.topTeams.length) {
    throw new Error("No current NCAA leaderboard data available.");
  }
  const sportLabel = data.sport === "women" ? "women's soccer" : "men's soccer";
  const used = (data.avoidHooks ?? []).map((hook) => hook.toLowerCase());
  let salt = data.variantIndex ?? 0;
  if (board.topTeams.length > 1 && used.length) {
    let found = false;
    for (let n = 0; n < board.topTeams.length; n++) {
      const candidate = rotateRows(board.topTeams, salt + n)[0];
      if (candidate && teamAlreadyCovered(candidate.team, used)) continue;
      salt += n;
      found = true;
      break;
    }
    if (!found) throw new Error("Season teams were already covered. Skipping another rankings post.");
  }

  const tool = {
    type: "function",
    function: {
      name: "create_posts",
      description: "Return one current-season Division I carousel.",
      parameters: {
        type: "object",
        properties: {
          posts: {
            type: "array",
            minItems: 1,
            maxItems: 1,
            items: {
              type: "object",
              properties: {
                hook: slideObj("COVER: 4 to 6 plain words that make someone swipe. The record goes in the body."),
                slide_2: slideObj("A team's real record and why that pace is hard."),
                slide_3: slideObj("A named goal leader and their real goal count."),
                slide_4: slideObj("A named assist leader, and why coaches value assists."),
                slide_5: slideObj("What a recruit should take from these numbers this week."),
                cta: slideObj("LAST: how Ryval gets this player's film in front of these programs."),
                caption: { type: "string" },
                hashtags: { type: "string" },
              },
              required: ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "cta", "caption", "hashtags"],
              additionalProperties: false,
            },
          },
        },
        required: ["posts"],
        additionalProperties: false,
      },
    },
  };

  const system = `You write Ryval 4:5 carousels about what is happening in NCAA Division I college soccer RIGHT NOW. Players and parents should save it because it is current and specific.

RULES:
- Every team name, player name, record, goal count and assist count must appear in the DATA below. Never invent one.
- Always spell out the number: "11-0-0", "15 goals in 12 games".
- Say what each number means for a recruit: what level of production actually gets recruited.
- Blunt, specific, useful. No hype, no fake scout stories, no waitlist ads.

LENGTH IS THE HARD PART. This is a graphic, not an article:
- Cover headline: 4 to 6 plain words. A reason to swipe, not a label like "Team Dominates the Rankings" or "Team is 6-0-2".
- Cover body: ONE sentence under 18 words. State the record here, and say the next slides name the rest.
- Other headlines: 6 plain words. Say the point out loud.
- Other body: ONE sentence, 12 to 22 words.
- Example cover: "Xavier still hasn't lost" with body "Men's Xavier is 6-0-2. Swipe for who is right behind them."
- The cover must say Women's or Men's. This carousel is only about ${sportLabel}. Never mix in the other side.`;

  const user = `Write 1 carousel (${data.slidesPerPost} slides including the CTA) about current Division I ${sportLabel}.

DATA (only source of truth):
${boardPrompt(board, salt)}

The cover must name the FIRST team or FIRST goal leader in the data above. Variant ${salt} already rotated that list, so do not skip back to the old number one.
Hashtags should include #CollegeSoccer #Ryval.
Return strictly via create_posts.`;

  const json = await chatCompletions({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [tool],
    tool_choice: { type: "function", function: { name: "create_posts" } },
  });
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No season copy returned");
  const parsed = JSON.parse(call.function.arguments) as {
    posts: Array<Record<string, { headline?: string; body?: string; tip?: string } | string>>;
  };
  const rawPost = parsed.posts?.[0];
  if (!rawPost) throw new Error("Empty season copy");

  const slide = (key: string) => {
    const s = rawPost[key];
    if (!s || typeof s === "string") return typeof s === "string" ? s : "";
    return packEditorial(s.headline ?? "", s.body ?? "", s.tip ?? "");
  };

  const leader = board.scorers[0];
  const fallbackCover = packEditorial(
    leader ? `${leader.name} has ${leader.goals} goals already` : "This week in Division I soccer",
    board.topTeams[0]
      ? `${board.topTeams[0].team} is ${board.topTeams[0].record} through games on ${board.updated ?? "this week"}.`
      : "Live NCAA.com leaderboards, not last season's page.",
    "",
  );

  const raw: SlideFields = {
    hook: slide("hook") || fallbackCover,
    slide_2: slide("slide_2"),
    slide_3: slide("slide_3"),
    slide_4: slide("slide_4"),
    slide_5: slide("slide_5"),
    slide_6: "",
    cta: slide("cta"),
    caption:
      (typeof rawPost.caption === "string" ? rawPost.caption : "") ||
      `Current Division I ${sportLabel} numbers, straight from NCAA.com.`,
    hashtags:
      (typeof rawPost.hashtags === "string" ? rawPost.hashtags : "") ||
      "#CollegeSoccer #Ryval #Recruiting",
    slide_image_prompts: ["", "", "", "", "", ""],
  };

  const cleaned = postProcessBrandPost(raw, data.slidesPerPost);
  const claimed = [cleaned.hook, cleaned.slide_2, cleaned.slide_3, cleaned.slide_4, cleaned.slide_5]
    .filter(Boolean)
    .join("\n");
  const unsupported = unsupportedFacts(claimed, boardPrompt(board));
  if (unsupported.length) {
    throw new Error(`Season copy claimed unverified facts: ${unsupported.join(", ")}`);
  }
  const leadTeam = rotateRows(board.topTeams, salt)[0];
  if (leadTeam) cleaned.hook = punchSeasonCover(cleaned.hook, leadTeam, data.sport, board.updated);
  const bodyKeys = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"] as const;
  const who =
    data.sport === "women"
      ? "women's soccer players on a grass pitch, female athletes only"
      : "men's soccer players on a grass pitch, male athletes only";

  const bgImages: string[] = [];
  const usedPhotos: string[] = [];
  const prompts = [...cleaned.slide_image_prompts];
  for (let i = 0; i < 6; i++) {
    if (!cleaned[bodyKeys[i]]) {
      bgImages[i] = "";
      continue;
    }
    prompts[i] = editorialImagePrompt(who, editorialTitle(cleaned[bodyKeys[i]]) || "college soccer");
    const picked = pickStockPhoto(
      editorialTitle(cleaned[bodyKeys[i]]) || "college soccer",
      salt * 17 + i,
      usedPhotos,
      data.sport === "women" ? "women" : "men",
      usedPhotos,
    );
    usedPhotos.push(picked.photoId);
    bgImages[i] = picked.url;
  }
  cleaned.slide_image_prompts = prompts;
  cleaned.cta = packEditorial(
    RYVAL_CTAS.apply_direct.headline,
    RYVAL_CTAS.apply_direct.body,
    "",
  );

  const ctaBg = nextCtaBackground([]);
  bgImages[6] = ctaBg;

  return {
    posts: [
      {
        ...cleaned,
        bg_images: bgImages,
        bg_image_url: bgImages.find(Boolean) ?? null,
        logo_url: RYVAL_MARK_SRC,
        app_screen_url: "/app-screens/discover.jpg",
        photo_gender: data.sport === "women" ? "women" : "men",
        cta_bg_url: ctaBg,
        fact_lane: `NCAA D1 ${sportLabel} season board`,
        notes: `${SEASON_LANE}\nsport:${data.sport}\nsource:${board.source}\nupdated:${board.updated ?? ""}`,
      },
    ],
  };
}
