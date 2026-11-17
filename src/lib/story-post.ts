import { chatCompletions } from "@/lib/ai-client";
import { nextCtaBackground, RYVAL_MARK_SRC } from "@/lib/brand";
import { editorialTitle, packEditorial, postProcessBrandPost, sportSideOf, stampSportSide, type SlideFields } from "@/lib/content-quality";
import { editorialImagePrompt } from "@/lib/editorial";
import { brandAssetById, brandNotes, findBrandAsset, headlineProgram } from "@/lib/brand-assets";
import {
  inaccurateAppClaims,
  RYVAL_FACTS,
  RYVAL_NOT,
  RYVAL_ONE_LINER,
} from "@/lib/ryval-product";
import { unsupportedFacts } from "@/lib/fact-check";
import {
  markAssetsUsed,
  pickMediaAssets,
  type MediaAsset,
  type MediaBestUse,
} from "@/lib/media-library";
import type { StoryFormat } from "@/lib/story-ingest";
import { pickStockPhoto } from "@/lib/stock-photos";
import { templateFor } from "@/lib/templates";

export type StoryRow = {
  id: string;
  source_name: string;
  source_url: string;
  story_url: string;
  title: string;
  summary: string | null;
  published_at: string | null;
  category: string | null;
  suggested_format: StoryFormat;
  players: string[];
  schools: string[];
  stats: Record<string, string>;
  image_url: string | null;
  relevance_score: number;
  override_image_url?: string | null;
  brand_asset_id?: string | null;
  show_logos?: boolean | null;
  manual_notes?: string | null;
  bucket?: string | null;
  entry_mode?: string | null;
};

/** Everything the model is allowed to state, and the only text the validator checks against. */
export function storyFactPack(story: StoryRow) {
  const lines = [
    `HEADLINE: ${story.title}`,
    story.summary ? `REPORTED DETAIL: ${story.summary}` : "",
    story.schools.length ? `PROGRAMS NAMED: ${story.schools.join(", ")}` : "",
    story.players.length ? `PEOPLE NAMED: ${story.players.join(", ")}` : "",
    Object.keys(story.stats).length
      ? `NUMBERS REPORTED: ${Object.entries(story.stats)
          .map(([k, v]) => `${k} ${v}`)
          .join(", ")}`
      : "",
    story.published_at ? `PUBLISHED: ${new Date(story.published_at).toDateString()}` : "",
    `SOURCE: ${story.source_name} — ${story.story_url}`,
  ];
  return lines.filter(Boolean).join("\n");
}

function sourceLine(story: StoryRow) {
  const when = story.published_at
    ? new Date(story.published_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  return [story.source_name, when].filter(Boolean).join(" · ");
}

/**
 * The rights-tracked library first, in its priority order, then the bundled
 * licensed stock if the library cannot fill every slide.
 */
async function pickBackgrounds(
  story: StoryRow,
  slideCount: number,
  salt: number,
  bestUse: MediaBestUse,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: { from: (table: string) => any },
) {
  const urls: string[] = [];
  let chosen: MediaAsset[] = [];

  // A photo Andrew supplied by hand outranks anything the library can pick.
  const override = (story.override_image_url ?? "").trim();
  if (override) urls.push(override);

  if (db) {
    try {
      chosen = await pickMediaAssets(db, {
        count: slideCount,
        bestUse,
        program: story.schools[0] ?? null,
        tags: story.players.length ? ["player action"] : ["college soccer"],
        sport: sportSideOf(story.title, story.summary),
      });
      for (const asset of chosen) urls.push(asset.url);
    } catch {
      /* library unavailable; fall through to bundled stock */
    }
  }

  const used: string[] = [];
  const out: string[] = [];
  for (let i = 0; i < slideCount; i++) {
    if (urls[i]) {
      out.push(urls[i]!);
      continue;
    }
    const side = sportSideOf(story.title, story.summary);
    const picked = pickStockPhoto(
      story.title,
      salt * 13 + i,
      used,
      side ?? "neutral",
      used,
    );
    used.push(picked.photoId);
    out.push(picked.url);
  }
  return { urls: out, assets: chosen };
}

/**
 * Turns one ingested story into a carousel. The story is the entire fact pack:
 * anything the copy claims that the story does not say gets the post rejected.
 */
export async function generatePostFromStory(
  story: StoryRow,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  opts: { salt?: number; db?: { from: (table: string) => any } } = {},
) {
  const template = templateFor(story.suggested_format);
  const salt = opts.salt ?? 0;
  const facts = storyFactPack(story);

  const slideSchema = (brief: string) => ({
    type: "object",
    properties: {
      headline: { type: "string", description: `${brief} 6 plain words max, no trailing punctuation.` },
      body: {
        type: "string",
        description: "ONE sentence, 12 to 22 words. Never two sentences, never a paragraph.",
      },
    },
    required: ["headline", "body"],
    additionalProperties: false,
  });

  const properties: Record<string, unknown> = {};
  for (const role of template.roles) properties[role.key] = slideSchema(role.brief);
  properties.caption = {
    type: "string",
    description:
      "2 to 3 sentences summarising the story and why players or coaches should care. No hashtags here.",
  };
  properties.hashtags = { type: "string", description: "4 to 6 hashtags including #CollegeSoccer and #Ryval." };

  const tool = {
    type: "function",
    function: {
      name: "create_post",
      description: `Write one Ryval ${template.label} carousel from the story.`,
      parameters: {
        type: "object",
        properties,
        required: [...template.roles.map((r) => r.key), "caption", "hashtags"],
        additionalProperties: false,
      },
    },
  };

  const side = sportSideOf(story.title, story.summary);
  const system = `You write Ryval college soccer carousels.

WHAT RYVAL IS, and you may not describe it any other way:
${RYVAL_ONE_LINER}
${RYVAL_FACTS.map((f) => `- ${f}`).join("\n")}

WHAT RYVAL IS NOT. Never imply any of these:
${RYVAL_NOT.map((f) => `- ${f}`).join("\n")}

HARD RULES:
- The STORY below is your only source. Every name, number, record and rank must appear in it.
- Never invent a quote, a stat, a player, a school, or a ranking. If the story does not say it, do not write it.
- Never claim a coach or program said something unless the story states it.

LENGTH, because this is a graphic and not an article:
- Cover headline: 4 to 6 plain words. A reason to swipe, not a news label.
- Cover body: ONE sentence under 18 words that states the fact and points to the next slide.
- Other headlines: 6 plain words. Other body: ONE sentence, 12 to 22 words.

VOICE: blunt, specific, useful to a 16 year old player and their parent. No hype, no motivational filler.

MEN'S AND WOMEN'S ARE DIFFERENT SPORTS:
${
  side === "women"
    ? "This story is women's soccer. The cover headline must include the word Women's. Do not mention men's soccer."
    : side === "men"
      ? "This story is men's soccer. The cover headline must include the word Men's. Do not mention women's soccer."
      : "If the story names both sides, say which fact is women's and which is men's. Never blend them into one team."
}`;

  const user = `Write one ${template.label} carousel.

STORY (only source of truth):
${facts}

Each slide has a job. Follow them exactly:
${template.roles.map((r, i) => `${i + 1}. ${r.key}: ${r.brief}`).join("\n")}

Variant ${salt}. Return strictly via create_post.`;

  const json = await chatCompletions({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    tools: [tool],
    tool_choice: { type: "function", function: { name: "create_post" } },
  });
  const call = json.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No copy returned for this story");
  const parsed = JSON.parse(call.function.arguments) as Record<
    string,
    { headline?: string; body?: string } | string
  >;

  const slideText = (key: string) => {
    const s = parsed[key];
    if (!s || typeof s === "string") return "";
    return packEditorial(s.headline ?? "", s.body ?? "", "");
  };

  const raw: SlideFields = {
    hook: slideText("hook") || packEditorial(story.title, "", ""),
    slide_2: slideText("slide_2"),
    slide_3: slideText("slide_3"),
    slide_4: slideText("slide_4"),
    slide_5: slideText("slide_5"),
    slide_6: slideText("slide_6"),
    cta: packEditorial(template.ctaHeadline, template.ctaBody, ""),
    caption: typeof parsed.caption === "string" ? parsed.caption : story.title,
    hashtags:
      typeof parsed.hashtags === "string" ? parsed.hashtags : "#CollegeSoccer #Ryval #Recruiting",
    slide_image_prompts: ["", "", "", "", "", ""],
  };

  const cleaned = postProcessBrandPost(raw, template.roles.length + 1);
  const bodyKeys = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"] as const;

  const slides = bodyKeys.map((k) => cleaned[k]).filter(Boolean);
  const sourceText = `${facts}\nRyval App Store college soccer`;
  // Headlines are title case, so names there are unreadable; check their numbers only.
  const headlines = slides.map((s) => s.split("\n---\n")[0] ?? "").join("\n");
  const bodies = slides.map((s) => s.split("\n---\n").slice(1).join(" ")).join("\n");
  const unsupported = [
    ...unsupportedFacts(headlines, sourceText, { skipNames: true }),
    ...unsupportedFacts(bodies, sourceText),
  ];
  if (unsupported.length) {
    throw new Error(`Copy claimed facts the story does not support: ${[...new Set(unsupported)].join(", ")}`);
  }
  if (side) cleaned.hook = stampSportSide(cleaned.hook, side);

  // A story with nothing to say produces slides about having nothing to say.
  const meta = slides.join(" ").match(
    /\b(the (?:story|article) (?:does not|doesn't)|not (?:identified|specified|mentioned|reported)|no (?:standout|ranking movement|specific|further) \w+ (?:identified|reported|mentioned)|does not (?:mention|specify|identify)|unclear from the)\b/i,
  );
  if (meta) {
    throw new Error(`Story too thin to post: copy fell back to "${meta[0]}"`);
  }

  const bestUse: MediaBestUse =
    story.suggested_format === "player_spotlight"
      ? "player_spotlight"
      : story.suggested_format === "news_slide"
        ? "news"
        : "carousel";
  const { urls: backgrounds, assets } = await pickBackgrounds(story, 6, salt, bestUse, opts.db);
  const bgImages: string[] = [];
  const prompts = [...cleaned.slide_image_prompts];
  for (let i = 0; i < 6; i++) {
    if (!cleaned[bodyKeys[i]]) {
      bgImages[i] = "";
      continue;
    }
    bgImages[i] = backgrounds[i] ?? "";
    prompts[i] = editorialImagePrompt(
      "college soccer players on a grass pitch",
      editorialTitle(cleaned[bodyKeys[i]]) || story.title,
    );
  }
  cleaned.slide_image_prompts = prompts;
  const ctaBg = nextCtaBackground([]);
  bgImages[6] = ctaBg;
  if (opts.db && assets.length) await markAssetsUsed(opts.db, assets);

  // Real branding when we can verify it: the story's chosen logo, else the program it names.
  const showLogos = story.show_logos !== false;
  const brandSchool = headlineProgram(story.title, story.schools);
  const brand = opts.db
    ? ((await brandAssetById(opts.db, story.brand_asset_id).catch(() => null)) ??
      (brandSchool ? await findBrandAsset(opts.db, brandSchool).catch(() => null) : null))
    : null;

  const notes = [
    `lane:story`,
    `story:${story.id}`,
    ...brandNotes(brand, showLogos),
    `template:${template.id}`,
    `format:${story.suggested_format}`,
    `source:${story.source_name}`,
    `source_url:${story.story_url}`,
    template.showSourceLine ? `source_line:${sourceLine(story)}` : "",
    story.schools.length ? `story_schools:${story.schools.join("|")}` : "",
    assets.length ? `photo_credit:${assets.map((a) => a.credit || a.origin).join(" | ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    post: {
      ...cleaned,
      bg_images: bgImages,
      bg_image_url: bgImages.find(Boolean) ?? null,
      logo_url: RYVAL_MARK_SRC,
      app_screen_url: template.appScreen,
      cta_bg_url: ctaBg,
      category: story.category ?? "College soccer news",
      notes,
    },
    template,
    sourceLine: sourceLine(story),
  };
}
