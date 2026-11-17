# Content Forge — TikTok Autopost setup

## Env vars (server)

```
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
TIKTOK_REDIRECT_URI=https://YOUR_DOMAIN/tiktok-callback
CRON_SECRET=long-random-string
LOVABLE_API_KEY=
OPENAI_API_KEY=   # optional, for gpt-image-1 engine
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Public app: `https://ryvalcontent.space`
Redirect: `https://ryvalcontent.space/tiktok-callback`
Terms: `https://ryvalcontent.space/legal/terms.html`
Privacy: `https://ryvalcontent.space/legal/privacy.html`

Restart `bun run dev` after changing `.env`. This app only auto-injects `VITE_*` into the browser; TikTok keys are loaded onto the server from `.env` / `.dev.vars`.

## Database

Apply migration:

```bash
supabase db push
# or run supabase/migrations/20260915200000_tiktok_autopost.sql in the SQL editor
```

## TikTok Developer Portal

1. Create an app → add **Content Posting API** → enable **Direct Post**
2. Request scopes: `user.info.basic`, `video.publish`
3. Add redirect URI matching `TIKTOK_REDIRECT_URI`
4. Verify your Supabase Storage public domain for `PULL_FROM_URL` photo posts
5. Until audit: privacy must be `SELF_ONLY` (private). Submit Content Posting API for production review to unlock `PUBLIC_TO_EVERYONE`.
6. After audit: reconnect TikTok in Settings. Autopilot prefers public.

Run `supabase/migrations/20260916020000_autopilot.sql` in the SQL editor so Settings can save queue preferences.

## Autopilot

1. Settings → Queue the next 12 hours (generates + exports + schedules hourly posts)
2. Supabase Edge Function `publish-due-posts` publishes due posts every 10 minutes — laptop can sleep
3. Secrets on the function: `CRON_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Cron

- Supabase: Edge Functions → `publish-due-posts` → Cron `*/10 * * * *`
- Or HTTP: `POST https://<project>.supabase.co/functions/v1/publish-due-posts` with `Authorization: Bearer $CRON_SECRET`
- Cloudflare: `wrangler.jsonc` `*/2 * * * *` still hits the app if it is deployed

## Flow

1. Generate → quality slides saved with `export_slide_urls`
2. Library → Schedule or Post to TikTok now
3. Cron publishes due `status=scheduled` posts via Photo Direct Post API
