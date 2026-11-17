import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatCompletions } from "@/lib/ai-client";
import { nextCtaBackground, RYVAL_MARK_SRC } from "@/lib/brand";
import {
  editorialTitle,
  isUsefulSlide,
  packEditorial,
  postProcessBrandPost,
  stampSportSide,
  type SlideFields,
} from "@/lib/content-quality";
import { editorialImagePrompt } from "@/lib/editorial";
import { unsupportedFacts } from "@/lib/fact-check";
import { factPackPrompt, fetchSchoolFactPack } from "@/lib/school-facts";
import { distinctSchoolShots } from "@/lib/school-photos";
import { getSchool, schoolCount, schoolNotes, searchSchools } from "@/lib/schools";
import { pickStockPhoto } from "@/lib/stock-photos";
import { RYVAL_CTAS } from "@/lib/ryval-product";

export const searchCollegeSchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ q: z.string().max(80).optional() }).parse(input ?? {}))
  .handler(async ({ data }) => {
    return { schools: searchSchools(data.q ?? "", 12), total: schoolCount() };
  });

const SchoolInput = z.object({
  schoolId: z.string().min(1).max(120),
  sport: z.enum(["men", "women"]),
  slidesPerPost: z.number().min(5).max(7).default(6),
});

export async function generateSchoolSpotlightPost(data: {
  schoolId: string;
  sport: "men" | "women";
  slidesPerPost: number;
}) {
    const school = getSchool(data.schoolId);
    if (!school) throw new Error("School not in the Ryval catalog.");

    const pack = await fetchSchoolFactPack(school, data.sport);
    // No live record and no named leaders means the model would have to invent a season.
    if (!pack.live.record && !pack.live.players.length) {
      throw new Error(`No current NCAA stats for ${school.shortName}. Skipping this spotlight.`);
    }
    const campusShots = distinctSchoolShots(pack.photos).filter((shot) =>
      /\b(soccer|pitch|match|stadium|goal)\b/i.test(shot.label),
    );
    const photoGender = data.sport === "women" ? "women" : "men";
    const sportLabel = data.sport === "women" ? "women's soccer" : "men's soccer";

    const slideObj = (desc: string) => ({
      type: "object",
      properties: {
        headline: { type: "string", description: `${desc} 6 plain words max.` },
        body: {
          type: "string",
          description: "ONE sentence, 12 to 22 words. Teach a real fact and keep the real number.",
        },
        tip: { type: "string", description: "One practical tip, 18 words max. Empty on the cover." },
        imagePrompt: { type: "string" },
      },
      required: ["headline", "body", "tip", "imagePrompt"],
      additionalProperties: false,
    });

    const tool = {
      type: "function",
      function: {
        name: "create_posts",
        description: "Return one school-specific educational carousel.",
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
                  hook: slideObj("COVER: 4 to 6 plain words naming this school, written so someone swipes. Put the record in the body."),
                  slide_2: slideObj("REASON 1: a real number or rule from the fact pack."),
                  slide_3: slideObj("REASON 2: what recruits still get wrong about this program."),
                  slide_4: slideObj("REASON 3: a real next step (film, position, academics)."),
                  slide_5: slideObj("REASON 4: another sourced fact."),
                  cta: slideObj("LAST: Ryval's fix for finding this exact type of program."),
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

    const system = `You write Ryval 4:5 educational carousels about ONE college soccer program. Parents and players should want to save and share the slides.

RULES:
- CURRENT NCAA STATS are the source of truth for this season. Teach the live W-L and named hot players first.
- Wikipedia is history only. If it conflicts with CURRENT NCAA STATS, ignore Wikipedia's record.
- Every number must appear in the fact pack. Never invent wins, goals, or ranks.
- Name the school in the cover. Say women's or men's in the cover. Never write a gender-neutral "soccer" headline.
- If hot players are listed, dedicate at least one slide to a named player and their real stats.
- If HOME FIELD is listed, name that field in one sentence. The photo is still a soccer match or pitch, never a chapel, statue, or campus building.
- Mention the head coach in a sentence on the record slide. Do not write a biography slide that needs a headshot.
- Do not pivot to MLS SuperDraft unless the pack is about that.
- Blunt, specific, locker-room. No waitlist ads. No fake scout stories.
- Cover headline: 4 to 6 plain words that make someone swipe. Not "School is 8-0-1" and not "School Dominates the Rankings".
- Cover body: ONE sentence under 18 words that states the record and points to the next slide.
- Other headlines: 6 plain words. Body: ONE sentence, 12 to 22 words.
- Last slide: Ryval, where coaches post roster spots and players apply with film.`;

    const user = `Write 1 carousel (${data.slidesPerPost} slides including CTA) for ${school.name} ${sportLabel}.

FACT PACK (only source of truth):
${factPackPrompt(pack)}

Cover must name ${school.shortName}. Use the real association (${school.association}${school.division ? ` ${school.division}` : ""}).
Hashtags should include the school and #CollegeSoccer #Ryval.
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
    if (!call) throw new Error("No school copy returned");
    const parsed = JSON.parse(call.function.arguments) as {
      posts: Array<{
        hook?: { headline?: string; body?: string; tip?: string; imagePrompt?: string; text?: string };
        slide_2?: { headline?: string; body?: string; tip?: string; imagePrompt?: string; text?: string };
        slide_3?: { headline?: string; body?: string; tip?: string; imagePrompt?: string; text?: string };
        slide_4?: { headline?: string; body?: string; tip?: string; imagePrompt?: string; text?: string };
        slide_5?: { headline?: string; body?: string; tip?: string; imagePrompt?: string; text?: string };
        cta?: { headline?: string; body?: string; tip?: string; imagePrompt?: string; text?: string };
        caption?: string;
        hashtags?: string;
      }>;
    };
    const rawPost = parsed.posts?.[0];
    if (!rawPost) throw new Error("Empty school copy");

    const packSlide = (s?: { headline?: string; body?: string; tip?: string; text?: string }) => {
      if (!s) return "";
      return packEditorial(s.headline ?? s.text ?? "", s.body ?? "", s.tip ?? "");
    };

    const liveRecord = pack.live.record?.record;
    const unbeaten = Boolean(liveRecord && /^\d+\s*[-–—]\s*0\s*[-–—]/.test(liveRecord));
    const fallbackCover = packEditorial(
      liveRecord
        ? unbeaten
          ? `${school.shortName} still hasn't lost`
          : `${school.shortName} this season`
        : school.shortName,
      liveRecord
        ? `${school.name} ${sportLabel} is ${liveRecord} this season through NCAA.com stats. ${pack.live.players[0] ? `${pack.live.players[0].name} is one reason.` : "The live table — not last year's Wikipedia page."}`
        : pack.staticFacts.slice(0, 2).join(" "),
      "",
    );

    const raw: SlideFields = {
      hook: packSlide(rawPost.hook) || fallbackCover,
      slide_2: packSlide(rawPost.slide_2),
      slide_3: packSlide(rawPost.slide_3),
      slide_4: packSlide(rawPost.slide_4),
      slide_5: packSlide(rawPost.slide_5),
      slide_6: "",
      cta: packSlide(rawPost.cta),
      caption: rawPost.caption ?? `${school.name} ${sportLabel} — sourced facts, not vibes.`,
      hashtags: rawPost.hashtags ?? `#${school.id.replace(/-/g, "")} #CollegeSoccer #Ryval`,
      slide_image_prompts: [
        rawPost.hook?.imagePrompt ?? "",
        rawPost.slide_2?.imagePrompt ?? "",
        rawPost.slide_3?.imagePrompt ?? "",
        rawPost.slide_4?.imagePrompt ?? "",
        rawPost.slide_5?.imagePrompt ?? "",
        "",
      ],
    };
    const cleaned = postProcessBrandPost(raw, data.slidesPerPost);
    const unsupported = unsupportedFacts(
      [cleaned.hook, cleaned.slide_2, cleaned.slide_3, cleaned.slide_4, cleaned.slide_5]
        .filter(Boolean)
        .join("\n"),
      `${factPackPrompt(pack)}\n${school.name} ${school.shortName} ${sportLabel}`,
    );
    if (unsupported.length) {
      throw new Error(`${school.shortName} copy claimed unverified facts: ${unsupported.join(", ")}`);
    }
    const bodyKeys = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"] as const;
    const prompts = [...cleaned.slide_image_prompts];
    const who =
      photoGender === "women"
        ? "women's soccer players on a grass pitch, female athletes only"
        : "men's soccer players on a grass pitch, male athletes only";
    for (let i = 0; i < bodyKeys.length; i++) {
      const key = bodyKeys[i];
      if (!cleaned[key]) continue;
      if (!isUsefulSlide(cleaned[key]) && i === 0) cleaned[key] = fallbackCover;
      prompts[i] = editorialImagePrompt(who, editorialTitle(cleaned[key]) || school.name);
    }
    cleaned.hook = stampSportSide(cleaned.hook, data.sport);
    cleaned.cta = packEditorial(RYVAL_CTAS.get_seen.headline, RYVAL_CTAS.get_seen.body, "");
    cleaned.slide_image_prompts = prompts;

    const bgImages: string[] = [];
    const used = new Set<string>();
    const pool = [...campusShots];
    for (let i = 0; i < 6; i++) {
      if (!cleaned[bodyKeys[i]]) {
        bgImages[i] = "";
        continue;
      }
      const shot = pool.find((s) => !used.has(s.url));
      if (shot) {
        used.add(shot.url);
        bgImages[i] = shot.url;
        continue;
      }
      const picked = pickStockPhoto(
        editorialTitle(cleaned[bodyKeys[i]]) || school.name,
        i + 3,
        [...used],
        photoGender,
        [...used],
      );
      used.add(picked.photoId);
      bgImages[i] = picked.url;
    }
    const ctaBg = nextCtaBackground([]);
    bgImages[6] = ctaBg;

    return {
      posts: [
        {
          ...cleaned,
          bg_images: bgImages,
          bg_image_url: bgImages.find(Boolean) ?? null,
          logo_url: RYVAL_MARK_SRC,
          school_logo_url: school.logoUrl,
          app_screen_url: "/app-screens/university.jpg",
          photo_gender: photoGender,
          cta_bg_url: ctaBg,
          fact_lane: `${school.name} ${sportLabel}`,
          notes: schoolNotes(school, data.sport),
          school,
          fact_source: pack.live.source || pack.wikiUrl || pack.school.athleticsUrl || null,
        },
      ],
    };
}

export const generateSchoolSpotlight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => SchoolInput.parse(input))
  .handler(async ({ data }) => generateSchoolSpotlightPost(data));
