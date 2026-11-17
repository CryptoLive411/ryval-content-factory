import { supabase } from "@/integrations/supabase/client";
import { nextUnusedAll } from "@/lib/rotation";
import { familyFromCopy, familyOf, matchLaneFromCopy, topicFromNotes } from "@/lib/fact-lanes";
import { etDayKey, nextIrregularSlots } from "@/lib/post-times";
import { DESK_BY_ACCOUNT } from "@/lib/recruiting-stories";
import { schoolIdFromNotes, schoolLogoFromNotes } from "@/lib/school-logo";
import { assignSchoolPhotos } from "@/lib/school-photos";
import { fetchSchoolFactPack } from "@/lib/school-facts";
import { getSchool, isSchoolSpotlightNotes, pickAutopilotSchool } from "@/lib/schools";
import {
  extractStockPhotoId,
  inferPhotoGender,
  isGenericCampusPhoto,
  isMissingSlidePhoto,
  pickStockPhoto,
  primeStockRotation,
} from "@/lib/stock-photos";
import { renderPostSlideBlobs, uploadExportSlides } from "@/lib/tiktok-export";
import {
  editorialTitle,
  isSameCarousel,
} from "@/lib/content-quality";
import { PREFERRED_PRIVACY } from "@/lib/tiktok-privacy";
import {
  POSTS_PER_ACCOUNT_PER_DAY,
  TIKTOK_PUBLISH_ACCOUNTS,
  tiktokOnlyAccount,
  withTikTokAccount,
} from "@/lib/tiktok-accounts";

const AUTOPILOT_AUDIENCES = ["players", "parents", "coaches", "international"] as const;
const AUTOPILOT_CATEGORIES = [
  "educational",
  "international_pathway",
  "coach_pov",
  "parent_education",
  "highlight_tips",
  "harsh_truths",
] as const;

export type AutopilotSettings = {
  autopilot_enabled: boolean;
  autopilot_interval_hours: number;
  autopilot_queue_hours: number;
  preferred_privacy: string;
};

const MEDIA_STAMP = "media:v3";

function campusUrls(bgs: Array<string | null | undefined>) {
  return bgs.filter((url) => url && !isMissingSlidePhoto(url) && !isGenericCampusPhoto(url)) as string[];
}

/** School spotlights keep campus shots only. Returns true when this post is a school spotlight. */
function lockSchoolPhotos(bgs: (string | null)[], notes: string) {
  if (!isSchoolSpotlightNotes(notes)) return false;
  const campus = campusUrls(bgs);
  if (!campus.length) return true;
  for (let i = 0; i < 6; i++) {
    if (isMissingSlidePhoto(bgs[i]) || isGenericCampusPhoto(bgs[i])) {
      bgs[i] = campus[i % campus.length]!;
    }
  }
  return true;
}

function ensureCtaSlide(post: Record<string, unknown>, bgs: (string | null)[], schoolPost: boolean) {
  if (!String(post.cta ?? "").trim()) {
    post.cta = `${RYVAL_CTAS.get_seen.headline}\n---\n${RYVAL_CTAS.get_seen.body}\n---\nDownload Ryval on the App Store.`;
  }
  if (!post.app_screen_url) {
    post.app_screen_url = schoolPost ? "/app-screens/university.jpg" : "/app-screens/discover.jpg";
  }
  if (!bgs[6] || isMissingSlidePhoto(bgs[6])) {
    bgs[6] = String(post.cta_bg_url ?? "") || "/cta-bg/stadium-night.jpg";
  }
}

const DEFAULTS: AutopilotSettings = {
  autopilot_enabled: true,
  autopilot_interval_hours: 1,
  autopilot_queue_hours: 24,
  preferred_privacy: PREFERRED_PRIVACY,
};

export const POSTS_PER_INTERVAL = 1;

export async function loadAutopilotSettings(userId: string): Promise<AutopilotSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select(
      "autopilot_enabled, autopilot_interval_hours, autopilot_queue_hours, preferred_privacy",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return { ...DEFAULTS };
  return {
    autopilot_enabled: Boolean(data.autopilot_enabled),
    autopilot_interval_hours: data.autopilot_interval_hours || 1,
    autopilot_queue_hours: data.autopilot_queue_hours || 12,
    preferred_privacy: data.preferred_privacy || PREFERRED_PRIVACY,
  };
}

export async function saveAutopilotSettings(userId: string, patch: Partial<AutopilotSettings>) {
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      ...patch,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

type GenerateFn = (args: {
  data: {
    slidesPerPost: number;
    platform: string;
    account: string;
    audience: string;
    category: string;
    tone: string;
    ctaType: string;
    includeAppScreen: boolean;
    count: number;
    variantIndex: number;
    desk?: "ryval" | "education" | "media";
    skipStoryIds?: string[];
  };
}) => Promise<{ posts: Array<Record<string, unknown>> }>;

type GenBgFn = (args: {
  data: {
    prompt: string;
    model: "stock";
    stylePreset: "stock";
    salt: number;
    excludeIds: string[];
    hardExcludeIds?: string[];
    gender: "women" | "men" | "neutral";
  };
}) => Promise<{ url: string; photoId?: string }>;

type GenerateSchoolFn = (args: {
  data: { schoolId: string; sport: "men" | "women"; slidesPerPost: number };
}) => Promise<{ posts: Array<Record<string, unknown>> }>;

type GenerateSeasonFn = (args: {
  data: { sport: "men" | "women"; slidesPerPost: number; variantIndex: number; avoidHooks?: string[] };
}) => Promise<{ posts: Array<Record<string, unknown>> }>;

export async function fillAutopilotQueue(opts: {
  userId: string;
  generate: GenerateFn;
  generateSchool?: GenerateSchoolFn;
  generateSeason?: GenerateSeasonFn;
  genBg: GenBgFn;
  intervalHours: number;
  queueHours: number;
  privacy: string;
  postsPerInterval?: number;
  maxPosts?: number;
  /** Connected TikToks. Defaults to the original three until a new account is connected. */
  accounts?: { id: string; name: string }[];
  onProgress?: (msg: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: { from: (table: string) => any; storage: { from: (b: string) => any } };
  renderSlides?: (post: Record<string, unknown>) => Promise<Blob[]>;
}) {
  const db = opts.db ?? supabase;
  const publishAccounts = opts.accounts?.length ? opts.accounts : [...TIKTOK_PUBLISH_ACCOUNTS];
  const deskFor = (accountId: string) => {
    const known = DESK_BY_ACCOUNT[accountId];
    if (known) return known;
    const desks = ["ryval", "education", "media"] as const;
    const idx = publishAccounts.findIndex((account) => account.id === accountId);
    return desks[idx >= 0 ? idx % desks.length : 0];
  };
  const { data: recentPhotos } = await db
    .from("posts")
    .select("bg_images")
    .eq("user_id", opts.userId)
    .order("created_at", { ascending: false })
    .limit(40);
  const recentIds: string[] = [];
  for (const row of recentPhotos ?? []) {
    const urls = Array.isArray(row.bg_images) ? row.bg_images : [];
    for (const url of urls) {
      const id = extractStockPhotoId(typeof url === "string" ? url : "");
      if (id) recentIds.push(id);
    }
  }
  primeStockRotation(recentIds);
  const { data: upcoming } = await db
    .from("posts")
    .select("scheduled_date")
    .eq("user_id", opts.userId)
    .eq("status", "scheduled")
    .gt("scheduled_date", new Date().toISOString())
    .order("scheduled_date", { ascending: true })
    .limit(120);

  const existingMs = (upcoming ?? [])
    .map((row) => (row.scheduled_date ? new Date(row.scheduled_date).getTime() : 0))
    .filter(Boolean);
  const slots = nextIrregularSlots({
    postsPerDay: POSTS_PER_ACCOUNT_PER_DAY * publishAccounts.length,
    existingMs,
    queueHours: opts.queueHours,
  });

  if (!slots.length) {
    opts.onProgress?.("Queue already covers the next window.");
    return { created: 0, slots: 0 };
  }

  const { count } = await db
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", opts.userId);

  const { data: recentMeta } = await db
    .from("posts")
    .select("audience, category, notes, hook")
    .eq("user_id", opts.userId)
    .order("created_at", { ascending: false })
    .limit(40);

  const recentAudiences = (recentMeta ?? []).map((r) => r.audience);
  const recentCategories = (recentMeta ?? []).map((r) => r.category);
  const recentSchoolIds = (recentMeta ?? [])
    .map((r) => schoolIdFromNotes(typeof r.notes === "string" ? r.notes : null))
    .filter((id): id is string => Boolean(id));
  const sinceMemory = new Date(Date.now() - 60 * 24 * 3600_000).toISOString();
  const memoryHooks: { hook: string | null }[] = [];
  for (let from = 0; from < 2000; from += 500) {
    const { data, error } = await db
      .from("posts")
      .select("hook")
      .eq("user_id", opts.userId)
      .gte("created_at", sinceMemory)
      .order("created_at", { ascending: false })
      .range(from, from + 499);
    if (error || !data?.length) break;
    memoryHooks.push(...data);
    if (data.length < 500) break;
  }
  const recentHooks = memoryHooks
    .map((r) => editorialTitle(typeof r.hook === "string" ? r.hook : ""))
    .filter(Boolean);
  const recentWereSchool = (recentMeta ?? []).map((r) =>
    isSchoolSpotlightNotes(typeof r.notes === "string" ? r.notes : null),
  );

  let created = 0;
  let newsCount = 0;
  const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
  const dayAhead = new Date(Date.now() + 24 * 3600_000).toISOString();
  const { data: dayRows } = await db
    .from("posts")
    .select("notes, status, scheduled_date, posted_at")
    .eq("user_id", opts.userId)
    .in("status", ["scheduled", "posted"])
    .order("created_at", { ascending: false })
    .limit(120);
  const accountDayCounts: Record<string, Record<string, number>> = {};
  const bump = (accountId: string, ms: number) => {
    const day = etDayKey(ms);
    const byDay = (accountDayCounts[accountId] ??= {});
    byDay[day] = (byDay[day] ?? 0) + 1;
  };
  for (const row of dayRows ?? []) {
    const when = row.status === "posted" ? row.posted_at : row.scheduled_date;
    if (!when) continue;
    const ms = new Date(when).getTime();
    const inWindow =
      row.status === "posted" ? ms >= new Date(dayAgo).getTime() : ms > Date.now() && ms <= new Date(dayAhead).getTime();
    if (!inWindow) continue;
    const id = tiktokOnlyAccount(typeof row.notes === "string" ? row.notes : null);
    if (!id) continue;
    bump(id, ms);
  }
  const countOn = (accountId: string, ms: number) => accountDayCounts[accountId]?.[etDayKey(ms)] ?? 0;
  const nextAccount = (slotMs: number) => {
    const open = publishAccounts.filter(
      (account) => countOn(account.id, slotMs) < POSTS_PER_ACCOUNT_PER_DAY,
    ).sort((a, b) => countOn(a.id, slotMs) - countOn(b.id, slotMs) || a.name.localeCompare(b.name));
    return open[0]?.id ?? null;
  };
  const maxPosts = opts.maxPosts ?? 24;
  for (let i = 0; i < slots.length; i++) {
    if (created >= maxPosts) break;
    const when = slots[i];
    const accountId = nextAccount(when.getTime());
    if (!accountId) continue;
    const audience = nextUnusedAll(AUTOPILOT_AUDIENCES, [...recentAudiences]);
    const category = nextUnusedAll(AUTOPILOT_CATEGORIES, [...recentCategories]);
    recentAudiences.unshift(audience);
    recentCategories.unshift(category);

    // Rankings stay off. The queue is recruiting facts until that mix is turned back on.
    const wantSeason = false;
    let post: Record<string, unknown> | undefined;

    if (!wantSeason) {
      opts.onProgress?.(`Generating recruiting facts ${i + 1} of ${slots.length} for ${when.toLocaleString()}…`);
      recentWereSchool.unshift(false);
      const skipStoryIds: string[] = [];
      try {
        for (let attempt = 0; attempt < 4 && !post; attempt++) {
          const r = await opts.generate({
            data: {
              slidesPerPost: 7,
              platform: "tiktok",
              account: "recruiting_truth",
              audience,
              category,
              tone: "direct",
              ctaType: "download app",
              includeAppScreen: true,
              count: 1,
              variantIndex: (count ?? 0) + created + attempt,
              desk: deskFor(accountId),
              skipStoryIds,
            },
          });
          const candidate = r.posts[0];
          if (!candidate) break;
          const title = editorialTitle(String(candidate.hook ?? ""));
          if (isSameCarousel(title, recentHooks.slice(0, 12))) {
            const storyId = topicFromNotes(typeof candidate.notes === "string" ? candidate.notes : null);
            if (storyId) skipStoryIds.push(storyId);
            opts.onProgress?.(`Skipped a repeat of “${title}”.`);
            continue;
          }
          post = candidate;
        }
      } catch (e) {
        opts.onProgress?.(
          `Recruiting facts failed (${e instanceof Error ? e.message : "error"}). Leaving this hour open.`,
        );
        continue;
      }
      if (!post) continue;
    }

    if (!post && opts.generateSeason) {
      const sport: "men" | "women" = newsCount % 2 === 0 ? "men" : "women";
      const variantIndex = newsCount;
      newsCount += 1;
      opts.onProgress?.(
        `Generating current-season board (${sport}'s) ${i + 1} of ${slots.length} for ${when.toLocaleString()}…`,
      );
      try {
        const r = await opts.generateSeason({
          data: { sport, slidesPerPost: 6, variantIndex, avoidHooks: recentHooks },
        });
        post = r.posts[0];
        recentWereSchool.unshift(false);
      } catch (e) {
        opts.onProgress?.(
          `Season board failed (${e instanceof Error ? e.message : "error"}); using recruiting facts.`,
        );
      }
    }

    if (!post) continue;
    const hookTitle = editorialTitle(String(post.hook ?? ""));
    if (isSameCarousel(hookTitle, recentHooks.slice(0, 12))) {
      opts.onProgress?.(`Skipped a repeat of “${hookTitle}”.`);
      continue;
    }
    recentHooks.unshift(hookTitle);

    const promptsList = (post.slide_image_prompts ?? []) as string[];
    const slideTexts = [
      post.hook,
      post.slide_2,
      post.slide_3,
      post.slide_4,
      post.slide_5,
      post.slide_6,
      post.cta,
    ] as Array<string | null | undefined>;
    const existing = Array.isArray(post.bg_images) ? [...(post.bg_images as (string | null)[])] : [];
    const bgs: (string | null)[] = existing;
    const historyIds = [...((post.photo_exclude_ids as string[] | undefined) ?? [])];
    const usedInPost: string[] = [];
    const lockedGender =
      (post.photo_gender as "women" | "men" | "neutral" | undefined) ??
      inferPhotoGender(...slideTexts);

    const notes = withTikTokAccount(
      String(post.notes ?? (post.fact_lane ? `lane:${post.fact_lane}` : "")),
      accountId,
    );
    const schoolPost = lockSchoolPhotos(bgs, notes);
    if (!schoolPost) {
      for (let s = 0; s < Math.max(promptsList.length, 6); s++) {
        const prompt = promptsList[s];
        if (!slideTexts[s]) {
          bgs[s] = bgs[s] ?? null;
          continue;
        }
        if (!isMissingSlidePhoto(bgs[s])) continue;
        const gender =
          lockedGender === "neutral" ? inferPhotoGender(prompt, slideTexts[s]) : lockedGender;
        const picked = pickStockPhoto(
          [prompt, slideTexts[s]].filter(Boolean).join(". ") || "soccer",
          ((count ?? 0) + created) * 17 + s,
          [...historyIds, ...usedInPost],
          gender,
          usedInPost,
        );
        usedInPost.push(picked.photoId);
        bgs[s] = picked.url;
      }
    }
    ensureCtaSlide(post, bgs, schoolPost);

    const { data: inserted, error } = await db
      .from("posts")
      .insert({
        user_id: opts.userId,
        hook: String(post.hook ?? ""),
        slide_2: String(post.slide_2 ?? ""),
        slide_3: String(post.slide_3 ?? ""),
        slide_4: String(post.slide_4 ?? ""),
        slide_5: String(post.slide_5 ?? ""),
        slide_6: String(post.slide_6 ?? ""),
        cta: String(post.cta ?? ""),
        caption: String(post.caption ?? ""),
        hashtags: String(post.hashtags ?? ""),
        cta_type: "download app",
        platform: "tiktok",
        account: "recruiting_truth",
        audience,
        category,
        tone: "direct",
        status: "scheduled",
        scheduled_date: when.toISOString(),
        tiktok_privacy_level: opts.privacy,
        bg_images: bgs.map((u) => u ?? ""),
        logo_url: (post.logo_url as string | null) ?? null,
        app_screen_url: (post.app_screen_url as string | null) ?? null,
        bg_image_url: bgs.find((u) => !!u && !u.startsWith("data:")) ?? null,
        notes,
      })
      .select("id")
      .single();
    if (error || !inserted) throw new Error(error?.message || "Could not save queued post");

    const fullPost = {
      ...post,
      bg_images: bgs,
      cta_type: "download app",
      notes,
      school_logo_url: (post.school_logo_url as string | null) ?? schoolLogoFromNotes(notes),
    };
    const blobs = await (opts.renderSlides
      ? opts.renderSlides(fullPost)
      : renderPostSlideBlobs(fullPost as never));
    const exportUrls = await uploadExportSlides({
      supabase: db,
      userId: opts.userId,
      postId: inserted.id,
      blobs,
    });
    const stamped = notes.includes("cta:phone") ? notes : `${notes}${notes ? "\n" : ""}cta:phone`;
    await db
      .from("posts")
      .update({ export_slide_urls: exportUrls, notes: stamped })
      .eq("id", inserted.id);
    created += 1;
    bump(accountId, when.getTime());
  }

  opts.onProgress?.(`Queued ${created} post${created === 1 ? "" : "s"}.`);
  return { created, slots: slots.length };
}

export async function repairQueuedPostPhotos(opts: {
  userId: string;
  onProgress?: (msg: string) => void;
}) {
  const { data: rows, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", opts.userId)
    .eq("status", "scheduled")
    .order("scheduled_date", { ascending: true })
    .limit(40);
  if (error) throw new Error(error.message);

  const usedAcross: string[] = [];
  let repaired = 0;
  for (const row of rows ?? []) {
    const bgs = Array.isArray(row.bg_images) ? [...(row.bg_images as string[])] : [];
    const missing = [0, 1, 2, 3, 4].some((i) => isMissingSlidePhoto(bgs[i]));
    if (!missing) continue;
    opts.onProgress?.(`Adding photos to “${String(row.hook ?? "").split("\n")[0]}”…`);
    const slideTexts = [
      row.hook,
      row.slide_2,
      row.slide_3,
      row.slide_4,
      row.slide_5,
      row.slide_6,
      row.cta,
    ];
    const notes = String(row.notes ?? "");
    const schoolPost = lockSchoolPhotos(bgs, notes);
    const gender = inferPhotoGender(...slideTexts);
    const usedInPost: string[] = [];
    if (!schoolPost) {
      for (let i = 0; i < 6; i++) {
        if (!slideTexts[i] || !isMissingSlidePhoto(bgs[i])) continue;
        const picked = pickStockPhoto(
          String(slideTexts[i]),
          i,
          [...usedAcross, ...usedInPost],
          gender,
          usedInPost,
        );
        bgs[i] = picked.url;
        usedInPost.push(picked.photoId);
      }
    }
    const rowPost = row as Record<string, unknown>;
    ensureCtaSlide(rowPost, bgs, schoolPost);
    usedAcross.push(...usedInPost);
    const fullPost = {
      ...row,
      ...rowPost,
      bg_images: bgs,
      school_logo_url: schoolLogoFromNotes(notes),
    };
    const blobs = await renderPostSlideBlobs(fullPost as never);
    const exportUrls = await uploadExportSlides({
      supabase,
      userId: opts.userId,
      postId: row.id as string,
      blobs,
    });
    const { error: upErr } = await supabase
      .from("posts")
      .update({
        bg_images: bgs.map((u) => u ?? ""),
        bg_image_url: bgs.find((u) => !!u && !u.startsWith("data:")) ?? null,
        export_slide_urls: exportUrls,
        cta: String(rowPost.cta ?? row.cta ?? ""),
        app_screen_url: (rowPost.app_screen_url as string | null) ?? row.app_screen_url,
      })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    repaired += 1;
  }
  opts.onProgress?.(`Rebuilt photos on ${repaired} queued post${repaired === 1 ? "" : "s"}.`);
  return { repaired };
}

function topicForRow(row: Record<string, unknown>) {
  const stored = topicFromNotes(typeof row.notes === "string" ? row.notes : null);
  if (stored) return stored;
  const blob = [row.hook, row.slide_2, row.slide_3, row.slide_4, row.slide_5, row.slide_6]
    .filter(Boolean)
    .join(" ");
  return matchLaneFromCopy(blob)?.topic ?? "";
}

export async function rewriteQueuedPostTopics(opts: {
  userId: string;
  generate: GenerateFn;
  onProgress?: (msg: string) => void;
}) {
  const { data: rows, error } = await supabase
    .from("posts")
    .select("*")
    .eq("user_id", opts.userId)
    .eq("status", "scheduled")
    .order("scheduled_date", { ascending: true })
    .limit(40);
  if (error) throw new Error(error.message);

  const seenTopics = new Set<string>();
  let previousFamily = "";
  let rewritten = 0;
  const usedPhotos: string[] = [];
  const { count } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", opts.userId);

  for (const row of rows ?? []) {
    if (isSchoolSpotlightNotes(typeof row.notes === "string" ? row.notes : null)) {
      previousFamily = "school-spotlight";
      continue;
    }
    const topic = topicForRow(row);
    const blob = [row.hook, row.slide_2, row.slide_3, row.slide_4, row.slide_5, row.slide_6]
      .filter(Boolean)
      .join(" ");
    const fam = topic ? familyOf(topic) : familyFromCopy(blob);
    const sameTopic = Boolean(topic && seenTopics.has(topic));
    const sameFamily = Boolean(fam && fam !== "other" && fam === previousFamily);
    if (!sameTopic && !sameFamily) {
      if (topic) seenTopics.add(topic);
      previousFamily = fam;
      continue;
    }
    opts.onProgress?.(
      `Rewriting “${String(row.hook ?? "").split("\n")[0]}” onto a new topic…`,
    );
    const r = await opts.generate({
      data: {
        slidesPerPost: 6,
        platform: "tiktok",
        account: "recruiting_truth",
        audience: String(row.audience || "players"),
        category: String(row.category || "educational"),
        tone: "direct",
        ctaType: "download app",
        includeAppScreen: true,
        count: 1,
        variantIndex: (count ?? 0) + rewritten + 17,
      },
    });
    const post = r.posts[0];
    if (!post) continue;
    const promptsList = (post.slide_image_prompts ?? []) as string[];
    const slideTexts = [
      post.hook,
      post.slide_2,
      post.slide_3,
      post.slide_4,
      post.slide_5,
      post.slide_6,
      post.cta,
    ] as Array<string | null | undefined>;
    const existing = Array.isArray(post.bg_images) ? [...(post.bg_images as (string | null)[])] : [];
    const bgs: (string | null)[] = existing;
    const usedInPost: string[] = [];
    const lockedGender =
      (post.photo_gender as "women" | "men" | "neutral" | undefined) ??
      inferPhotoGender(...slideTexts);
    const rewriteNotes = String(post.notes ?? "");
    const schoolPost = lockSchoolPhotos(bgs, rewriteNotes);
    if (!schoolPost) {
      for (let s = 0; s < 6; s++) {
        if (!slideTexts[s] || !isMissingSlidePhoto(bgs[s])) continue;
        const picked = pickStockPhoto(
          [promptsList[s], slideTexts[s]].filter(Boolean).join(". ") || "soccer",
          rewritten * 17 + s,
          [...usedPhotos, ...usedInPost],
          lockedGender === "neutral" ? inferPhotoGender(promptsList[s], slideTexts[s]) : lockedGender,
          usedInPost,
        );
        usedInPost.push(picked.photoId);
        bgs[s] = picked.url;
      }
    }
    ensureCtaSlide(post, bgs, schoolPost);
    usedPhotos.push(...usedInPost);
    const fullPost = {
      ...post,
      bg_images: bgs,
      cta_type: "download app",
      school_logo_url:
        (post.school_logo_url as string | null) ?? schoolLogoFromNotes(rewriteNotes),
    };
    const blobs = await renderPostSlideBlobs(fullPost as never);
    const exportUrls = await uploadExportSlides({
      supabase,
      userId: opts.userId,
      postId: row.id as string,
      blobs,
    });
    const { error: upErr } = await supabase
      .from("posts")
      .update({
        hook: String(post.hook ?? ""),
        slide_2: String(post.slide_2 ?? ""),
        slide_3: String(post.slide_3 ?? ""),
        slide_4: String(post.slide_4 ?? ""),
        slide_5: String(post.slide_5 ?? ""),
        slide_6: String(post.slide_6 ?? ""),
        cta: String(post.cta ?? ""),
        caption: String(post.caption ?? ""),
        hashtags: String(post.hashtags ?? ""),
        notes: String(post.notes ?? ""),
        bg_images: bgs.map((u) => u ?? ""),
        bg_image_url: bgs.find((u) => !!u && !u.startsWith("data:")) ?? null,
        app_screen_url: (post.app_screen_url as string | null) ?? row.app_screen_url,
        export_slide_urls: exportUrls,
      })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    const nextTopic = topicFromNotes(String(post.notes ?? "")) || topicForRow(post);
    if (nextTopic) seenTopics.add(nextTopic);
    previousFamily = nextTopic ? familyOf(nextTopic) : familyFromCopy(String(post.hook ?? ""));
    rewritten += 1;
  }
  opts.onProgress?.(
    rewritten
      ? `Rewrote ${rewritten} duplicate-topic post${rewritten === 1 ? "" : "s"}.`
      : "Queued posts already have different topics.",
  );
  return { rewritten };
}

/** Re-render scheduled posts so campus photos and the phone CTA are on the JPEGs that actually post. */
export async function rebuildQueuedMedia(opts: {
  userId: string;
  renderSlides: (post: Record<string, unknown>) => Promise<Blob[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db?: { from: (table: string) => any; storage: { from: (b: string) => any } };
  limit?: number;
}) {
  const db = opts.db ?? supabase;
  const { data, error } = await db
    .from("posts")
    .select("*")
    .eq("user_id", opts.userId)
    .eq("status", "scheduled")
    .order("scheduled_date", { ascending: true })
    .limit(24);
  if (error) throw new Error(error.message);

  let rebuilt = 0;
  for (const row of data ?? []) {
    if (rebuilt >= (opts.limit ?? 3)) break;
    const notes = String(row.notes ?? "");
    if (notes.includes(MEDIA_STAMP)) continue;

    const bgs: (string | null)[] = Array.isArray(row.bg_images) ? [...(row.bg_images as string[])] : [];
    const schoolPost = isSchoolSpotlightNotes(notes);
    const texts = [row.hook, row.slide_2, row.slide_3, row.slide_4, row.slide_5, row.slide_6].map((t) =>
      String(t ?? ""),
    );

    if (schoolPost) {
      const school = getSchool(schoolIdFromNotes(notes) ?? "");
      const sport: "men" | "women" = /sport:women/.test(notes) ? "women" : "men";
      if (!school) continue;
      try {
        const pack = await fetchSchoolFactPack(school, sport);
        const assigned = assignSchoolPhotos(6, pack.photos, texts);
        const campus = assigned.filter((url) => url && !isGenericCampusPhoto(url));
        if (!campus.length) continue;
        for (let i = 0; i < 6; i++) {
          bgs[i] = texts[i] ? campus[i % campus.length]! : "";
        }
      } catch (e) {
        console.log("school photo rebuild skipped", e instanceof Error ? e.message : e);
        continue;
      }
    }

    const post = { ...row, notes, bg_images: bgs } as Record<string, unknown>;
    ensureCtaSlide(post, bgs, schoolPost);
    const stamped = `${notes}${notes ? "\n" : ""}${MEDIA_STAMP}`;
    const fullPost = {
      ...post,
      bg_images: bgs,
      notes: stamped,
      school_logo_url: schoolLogoFromNotes(notes) || row.school_logo_url || null,
    };
    try {
      const blobs = await opts.renderSlides(fullPost);
      const exportUrls = await uploadExportSlides({
        supabase: db,
        userId: opts.userId,
        postId: row.id as string,
        blobs,
      });
      const { error: upErr } = await db
        .from("posts")
        .update({
          bg_images: bgs.map((u) => u ?? ""),
          bg_image_url: bgs.find((u) => !!u && !String(u).startsWith("data:")) ?? null,
          export_slide_urls: exportUrls,
          cta: String(post.cta ?? ""),
          app_screen_url: (post.app_screen_url as string | null) ?? null,
          notes: stamped,
        })
        .eq("id", row.id);
      if (upErr) throw new Error(upErr.message);
      rebuilt += 1;
    } catch (e) {
      console.log("media rebuild failed", row.id, e instanceof Error ? e.message : e);
    }
  }
  return { rebuilt };
}
