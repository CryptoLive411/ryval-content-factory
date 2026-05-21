import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
});

const SYSTEM_BASE = `You are Ryval's faceless slideshow content generator.

Ryval is a soccer recruiting app that helps players get discovered by college coaches and helps coaches find players faster (clips, filters, academics, position, grad year, nationality, recruiting signals).

NARRATIVE STRUCTURE (mandatory):
- Slide 1 (hook): Name the PROBLEM bluntly. E.g. "Recruiting is rigged against you."
- Middle slides: Twist the knife — show WHY it's broken, what people get wrong, what it costs them. Each slide must escalate.
- Second-to-last slide: Pivot to the SOLUTION / what to do instead. Talk about the solution generically — DO NOT name Ryval yet.
- CTA slide: This is the ONLY slide where Ryval is named/plugged. Hard call to action tied to the chosen CTA type (waitlist / coming soon / follow).
- DO NOT mention "Ryval", "the app", "our platform", or any product plug in slides 1 through second-to-last. Those slides must read as pure problem + real-world advice.
- Every post must move from PROBLEM → ESCALATION → SOLUTION → CTA. No random tip lists.

WRITING RULES:
- Max 12 words per slide. Punchy, direct, premium. Each slide reads on its own.
- Tone: direct, human, confident, useful, slightly intense, premium, modern. Never cheesy, never corporate, never AI-slop.
- Do NOT promise scholarships, guarantee recruitment, fake coach quotes, use school/NCAA logos, or overhype.
- Captions: 1-3 short lines. Hashtags: 6-10, mix niche + broad, no spammy stacks.

IMAGE PROMPTS (CRITICAL — read carefully):
- For EACH slide produce a UNIQUE imagePrompt that VISUALLY MATCHES that specific slide's text. Never reuse the same scene across slides.
- Subjects MUST come from the real youth/college soccer + student-athlete world. Pick from: empty college soccer stadium at dusk, sunlit college campus quad, locker room with cleats and kit bags, training ground with cones and balls, weight room / athletic gym, turf field under floodlights at night, scout in stands with clipboard, suburban backyard practice, school hallway with trophy case, dorm room with laptop showing highlight clips, bleachers with parents watching, muddy boots on grass, goalposts at sunrise, team bus, whiteboard with tactics, coach's office with paperwork.
- Style options (pick whichever fits the slide's mood — vary across slides in the same post): cinematic photographic OR clean flat-vector cartoon illustration OR bold editorial illustration. All in Ryval's premium dark moody palette (deep navy, charcoal, electric accent), 9:16 vertical composition.
- NO text in image, NO logos, NO school crests, NO NCAA marks, NO close-up faces, NO generic abstract gradients, NO stock-business imagery (no laptops in offices, no handshakes, no suits).
- The image must clearly connect to what the slide's text is saying — if the slide says "scouts ignore you", show empty bleachers or a lone scout walking away. If it says "grind in silence", show a player training alone at night.`;


export const generatePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const { supabase } = context;

    const slideObj = (desc: string) => ({
      type: "object",
      properties: {
        text: { type: "string", description: desc },
        imagePrompt: { type: "string", description: "Cinematic bg-image prompt that VISUALLY matches this slide's text" },
      },
      required: ["text", "imagePrompt"],
      additionalProperties: false,
    });

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
                  hook: slideObj("Slide 1 — name the PROBLEM bluntly, max 12 words"),
                  slide_2: slideObj("Escalate the problem"),
                  slide_3: slideObj("Twist the knife / show the cost"),
                  slide_4: slideObj("Pivot toward the solution"),
                  slide_5: slideObj("Solution: what to do instead"),
                  slide_6: slideObj("Optional extra solution slide — leave text empty if not needed"),
                  cta: { type: "string", description: "Final CTA slide text tied to the CTA type" },
                  caption: { type: "string" },
                  hashtags: { type: "string", description: "Space-separated #tags" },
                },
                required: ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6", "cta", "caption", "hashtags"],
                additionalProperties: false,
              },
            },
          },
          required: ["posts"],
          additionalProperties: false,
        },
      },
    };

    const userPrompt = `${data.promptOverride ?? ""}
Generate ${data.count} faceless slideshow carousel post(s).
- Platform: ${data.platform}
- Account: ${data.account}
- Audience: ${data.audience}
- Category: ${data.category}
- Tone: ${data.tone}
- CTA type: ${data.ctaType} (the final CTA slide must reflect this — e.g. "Join the waitlist", "Coming soon", "Follow for more")
- Slides per post: ${data.slidesPerPost} (hook + body slides + CTA). Use slide_6 only if slidesPerPost >= 7, otherwise return empty string for slide_6.text and imagePrompt.

Every post MUST follow: problem → escalation → solution → CTA.
Every slide MUST have its own imagePrompt that visually matches its text.

Return strictly via the create_posts tool.`;

    const textRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_BASE },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "create_posts" } },
      }),
    });

    if (textRes.status === 429) throw new Error("Rate limit reached. Wait a moment and try again.");
    if (textRes.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    if (!textRes.ok) {
      console.error("AI gateway text error", textRes.status, await textRes.text());
      throw new Error(`AI gateway error (${textRes.status})`);
    }

    const textJson = await textRes.json();
    const call = textJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No tool call returned from model");
    const args = JSON.parse(call.function.arguments);
    type SlideObj = { text: string; imagePrompt: string };
    type RawPost = {
      hook: SlideObj; slide_2: SlideObj; slide_3: SlideObj;
      slide_4: SlideObj; slide_5: SlideObj; slide_6: SlideObj;
      cta: string; caption: string; hashtags: string;
    };
    const posts = args.posts as RawPost[];

    // Brand assets
    const [{ data: logoAssets }, { data: screenAssets }] = await Promise.all([
      supabase.from("assets").select("file_url").overlaps("tags", ["logo", "ryval logo"]).order("created_at", { ascending: false }).limit(1),
      supabase.from("assets").select("file_url").overlaps("tags", [
        "main page","quick scout","ryval discovery",
        "player profile","player feed","player messages","player opportunities","player reels",
        "coach profile","coach feed","coach dashboard","roster needs","applicant screen",
      ]).limit(40),
    ]);

    const logoUrl = logoAssets?.[0]?.file_url ?? null;
    const screens = (screenAssets ?? []).map(s => s.file_url);

    // Flatten to client-friendly shape; backgrounds generated per-slide on the client.
    const enriched = posts.map((p) => {
      const slidePrompts = [p.hook, p.slide_2, p.slide_3, p.slide_4, p.slide_5, p.slide_6]
        .map(s => s?.imagePrompt ?? "");
      return {
        hook: p.hook?.text ?? "",
        slide_2: p.slide_2?.text ?? "",
        slide_3: p.slide_3?.text ?? "",
        slide_4: p.slide_4?.text ?? "",
        slide_5: p.slide_5?.text ?? "",
        slide_6: p.slide_6?.text ?? "",
        cta: p.cta ?? "",
        caption: p.caption ?? "",
        hashtags: p.hashtags ?? "",
        slide_image_prompts: slidePrompts,
        bg_images: [] as string[],
        bg_image_url: null as string | null,
        logo_url: logoUrl,
        app_screen_url: data.includeAppScreen && screens.length
          ? screens[Math.floor(Math.random() * screens.length)]
          : null,
      };
    });

    return { posts: enriched };
  });

// One short call per slide, fired in parallel from the client.
export const generateBackground = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ prompt: z.string().min(3).max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const { supabase, userId } = context;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: `${data.prompt}\n\nStyle: premium soccer / student-athlete world — real settings like college campuses, soccer fields, locker rooms, athletic gyms, training grounds, stadiums, dorm rooms, bleachers. Either cinematic photographic OR clean flat-vector cartoon illustration OR bold editorial illustration — pick whatever best fits the scene. Dark moody palette: deep navy, charcoal, with a single electric accent. Vertical 9:16 composition. Strong subject, clear focal point. NO text, NO logos, NO school crests, NO NCAA marks, NO close-up faces, NO generic gradients, NO corporate stock imagery (no suits, no boardrooms, no handshakes).` }],
        modalities: ["image", "text"],
      }),
    });
    if (r.status === 429) throw new Error("Rate limit on image gateway. Wait a moment.");
    if (r.status === 402) throw new Error("AI credits exhausted.");
    if (!r.ok) throw new Error(`Image gateway error (${r.status})`);

    const j = await r.json();
    const dataUrl: string | undefined = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl?.startsWith("data:image/")) throw new Error("No image returned");

    const [meta, b64] = dataUrl.split(",");
    const mime = meta.slice(5, meta.indexOf(";"));
    const ext = mime.split("/")[1] ?? "png";
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const path = `${userId}/generated/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("assets").upload(path, bytes, { contentType: mime });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    return { url: supabase.storage.from("assets").getPublicUrl(path).data.publicUrl };
  });
