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
  variantIndex: z.number().min(0).max(100000).optional(),
});

// Rotate persona + angle each call so a batch of count:1 generations doesn't repeat.
const PERSONAS = [
  {
    who: "high school player (boys)",
    pain: "no exposure, can't get coaches to watch film, lost in the recruiting noise",
  },
  {
    who: "high school player (girls)",
    pain: "fewer scouts, smaller showcase circuit, harder to get evaluated fairly",
  },
  {
    who: "JUCO / transfer player",
    pain: "tight timeline, limited contacts, fighting the 'late bloomer' label",
  },
  {
    who: "international player trying to reach US college soccer",
    pain: "no US film, no contacts, visa + NCAA eligibility maze",
  },
  {
    who: "college coach (D1/D2/NAIA)",
    pain: "drowning in unsolicited emails, can't separate real prospects from spam, recruiting budget is tiny",
  },
  {
    who: "club coach / DOC",
    pain: "players ask for help but no time to chase every college, hard to track outcomes",
  },
  {
    who: "soccer parent",
    pain: "spending thousands on showcases with zero clarity on what works, scared of scams",
  },
  {
    who: "former player turned trainer",
    pain: "great players being missed because no one is packaging their story",
  },
];
const ANGLES = [
  "expose a specific lie the recruiting industry sells",
  "break down what coaches actually look at in the first 10 seconds of film",
  "explain why showcase ROI is collapsing and what to do instead",
  "show the hidden math of recruiting (rosters, scholarships, walk-on rates)",
  "tell the truth about emailing coaches — what works, what gets ignored",
  "explain academic + position + grad-year filters and why most players misuse them",
  "call out parents who are wasting money on the wrong things",
  "give the real timeline of recruiting by grade",
  "compare what top recruits do vs what everyone else does",
  "explain why your highlight reel is probably hurting you",
];

const SYSTEM_BASE = `You are Ryval's faceless slideshow content generator.

Ryval is a soccer recruiting app that helps players get discovered by college coaches and helps coaches find players faster (clips, filters, academics, position, grad year, nationality, recruiting signals). BUT: the content you write is NOT a product ad. It is genuinely useful, value-first soccer-recruiting content that earns a follow. Ryval only shows up on the FINAL CTA slide.

WHO YOU SPEAK TO (rotates per post):
You will be given a specific persona to address (player / coach / parent / trainer / international, etc.). Speak directly to THAT persona. Name their real pain. Do not write generic "players struggle" content.

NARRATIVE STRUCTURE (mandatory, every post):
- Slide 1 (hook): Name a SPECIFIC problem THIS persona feels. Concrete, blunt, no generalities.
- Middle slides: Explain WHY it happens, what's broken about the system, what it costs them. Each slide escalates and reveals something they didn't know.
- Solution slides (the slides right before CTA): Give REAL, ACTIONABLE tips a smart person could act on tomorrow. Not vague ("be better"), not product plugs. Examples: "Lead your email with position, grad year, GPA, club, highlight link — in that order", "Coaches scrub past minute 1:30, put your best clip first", "Cold-email 20 schools that fit your level, not 200 dream schools".
- CTA slide (LAST ONLY): This is the only slide that mentions Ryval / the app. Tie it to the chosen CTA type (waitlist / coming soon / follow).
- ABSOLUTE RULE: Slides 1 through second-to-last must NOT mention Ryval, "the app", "our platform", "we built", or any product. They must read like a free, valuable lesson.

DIVERSITY RULE:
Each post must feel different from any other in the same batch — different persona, different angle, different opening line. Avoid repeating "Recruiting is rigged against you" or any single hook formulation.

WRITING RULES:
- Max 12 words per slide. Punchy, direct, premium. Each slide reads on its own.
- Tone: direct, human, confident, useful, slightly intense, premium, modern. Never cheesy, never corporate, never AI-slop.
- Do NOT promise scholarships, guarantee recruitment, fake coach quotes, use school/NCAA logos, or overhype.
- Captions: 1-3 short lines, value-led. Hashtags: 6-10, mix niche + broad, no spammy stacks.

IMAGE PROMPTS (CRITICAL — read carefully):
- For EACH slide produce a UNIQUE imagePrompt that VISUALLY MATCHES that specific slide's text. Never reuse the same scene across slides.
- Subjects MUST come from the real youth/college soccer + student-athlete + recruiting world. Pick from: empty college soccer stadium at dusk, sunlit college campus quad, locker room with cleats and kit bags, training ground with cones and balls, weight room / athletic gym, turf field under floodlights at night, scout in stands with clipboard, suburban backyard practice, school hallway with trophy case, dorm room with laptop showing highlight clips, bleachers with parents watching, muddy boots on grass, goalposts at sunrise, team bus, whiteboard with tactics, coach's office with paperwork, parent driving to a tournament at dawn, packed showcase sideline.
- Style options (pick whichever fits the slide's mood — vary across slides in the same post): cinematic photographic OR clean flat-vector cartoon illustration OR bold editorial illustration. All in a premium dark moody palette (deep navy, charcoal, electric accent), 9:16 vertical composition.
- NO text in image, NO logos, NO school crests, NO NCAA marks, NO close-up faces, NO generic abstract gradients, NO stock-business imagery.
- The image must clearly connect to what the slide's text is saying.`;

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
        imagePrompt: {
          type: "string",
          description: "Cinematic bg-image prompt that VISUALLY matches this slide's text",
        },
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
                  slide_6: slideObj(
                    "Optional extra solution slide — leave text empty if not needed",
                  ),
                  cta: { type: "string", description: "Final CTA slide text tied to the CTA type" },
                  caption: { type: "string" },
                  hashtags: { type: "string", description: "Space-separated #tags" },
                },
                required: [
                  "hook",
                  "slide_2",
                  "slide_3",
                  "slide_4",
                  "slide_5",
                  "slide_6",
                  "cta",
                  "caption",
                  "hashtags",
                ],
                additionalProperties: false,
              },
            },
          },
          required: ["posts"],
          additionalProperties: false,
        },
      },
    };

    const vi = data.variantIndex ?? Math.floor(Math.random() * 1000);
    const persona = PERSONAS[vi % PERSONAS.length];
    const angle = ANGLES[vi % ANGLES.length];

    const userPrompt = `${data.promptOverride ?? ""}
Generate ${data.count} faceless slideshow carousel post(s).

THIS POST'S PERSONA (speak directly to them): ${persona.who}
Their real pain: ${persona.pain}
THIS POST'S ANGLE: ${angle}

- Platform: ${data.platform}
- Account: ${data.account}
- Broader audience bucket: ${data.audience}
- Category: ${data.category}
- Tone: ${data.tone}
- CTA type: ${data.ctaType} (the final CTA slide must reflect this — e.g. "Join the waitlist", "Coming soon", "Follow for more"). The CTA is the ONLY slide that may mention Ryval.
- Slides per post: ${data.slidesPerPost} (hook + body slides + CTA). Use slide_6 only if slidesPerPost >= 7, otherwise return empty string for slide_6.text and imagePrompt.

Structure: problem (specific to this persona) → why it's broken → real actionable tips they can use tomorrow → CTA.
Slides 1 through second-to-last MUST be pure value — no app mention, no product plug.
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
    if (textRes.status === 402)
      throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
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
      hook: SlideObj;
      slide_2: SlideObj;
      slide_3: SlideObj;
      slide_4: SlideObj;
      slide_5: SlideObj;
      slide_6: SlideObj;
      cta: string;
      caption: string;
      hashtags: string;
    };
    const posts = args.posts as RawPost[];

    // Brand assets
    const [{ data: logoAssets }, { data: screenAssets }] = await Promise.all([
      supabase
        .from("assets")
        .select("file_url")
        .overlaps("tags", ["logo", "ryval logo"])
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("assets")
        .select("file_url")
        .overlaps("tags", [
          "main page",
          "quick scout",
          "ryval discovery",
          "player profile",
          "player feed",
          "player messages",
          "player opportunities",
          "player reels",
          "coach profile",
          "coach feed",
          "coach dashboard",
          "roster needs",
          "applicant screen",
        ])
        .limit(40),
    ]);

    const logoUrl = logoAssets?.[0]?.file_url ?? null;
    const screens = (screenAssets ?? []).map((s) => s.file_url);

    // Flatten to client-friendly shape; backgrounds generated per-slide on the client.
    const enriched = posts.map((p) => {
      const slidePrompts = [p.hook, p.slide_2, p.slide_3, p.slide_4, p.slide_5, p.slide_6].map(
        (s) => s?.imagePrompt ?? "",
      );
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
        app_screen_url:
          data.includeAppScreen && screens.length
            ? screens[Math.floor(Math.random() * screens.length)]
            : null,
      };
    });

    return { posts: enriched };
  });

// One short call per slide, fired sequentially from the client.
export const generateBackground = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        prompt: z.string().min(3).max(4000),
        model: z.enum(["nano", "nano-pro", "openai"]).optional(),
        stylePreset: z.enum(["ryval", "college", "college-composed", "raw"]).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const styleSuffix =
      data.stylePreset === "college-composed"
        ? "" // prompt already fully describes the composed slide
        : data.stylePreset === "college"
          ? `\n\nFormat: vertical 4:5 (1080x1350). Photoreal, cinematic, magazine-quality. Premium college athletics aesthetic — deep dramatic lighting, rich blacks, single accent of school blue. Strong subject, professional photographic depth of field. NO text, NO logos, NO school crests, NO trademarks, NO close-up identifiable faces.`
          : data.stylePreset === "raw"
            ? ""
            : `\n\nFormat: vertical 4:5 aspect ratio composition optimized for a 1080x1350 social post — subject placed safely in the central 80% so nothing critical gets cropped. Style: premium soccer / student-athlete world — real settings like college campuses, soccer fields, locker rooms, athletic gyms, training grounds, stadiums, dorm rooms, bleachers. Either cinematic photographic OR clean flat-vector cartoon illustration OR bold editorial illustration — pick whatever best fits the scene. Dark moody palette: deep navy, charcoal, with a single electric blue accent. Strong subject, clear focal point, rich depth, professional lighting. NO text, NO logos, NO school crests, NO NCAA marks, NO close-up faces, NO generic gradients, NO corporate stock imagery (no suits, no boardrooms, no handshakes).`;

    const fullPrompt = `${data.prompt}${styleSuffix}`;

    // ============= OpenAI gpt-image-1 path =============
    if (data.model === "openai") {
      const openaiKey = process.env.OPENAI_API_KEY;
      if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

      const r = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-image-1",
          prompt: fullPrompt,
          size: "1024x1536", // closest 2:3 to 1080x1350 (4:5) — we'll re-crop client-side if needed
          quality: "high",
          n: 1,
        }),
      });

      if (r.status === 429) throw new Error("OpenAI rate limit. Wait a moment.");
      if (!r.ok) {
        const t = await r.text();
        console.error("OpenAI image error", r.status, t);
        throw new Error(`OpenAI image error (${r.status}): ${t.slice(0, 200)}`);
      }
      const j = await r.json();
      const b64: string | undefined = j.data?.[0]?.b64_json;
      if (!b64) throw new Error("No image returned from OpenAI");
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const path = `${userId}/generated/${crypto.randomUUID()}.png`;
      const { error: upErr } = await supabase.storage
        .from("assets")
        .upload(path, bytes, { contentType: "image/png" });
      if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
      return { url: supabase.storage.from("assets").getPublicUrl(path).data.publicUrl };
    }

    // ============= Lovable AI Gateway (Nano Banana) path =============
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const model =
      data.model === "nano-pro"
        ? "google/gemini-3.1-flash-image-preview"
        : "google/gemini-2.5-flash-image";

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: fullPrompt }],
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
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${userId}/generated/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("assets")
      .upload(path, bytes, { contentType: mime });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
    return { url: supabase.storage.from("assets").getPublicUrl(path).data.publicUrl };
  });
