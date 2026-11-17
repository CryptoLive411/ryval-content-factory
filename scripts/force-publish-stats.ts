/**
 * Force one college stats post onto one TikTok account now, outside the hourly clock.
 * Built with the code in this checkout, published through the same Publer path as autopilot.
 *
 * Two steps, so a person looks at the slides before anything goes out:
 *
 *   bun scripts/force-publish-stats.ts prepare <publer account id> <men|women> <families> [match] [seed]
 *     Builds the post, saves it with status "approved" (the cron only touches "scheduled"),
 *     renders and uploads the slides, and copies the JPEGs to tmp/forced/<post id>/.
 *
 *   bun scripts/force-publish-stats.ts publish <post id>
 *     Sends that post to its one account and waits for Publer to confirm it is live.
 *
 * Needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLER_API_KEY and PUBLER_WORKSPACE_ID in .env.
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { previewCollegeStats, statSpecNote } from "@/lib/college-stats";
import { editorialTitle } from "@/lib/content-quality";
import { DESK_BY_ACCOUNT } from "@/lib/recruiting-stories";
import { collectStockPhotoIds, pickVariedSlidePhotos } from "@/lib/stock-photos";
import { uploadExportSlides } from "@/lib/tiktok-export";
import { publishPhotoCarouselToAllAccounts } from "@/lib/tiktok.functions";

type Family =
  | "leaders"
  | "freshmen"
  | "totw"
  | "performers"
  | "scores"
  | "ncaa"
  | "teams"
  | "streaks"
  | "poll";

const pack = (headline: string, body: string) => `${headline}\n---\n${body}`;

async function prepare(
  account: string,
  side: "men" | "women",
  families: Family[],
  match?: string,
  seed = 0,
) {
  if (!DESK_BY_ACCOUNT[account]) throw new Error(`Unknown Publer account ${account}`);
  const [story] = await previewCollegeStats(side, { limit: 1, seed, families, match });
  if (!story) throw new Error("No stats post can be built for that choice right now");

  const { data: recent, error } = await supabaseAdmin
    .from("posts")
    .select("user_id, audience, category, bg_images")
    .order("created_at", { ascending: false })
    .limit(80);
  if (error || !recent?.length)
    throw new Error(error?.message || "No posts to find the queue owner");
  const owner = recent[0]!;
  const exclude = collectStockPhotoIds(
    recent.flatMap((r) => (Array.isArray(r.bg_images) ? r.bg_images : [])),
  );
  const cover =
    pickVariedSlidePhotos({ slideCount: 1, gender: side, excludeIds: exclude })[0] ?? "";

  const keys = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"] as const;
  const text = [
    pack(story.hook, story.hookBody),
    ...story.slides.map((s) => pack(s.headline, s.body)),
  ];
  const fields: Record<string, string> = {};
  keys.forEach((k, i) => (fields[k] = text[i] ?? ""));
  const bgImages = keys.map((k, i) => (!fields[k] ? "" : i === 0 ? cover : "/stat-bg/data"));
  bgImages.push("/cta-bg/stadium-night.jpg");
  const notes = [
    `lane:${story.id}`,
    `kind:${story.kind}`,
    `desk:${DESK_BY_ACCOUNT[account]}`,
    `stats:${story.spec.family}`,
    "forced:manual",
    `tiktok_only:${account}`,
    statSpecNote(story.spec),
  ].join("\n");

  const { data: row, error: insertError } = await supabaseAdmin
    .from("posts")
    .insert({
      user_id: owner.user_id,
      ...fields,
      cta: pack(story.ctaHeadline, story.ctaBody),
      caption: story.caption ?? story.hookBody,
      hashtags: story.hashtags ?? "#collegesoccer #soccerrecruiting #ryval",
      cta_type: "download app",
      platform: "tiktok",
      account: "recruiting_truth",
      audience: owner.audience,
      category: owner.category,
      tone: "direct",
      status: "approved",
      scheduled_date: new Date().toISOString(),
      tiktok_privacy_level: "PUBLIC_TO_EVERYONE",
      bg_images: bgImages,
      bg_image_url: cover || null,
      logo_url: "/ryval-mark.png",
      app_screen_url: story.screen,
      notes,
    })
    .select("*")
    .single();
  if (insertError || !row) throw new Error(insertError?.message || "Insert failed");

  const work = mkdtempSync(join(tmpdir(), "ryval-force-"));
  writeFileSync(join(work, "post.json"), JSON.stringify(row));
  const out = join(work, "out");
  const run = spawnSync("node", ["scripts/render-slides.mjs", join(work, "post.json"), out], {
    encoding: "utf8",
  });
  if (run.status !== 0) throw new Error(`Render failed: ${run.stderr}`);
  const names = readdirSync(out)
    .filter((n) => n.endsWith(".jpg"))
    .sort();
  const blobs = names.map(
    (n) => new Blob([new Uint8Array(readFileSync(join(out, n)))], { type: "image/jpeg" }),
  );
  const urls = await uploadExportSlides({
    supabase: supabaseAdmin,
    userId: row.user_id,
    postId: row.id,
    blobs,
  });
  await supabaseAdmin
    .from("posts")
    .update({ export_slide_urls: urls, notes: `${notes}\ncta:phone` })
    .eq("id", row.id);

  const keep = resolve("tmp/forced", row.id);
  mkdirSync(keep, { recursive: true });
  names.forEach((n) => copyFileSync(join(out, n), join(keep, n)));
  writeFileSync(
    join(keep, "caption.txt"),
    `${editorialTitle(row.hook)}\n\n${row.caption}\n\n${row.hashtags}\n`,
  );
  console.log(
    JSON.stringify({ postId: row.id, story: story.id, account, slides: urls.length, local: keep }),
  );
}

async function publish(postId: string) {
  const { data: row, error } = await supabaseAdmin
    .from("posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (error || !row) throw new Error(error?.message || "No such post");
  if (row.status === "posted") throw new Error("Already posted");
  if (!String(row.notes ?? "").includes("cta:phone")) throw new Error("Slides were not rendered");
  const urls = (row.export_slide_urls ?? []).filter((u: string) => u?.startsWith("http"));
  if (urls.length < 2) throw new Error("Missing slides");
  const title = editorialTitle(row.hook) || "Ryval";
  const description = [row.caption ?? "", row.hashtags ?? ""].filter(Boolean).join("\n\n");
  const result = await publishPhotoCarouselToAllAccounts({
    userId: row.user_id,
    postId: row.id,
    photoUrls: urls,
    title,
    description: description || title,
    privacyLevel: row.tiktok_privacy_level || "PUBLIC_TO_EVERYONE",
  });
  const { data: after } = await supabaseAdmin
    .from("posts")
    .select("status, tiktok_status, tiktok_error, posted_at")
    .eq("id", postId)
    .single();
  console.log(JSON.stringify({ postId, result: result.results, after }));
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "prepare") {
  await prepare(
    args[0]!,
    args[1] as "men" | "women",
    (args[2] ?? "").split(",") as Family[],
    args[3],
    Number(args[4] ?? 0),
  );
} else if (cmd === "publish") {
  await publish(args[0]!);
} else {
  console.error(
    "Usage: prepare <account> <men|women> <families> [match] [seed] | publish <postId>",
  );
  process.exit(1);
}
