/**
 * Render college stats posts from live Ryval data to a local folder. Writes nothing to Supabase,
 * sends nothing to Publer.
 *
 *   bun scripts/preview-college-stats.ts [outDir] [perSide]
 *
 * Each post lands in <outDir>/<story id>/ with slide JPEGs, post.json and caption.txt.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { previewCollegeStats, statSpecNote, type CollegeStatsStory } from "@/lib/college-stats";
import { pickVariedSlidePhotos } from "@/lib/stock-photos";

const outDir = resolve(process.argv[2] ?? "tmp/college-stats-preview");
const perSide = Number(process.argv[3] ?? 4);
/** Rotates which metric and division come first. */
const seed = Number(process.argv[4] ?? 0);
/** Comma list: performers,totw,leaders,freshmen */
const families = process.argv[5]
  ? (process.argv[5].split(",") as ("performers" | "totw" | "leaders" | "freshmen")[])
  : undefined;

function pack(headline: string, body: string) {
  return `${headline}\n---\n${body}`;
}

function postFor(story: CollegeStatsStory) {
  const cover =
    pickVariedSlidePhotos({
      slideCount: 1,
      gender: story.gender === "men" ? "men" : "women",
      excludeIds: [],
    })[0] ?? "";
  const text = [
    pack(story.hook, story.hookBody),
    ...story.slides.map((s) => pack(s.headline, s.body)),
  ];
  const keys = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"] as const;
  const post: Record<string, unknown> = {};
  keys.forEach((k, i) => (post[k] = text[i] ?? ""));
  post.cta = pack(story.ctaHeadline, story.ctaBody);
  post.caption = story.caption;
  post.hashtags = story.hashtags;
  post.app_screen_url = story.screen;
  post.logo_url = "/ryval-mark.png";
  post.bg_images = keys
    .map((k, i) => (!post[k] ? "" : i === 0 ? cover : "/stat-bg/data"))
    .concat(["/cta-bg/stadium-night.jpg"]);
  post.notes = [
    `lane:${story.id}`,
    `kind:${story.kind}`,
    `stats:${story.spec.family}`,
    statSpecNote(story.spec),
  ].join("\n");
  return post;
}

mkdirSync(outDir, { recursive: true });
for (const side of ["men", "women"] as const) {
  const stories = await previewCollegeStats(side, { limit: perSide, seed, families, match: process.argv[6] });
  for (const story of stories) {
    const dir = join(outDir, story.id);
    mkdirSync(dir, { recursive: true });
    const post = postFor(story);
    writeFileSync(join(dir, "post.json"), JSON.stringify(post, null, 2));
    writeFileSync(
      join(dir, "caption.txt"),
      `${story.hook}\n\n${story.caption}\n\n${story.hashtags}\n`,
    );
    const run = spawnSync("node", ["scripts/render-slides.mjs", join(dir, "post.json"), dir], {
      encoding: "utf8",
    });
    console.log(story.id, run.status === 0 ? run.stdout.trim() : run.stderr.trim());
  }
}
