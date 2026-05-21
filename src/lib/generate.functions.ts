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
- The final CTA slide should be a clean, branded call to action tied to the chosen CTA type.`;

export const generatePosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `${data.promptOverride ?? SYSTEM_BASE}

Generate ${data.count} faceless slideshow carousel post(s).
- Platform: ${data.platform}
- Account: ${data.account}
- Audience: ${data.audience}
- Category: ${data.category}
- Tone: ${data.tone}
- CTA type: ${data.ctaType}
- Slides per post: ${data.slidesPerPost} (hook + ${data.slidesPerPost - 2} body slides + CTA slide)
- Include app-screen reference on CTA slide: ${data.includeAppScreen ? "yes" : "no"}

Return strictly via the create_posts tool.`;

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

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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

    if (res.status === 429) throw new Error("Rate limit reached. Wait a moment and try again.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error", res.status, t);
      throw new Error(`AI gateway error (${res.status})`);
    }

    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("No tool call returned from model");
    const args = JSON.parse(call.function.arguments);
    return { posts: args.posts as Array<Record<string, string>> };
  });
