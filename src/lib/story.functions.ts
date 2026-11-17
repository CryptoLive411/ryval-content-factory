import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ingestStories } from "@/lib/story-ingest";
import { generatePostFromStory, type StoryRow } from "@/lib/story-post";

export const refreshStorySources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ force: z.boolean().default(false) }).parse(input ?? {}))
  .handler(async ({ data }) => {
    const result = await ingestStories({ db: supabaseAdmin, force: data.force });
    return result;
  });

export const setStoryStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        storyId: z.string().uuid(),
        status: z.enum(["new", "approved", "rejected", "used"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("stories")
      .update({ status: data.status })
      .eq("id", data.storyId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Turn one reviewed story into a draft carousel that keeps its source attached. */
export const draftPostFromStory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        storyId: z.string().uuid(),
        format: z
          .enum([
            "news_slide",
            "carousel",
            "player_spotlight",
            "program_spotlight",
            "recruiting_tip",
            "rules_update",
            "stats_post",
          ])
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: story, error } = await supabaseAdmin
      .from("stories")
      .select("*")
      .eq("id", data.storyId)
      .single();
    if (error || !story) throw new Error(error?.message ?? "Story not found");

    const row = {
      ...(story as unknown as StoryRow),
      suggested_format: data.format ?? (story as unknown as StoryRow).suggested_format,
    };
    const { post, template } = await generatePostFromStory(row, {
      salt: Math.floor(Math.random() * 40),
    });

    const insert = {
      user_id: userId,
      hook: post.hook,
      slide_2: post.slide_2,
      slide_3: post.slide_3,
      slide_4: post.slide_4,
      slide_5: post.slide_5,
      slide_6: post.slide_6,
      cta: post.cta,
      caption: post.caption,
      hashtags: post.hashtags,
      platform: "tiktok" as const,
      // Drafted, not scheduled: a story post waits for a human before it can publish.
      status: "drafted" as const,
      cta_type: "download app",
      notes: post.notes,
      bg_images: post.bg_images,
      bg_image_url: post.bg_image_url,
      app_screen_url: post.app_screen_url,
      logo_url: post.logo_url,
    };
    const { data: saved, error: insertError } = await supabaseAdmin
      .from("posts")
      .insert(insert)
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin
      .from("stories")
      .update({ status: "used", post_id: saved.id })
      .eq("id", data.storyId);

    return { postId: saved.id as string, template: template.label };
  });
