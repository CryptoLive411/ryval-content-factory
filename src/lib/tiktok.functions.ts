import { createHash, randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { editorialTitle, isSameCarousel } from "@/lib/content-quality";
import { isPublerConfigured, publerStatus, publishTikTokCarouselViaPubler } from "@/lib/publer";
import { TIKTOK_PUBLISH_ACCOUNTS, tiktokOnlyAccount, withTikTokAccount } from "@/lib/tiktok-accounts";
import { PREFERRED_PRIVACY, PRIVACY_FALLBACK, SANDBOX_PRIVACY } from "@/lib/tiktok-privacy";

const TT_AUTH = "https://www.tiktok.com/v2/auth/authorize/";
const TT_TOKEN = "https://open.tiktokapis.com/v2/oauth/token/";
const TT_CREATOR = "https://open.tiktokapis.com/v2/post/publish/creator_info/query/";
const TT_PHOTO_INIT = "https://open.tiktokapis.com/v2/post/publish/content/init/";
const TT_VIDEO_INIT = "https://open.tiktokapis.com/v2/post/publish/video/init/";
const TT_STATUS = "https://open.tiktokapis.com/v2/post/publish/status/fetch/";

function findMp4Url(urls: string[]) {
  return urls.find((u) => /\.mp4(\?|#|$)/i.test(u)) ?? null;
}

function cleanEnv(raw: string | undefined) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

function tiktokEnv() {
  const clientKey = cleanEnv(process.env.TIKTOK_CLIENT_KEY);
  const clientSecret = cleanEnv(process.env.TIKTOK_CLIENT_SECRET);
  const redirectUri = cleanEnv(process.env.TIKTOK_REDIRECT_URI);
  const missing = [
    !clientKey && "TIKTOK_CLIENT_KEY",
    !clientSecret && "TIKTOK_CLIENT_SECRET",
    !redirectUri && "TIKTOK_REDIRECT_URI",
  ].filter(Boolean);
  if (missing.length) {
    throw new Error(
      `TikTok not configured. Missing ${missing.join(", ")}. Restart the dev server after editing .env.`,
    );
  }
  return { clientKey, clientSecret, redirectUri };
}

/** TikTok desktop/localhost Login Kit: PKCE with hex SHA-256 (not RFC 7636 base64url). */
function createTikTokPkce() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = randomBytes(64);
  let verifier = "";
  for (const b of bytes) verifier += chars[b % chars.length];
  const challenge = createHash("sha256").update(verifier).digest("hex");
  return { verifier, challenge };
}

const pkceByState = new Map<string, { verifier: string; userId: string; createdAt: number }>();
const PKCE_TTL_MS = 15 * 60 * 1000;

function rememberPkce(state: string, userId: string, verifier: string) {
  const now = Date.now();
  for (const [key, row] of pkceByState) {
    if (now - row.createdAt > PKCE_TTL_MS) pkceByState.delete(key);
  }
  pkceByState.set(state, { verifier, userId, createdAt: now });
}

function takePkce(state: string | undefined, userId: string, fallback?: string) {
  if (state) {
    const row = pkceByState.get(state);
    if (row) {
      pkceByState.delete(state);
      if (row.userId === userId) return row.verifier;
    }
  }
  if (fallback && fallback.length >= 43) return fallback;
  throw new Error("TikTok login expired. Go back to Settings and Connect TikTok again.");
}

export const getTikTokAuthUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { clientKey, redirectUri } = tiktokEnv();
    const state = `${context.userId}.${crypto.randomUUID()}`;
    const { verifier, challenge } = createTikTokPkce();
    rememberPkce(state, context.userId, verifier);
    const scopes = ["user.info.basic", "video.publish"].join(",");
    const url = new URL(TT_AUTH);
    url.searchParams.set("client_key", clientKey);
    url.searchParams.set("scope", scopes);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    // Otherwise TikTok silently re-authorizes the account already signed in on this browser.
    url.searchParams.set("disable_auto_auth", "1");
    return { url: url.toString(), state, codeVerifier: verifier };
  });

export const exchangeTikTokCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        code: z.string().min(1),
        state: z.string().optional(),
        codeVerifier: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { clientKey, clientSecret, redirectUri } = tiktokEnv();
    const { supabase, userId } = context;
    const codeVerifier = takePkce(data.state, userId, data.codeVerifier);
    let code = data.code;
    try {
      code = decodeURIComponent(code);
    } catch {
      /* already decoded */
    }

    const body = new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const tokenRes = await fetch(TT_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok || tokenJson.error) {
      console.error("TikTok token error", tokenJson);
      throw new Error(tokenJson.error_description || tokenJson.error || "TikTok OAuth failed");
    }

    const openId = tokenJson.open_id as string;
    const accessToken = tokenJson.access_token as string;
    const refreshToken = tokenJson.refresh_token as string;
    const expiresIn = Number(tokenJson.expires_in ?? 86400);
    const refreshExpiresIn = Number(tokenJson.refresh_expires_in ?? 31536000);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const refreshExpiresAt = new Date(Date.now() + refreshExpiresIn * 1000).toISOString();

    // Optional profile
    let displayName: string | null = null;
    let avatarUrl: string | null = null;
    try {
      const u = await fetch(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const uj = await u.json();
      displayName = uj?.data?.user?.display_name ?? null;
      avatarUrl = uj?.data?.user?.avatar_url ?? null;
    } catch {
      /* ignore */
    }

    const { error } = await supabase.from("tiktok_accounts").upsert(
      {
        user_id: userId,
        open_id: openId,
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        refresh_expires_at: refreshExpiresAt,
        scopes: tokenJson.scope ?? "user.info.basic,video.publish",
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "user_id,open_id" },
    );
    if (error) throw new Error(error.message);

    return { openId, displayName };
  });

export const getTikTokConnection = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("tiktok_accounts")
      .select("id, open_id, display_name, avatar_url, expires_at, scopes, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    const accounts = data ?? [];
    return { accounts, account: accounts[0] ?? null };
  });

export const setActiveTikTokAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ accountId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tiktok_accounts")
      .select("id, display_name")
      .eq("user_id", context.userId)
      .eq("id", data.accountId)
      .single();
    if (error || !row) throw new Error("TikTok account not found");
    const { error: upErr } = await context.supabase
      .from("tiktok_accounts")
      .update({ display_name: row.display_name })
      .eq("id", row.id);
    if (upErr) throw new Error(upErr.message);
    return { ok: true };
  });

export const disconnectTikTok = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ accountId: z.string().uuid().optional() }).optional().parse(input))
  .handler(async ({ data, context }) => {
    let q = context.supabase.from("tiktok_accounts").delete().eq("user_id", context.userId);
    if (data?.accountId) q = q.eq("id", data.accountId);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function refreshTikTokToken(row: {
  id: string;
  refresh_token: string;
  user_id: string;
}) {
  const { clientKey, clientSecret } = tiktokEnv();
  const body = new URLSearchParams({
    client_key: clientKey,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: row.refresh_token,
  });
  const r = await fetch(TT_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error_description || "TikTok refresh failed");

  const expiresAt = new Date(Date.now() + Number(j.expires_in ?? 86400) * 1000).toISOString();
  const patch = {
    access_token: j.access_token as string,
    refresh_token: (j.refresh_token as string) || row.refresh_token,
    expires_at: expiresAt,
  };
  await supabaseAdmin.from("tiktok_accounts").update(patch).eq("id", row.id);
  return patch.access_token;
}

async function getTikTokAccountRow(userId: string, accountId?: string) {
  let q = supabaseAdmin.from("tiktok_accounts").select("*").eq("user_id", userId);
  q = accountId
    ? q.eq("id", accountId)
    : q.order("updated_at", { ascending: false }).limit(1);
  const { data: row, error } = await q.maybeSingle();
  if (error || !row) throw new Error("Connect TikTok in Settings first.");
  return row;
}

async function getValidAccessToken(userId: string, accountId?: string) {
  const row = await getTikTokAccountRow(userId, accountId);
  const expiresMs = new Date(row.expires_at).getTime();
  if (expiresMs - Date.now() < 5 * 60 * 1000) {
    const token = await refreshTikTokToken({
      id: row.id,
      refresh_token: row.refresh_token,
      user_id: row.user_id,
    });
    return { token, accountId: row.id, displayName: row.display_name as string | null };
  }
  return {
    token: row.access_token as string,
    accountId: row.id as string,
    displayName: row.display_name as string | null,
  };
}

export type TikTokCreatorInfo = {
  creator_avatar_url?: string;
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options?: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
  can_post?: boolean;
  rateLimited?: boolean;
  postCapped?: boolean;
};

const POST_CAP_MS = 20 * 60 * 60 * 1000;
const postCapUntil = new Map<string, number>();
export const TIKTOK_POST_CAP_MSG =
  "TikTok blocked more API posts from this account for 24 hours. Do not retry today — each try can extend the block. Save drafts in Library and post tomorrow, or share from the TikTok app.";

function isPostCapError(code?: string, message?: string) {
  const msg = (message ?? "").toLowerCase();
  return (
    code === "spam_risk_too_many_posts" ||
    code === "reached_active_user_cap" ||
    msg.includes("too many posts") ||
    msg.includes("minimize spam") ||
    msg.includes("via openapi")
  );
}

function markPostCap(userId: string) {
  postCapUntil.set(userId, Date.now() + POST_CAP_MS);
  const hit = creatorCache.get(userId);
  creatorCache.set(userId, {
    at: Date.now(),
    data: { ...(hit?.data ?? SANDBOX_CREATOR), can_post: false, postCapped: true },
  });
}

function isPostCapped(userId: string) {
  return (postCapUntil.get(userId) ?? 0) > Date.now();
}

const CREATOR_TTL_MS = 10 * 60 * 1000;
const creatorCache = new Map<string, { at: number; data: TikTokCreatorInfo }>();

const SANDBOX_CREATOR: TikTokCreatorInfo = {
  privacy_level_options: [SANDBOX_PRIVACY],
  comment_disabled: false,
  can_post: true,
};

function isRateLimitError(code?: string, message?: string) {
  const msg = (message ?? "").toLowerCase();
  return code === "rate_limit_exceeded" || msg.includes("rate limit");
}

async function fetchCreatorInfo(token: string, cacheKey: string): Promise<TikTokCreatorInfo> {
  if (isPostCapped(cacheKey)) {
    const hit = creatorCache.get(cacheKey);
    return { ...(hit?.data ?? SANDBOX_CREATOR), can_post: false, postCapped: true };
  }
  const hit = creatorCache.get(cacheKey);
  if (hit && Date.now() - hit.at < CREATOR_TTL_MS) return hit.data;

  const r = await fetch(TT_CREATOR, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({}),
  });
  const j = await r.json();
  if (!r.ok || (j.error?.code && j.error.code !== "ok")) {
    if (hit) return { ...hit.data, rateLimited: isRateLimitError(j.error?.code, j.error?.message) };
    if (isRateLimitError(j.error?.code, j.error?.message)) {
      return { ...SANDBOX_CREATOR, rateLimited: true };
    }
    throw new Error(j.error?.message || "Failed to load TikTok creator info");
  }
  const data = (j.data ?? {}) as TikTokCreatorInfo;
  if (data.can_post === false) markPostCap(cacheKey);
  creatorCache.set(cacheKey, { at: Date.now(), data });
  return data;
}

export const queryTikTokCreatorInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ accountId: z.string().uuid().optional() }).optional().parse(input),
  )
  .handler(async ({ data, context }) => {
    const auth = await getValidAccessToken(context.userId, data?.accountId);
    return fetchCreatorInfo(auth.token, auth.accountId);
  });

async function creatorPrivacyOptions(token: string, cacheKey?: string): Promise<string[]> {
  try {
    const info = await fetchCreatorInfo(token, cacheKey || token.slice(-12));
    const opts = info.privacy_level_options;
    return Array.isArray(opts) && opts.length ? opts : [SANDBOX_PRIVACY];
  } catch {
    return [SANDBOX_PRIVACY];
  }
}

export { PREFERRED_PRIVACY, SANDBOX_PRIVACY };

function pickPrivacy(requested: string, options: string[]) {
  if (requested && options.includes(requested)) return requested;
  for (const p of PRIVACY_FALLBACK) {
    if (options.includes(p)) return p;
  }
  return options[0] ?? SANDBOX_PRIVACY;
}

function isUnauditedAccountError(code?: string, message?: string) {
  const msg = message ?? "";
  return (
    code === "unaudited_client_can_only_post_to_private_accounts" ||
    msg.includes("content-sharing-guidelines")
  );
}

function explainTikTokPublishError(code?: string, message?: string) {
  if (isPostCapError(code, message)) return TIKTOK_POST_CAP_MSG;
  if (isRateLimitError(code, message)) {
    return "TikTok rate limit — wait about 10 minutes, then post again. Do not keep retrying; each try burns the quota.";
  }
  if (isUnauditedAccountError(code, message)) {
    return "TikTok blocked this post. Until the app is audited, you can only post Only me, and the connected TikTok account must be Private. In the TikTok app: Profile → Menu → Settings and privacy → Privacy → turn Private account ON. Then post again and choose Only me.";
  }
  return message || code || "TikTok publish failed";
}

async function initPhotoPost(
  token: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; json: { error?: { code?: string; message?: string }; data?: { publish_id?: string } } }> {
  const initRes = await fetch(TT_PHOTO_INIT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(body),
  });
  const json = await initRes.json();
  const code = json.error?.code;
  const ok = initRes.ok && (!code || code === "ok");
  return { ok, json };
}

const FANOUT_RE = /^tiktok_fanout:(.+)$/m;

type FanoutEntry = { publishId?: string; status?: string; error?: string; name?: string };
type FanoutMap = Record<string, FanoutEntry>;

function readFanout(notes: string | null | undefined): FanoutMap {
  const match = notes?.match(FANOUT_RE);
  if (!match?.[1]) return {};
  try {
    const parsed = JSON.parse(match[1]) as FanoutMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFanout(notes: string | null | undefined, fanout: FanoutMap) {
  const base = (notes ?? "").replace(FANOUT_RE, "").trimEnd();
  return `${base}${base ? "\n\n" : ""}tiktok_fanout:${JSON.stringify(fanout)}`;
}

async function publishPhotoCarousel(opts: {
  userId: string;
  postId: string;
  photoUrls: string[];
  title: string;
  description: string;
  privacyLevel: string;
  disableComment?: boolean;
  brandOrganic?: boolean;
  brandContent?: boolean;
  accountId?: string;
  persist?: "post" | "none";
}) {
  const persist = opts.persist ?? "post";
  if (opts.photoUrls.length < 1) throw new Error("No export slides to publish. Re-generate or re-export first.");
  if (opts.photoUrls.some((u) => u.startsWith("data:"))) {
    throw new Error("Slide URLs must be public https links (re-export the post).");
  }

  if (persist === "post") {
    const { data: existing } = await supabaseAdmin
      .from("posts")
      .select("tiktok_publish_id, tiktok_status, status")
      .eq("id", opts.postId)
      .single();
    const alreadyOut =
      Boolean(existing?.tiktok_publish_id) ||
      ["PUBLISHING", "PROCESSING", "PROCESSING_UPLOAD", "PUBLISH_COMPLETE"].includes(
        existing?.tiktok_status ?? "",
      );
    if (alreadyOut) {
      return { publishId: existing?.tiktok_publish_id ?? "", skipped: true, status: existing?.tiktok_status ?? "" };
    }
  }

  const auth = await getValidAccessToken(opts.userId, opts.accountId);
  const persistRow = async (patch: Record<string, unknown>) => {
    if (persist !== "post") return;
    await supabaseAdmin.from("posts").update(patch).eq("id", opts.postId);
  };
  if (isPostCapped(auth.accountId)) {
    await persistRow({ tiktok_status: "FAILED", tiktok_error: TIKTOK_POST_CAP_MSG });
    throw new Error(TIKTOK_POST_CAP_MSG);
  }

  const creator = await fetchCreatorInfo(auth.token, auth.accountId);
  if (creator.can_post === false || creator.postCapped) {
    markPostCap(auth.accountId);
    await persistRow({ tiktok_status: "FAILED", tiktok_error: TIKTOK_POST_CAP_MSG });
    throw new Error(TIKTOK_POST_CAP_MSG);
  }

  let privacy = pickPrivacy(opts.privacyLevel, creator.privacy_level_options ?? [SANDBOX_PRIVACY]);

  await persistRow({
    tiktok_status: "PUBLISHING",
    tiktok_error: null,
    tiktok_privacy_level: privacy,
  });

  const buildBody = (privacyLevel: string) => ({
    post_mode: "DIRECT_POST",
    media_type: "PHOTO",
    post_info: {
      title: opts.title.slice(0, 90),
      description: opts.description.slice(0, 2200),
      privacy_level: privacyLevel,
      disable_comment: opts.disableComment !== false ? true : false,
      auto_add_music: true,
      brand_content_toggle: Boolean(opts.brandContent),
      brand_organic_toggle: Boolean(opts.brandOrganic),
    },
    source_info: {
      source: "PULL_FROM_URL",
      photo_cover_index: 0,
      photo_images: opts.photoUrls.slice(0, 35),
    },
  });

  let { ok, json: initJson } = await initPhotoPost(auth.token, buildBody(privacy));
  if (
    !ok &&
    privacy !== SANDBOX_PRIVACY &&
    isUnauditedAccountError(initJson.error?.code, initJson.error?.message)
  ) {
    privacy = SANDBOX_PRIVACY;
    ({ ok, json: initJson } = await initPhotoPost(auth.token, buildBody(privacy)));
  }
  if (!ok) {
    if (isPostCapError(initJson.error?.code, initJson.error?.message)) {
      markPostCap(auth.accountId);
    }
    const msg = explainTikTokPublishError(initJson.error?.code, initJson.error?.message);
    await persistRow({ tiktok_status: "FAILED", tiktok_error: msg });
    throw new Error(msg);
  }

  const publishId = initJson.data?.publish_id as string;
  await persistRow({ tiktok_publish_id: publishId, tiktok_status: "PROCESSING" });

  // Poll status briefly
  let status = "PROCESSING_UPLOAD";
  const polls = persist === "post" ? 12 : 4;
  for (let i = 0; i < polls; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const sRes = await fetch(TT_STATUS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const sJson = await sRes.json();
    status = sJson.data?.status ?? status;
    if (status === "PUBLISH_COMPLETE") {
      await persistRow({
        tiktok_status: status,
        status: "posted",
        posted_at: new Date().toISOString(),
        tiktok_error: null,
      });
      return { publishId, status, skipped: false };
    }
    if (status === "FAILED") {
      const failMsg = sJson.data?.fail_reason || "TikTok reported FAILED";
      await persistRow({ tiktok_status: "FAILED", tiktok_error: failMsg });
      throw new Error(failMsg);
    }
  }

  await persistRow({ tiktok_status: status });
  return { publishId, status, skipped: false };
}

async function publishVideoSlideshow(opts: {
  userId: string;
  postId: string;
  videoUrl: string;
  title: string;
  description: string;
  privacyLevel: string;
}) {
  if (!opts.videoUrl.startsWith("https://")) {
    throw new Error("Video URL must be a public https link.");
  }

  const { data: existing } = await supabaseAdmin
    .from("posts")
    .select("tiktok_publish_id, tiktok_status, status")
    .eq("id", opts.postId)
    .single();
  const alreadyOut =
    Boolean(existing?.tiktok_publish_id) ||
    ["PUBLISHING", "PROCESSING", "PROCESSING_UPLOAD", "PROCESSING_DOWNLOAD", "PUBLISH_COMPLETE"].includes(
      existing?.tiktok_status ?? "",
    );
  if (alreadyOut) {
    return { publishId: existing?.tiktok_publish_id ?? "", skipped: true };
  }

  const auth = await getValidAccessToken(opts.userId);
  const privacy = pickPrivacy(
    opts.privacyLevel,
    await creatorPrivacyOptions(auth.token, auth.accountId),
  );

  await supabaseAdmin
    .from("posts")
    .update({
      tiktok_status: "PUBLISHING",
      tiktok_error: null,
      tiktok_privacy_level: privacy,
    })
    .eq("id", opts.postId);

  const initBody = {
    post_info: {
      title: (opts.description || opts.title).slice(0, 2200),
      privacy_level: privacy,
      disable_duet: false,
      disable_comment: false,
      disable_stitch: false,
      video_cover_timestamp_ms: 400,
      brand_content_toggle: false,
      brand_organic_toggle: false,
    },
    source_info: {
      source: "PULL_FROM_URL",
      video_url: opts.videoUrl,
    },
  };

  const initRes = await fetch(TT_VIDEO_INIT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify(initBody),
  });
  const initJson = await initRes.json();
  if (!initRes.ok || (initJson.error?.code && initJson.error.code !== "ok")) {
    const msg = initJson.error?.message || JSON.stringify(initJson);
    await supabaseAdmin
      .from("posts")
      .update({ tiktok_status: "FAILED", tiktok_error: msg })
      .eq("id", opts.postId);
    throw new Error(`TikTok video publish failed: ${msg}`);
  }

  const publishId = initJson.data?.publish_id as string;
  await supabaseAdmin
    .from("posts")
    .update({ tiktok_publish_id: publishId, tiktok_status: "PROCESSING" })
    .eq("id", opts.postId);

  let status = "PROCESSING_DOWNLOAD";
  for (let i = 0; i < 16; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const sRes = await fetch(TT_STATUS, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const sJson = await sRes.json();
    status = sJson.data?.status ?? status;
    if (status === "PUBLISH_COMPLETE") {
      await supabaseAdmin
        .from("posts")
        .update({
          tiktok_status: status,
          status: "posted",
          posted_at: new Date().toISOString(),
          tiktok_error: null,
        })
        .eq("id", opts.postId);
      return { publishId, status, skipped: false };
    }
    if (status === "FAILED") {
      const failMsg = sJson.data?.fail_reason || "TikTok reported FAILED";
      await supabaseAdmin
        .from("posts")
        .update({ tiktok_status: "FAILED", tiktok_error: failMsg })
        .eq("id", opts.postId);
      throw new Error(failMsg);
    }
  }

  await supabaseAdmin.from("posts").update({ tiktok_status: status }).eq("id", opts.postId);
  return { publishId, status, skipped: false };
}

export const tiktokPublishPhotoPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        postId: z.string().uuid(),
        privacyLevel: z.string().min(1),
        /** Optional override if client just uploaded fresh export URLs */
        photoUrls: z.array(z.string().url()).optional(),
        title: z.string().max(90).optional(),
        description: z.string().max(2200).optional(),
        disableComment: z.boolean().optional(),
        brandOrganic: z.boolean().optional(),
        brandContent: z.boolean().optional(),
        accountId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: post, error } = await context.supabase
      .from("posts")
      .select("*")
      .eq("id", data.postId)
      .eq("user_id", context.userId)
      .single();
    if (error || !post) throw new Error("Post not found");

    const urls = (
      data.photoUrls && data.photoUrls.length
        ? data.photoUrls
        : (post.export_slide_urls ?? []).filter((u) => !!u && u.startsWith("http"))
    ).filter((u) => !/\.mp4(\?|#|$)/i.test(u));

    if (data.photoUrls?.length || data.description) {
      await context.supabase
        .from("posts")
        .update({
          ...(data.photoUrls?.length ? { export_slide_urls: urls } : {}),
          ...(data.description ? { caption: data.description } : {}),
        })
        .eq("id", data.postId);
    }

    const caption = [post.caption ?? "", post.hashtags ?? ""].filter(Boolean).join("\n\n");
    return publishPhotoCarousel({
      userId: context.userId,
      postId: data.postId,
      photoUrls: urls,
      title: (data.title || editorialTitle(post.hook) || "Ryval").slice(0, 90),
      description: (data.description || caption || editorialTitle(post.hook) || "").slice(0, 2200),
      privacyLevel: data.privacyLevel,
      disableComment: data.disableComment,
      brandOrganic: data.brandOrganic,
      brandContent: data.brandContent,
      accountId: data.accountId,
    });
  });

async function tiktokAccountIdsForUser(userId: string) {
  const { data } = await supabaseAdmin
    .from("tiktok_accounts")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((row) => row.id as string);
}

export async function publishPhotoCarouselToAllAccounts(opts: {
  userId: string;
  postId: string;
  photoUrls: string[];
  title: string;
  description: string;
  privacyLevel: string;
}) {
  if (isPublerConfigured()) {
    const privacy =
      opts.privacyLevel === SANDBOX_PRIVACY ? PREFERRED_PRIVACY : opts.privacyLevel || PREFERRED_PRIVACY;
    const claim = `lock:${Date.now()}`;
    const { data: locked, error: claimError } = await supabaseAdmin
      .from("posts")
      .update({ tiktok_publish_id: claim, tiktok_status: "PROCESSING" })
      .eq("id", opts.postId)
      .is("tiktok_publish_id", null)
      .select("id");
    if (claimError) throw new Error(claimError.message);
    if (!locked?.length) {
      const { data: existing } = await supabaseAdmin
        .from("posts")
        .select("tiktok_publish_id")
        .eq("id", opts.postId)
        .maybeSingle();
      const current = String(existing?.tiktok_publish_id ?? "");
      if (current && !current.startsWith("lock:")) {
        return { publishId: current, results: [], skipped: true };
      }
      throw new Error("Already publishing");
    }

    const { data: post } = await supabaseAdmin
      .from("posts")
      .select("notes, hook")
      .eq("id", opts.postId)
      .single();
    try {
      await assignSingleTikTokAccount(opts.postId, post?.notes);
      if (await carouselAlreadyPosted(opts.title, opts.postId)) {
        await supabaseAdmin
          .from("posts")
          .update({
            tiktok_publish_id: null,
            tiktok_status: "FAILED",
            tiktok_error: "Held: this carousel was already posted",
            status: "needs_edit",
          })
          .eq("id", opts.postId)
          .eq("tiktok_publish_id", claim);
        throw new Error("Duplicate carousel");
      }
      const { data: assigned } = await supabaseAdmin
        .from("posts")
        .select("notes")
        .eq("id", opts.postId)
        .single();
      const only = tiktokOnlyAccount(assigned?.notes);
      if (!only) throw new Error("Post is not assigned to one TikTok account");
      const r = await publishTikTokCarouselViaPubler({
        photoUrls: opts.photoUrls,
        title: opts.title,
        description: opts.description,
        privacy,
        accountIds: [only],
      });
      const fanout: FanoutMap = {};
      for (const row of r.results) {
        fanout[row.accountId] = row.ok
          ? { publishId: row.jobId || r.publishId, status: "PUBLISH_COMPLETE", name: row.name }
          : { status: "FAILED", error: row.error, name: row.name };
      }
      const anyOk = r.results.some((row) => row.ok);
      const patch: Record<string, unknown> = {
        tiktok_status: anyOk ? "PUBLISH_COMPLETE" : "FAILED",
        tiktok_privacy_level: privacy,
        tiktok_error:
          r.results
            .filter((row) => !row.ok)
            .map((row) => row.error)
            .filter(Boolean)
            .join(" · ") || null,
        notes: writeFanout(assigned?.notes, fanout),
      };
      if (anyOk) {
        patch.tiktok_publish_id = r.publishId;
        patch.status = "posted";
        patch.posted_at = new Date().toISOString();
      }
      await supabaseAdmin.from("posts").update(patch).eq("id", opts.postId).eq("tiktok_publish_id", claim);
      if (!anyOk) throw new Error(String(patch.tiktok_error || "TikTok publish failed"));
      return { publishId: r.publishId, results: r.results, skipped: false };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "failed";
      const safeToRetry =
        /not assigned|Connect a TikTok|too many posts via OpenAPI|Duplicate carousel/i.test(msg);
      if (safeToRetry && !/Duplicate carousel/i.test(msg)) {
        await supabaseAdmin
          .from("posts")
          .update({ tiktok_publish_id: null, tiktok_status: "FAILED", tiktok_error: msg.slice(0, 280) })
          .eq("id", opts.postId)
          .eq("tiktok_publish_id", claim);
      } else if (!/Duplicate carousel/i.test(msg)) {
        await supabaseAdmin
          .from("posts")
          .update({ tiktok_status: "FAILED", tiktok_error: msg.slice(0, 280) })
          .eq("id", opts.postId)
          .eq("tiktok_publish_id", claim);
      }
      throw e;
    }
  }
  const accountIds = await tiktokAccountIdsForUser(opts.userId);
  if (!accountIds.length) throw new Error("Connect TikTok in Settings first.");

  const { data: post } = await supabaseAdmin
    .from("posts")
    .select("notes, tiktok_publish_id, tiktok_status")
    .eq("id", opts.postId)
    .single();
  const fanout = readFanout(post?.notes);
  const results: { accountId: string; ok: boolean; skipped?: boolean; error?: string }[] = [];

  for (const accountId of accountIds) {
    if (fanout[accountId]?.publishId) {
      results.push({ accountId, ok: true, skipped: true });
      continue;
    }
    if (isPostCapped(accountId)) {
      fanout[accountId] = { status: "CAPPED", error: TIKTOK_POST_CAP_MSG };
      results.push({ accountId, ok: false, error: TIKTOK_POST_CAP_MSG });
      continue;
    }
    try {
      const r = await publishPhotoCarousel({
        ...opts,
        accountId,
        persist: "none",
      });
      fanout[accountId] = { publishId: r.publishId, status: r.status || "PROCESSING" };
      results.push({ accountId, ok: true, skipped: r.skipped });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "failed";
      fanout[accountId] = { status: "FAILED", error: msg };
      results.push({ accountId, ok: false, error: msg });
    }
    await supabaseAdmin
      .from("posts")
      .update({ notes: writeFanout(post?.notes, fanout) })
      .eq("id", opts.postId);
  }

  const firstId = accountIds.map((id) => fanout[id]?.publishId).find(Boolean) ?? null;
  const anyOk = results.some((r) => r.ok);
  const pending = accountIds.some((id) => !fanout[id]?.publishId && fanout[id]?.status !== "CAPPED" && fanout[id]?.status !== "FAILED");
  const errors = results.filter((r) => !r.ok).map((r) => r.error).filter(Boolean);

  if (anyOk && !pending) {
    await supabaseAdmin
      .from("posts")
      .update({
        tiktok_publish_id: firstId,
        tiktok_status: "PUBLISH_COMPLETE",
        status: "posted",
        posted_at: new Date().toISOString(),
        tiktok_error: errors.length ? errors.join(" · ") : null,
        notes: writeFanout(post?.notes, fanout),
      })
      .eq("id", opts.postId);
  } else if (!anyOk) {
    await supabaseAdmin
      .from("posts")
      .update({
        tiktok_status: "FAILED",
        tiktok_error: errors[0] || "TikTok publish failed",
        notes: writeFanout(post?.notes, fanout),
      })
      .eq("id", opts.postId);
  } else {
    await supabaseAdmin
      .from("posts")
      .update({
        tiktok_status: "PROCESSING",
        notes: writeFanout(post?.notes, fanout),
      })
      .eq("id", opts.postId);
  }

  if (!anyOk) throw new Error(errors[0] || "TikTok publish failed");
  return { publishId: firstId ?? "", results, skipped: results.every((r) => r.skipped) };
}

const CAROUSELS_PER_HOUR = 1;

/** One carousel at a time. The scheduled time decides when it goes, and the publish lock stops a second send. */
export async function hourlyPublishRoom(): Promise<{ open: boolean; reason?: string }> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "posted")
    .gte("posted_at", since);
  if (error) throw new Error(error.message);
  if ((count ?? 0) >= CAROUSELS_PER_HOUR) {
    return { open: false, reason: "Already posted 1 carousel in the last hour" };
  }
  return { open: true };
}

/** One account per post. Rows missing tiktok_only get the account with fewer posts today. */
async function assignSingleTikTokAccount(postId: string, notes: string | null | undefined) {
  const existing = tiktokOnlyAccount(notes);
  if (existing) return existing;
  const since = Date.now() - 24 * 3600_000;
  const { data: rows } = await supabaseAdmin
    .from("posts")
    .select("notes, status, posted_at, scheduled_date")
    .in("status", ["posted", "scheduled"])
    .order("created_at", { ascending: false })
    .limit(40);
  const counts = new Map<string, number>(TIKTOK_PUBLISH_ACCOUNTS.map((account) => [account.id, 0]));
  for (const row of rows ?? []) {
    const when = row.status === "posted" ? row.posted_at : row.scheduled_date;
    if (!when || new Date(when).getTime() < since) continue;
    const id = tiktokOnlyAccount(typeof row.notes === "string" ? row.notes : null);
    if (id && counts.has(id)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const accountId = [...TIKTOK_PUBLISH_ACCOUNTS].sort(
    (a, b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0) || a.name.localeCompare(b.name),
  )[0]?.id;
  if (!accountId) throw new Error("Post is not assigned to one TikTok account");
  const next = withTikTokAccount(typeof notes === "string" ? notes : "", accountId);
  await supabaseAdmin.from("posts").update({ notes: next }).eq("id", postId);
  return accountId;
}

async function carouselAlreadyPosted(title: string, exceptId: string) {
  const since = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();
  const { data } = await supabaseAdmin
    .from("posts")
    .select("id, hook")
    .eq("status", "posted")
    .gte("posted_at", since)
    .neq("id", exceptId)
    .limit(80);
  const hooks = (data ?? []).map((row) => String(row.hook ?? "")).filter(Boolean);
  return isSameCarousel(title, hooks);
}

/** Cron / worker: publish due posts to every connected TikTok. Protected by CRON_SECRET. */
export async function runPublishDuePosts(opts: { secret: string; limit?: number }) {
  const expected = process.env.CRON_SECRET;
  if (!expected || opts.secret !== expected) throw new Error("Unauthorized");

  const room = await hourlyPublishRoom();
  if (!room.open) return { processed: 0, published: 0, results: [], skipped: room.reason };

  const now = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from("posts")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_date", now)
    .is("tiktok_publish_id", null)
    .order("scheduled_date", { ascending: true })
    .limit(1);

  if (error) throw new Error(error.message);

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const post of due ?? []) {
    try {
      if (!String(post.notes ?? "").includes("cta:phone")) {
        throw new Error("CTA slide was not rendered");
      }
      const urls = (post.export_slide_urls ?? []).filter(
        (u: string) => u?.startsWith("http") && !/\.mp4(\?|#|$)/i.test(u),
      );
      if (urls.length < 2) throw new Error("Carousel is missing the CTA slide");
      const privacy = post.tiktok_privacy_level || SANDBOX_PRIVACY;
      const caption = [post.caption ?? "", post.hashtags ?? ""].filter(Boolean).join("\n\n");
      const title = editorialTitle(post.hook) || "Ryval";
      await publishPhotoCarouselToAllAccounts({
        userId: post.user_id,
        postId: post.id,
        photoUrls: urls,
        title,
        description: caption || title,
        privacyLevel: privacy,
      });
      results.push({ id: post.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "failed";
      results.push({ id: post.id, ok: false, error: msg });
      if (/too many posts via OpenAPI/i.test(msg)) {
        const retryAt = new Date(Date.now() + 70 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from("posts")
          .update({
            tiktok_publish_id: null,
            tiktok_status: "FAILED",
            tiktok_error: msg.slice(0, 280),
            scheduled_date: retryAt,
          })
          .eq("id", post.id)
          .eq("status", "scheduled");
      }
    }
  }
  return { processed: results.length, results };
}

export const publishDueTikTokPosts = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ secret: z.string().min(1), limit: z.number().min(1).max(20).optional() }).parse(input),
  )
  .handler(async ({ data }) => runPublishDuePosts(data));

export const getTikTokPublishReady = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    let configured = true;
    try {
      tiktokEnv();
    } catch {
      configured = false;
    }
    const { data: rows } = await context.supabase
      .from("tiktok_accounts")
      .select("id, display_name, avatar_url, expires_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    const accounts = (rows ?? []).map((row) => ({
      id: row.id as string,
      display_name: row.display_name as string | null,
      avatar_url: row.avatar_url as string | null,
      expires_at: row.expires_at as string,
      postCapped: isPostCapped(row.id),
    }));
    const account = accounts[0] ?? null;
    const now = new Date().toISOString();
    const { count: dueCount } = await context.supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("status", "scheduled")
      .lte("scheduled_date", now)
      .is("tiktok_publish_id", null);
    const origin = cleanEnv(process.env.SUPABASE_URL);
    let redirectUri: string | null = null;
    try {
      redirectUri = tiktokEnv().redirectUri;
    } catch {
      redirectUri = null;
    }
    let publicUrl: string | null = null;
    if (redirectUri) {
      try {
        publicUrl = new URL(redirectUri).origin;
      } catch {
        publicUrl = null;
      }
    }
    let privacyOptions: string[] = ["SELF_ONLY"];
    if (account) {
      try {
        const auth = await getValidAccessToken(context.userId, account.id);
        privacyOptions = await creatorPrivacyOptions(auth.token, auth.accountId);
      } catch {
        /* still unaudited / token stale */
      }
    }
    const publer = await publerStatus();
    const usingPubler = publer.configured && !publer.error && publer.accounts.length > 0;
    return {
      configured: configured || publer.configured,
      publisher: usingPubler ? "publer" : "tiktok",
      connected: usingPubler ? publer.accounts.length > 0 : accounts.length > 0,
      displayName: usingPubler
        ? publer.accounts.map((a) => a.name).join(", ")
        : account?.display_name ?? null,
      expiresAt: account?.expires_at ?? null,
      accounts,
      publerAccounts: publer.accounts,
      publerError: publer.error ?? null,
      dueCount: dueCount ?? 0,
      redirectUri,
      publicUrl,
      storagePrefix: origin ? `${origin}/storage/v1/object/public/` : null,
      privacyOptions: usingPubler ? [PREFERRED_PRIVACY, SANDBOX_PRIVACY] : privacyOptions,
      canPostPublic: usingPubler ? true : privacyOptions.includes("PUBLIC_TO_EVERYONE"),
      postCapped: usingPubler ? false : accounts.length > 0 && accounts.every((row) => row.postCapped),
    };
  });

/** Logged-in user's due scheduled posts — used by the in-app worker (local + prod). */
export const publishMyDueTikTokPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const accountIds = await tiktokAccountIdsForUser(context.userId);
    const usingPubler = isPublerConfigured();
    if (!usingPubler && !accountIds.length) {
      return { processed: 0, published: 0, results: [] as { id: string; ok: boolean; error?: string }[] };
    }
    if (!usingPubler && accountIds.every((id) => isPostCapped(id))) {
      return { processed: 0, published: 0, results: [] as { id: string; ok: boolean; error?: string }[] };
    }

    const room = await hourlyPublishRoom();
    if (!room.open) {
      return { processed: 0, published: 0, results: [] as { id: string; ok: boolean; error?: string }[], skipped: room.reason };
    }

    const now = new Date().toISOString();
    const { data: due, error } = await context.supabase
      .from("posts")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "scheduled")
      .lte("scheduled_date", now)
      .is("tiktok_publish_id", null)
      .order("scheduled_date", { ascending: true })
      .limit(1);
    if (error) throw new Error(error.message);

    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const post of due ?? []) {
      try {
        if (!String(post.notes ?? "").includes("cta:phone")) {
          return { processed: 0, published: 0, results: [] as { id: string; ok: boolean; error?: string }[] };
        }
        const urls = (post.export_slide_urls ?? []).filter(
          (u) => u?.startsWith("http") && !/\.mp4(\?|#|$)/i.test(u),
        );
        if (urls.length < 2) throw new Error("Carousel is missing the CTA slide");
        const privacy = post.tiktok_privacy_level || SANDBOX_PRIVACY;
        const caption = [post.caption ?? "", post.hashtags ?? ""].filter(Boolean).join("\n\n");
        await publishPhotoCarouselToAllAccounts({
          userId: context.userId,
          postId: post.id,
          photoUrls: urls,
          title: editorialTitle(post.hook) || "Ryval",
          description: caption || editorialTitle(post.hook) || "",
          privacyLevel: privacy,
        });
        results.push({ id: post.id, ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "failed";
        results.push({ id: post.id, ok: false, error: msg });
      }
    }
    return {
      processed: results.length,
      published: results.filter((r) => r.ok).length,
      results,
    };
  });
