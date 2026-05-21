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

Rules:
- Max 12 words per slide. Punchy, direct, premium.
- Tone: direct, human, confident, useful, slightly intense, premium, modern. Never cheesy, never corporate, never AI-slop.
- Do NOT promise scholarships, guarantee recruitment, fake coach quotes, use school/NCAA logos, or overhype Ryval.
- Useful first, then soft Ryval pitch.
- Captions: 1-3 short lines. Hashtags: 6-10, mix niche + broad, no spammy stacks.
- The final CTA slide should be a clean, branded call to action tied to the chosen CTA type.
- imagePrompt: one cinematic background-image prompt for the whole post. Dark, premium, soccer-themed (stadium lights, grass texture, ball motion-blur, locker room, training cones, dramatic shadows). NO text, NO logos, NO faces close-up, NO school crests. Moody, editorial, 9:16-friendly composition.`;

export const generatePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data, context }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const { supabase, userId } = context;

    // 1. Generate text content
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
                  hook: { type: "string", description: "Slide 1, max 12 words" },
                  slide_2: { type: "string" },
                  slide_3: { type: "string" },
                  slide_4: { type: "string" },
                  slide_5: { type: "string" },
                  slide_6: { type: "string", description: "Optional, may be empty" },
                  cta: { type: "string", description: "Final CTA slide text" },
                  caption: { type: "string" },
                  hashtags: { type: "string", description: "Space-separated #tags" },
                  imagePrompt: { type: "string", description: "Cinematic bg-image prompt for the whole post" },
                },
                required: ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "cta", "caption", "hashtags", "imagePrompt"],
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
- CTA type: ${data.ctaType}
- Slides per post: ${data.slidesPerPost} (hook + ${data.slidesPerPost - 2} body slides + CTA slide)

Return strictly via the create_posts tool.`;

    const textRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
    const posts = args.posts as Array<Record<string, string>>;

    // 2. Look up brand assets (logo + app screenshot pool)
    const [{ data: logoAssets }, { data: screenAssets }] = await Promise.all([
      supabase.from("assets").select("file_url").contains("tags", ["logo"]).order("created_at", { ascending: false }).limit(1),
      supabase.from("assets").select("file_url").overlaps("tags", ["player profile", "feed", "coach dashboard", "discover", "opportunities", "reels", "app store"]).limit(20),
    ]);
    const logoUrl = logoAssets?.[0]?.file_url ?? null;
    const screens = (screenAssets ?? []).map(s => s.file_url);

    // 3. Generate background image per post (parallel, capped concurrency)
    const generateBg = async (prompt: string): Promise<string | null> => {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: `${prompt}. Vertical 9:16 composition. Cinematic, moody, premium editorial. NO text. NO logos. NO school crests.` }],
            modalities: ["image", "text"],
          }),
        });
        if (!r.ok) { console.error("img gen failed", r.status); return null; }
        const j = await r.json();
        const dataUrl: string | undefined = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        if (!dataUrl?.startsWith("data:image/")) return null;
        const [meta, b64] = dataUrl.split(",");
        const mime = meta.slice(5, meta.indexOf(";"));
        const ext = mime.split("/")[1] ?? "png";
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const path = `${userId}/generated/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("assets").upload(path, bytes, { contentType: mime });
        if (upErr) { console.error("upload failed", upErr); return null; }
        return supabase.storage.from("assets").getPublicUrl(path).data.publicUrl;
      } catch (e) { console.error("bg gen error", e); return null; }
    };

    // Concurrency-cap of 4 to be friendly to the gateway
    const bgUrls: (string | null)[] = new Array(posts.length).fill(null);
    const queue = posts.map((p, i) => ({ i, prompt: p.imagePrompt }));
    const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length) {
        const item = queue.shift()!;
        bgUrls[item.i] = await generateBg(item.prompt);
      }
    });
    await Promise.all(workers);

    const enriched = posts.map((p, i) => ({
      ...p,
      bg_image_url: bgUrls[i],
      logo_url: logoUrl,
      app_screen_url: data.includeAppScreen && screens.length
        ? screens[Math.floor(Math.random() * screens.length)]
        : null,
    }));

    return { posts: enriched };
  });
