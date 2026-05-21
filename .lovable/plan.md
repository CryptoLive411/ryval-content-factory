## Goal

Turn Ryval into a hands-off TikTok content engine: every 8 hours, the system generates a new post, builds the slides, and publishes it directly to your TikTok account. No approval step. You only step in if you want to pause the queue or change the cadence.

---

## What you'll get

- A new **Autopilot** page in the app where you:
  - Connect your TikTok account (one-click OAuth)
  - Set the active "preset" (audience, category, tone, CTA, slidesPerPost) the bot uses
  - See the upcoming schedule, a live feed of what was posted, and any failures
  - One big **Pause / Resume** switch
- A background job that runs every 8 hours and does the full pipeline end-to-end
- All posts also land in your Library so you can browse history

---

## How the automation flows

```text
pg_cron (every 8h)
   └─> POST /api/public/hooks/autopilot-tick
         ├─ 1. Pick the active preset for the user
         ├─ 2. generatePosts(count: 1)          ← reuses existing AI pipeline
         ├─ 3. Render 1080x1350 PNGs           ← reuses tiktok-export logic, server-side
         ├─ 4. Upload PNGs to Supabase Storage (assets bucket, public)
         ├─ 5. TikTok Content Posting API:
         │     PHOTO carousel via PULL_FROM_URL
         │     post_mode: DIRECT_POST
         ├─ 6. Insert row in posts (status: 'posted') + autopilot_runs log
         └─ 7. On failure: log + mark run failed, do not retry the same content
```

The cron job is the only trigger — no client involvement, no laptop required.

---

## Pieces to build

### 1. TikTok connection
- Use the **TikTok connector** (`standard_connectors--connect`, connector_id `tiktok`)
- Required scopes for direct posting: `user.info.basic`, `video.publish`, `video.upload`, plus the photo-posting scope
- The connector gateway handles token refresh automatically; we just call `https://connector-gateway.lovable.dev/tiktok/post/publish/content/init/`

### 2. Database
New tables (RLS scoped to `auth.uid()`):
- `autopilot_settings` — one row per user: `is_active`, `cadence_cron` (default `0 */8 * * *`), `preset_json` (audience/category/tone/cta/slides), `tiktok_connected_at`
- `autopilot_runs` — one row per cron tick: `status` (`queued|generated|rendered|posted|failed`), `post_id`, `tiktok_publish_id`, `error`, `started_at`, `finished_at`

### 3. Server route: `/api/public/hooks/autopilot-tick`
- Authenticated via `apikey` header (Supabase anon key) — standard pg_cron pattern
- For each user with `is_active = true`:
  1. Call existing `generatePosts` logic (extracted into a shared helper so both the UI server fn and the cron route can use it)
  2. Render each slide to PNG on the server using `node-canvas`-compatible code OR reuse `@napi-rs/canvas` (Worker-compatible). If canvas isn't viable in the Worker runtime, we render via the Lovable AI image model directly (skip the HTML-canvas path entirely for the autopilot lane).
  3. Upload PNGs to the `assets` storage bucket → get public URLs
  4. POST to TikTok `post/publish/content/init/` with `media_type: PHOTO`, `post_mode: DIRECT_POST`, `photo_images: [urls]`, `title: caption + hashtags`
  5. Persist results

### 4. pg_cron schedule
```sql
select cron.schedule(
  'ryval-autopilot-8h',
  '0 */8 * * *',
  $$ select net.http_post(
       url := 'https://project--5230a4cc-e56d-46a8-affd-eaedaa29562d.lovable.app/api/public/hooks/autopilot-tick',
       headers := '{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
       body := '{}'::jsonb
     ) $$
);
```

### 5. UI: `/autopilot` route
- "Connect TikTok" button → triggers connector flow
- Preset form (re-uses the Generate page form fields)
- Active toggle + Pause button
- Table of last 30 runs with status, posted-at, link to TikTok post, error message if any

---

## Important constraints to know up front

1. **TikTok app approval.** TikTok's Content Posting API has two modes:
   - *Unaudited app* → posts go to your TikTok inbox as a **draft** you tap "Post" on. Still 95% automated, but not zero-touch.
   - *Audited app* → true `DIRECT_POST`, fully hands-off. Requires submitting the app for TikTok review (typically 1–3 weeks).
   The Lovable TikTok connector currently runs against an unaudited app surface, so realistically **the first version ships as "auto-drafts to your TikTok inbox, one tap to publish"**. We'll wire `DIRECT_POST` so the moment the app is audited it flips to truly hands-off with zero code change.

2. **Image rendering on the server.** The current export uses browser Canvas. The cron route runs on Cloudflare Workers (no browser). We have two options:
   - Use `@napi-rs/canvas` or `skia-canvas` — may not work on Workers
   - Recommended fallback: generate the slide images with the Lovable AI image model (Nano Banana 2) using the slide text + scene prompt we already produce. This is what the Generate page already does for backgrounds; we extend it to render the full composed slide. Slightly different visual style than the in-app preview, but zero runtime risk.

3. **Cost.** 3 posts/day × 7 slides × image generation ≈ ~630 Lovable AI image calls/month + the text generation. Watch the credit balance; we'll surface it in the Autopilot page.

4. **TikTok rate limits.** 3/day is well under TikTok's posting limits, no issue.

---

## What I need from you before building

- Confirm: ship the "auto-draft to TikTok inbox" version now, and we flip to true `DIRECT_POST` once you submit the app for TikTok audit? (This is the only way to actually start running this week.)
- Confirm the initial preset (audience / category / tone / CTA / slides per post) the bot should use, or I'll mirror whatever you used in your last Generate run.
