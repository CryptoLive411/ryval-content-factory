import { spawn } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RYVAL_CTAS } from "@/lib/ryval-product";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fillAutopilotQueue, POSTS_PER_INTERVAL, rebuildQueuedMedia } from "@/lib/autopilot-queue";
import { generateEditorialPosts } from "@/lib/generate.functions";
import { generateSchoolSpotlightPost } from "@/lib/school.functions";
import { generateSeasonBoardPost } from "@/lib/season.functions";
import { listPublerTikTokAccounts } from "@/lib/publer";
import { PREFERRED_PRIVACY } from "@/lib/tiktok-privacy";
import { TIKTOK_PUBLISH_ACCOUNTS } from "@/lib/tiktok-accounts";
import { uploadExportSlides } from "@/lib/tiktok-export";

function runRender(post: Record<string, unknown>): Promise<Blob[]> {
  return (async () => {
    const dir = await mkdtemp(join(tmpdir(), "ryval-slides-"));
    const jsonPath = join(dir, "post.json");
    await writeFile(jsonPath, JSON.stringify(post));
    const outDir = join(dir, "out");
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ["scripts/render-slides.mjs", jsonPath, outDir], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      });
      let err = "";
      child.stderr.on("data", (chunk) => {
        err += String(chunk);
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(err.trim() || `render-slides exited ${code}`));
      });
    });
    const names = (await readdir(outDir)).filter((n) => n.endsWith(".jpg")).sort();
    const blobs: Blob[] = [];
    for (const name of names) {
      const bytes = await readFile(join(outDir, name));
      blobs.push(new Blob([new Uint8Array(bytes)], { type: "image/jpeg" }));
    }
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    if (!blobs.length) throw new Error("Slide renderer produced no JPEGs");
    return blobs;
  })();
}

async function enableAutopilotForConnectedUsers() {
  const { data: accounts } = await supabaseAdmin.from("tiktok_accounts").select("user_id");
  const userIds = [...new Set((accounts ?? []).map((row) => row.user_id).filter(Boolean))];
  for (const userId of userIds) {
    const { data: existing } = await supabaseAdmin
      .from("user_settings")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) continue;
    await supabaseAdmin.from("user_settings").insert({
      user_id: userId,
      autopilot_enabled: true,
      autopilot_interval_hours: 1,
      autopilot_queue_hours: 12,
      preferred_privacy: PREFERRED_PRIVACY,
      updated_at: new Date().toISOString(),
    });
  }
  return userIds;
}

/** Rebuild the JPEGs for one post so the last slide has the phone and App Store CTA. */
export async function renderStoredPost(post: Record<string, unknown>): Promise<string[]> {
  const notes = String(post.notes ?? "");
  const schoolPost = /lane:school-spotlight/.test(notes);
  const bgs = Array.isArray(post.bg_images) ? [...(post.bg_images as string[])] : [];
  if (!bgs[6]) bgs[6] = "/cta-bg/stadium-night.jpg";
  // A slide with no photo cannot render, so drop it rather than fail the whole carousel.
  const bodyKeys = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"];
  const dropped: Record<string, string> = {};
  for (let i = 0; i < 6; i++) {
    const key = bodyKeys[i]!;
    if (String(post[key] ?? "").trim() && !String(bgs[i] ?? "").trim()) dropped[key] = "";
  }
  const full: Record<string, unknown> = {
    ...post,
    ...dropped,
    bg_images: bgs,
    cta:
      String(post.cta ?? "").trim() ||
      `${RYVAL_CTAS.get_seen.headline}\n---\n${RYVAL_CTAS.get_seen.body}\n---\nDownload Ryval on the App Store.`,
    app_screen_url:
      post.app_screen_url || (schoolPost ? "/app-screens/university.jpg" : "/app-screens/discover.jpg"),
    logo_url: post.logo_url || "/ryval-mark.png",
  };
  const blobs = await runRender(full);
  const urls = await uploadExportSlides({
    supabase: supabaseAdmin,
    userId: String(post.user_id),
    postId: String(post.id),
    blobs,
  });
  const stamped = notes.includes("cta:phone") ? notes : `${notes}${notes ? "\n" : ""}cta:phone`;
  await supabaseAdmin
    .from("posts")
    .update({
      export_slide_urls: urls,
      cta: String(full.cta),
      app_screen_url: String(full.app_screen_url),
      bg_images: bgs,
      logo_url: String(full.logo_url),
      notes: stamped,
      ...dropped,
    })
    .eq("id", post.id as string);
  return urls;
}

/** Re-render the oldest due carousel so its last slide is the phone CTA before it can post. */
export async function renderNextDueCarousel() {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_date", now)
    .is("tiktok_publish_id", null)
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  if (String(data.notes ?? "").includes("cta:phone")) return data.id as string;
  try {
    await renderStoredPost(data as Record<string, unknown>);
  } catch (e) {
    // Park it as a draft. One unrenderable carousel must not block the whole queue.
    const why = e instanceof Error ? e.message : "render failed";
    console.error(`parking post ${data.id}: ${why}`);
    await supabaseAdmin
      .from("posts")
      .update({ status: "needs_edit", tiktok_error: `Not rendered: ${why}`.slice(0, 280) })
      .eq("id", data.id as string);
    return null;
  }
  return data.id as string;
}

async function parkStalePublishLocks() {
  const { data, error } = await supabaseAdmin
    .from("posts")
    .update({ status: "needs_edit" })
    .eq("status", "scheduled")
    .like("tiktok_publish_id", "lock:%")
    .select("id");
  if (error) console.error("stale lock park failed", error.message);
  else if (data?.length) console.log(`parked ${data.length} stale publish lock(s)`);
}

async function connectedTikToks() {
  try {
    const live = await listPublerTikTokAccounts();
    if (live.length) return live.map((row) => ({ id: row.id, name: row.name || row.id }));
  } catch (e) {
    console.error("tiktok account list failed", e instanceof Error ? e.message : e);
  }
  return [...TIKTOK_PUBLISH_ACCOUNTS];
}

export async function runAutopilotFill(opts: { maxPosts?: number } = {}) {
  await parkStalePublishLocks();
  const accounts = await connectedTikToks();
  const userIds = await enableAutopilotForConnectedUsers();
  let created = 0;
  for (const userId of userIds) {
    const { data: settings } = await supabaseAdmin
      .from("user_settings")
      .select("autopilot_enabled, autopilot_interval_hours, autopilot_queue_hours, preferred_privacy")
      .eq("user_id", userId)
      .maybeSingle();
    if (settings && settings.autopilot_enabled === false) continue;
    try {
      const rebuilt = await rebuildQueuedMedia({
        userId,
        db: supabaseAdmin,
        renderSlides: runRender,
        limit: 3,
      });
      if (rebuilt.rebuilt) {
        console.log(`[autopilot ${userId.slice(0, 8)}] rebuilt ${rebuilt.rebuilt} queued slide set(s)`);
      }
    } catch (e) {
      console.error("queued media rebuild failed", e);
    }
    const fill = await fillAutopilotQueue({
      userId,
      generate: ({ data }) => generateEditorialPosts({ supabase: supabaseAdmin, userId, data }),
      generateSchool: ({ data }) => generateSchoolSpotlightPost(data),
      generateSeason: ({ data }) => generateSeasonBoardPost(data),
      genBg: async () => ({ url: "", photoId: "" }),
      intervalHours: Math.max(1, settings?.autopilot_interval_hours || 1),
      queueHours: Math.max(24, settings?.autopilot_queue_hours || 24),
      privacy: settings?.preferred_privacy || PREFERRED_PRIVACY,
      postsPerInterval: POSTS_PER_INTERVAL,
      maxPosts: opts.maxPosts ?? 2,
      accounts,
      db: supabaseAdmin,
      renderSlides: runRender,
      onProgress: (msg) => console.log(`[autopilot ${userId.slice(0, 8)}] ${msg}`),
    });
    created += fill.created;
  }
  return { created, users: userIds.length };
}
