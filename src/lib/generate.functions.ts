import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatCompletions, generateImageBytes } from "@/lib/ai-client";
import {
  collectStockPhotoIds,
  genderForStockId,
  genderPromptLine,
  inferPhotoGender,
  pickStockPhoto,
  pickVariedSlidePhotos,
  type PhotoGender,
} from "@/lib/stock-photos";
import { nextAppScreen, nextCtaBackground, resolveCtaBackground, RYVAL_MARK_SRC, screenSalt } from "@/lib/brand";
import {
  copyFitsLane,
  FACT_LANES,
  familyFromCopy,
  familyOf,
  laneNotes,
  personasForLane,
  pickNextLane,
  resolvedTopic,
  topicFromNotes,
} from "@/lib/fact-lanes";
import { fetchNcaaSeasonBoard } from "@/lib/ncaa-live";
import {
  canonicalStoryId,
  newsStoryFromRecord,
  pickRecruitingStory,
  storyPassesGate,
  type RecruitingStory,
  type StoryDesk,
} from "@/lib/recruiting-stories";
import { pickWeekOneStory } from "@/lib/week-one-slate";
import {
  pickCollegeStatsStory,
  STATS_DESKS,
  statSpecNote,
  type CollegeStatsStory,
} from "@/lib/college-stats";
import { nextPostGender } from "@/lib/rotation";
import {
  editorialTitle,
  enforceMaxWords,
  isSameCarousel,
  isTooSimilar,
  isUsefulSlide,
  looksLikeSlop,
  packEditorial,
  parseEditorial,
  postProcessBrandPost,
  type SlideFields,
} from "@/lib/content-quality";

const Input = z.object({
  count: z.number().min(1).max(50),
  slidesPerPost: z.number().min(5).max(7),
  platform: z.string(),
  account: z.string(),
  audience: z.string(),
  category: z.string(),
  tone: z.string(),
  ctaType: z.string(),
  includeAppScreen: z.boolean(),
  promptOverride: z.string().optional(),
  /** Deterministic diversity cursor — prefer posts count from client. */
  variantIndex: z.number().min(0).max(100000).optional(),
  /** Which account voice this post is for. Autopilot sets this. */
  desk: z.enum(["ryval", "education", "media"]).optional(),
  /** Story ids already rejected this attempt, so the next pick is a different one. */
  skipStoryIds: z.array(z.string()).max(12).optional(),
});

const SYSTEM_BASE = `You write Ryval 4:5 editorial carousels (Instagram/TikTok photo posts). Each slide is a designed graphic: short headline + two body paragraphs + optional tip. Photos sit on the RIGHT. Type sits on the LEFT.

This is educational. Not a fake story. Not a waitlist ad. Not vibe copy on a pretty photo.

RULE: Teach ONLY the assigned FACT and BEATS. Keep every real number. Do not invent scout appointments, fake quotes, or "they promised 5PM" plots. Do not rewrite the assigned lane into a generic NCAA walk-on / college-only post. If the lane is USL, Europe, ECNL, visas, film, or a position pathway — stay there.

Every slide must be useful on its own: a number, a rule, or a real next step. If a parent or coach screenshotted one slide, they should learn something.

Ryval is a global sports network, soccer-first: player profiles, film, coaches, and global opportunity. College (NCAA/NAIA/NJCAA) is ONE pathway, not the default story. Body slides never mention Ryval, waitlist, or bio. The LAST slide explains Ryval's fix for THIS fact — profiles, film, coaches, opportunity — not just "download."

VOICE:
- Blunt, specific, locker-room. Like explaining the rule on the bus.
- Lead with the number or the rule. Then what it actually means. Then what to do.
- No motivational glue. No hustle slop.

GENDER:
- If the fact is about women's soccer, write women / girls and image women players.
- If the fact is about men's soccer, write men / boys and image men players.
- Do not mix.

BANNED:
- Waitlist / link in bio
- Invented stories (scout times, "you lost a year", fake dialogue)
- "period." "Focus on…" "Take control" "Recruiting is rigged"
- "Email 10 coaches every weekend" as the whole payoff
- Forcing NCAA / walk-on / D1 framing onto a non-college lane
- Pivoting a new post back to MLS SuperDraft / draft night unless that is the assigned topic
- Reusing last post's topic, lane, or SuperDraft-style "only one door" hook
- Restating the same line four ways
- Empty lines like "teamwide" or "the truth"

STRUCTURE:
1) COVER (hook): 4 to 6 plain words a parent gets in one glance. It must make the next swipe feel necessary. Body is one short sentence with the fact. No tip.
2–N) REASON slides: a 6-word headline in normal words (no leading number), one short paragraph, one practical tip.
LAST: Ryval's solution for this exact problem (what the app does). Tip can mention Download Ryval.

GOOD cover hooks:
- "The eligibility clock starts early"
- "USL can be a real job"
- "Coaches forget the name Monday"

GOOD reason headlines:
- "The clock starts in high school"
- "Film has to show the job"

BAD covers:
- "5 things you still get wrong about USL as a job path"
- "SMU Dominates Men's Soccer Rankings"
- A record with nothing to swipe for, like "Men's Xavier is 6-0-2"

GOOD body:
- Two sentences that teach the assigned rule, then what to do. Keep the real number from the beats.

BAD:
- "They promised a pro scout at 5:00 PM"
- Single 8-word billboard with no body
- "Waitlist in bio."
- "Download Ryval" with no explanation
- Turning a Europe / NWSL / GK lane into another college walk-on post

WRITING LIMITS:
- Cover headline: 6 words max. Other headlines: 6 words max. Plain words, not headline-speak.
- Cover body: one sentence, under 18 words.
- Other body: 35–55 words, two short paragraphs.
- Tip: 18 words max. Practical, not motivational. Empty on the cover.
- Caption: 1–2 lines that repeat the fact, not ad copy.
- Hashtags: 6–8 that match THIS topic (#Soccer #WomensSoccer #MLSNext #NWSL #USL #CollegeSoccer #FootballPathway etc.)

IMAGE PROMPTS: dark 4:5 editorial photo, subject on the RIGHT half, left half empty/dark for type. Correct player gender. No text, logos, or crests.`;

function sentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<![A-Z\d])[.!?](?!\d)\s+/)
    .map((part) => part.replace(/[.!?]+$/g, "").trim())
    .filter(Boolean);
}

function claimLine(text: string, max: number) {
  const parts = sentences(text);
  const best = parts.find((part) => part.split(/\s+/).length >= 4) || parts[0] || text;
  let line = enforceMaxWords(best, max);
  while (/\b(a|an|the|and|or|of|to|in|for|with|across|before|after|from|into|over|under|than|then)$/i.test(line)) {
    line = line.replace(/\s+\S+$/, "").trim();
  }
  return line.replace(/[,:;—–-]+$/g, "").trim();
}

function teachingLine(text: string, max = 18) {
  const parts = sentences(text);
  const useful = parts.find((part) => part.split(/\s+/).length >= 8) || parts[0] || text;
  const beforeDash = useful.split(/\s+[—–]\s+/)[0]?.trim() || useful;
  const choice = beforeDash.split(/\s+/).length >= 8 ? beforeDash : useful;
  return enforceMaxWords(choice, max);
}

function coverHeadline(topic: string, beat: string) {
  const fit = sentences(beat).find((part) => {
    const n = part.split(/\s+/).length;
    return n >= 4 && n <= 7;
  });
  if (fit) return fit;
  const trimmed = claimLine(beat, 6);
  const full = sentences(beat)[0] || beat;
  const cut = trimmed.split(/\s+/).length < full.split(/\s+/).filter(Boolean).length;
  if (cut && !/\d/.test(trimmed) && topic.split(/\s+/).length <= 6) return topic;
  return trimmed || topic;
}

/** One real recruiting fact per slide. The model does not get to turn this into a rankings post. */
export function recruitingPostFromLane(
  lane: (typeof FACT_LANES)[number],
  ctaSolution: string,
) {
  const fact = teachingLine(lane.fact, 22);
  const beats = lane.beats.map((beat) => beat.replace(/\s+/g, " ").trim()).filter(Boolean);
  const side =
    lane.gender === "women" ? "Women's" : lane.gender === "men" ? "Men's" : "";
  const topic = side && !/\b(women'?s|men'?s|nwsl)\b/i.test(lane.topic) ? `${side} ${lane.topic}` : lane.topic;
  const slide = (headline: string, body: string, max = 6) => {
    const head = claimLine(headline, max);
    const sentence = enforceMaxWords(body.replace(/\s+/g, " ").trim(), 32);
    const norm = (value: string) => value.toLowerCase().replace(/[^a-z0-9%.\s]/g, "").replace(/\s+/g, " ").trim();
    const headWords = norm(head).split(" ").filter(Boolean);
    const bodyWords = norm(sentence).split(" ").filter(Boolean);
    const shared = headWords.filter((word) => bodyWords.includes(word)).length;
    const keepBody =
      bodyWords.length > 0 &&
      !(shared / Math.max(headWords.length, 1) >= 0.85 && Math.abs(bodyWords.length - headWords.length) <= 1);
    return {
      headline: head,
      body: keepBody ? sentence : "",
      tip: "",
      imagePrompt: [topic, head, keepBody ? sentence : ""].filter(Boolean).join(". "),
    };
  };
  const coverHead = coverHeadline(topic, beats[0] || topic);
  const rest = beats.slice(1);
  const beatSlide = (beat: string) => {
    const parts = sentences(beat);
    const first = parts[0] || beat;
    if (parts.length > 1 && first.split(/\s+/).length <= 8) {
      return slide(first, parts.slice(1).join(". "), 8);
    }
    if (first.split(/\s+/).length <= 8) return slide(first, "", 8);
    return slide(first, beat, 6);
  };
  return {
    hook: slide(coverHead, fact, 7),
    slide_2: beatSlide(rest[0] || beats[0] || topic),
    slide_3: beatSlide(rest[1] || rest[0] || topic),
    slide_4: beatSlide(rest[2] || rest[1] || rest[0] || topic),
    ...(rest[3] ? { slide_5: beatSlide(rest[3]) } : {}),
    cta: slide(ctaSolution, "Coaches post the roster spot. You apply with film.", 12),
    caption: fact,
    hashtags: "#collegesoccer #soccerrecruiting #ryval",
  };
}

async function loadTitleMemory(
  supabase: { from: (table: string) => any },
  userId: string,
) {
  const since = new Date(Date.now() - 60 * 24 * 3600_000).toISOString();
  const rows: { hook: string | null; notes: string | null }[] = [];
  for (let from = 0; from < 2000; from += 500) {
    const { data, error } = await supabase
      .from("posts")
      .select("hook, notes")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .range(from, from + 499);
    if (error || !data?.length) break;
    rows.push(...data);
    if (data.length < 500) break;
  }
  return rows;
}

function kindFromNotes(notes: string | null | undefined) {
  return notes?.match(/^kind:(\S+)/m)?.[1] ?? "";
}

async function maybeNewsStory(opts: {
  desk: StoryDesk;
  gender: "men" | "women";
  recentHooks: string[];
  recentIds: string[];
  recentKinds: string[];
}): Promise<RecruitingStory | null> {
  if (opts.desk !== "media") return null;
  const recentNews = opts.recentKinds.slice(0, 8).filter((kind) => kind === "news").length;
  if (recentNews > 0) return null;
  try {
    const board = await fetchNcaaSeasonBoard(opts.gender);
    const blob = opts.recentHooks.join(" \n ").toLowerCase();
    const team = board.topTeams.find((row) => {
      const name = row.team?.trim();
      if (!name || name.length < 3) return false;
      if (blob.includes(name.toLowerCase())) return false;
      const id = `news-${opts.gender}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      return !opts.recentIds.includes(id);
    });
    if (!team) return null;
    const story = newsStoryFromRecord({
      sport: opts.gender,
      team: team.team,
      record: team.record,
      losses: team.loss,
    });
    return storyPassesGate(story) ? story : null;
  } catch {
    return null;
  }
}

async function autopilotStoryPost(opts: {
  supabase: { from: (table: string) => any };
  userId: string;
  data: z.infer<typeof Input>;
}) {
  const { supabase, userId, data } = opts;
  const memory = await loadTitleMemory(supabase, userId);
  const { data: recentRows } = await supabase
    .from("posts")
    .select("hook, slide_2, slide_3, slide_4, slide_5, slide_6, bg_images, app_screen_url")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(80);

  const recent = (recentRows ?? []) as Array<{
    hook?: string | null;
    slide_2?: string | null;
    slide_3?: string | null;
    slide_4?: string | null;
    slide_5?: string | null;
    slide_6?: string | null;
    bg_images?: unknown;
    app_screen_url?: string | null;
  }>;
  const recentGenders = recent.map((r) => {
    const fromCopy = inferPhotoGender(r.hook, r.slide_2, r.slide_3, r.slide_4, r.slide_5, r.slide_6);
    if (fromCopy !== "neutral") return fromCopy;
    const ids = collectStockPhotoIds(Array.isArray(r.bg_images) ? r.bg_images : []);
    for (const id of ids) {
      const g = genderForStockId(id);
      if (g === "men" || g === "women") return g;
    }
    return "neutral" as const;
  });
  const photoGender = nextPostGender(recentGenders);
  const desk: StoryDesk = data.desk ?? "education";
  const recentHooks = memory.map((row) => editorialTitle(row.hook)).filter(Boolean);
  const recentIds = [
    ...(data.skipStoryIds ?? []),
    ...memory
      .map((row) => topicFromNotes(row.notes))
      .filter((id): id is string => Boolean(id))
      .map(canonicalStoryId),
  ];
  const recentKinds = memory.map((row) => kindFromNotes(row.notes));
  // RyvalApp and Ryval Sports lead with college stats from Ryval's own data. If the API is down
  // or nothing new is ready, the slot falls through to the written stories as before.
  const stats: CollegeStatsStory | null = STATS_DESKS.has(desk)
    ? await pickCollegeStatsStory({ side: photoGender, recentIds, recentHooks, desk }).catch(() => null)
    : null;
  const slate = stats ? null : pickWeekOneStory({ desk, recentIds, recentHooks });
  const news =
    stats || slate
      ? null
      : await maybeNewsStory({ desk, gender: photoGender, recentHooks, recentIds, recentKinds });
  const story: RecruitingStory | CollegeStatsStory =
    stats ??
    slate ??
    news ??
    pickRecruitingStory({
      desk,
      gender: photoGender,
      recentHooks,
      recentIds,
    });
  const statSpec = stats?.spec ?? null;

  const slide = (headline: string, body: string) => ({
    headline,
    body,
    tip: "",
    imagePrompt: [story.id, headline, body].filter(Boolean).join(". "),
  });
  const rawSlides = [slide(story.hook, story.hookBody), ...story.slides.map((row) => slide(row.headline, row.body))];
  const packed: SlideFields = {
    hook: packEditorial(rawSlides[0]?.headline ?? "", rawSlides[0]?.body ?? "", ""),
    slide_2: rawSlides[1] ? packEditorial(rawSlides[1].headline, rawSlides[1].body, "") : "",
    slide_3: rawSlides[2] ? packEditorial(rawSlides[2].headline, rawSlides[2].body, "") : "",
    slide_4: rawSlides[3] ? packEditorial(rawSlides[3].headline, rawSlides[3].body, "") : "",
    slide_5: rawSlides[4] ? packEditorial(rawSlides[4].headline, rawSlides[4].body, "") : "",
    slide_6: "",
    cta: packEditorial(story.ctaHeadline, story.ctaBody, ""),
    caption: story.hookBody || story.hook,
    hashtags: "#collegesoccer #soccerrecruiting #ryval",
    slide_image_prompts: rawSlides.map((row) => row.imagePrompt),
  };
  const cleaned = postProcessBrandPost(packed, 7);
  // Stats slides are drawn from the spec, so the hook is only the TikTok title: keep it whole
  // (the 16-word cap cut "…the most in D1 men's soccer" to "…the most in D1 men's").
  if (statSpec) cleaned.hook = packed.hook;
  cleaned.cta = packEditorial(story.ctaHeadline, story.ctaBody, "");
  if (story.caption?.trim()) cleaned.caption = story.caption.trim();
  if (story.hashtags?.trim()) cleaned.hashtags = story.hashtags.trim();
  const gender: PhotoGender = story.gender === "any" ? photoGender : story.gender;
  const photoExcludeIds = collectStockPhotoIds(
    recent.flatMap((r) => (Array.isArray(r.bg_images) ? r.bg_images : [])),
  );
  const bodyKeys = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"] as const;
  const filled = bodyKeys.filter((key) => Boolean(cleaned[key])).length;
  const varied = pickVariedSlidePhotos({
    slideCount: filled,
    gender: gender === "men" ? "men" : "women",
    excludeIds: photoExcludeIds,
  });
  const bgImages: string[] = [];
  let photoCursor = 0;
  for (const key of bodyKeys) {
    if (!cleaned[key]) {
      bgImages.push("");
      continue;
    }
    // Stats posts: only the cover carries a photo; data slides are drawn, marked so they are never dropped.
    if (statSpec && key !== "hook") {
      bgImages.push("/stat-bg/data");
      continue;
    }
    bgImages.push(varied[photoCursor] ?? "");
    photoCursor += 1;
  }
  const recentCtas = recent.map((r) => {
    const arr = Array.isArray(r.bg_images) ? r.bg_images : [];
    return arr[6] || resolveCtaBackground(screenSalt(r.app_screen_url));
  });
  bgImages[6] = nextCtaBackground(recentCtas);
  return {
    ...cleaned,
    bg_images: bgImages,
    bg_image_url: bgImages.find((url) => !!url) ?? null,
    logo_url: RYVAL_MARK_SRC,
    app_screen_url: story.screen,
    photo_exclude_ids: [...photoExcludeIds, ...collectStockPhotoIds(bgImages)],
    photo_gender: gender,
    cta_bg_url: bgImages[6],
    fact_lane: story.id,
    notes: [
      `lane:${story.id}`,
      `kind:${story.kind}`,
      `desk:${story.desk}`,
      story.family ? `family:${story.family}` : "",
      story.objective ? `objective:${story.objective}` : "",
      story.closeMode ? `close:${story.closeMode}` : "",
      story.slateDay ? `slate:week-1` : "",
      story.slateDay ? `day:${story.slateDay}` : "",
      statSpec ? `stats:${statSpec.family}` : "",
      statSpec ? statSpecNote(statSpec) : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

export async function generateEditorialPosts(opts: {
  // User-scoped or service-role client — both expose .from("posts")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any };
  userId: string;
  data: z.infer<typeof Input>;
}) {
  const { supabase, userId, data } = opts;
  if (!data.promptOverride) {
    return { posts: [await autopilotStoryPost({ supabase, userId, data })] };
  }

    const bodySlideCount = Math.max(4, Math.min(6, data.slidesPerPost - 1));

    const slideObj = (desc: string) => ({
      type: "object",
      properties: {
        headline: { type: "string", description: `${desc} Headline, 6 plain words max. Easy to read out loud.` },
        body: {
          type: "string",
          description: "Two short paragraphs, 35–55 words. Teach the rule. Keep real numbers.",
        },
        tip: {
          type: "string",
          description: "One practical tip, 18 words max. Empty string on the cover.",
        },
        imagePrompt: {
          type: "string",
          description:
            "4:5 (1080x1350) dark editorial soccer photo. Subject on the RIGHT half. Left half empty/dark. No text in the image.",
        },
      },
      required: ["headline", "body", "tip", "imagePrompt"],
      additionalProperties: false,
    });

    const bodyProps: Record<string, unknown> = {
      hook: slideObj("COVER: 4 to 6 plain words that make someone swipe. Not a 'facts about' label."),
      slide_2: slideObj("REASON 1: what the number actually means."),
      slide_3: slideObj("REASON 2: the lie parents/players believe."),
      slide_4: slideObj("REASON 3: one real move."),
    };
    const requiredSlides = ["hook", "slide_2", "slide_3", "slide_4"];
    if (bodySlideCount >= 5) {
      bodyProps.slide_5 = slideObj("REASON 4: another real soccer action from the assigned lane.");
      requiredSlides.push("slide_5");
    }
    if (bodySlideCount >= 6) {
      bodyProps.slide_6 = slideObj("REASON 5: last teaching beat before the Ryval fix.");
      requiredSlides.push("slide_6");
    }

    const tool = {
      type: "function",
      function: {
        name: "create_posts",
        description: "Return generated slideshow posts.",
        parameters: {
          type: "object",
          properties: {
            posts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  ...bodyProps,
                  cta: slideObj(
                    "LAST SLIDE: Ryval's specific fix for THIS fact. Say what the app does. Tip may say Download Ryval.",
                  ),
                  caption: { type: "string" },
                  hashtags: { type: "string", description: "Space-separated #tags" },
                },
                required: [...requiredSlides, "cta", "caption", "hashtags"],
                additionalProperties: false,
              },
            },
          },
          required: ["posts"],
          additionalProperties: false,
        },
      },
    };

    const { count: postCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    const vi = data.variantIndex ?? postCount ?? 0;

    const { data: recentRows } = await supabase
      .from("posts")
      .select("hook, slide_2, slide_3, slide_4, slide_5, slide_6, cta, app_screen_url, bg_images, notes")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(120);

    const recent = recentRows ?? [];
    const recentGenders = recent.map((r) => {
      const fromCopy = inferPhotoGender(
        r.hook,
        r.slide_2,
        r.slide_3,
        r.slide_4,
        r.slide_5,
        r.slide_6,
      );
      if (fromCopy !== "neutral") return fromCopy;
      const ids = collectStockPhotoIds(Array.isArray(r.bg_images) ? r.bg_images : []);
      for (const id of ids) {
        const g = genderForStockId(id);
        if (g === "men" || g === "women") return g;
      }
      return "neutral" as const;
    });
    const photoGender = nextPostGender(recentGenders);

    const recentLaneTopics = recent.map((r) => {
      const blob = [r.hook, r.slide_2, r.slide_3, r.slide_4, r.slide_5, r.slide_6]
        .filter(Boolean)
        .join(" ");
      return resolvedTopic(r.notes, blob);
    });
    const recentBlobs = recent.map((r) =>
      [r.hook, r.slide_2, r.slide_3, r.slide_4, r.slide_5, r.slide_6].filter(Boolean).join(" "),
    );
    const lane = pickNextLane(photoGender, recentLaneTopics, recentBlobs);

    const personaPool = personasForLane(lane, photoGender);
    const persona = personaPool[vi % personaPool.length] ?? personaPool[0];
    const isCoach = persona.lens === "coaches";
    const ctaSolution = isCoach ? lane.coachSolution : lane.solution;
    const appScreen = nextAppScreen(recent.map((r) => r.app_screen_url));
    const photoExcludeIds = collectStockPhotoIds(
      recent.flatMap((r) => (Array.isArray(r.bg_images) ? r.bg_images : [])),
    );
    const recentCtas = recent.map((r) => {
      const arr = Array.isArray(r.bg_images) ? r.bg_images : [];
      return arr[6] || resolveCtaBackground(screenSalt(r.app_screen_url));
    });
    const ctaBgUrl = nextCtaBackground(recentCtas);

    const recentHooks = recent.map((r) => editorialTitle(r.hook)).filter(Boolean);
    const usedTopicList = [...new Set(recentLaneTopics.filter(Boolean) as string[])].slice(0, 20);
    const lastTopic = recentLaneTopics.find(Boolean);
    const lastFamily = lastTopic ? familyOf(lastTopic) : familyFromCopy(recentBlobs[0] ?? "");
    const avoidBlock = `
THIS POST'S ONLY TOPIC: ${lane.topic}
Family: ${familyOf(lane.topic)}. Last post was "${lastTopic ?? "none"}" (${lastFamily || "none"}). Do not repeat that topic or family.
Do not mention any of these already-used topics: ${usedTopicList.join(" · ") || "(none yet)"}.
${
  familyOf(lane.topic) === "draft"
    ? ""
    : "Forbidden in this draft: SuperDraft, draft night, Super Draft, 'only one door', 'only intake'. That is a different post.\n"
}
${
  recentHooks.length
    ? `Do not reuse these recent openings:\n${recentHooks
        .slice(0, 10)
        .map((h, i) => `${i + 1}. ${h}`)
        .join("\n")}\n`
    : ""
}`;

    const userPrompt = `${data.promptOverride ?? ""}
Generate ${data.count} faceless slideshow carousel post(s).

THIS POST'S PERSONA (who you're talking to): ${persona.who}
THEIR CONTEXT: ${persona.pain}
LENS: ${persona.lens} (player, parent, or coach — stay in their world)
WRITE THIS POST FOR: ${photoGender === "women" ? "women / girls only" : "men / boys only"}. Do not switch gender.
PLAYER IMAGES: ${photoGender === "women" ? "women's soccer players only" : "men's soccer players only"}

ASSIGNED LANE (mandatory — teach THIS topic, do not invent a vibe ad, do not default to NCAA walk-on):
Topic: ${lane.topic}
${lane.fact}

REQUIRED BEATS (keep the numbers; you may punch them up, do not replace with vibe copy or a different pathway):
${lane.beats.map((b, i) => `${i + 1}. ${b}`).join("\n")}

ASSIGNED RYVAL SOLUTION (last slide — use this idea: profiles, film, coaches, global opportunity):
${ctaSolution}

Diversity cursor: #${vi}
${avoidBlock}
- Platform: ${data.platform}
- Account: ${data.account}
- Audience hint: ${data.audience} (persona above wins if they disagree)
- Category: ${data.category}
- Tone: ${data.tone}
- CTA: last slide explains the Ryval solution above. Do not only say Download Ryval.
- Total slides including CTA: ${data.slidesPerPost}. Body slides: ${bodySlideCount}.

Structure: this is a facts carousel, not a news recap.
Cover headline is 4 to 6 plain words. Name ${lane.topic} in words a 16-year-old understands immediately. Do not start with "facts about" or "things you still get wrong about".
Cover body is one sentence: the fact, then why the next slide is worth the swipe.
Each reason headline is 6 plain words that say the point. If the fact is men's or women's, say which. Never blend the two.
Last slide is Ryval's fix.
Every slide needs a 4:5 (1080x1350) imagePrompt: subject on the RIGHT, dark left, correct player gender.

Return strictly via the create_posts tool.`;

    type SlideObj = {
      headline?: string;
      body?: string;
      tip?: string;
      text?: string;
      imagePrompt: string;
    };
    type RawPost = {
      hook?: SlideObj;
      slide_2?: SlideObj;
      slide_3?: SlideObj;
      slide_4?: SlideObj;
      slide_5?: SlideObj;
      slide_6?: SlideObj;
      cta?: SlideObj | string;
      caption: string;
      hashtags: string;
    };

    const packSlide = (s?: SlideObj | string) => {
      if (!s) return "";
      if (typeof s === "string") return packEditorial(s);
      return packEditorial(s.headline ?? s.text ?? "", s.body ?? "", s.tip ?? "");
    };

    async function callModel(extraAvoid: string): Promise<RawPost[]> {
      const textJson = await chatCompletions({
        messages: [
          { role: "system", content: SYSTEM_BASE },
          { role: "user", content: userPrompt + extraAvoid },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "create_posts" } },
      });
      const call = textJson.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) throw new Error("No tool call returned from model");
      const args = JSON.parse(call.function.arguments);
      return args.posts as RawPost[];
    }

    const draftBlob = (rows: RawPost[]) =>
      [rows[0]?.hook, rows[0]?.slide_2, rows[0]?.slide_3, rows[0]?.slide_4]
        .map((s) => (s ? `${s.headline ?? s.text ?? ""} ${s.body ?? ""}` : ""))
        .filter(Boolean)
        .join(" ");

    let posts = data.promptOverride ? await callModel("") : [recruitingPostFromLane(lane, ctaSolution)];
    const draftText = draftBlob(posts);
    if (data.promptOverride && !copyFitsLane(draftText, lane)) {
      posts = await callModel(
        `\nINVALID DRAFT. You drifted off topic. Teach ONLY "${lane.topic}". Do not mention SuperDraft, NCAA walk-on, or college unless that is this assigned topic. Use the assigned beats and numbers.`,
      );
    } else if (
      data.promptOverride &&
      posts[0]?.hook &&
      (isTooSimilar(posts[0].hook.headline ?? posts[0].hook.text ?? "", recentHooks) ||
        isSameCarousel(posts[0].hook.headline ?? posts[0].hook.text ?? "", recentHooks))
    ) {
      posts = await callModel(
        `\nYour previous hook was too similar. Stay on "${lane.topic}" with a different opening number/line. Do not switch topics.`,
      );
    } else if (data.promptOverride && looksLikeSlop(draftText)) {
      posts = await callModel(
        `\nThat draft invented a story or sounded like a waitlist ad. Rewrite using ONLY "${lane.topic}" and the assigned beats. Do not pivot to SuperDraft or college walk-on unless that is the assigned topic.`,
      );
    }
    if (!copyFitsLane(draftBlob(posts), lane)) {
      posts = [recruitingPostFromLane(lane, ctaSolution)];
    }

    const logoUrl = RYVAL_MARK_SRC;

    const enriched = posts.map((p) => {
      const raw: SlideFields = {
        hook: packSlide(p.hook),
        slide_2: packSlide(p.slide_2),
        slide_3: packSlide(p.slide_3),
        slide_4: packSlide(p.slide_4),
        slide_5: packSlide(p.slide_5),
        slide_6: packSlide(p.slide_6),
        cta: packSlide(p.cta),
        caption: p.caption ?? "",
        hashtags: p.hashtags ?? "",
        slide_image_prompts: [
          p.hook?.imagePrompt ?? "",
          p.slide_2?.imagePrompt ?? "",
          p.slide_3?.imagePrompt ?? "",
          p.slide_4?.imagePrompt ?? "",
          p.slide_5?.imagePrompt ?? "",
          p.slide_6?.imagePrompt ?? "",
        ],
      };
      const cleaned = postProcessBrandPost(raw, data.slidesPerPost);
      const bodyKeys = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"] as const;
      const prompts = [...cleaned.slide_image_prompts];
      for (let i = 0; i < bodyKeys.length; i++) {
        const key = bodyKeys[i];
        if (!cleaned[key]) continue;
        const head = parseEditorial(cleaned[key]).headline.toLowerCase();
        const alreadyABeat =
          lane.beats.some((beat) => {
            const b = beat.toLowerCase();
            return b.startsWith(head.slice(0, 18)) || head.startsWith(b.slice(0, 18));
          }) || head.startsWith(lane.topic.toLowerCase().slice(0, 18));
        if (!alreadyABeat && !isUsefulSlide(cleaned[key])) {
          cleaned[key] =
            i === 0
              ? packEditorial(
                  lane.topic,
                  lane.fact,
                  "",
                )
              : packEditorial(
                  lane.beats[Math.min(i, lane.beats.length - 1)] ?? "",
                  lane.fact,
                  "Write the next step down before you spend another weekend guessing.",
                );
          if (!cleaned[key]) {
            prompts[i] = "";
            continue;
          }
        }
        const ed = parseEditorial(cleaned[key]);
        prompts[i] = [ed.headline, ed.body].filter(Boolean).join(". ");
      }
      cleaned.cta = packEditorial(
        ctaSolution,
        "Build one profile coaches can open — film, position, and real roster needs in the same place.",
        "Download Ryval on the App Store.",
      );
      cleaned.slide_image_prompts = prompts;
      const usedInPost: string[] = [];
      const bgImages: string[] = [];
      for (let i = 0; i < 6; i++) {
        if (!cleaned[["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"][i] as keyof SlideFields]) {
          bgImages[i] = "";
          continue;
        }
        const picked = pickStockPhoto(
          [prompts[i], lane.topic].filter(Boolean).join(". "),
          vi * 17 + i,
          [...photoExcludeIds, ...usedInPost],
          photoGender,
          usedInPost,
        );
        usedInPost.push(picked.photoId);
        bgImages[i] = picked.url;
      }
      bgImages[6] = ctaBgUrl;
      return {
        ...cleaned,
        bg_images: bgImages,
        bg_image_url: bgImages.find((u) => !!u) ?? null,
        logo_url: logoUrl,
        app_screen_url: appScreen,
        diversity_cursor: vi,
        photo_exclude_ids: [...photoExcludeIds, ...usedInPost],
        photo_gender: photoGender,
        cta_bg_url: ctaBgUrl,
        fact_lane: lane.topic,
        notes: laneNotes(lane.topic),
      };
    });

    return { posts: enriched };
}

export const generatePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data, context }) =>
    generateEditorialPosts({ supabase: context.supabase, userId: context.userId, data }),
  );

// ──────────────────────────────── College copy (school-specific) ────────────────────────────────
export const generateCollegeCopy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        school: z.string().min(1).max(120),
        sport: z.string().min(1).max(80),
        conference: z.string().max(80).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {

    const tool = {
      type: "function",
      function: {
        name: "create_college_copy",
        description: "Return school-specific recruiting slide copy and image scene descriptions.",
        parameters: {
          type: "object",
          properties: {
            nickname: { type: "string", description: "Short uppercase nickname e.g. HARVARD, CRIMSON" },
            conference: { type: "string", description: "Athletic conference, e.g. Ivy League, ACC" },
            accent_hex: { type: "string", description: "School primary color hex, e.g. #A41034 for Harvard crimson" },
            hero_tagline: { type: "string", description: "Short 2-3 word tagline after the nickname, e.g. BUILT DIFFERENT, EARNED HERE, ALWAYS FORWARD. Must end with a period." },
            hero_accent_word: { type: "string", description: "Which trailing word of hero_tagline to color in accent (e.g. DIFFERENT.)" },
            compete_subline: { type: "string", description: "All-caps short subline, e.g. IVY LEAGUE STANDARD." },
            compete_chips: {
              type: "array", minItems: 3, maxItems: 3,
              items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"], additionalProperties: false },
              description: "3 chips with REAL, SPECIFIC, NUMERIC stats about this school's program. Title is a short uppercase stat headline (e.g. '17 NCAA TOURNAMENTS', '4 NATIONAL TITLES', '38 PROS DEVELOPED'). Body is one factual 6-12 word sentence with a year, number, or named accomplishment. NEVER use generic filler like 'NCAA POWERHOUSE' or 'PRO PIPELINE'. If unsure of an exact number, pick a plausible specific one and phrase it accurately for this program.",
            },
            environment_chips: {
              type: "array", minItems: 3, maxItems: 3,
              items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"], additionalProperties: false },
              description: "3 chips naming the school's ACTUAL facilities by name (e.g. 'KOSKINEN STADIUM', 'YEARDLEY LOVE CENTER', 'JOHN A. BLACKBURN INSTITUTE'). Body: short 6-10 word factual line about that facility.",
            },
            more_than_chips: {
              type: "array", minItems: 3, maxItems: 3,
              items: { type: "object", properties: { title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"], additionalProperties: false },
              description: "3 academic chips with REAL specifics: world ranking number, famous alumni name, named program (e.g. '#3 US NEWS RANKING', '162 RHODES SCHOLARS', 'WHARTON / FUQUA / ROSS pipeline'). Numeric / named, never generic.",
            },
            cta_subline: { type: "string", description: 'Final CTA subline, e.g. DM "RECRUIT"' },
            caption: { type: "string", description: "Short TikTok caption, 1-2 lines, mentions the school+sport. Do not stuff." },
            hashtags: { type: "string", description: "8-12 space-separated hashtags, mix school + sport + recruiting tags. Include school-specific tags." },
            hero_scene: { type: "string", description: `Photoreal scene description for HERO slide background — must clearly be ${data.school}: iconic campus landmark, named building if you know one, dusk lighting. No text, no logos.` },
            compete_scene: { type: "string", description: `Photoreal action scene of ${data.school} ${data.sport} players competing. Use the school's actual primary uniform colors. No readable logos, no recognizable faces.` },
            environment_scene: { type: "string", description: `Photoreal interior of ${data.school} ${data.sport} facility / locker room / training ground. School colors visible. No text or logos.` },
            more_than_scene: { type: "string", description: `Photoreal scene of ${data.school} campus academic life — students walking past a named iconic building if you know one. Shot from behind so no faces.` },
            cta_scene: { type: "string", description: `Photoreal empty ${data.school} ${data.sport} stadium/field at night under floodlights. If you know the stadium name, evoke it. No text or logos.` },
          },
          required: ["nickname", "conference", "accent_hex", "hero_tagline", "hero_accent_word", "compete_subline", "compete_chips", "environment_chips", "more_than_chips", "cta_subline", "caption", "hashtags", "hero_scene", "compete_scene", "environment_scene", "more_than_scene", "cta_scene"],
          additionalProperties: false,
        },
      },
    };

    const userPrompt = `Generate UNIQUE, school-specific recruiting carousel copy for:
- School: ${data.school}
- Sport: ${data.sport}
- Conference (if provided): ${data.conference ?? "(infer)"}

Use REAL knowledge about this school and program when you have it: actual conference, real primary color, named campus buildings, real stadium/arena names, accurate academic reputation. Stats/facts must be specific and plausible — never the same generic "NCAA POWERHOUSE / PRO PIPELINE" filler. Make each generation feel hand-written for this exact school. Return strictly via the tool.`;

    const j = await chatCompletions({
      messages: [
        { role: "system", content: "You write premium, school-specific college recruiting social copy. You know real facts about US colleges and their athletic programs. Never use generic filler." },
        { role: "user", content: userPrompt },
      ],
      tools: [tool],
      tool_choice: { type: "function", function: { name: "create_college_copy" } },
    });
    const call = j.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No tool call returned");
    return JSON.parse(call.function.arguments);
  });

// ──────────────────────────────── School crest / logo generation ────────────────────────────────
export const generateSchoolLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        school: z.string().min(1).max(120),
        accent: z.string().min(3).max(20),
        motif: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const prompt = `Original athletic monogram crest INSPIRED BY ${data.school}'s color identity and traditional collegiate motif (${data.motif ?? "shield with bold serif letterform"}). Clean vector-style emblem, centered, on a SOLID WHITE BACKGROUND, premium college sports branding aesthetic. Primary color: ${data.accent}. Add a tasteful secondary tone (white / cream / black) for depth. Bold, simple, instantly readable at small sizes — like a varsity team patch. Symmetrical, sharp edges, no gradients, no photographic textures, no 3D, no busy details. ABSOLUTELY NO real trademarks, NO existing school crests, NO NCAA marks, NO copyrighted logos. Do not include any text other than (optionally) a single bold initial letter. Square 1:1 composition with generous padding around the emblem.`;

    const { bytes, mime, ext } = await generateImageBytes(prompt, "nano-pro");
    const path = `${userId}/generated/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("assets")
      .upload(path, bytes, { contentType: mime });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    return { url: supabase.storage.from("assets").getPublicUrl(path).data.publicUrl };
  });

// One short call per slide, fired sequentially from the client.
export const generateBackground = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        prompt: z.string().min(3).max(4000),
        model: z.enum(["nano", "nano-pro", "openai", "stick", "stock"]).optional(),
        stylePreset: z.enum(["ryval", "college", "college-composed", "raw", "stick", "stock"]).optional(),
        salt: z.number().optional(),
        excludeIds: z.array(z.string()).optional(),
        hardExcludeIds: z.array(z.string()).optional(),
        gender: z.enum(["women", "men", "neutral"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const engine = data.model ?? "stock";
    const gender = data.gender ?? inferPhotoGender(data.prompt);

    let bytes: Uint8Array;
    let mime: string;
    let ext: string;
    let photoId: string | undefined;

    if (engine === "stock" || data.stylePreset === "stock") {
      // Do not fetch/re-upload Unsplash on the server. Batch queue was failing
      // that hop and saving empty navy gradients. Preview + export load the URL.
      const picked = pickStockPhoto(
        data.prompt,
        data.salt ?? 0,
        data.excludeIds ?? [],
        gender,
        data.hardExcludeIds ?? [],
      );
      return { url: picked.url, photoId: picked.photoId };
    } else {
      const styleSuffix =
        engine === "stick" || data.stylePreset === "stick"
          ? `\n\n4:5 (1080x1350) ENTERTAINING stick-figure comic. ${genderPromptLine(gender)} Subject on the RIGHT. Thick black outlines, flat bright colors (electric blue, white, one hot accent), simple shapes, funny soccer-recruiting gag that matches the line. Full color. NOT photoreal, NOT black and white, NOT grayscale, NOT cinematic, NOT 3D, NO text, NO logos.`
          : data.stylePreset === "college-composed"
            ? ""
            : data.stylePreset === "college"
              ? `\n\nFormat: 4:5 (1080x1350). ${genderPromptLine(gender)} Subject on the RIGHT half, left half dark/empty. Shot on a Canon R5 with a 50mm prime, f/1.8, ultra sharp focus, shallow depth of field, photoreal — Sports Illustrated / ESPN cover quality, NOT illustration, NOT CGI, NOT rendered. Cinematic dramatic stadium lighting, deep saturated colors, crisp athletic detail. Players wear plausible team uniforms. NO text, NO logos, NO school crests, NO trademarks, NO recognizable celebrity faces. FULL COLOR — not black and white.`
              : data.stylePreset === "raw"
                ? ""
                : `\n\n4:5 (1080x1350). ${genderPromptLine(gender)} Subject on the RIGHT half, left half dark/empty. FULL COLOR documentary photo — never black and white, never navy mush. Hard daylight or golden hour. Real youth/college soccer. NO text, logos, crests, or celebrity faces.`;

      const imageModel = engine === "stick" ? "openai" : engine;
      const generated = await generateImageBytes(
        `${data.prompt}${styleSuffix}\nVariation seed: ${data.salt ?? Date.now()}`,
        imageModel,
      );
      bytes = generated.bytes;
      mime = generated.mime;
      ext = generated.ext;
    }
    const path = `${userId}/generated/${photoId ? `stock-${photoId}-${crypto.randomUUID().slice(0, 8)}` : crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("assets")
      .upload(path, bytes, { contentType: mime });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    return {
      url: supabase.storage.from("assets").getPublicUrl(path).data.publicUrl,
      photoId: photoId ?? path,
    };
  });
