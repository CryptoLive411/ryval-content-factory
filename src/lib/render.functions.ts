import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { renderStoredPost } from "@/lib/autopilot-worker";

/**
 * The only slide renderer. The dashboard preview, the export button and the
 * autopilot all come through here, so what you see is what gets posted.
 */
export const renderPostSlides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        // Unsaved dialog edits, so the preview reflects what is on screen.
        draft: z
          .object({
            hook: z.string().optional(),
            slide_2: z.string().optional(),
            slide_3: z.string().optional(),
            slide_4: z.string().optional(),
            slide_5: z.string().optional(),
            slide_6: z.string().optional(),
            cta: z.string().optional(),
            bg_images: z.array(z.string()).optional(),
            app_screen_url: z.string().optional(),
          })
          .partial()
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await supabaseAdmin
      .from("posts")
      .select("*")
      .eq("id", data.postId)
      // Scoped to the signed-in owner so a post id alone cannot render someone else's work.
      .eq("user_id", context.userId)
      .single();
    if (error || !row) throw new Error(error?.message ?? "Post not found");

    const draft = Object.fromEntries(
      Object.entries(data.draft ?? {}).filter(([, v]) => v !== undefined),
    );
    const urls = await renderStoredPost({ ...row, ...draft });
    return { urls };
  });
