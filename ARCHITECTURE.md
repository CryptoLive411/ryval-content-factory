# Ryval Content Forge — architecture

This is how the live system makes and publishes TikTok carousels. It describes the code that is running, not an older design.

The short version: a timer wakes the app about every 2 minutes. The app picks one written recruiting story, pairs it with a soccer photo, renders slides, saves them, and later sends that one carousel to one TikTok through Publer. The model is not called on this path.

`HOW-POSTS-WORK.md` is the shorter operator guide. This file is the map of the whole machine.

## What is running

| Piece | What it is |
| --- | --- |
| App | TanStack Start app, built with `bun run build:node` (`FORGE_NODE=1 vite build`) |
| Process | `scripts/node-host.mjs` serves `dist/server/server.js` on `127.0.0.1:3000` |
| Server | Droplet `68.183.112.176` (`volume-tx`). App directory `/opt/ryval-content-forge`. Public host `https://ryvalcontent.space` |
| Process manager | systemd `ryval-forge.service`. Working directory `/opt/ryval-content-forge`. Environment comes from `.env` on the server |
| Clock | systemd `ryval-forge-cron.timer`, about every 2 minutes. It runs `scripts/cron-publish.sh` |
| Cron script | Takes a lock at `/tmp/ryval-forge-cron.lock`, then `curl`s `POST /api/cron/publish-due` with `Authorization: Bearer $CRON_SECRET` |
| Database | Supabase. The queue is the `posts` table. Settings are `user_settings`. Rendered JPEGs go in the `assets` storage bucket |
| Publisher | Publer API, `https://app.publer.com/api/v1`. Header `Authorization: Bearer-API`. Workspace header `Publer-Workspace-Id` |
| Direct TikTok | The Settings “Connect another TikTok” button is a separate OAuth path. Autopilot does not publish through it |

Caddy sits in front of the Node process. The cron hits localhost, not the public URL.

Secrets live in `.env` (Supabase, `CRON_SECRET`, Publer, OpenAI). They are not repeated here.

## One wake-up, in order

`handleCronPublishDue` in `src/server.ts` does this on every cron hit:

1. **Fill.** `runAutopilotFill({ maxPosts: 2 })` in `src/lib/autopilot-worker.ts`. Adds up to 2 missing posts so the next 24 hours of slots stay full. If this throws, the cron still tries to publish.
2. **Room.** `hourlyPublishRoom()` in `src/lib/tiktok.functions.ts`. If any post has `status = posted` and `posted_at` inside the last 60 minutes, the cron stops with “Already posted 1 carousel in the last hour.” `CAROUSELS_PER_HOUR` is 1, across all accounts together.
3. **Render.** `renderNextDueCarousel()`. The oldest row with `status = scheduled`, `scheduled_date <= now`, and `tiktok_publish_id` null. If the notes already contain `cta:phone`, it is already rendered and the id is returned. If render throws, the row becomes `needs_edit` and this wake-up publishes nothing.
4. **Publish.** `runPublishDuePosts({ limit: 1 })`. One carousel, to the one account stored on that row.

A row with any `tiktok_publish_id`, including a leftover `lock:...`, is invisible to steps 3 and 4.

## The clock

| Rule | Value | Where |
| --- | --- | --- |
| Wake-up | about every 2 minutes | `ryval-forge-cron.timer` |
| Posts created per wake-up | 2 | `maxPosts: 2` in `src/server.ts` |
| Posts per account per Eastern day | 2 | `POSTS_PER_ACCOUNT_PER_DAY` in `src/lib/tiktok-accounts.ts` |
| Daily total | 6 | 3 connected accounts × 2 |
| How far ahead the queue is filled | 24 hours | `autopilot_queue_hours`, forced to at least 24 in the worker |
| Gap between times | uneven, about 80 to 240 minutes, never `:00` | `irregularDaySlots()` in `src/lib/post-times.ts` |
| Soonest a new slot | 8 minutes from now | `nextIrregularSlots()` |
| Posts published per hour | 1, all accounts combined | `CAROUSELS_PER_HOUR` |
| A day | Eastern calendar day (`America/New_York`), not a rolling 24 hours and not midnight UTC | `etDayKey()` |

Minutes are chosen from 4, 7, 11, 14, 18, 22, 26, 29, 33, 36, 41, 44, 48, 52, 57. The choice is a hash of the day, so the same day always gets the same times. A new time within 40 minutes of a time that is already scheduled is skipped.

The account for a slot is whichever connected TikTok is furthest under 2 posts on that Eastern day. The count includes posts already `posted` that day and posts `scheduled` later that same day. If every account is at 2, that slot is skipped and the filler tries the next time. It does not stop the rest of the day.

Autopilot stays on until the Settings switch “Keep autopilot on” is turned off (`user_settings.autopilot_enabled`). The worker skips a user only when that flag is explicitly false.

`intervalHours` is still stored in settings. The slot grid does not read it. Times come from `post-times.ts`.

## The three TikToks

Publishing uses whatever TikToks are connected in the Publer workspace, minus two retired ids. `listPublerTikTokAccounts()` in `src/lib/publer.ts` does that. If Publer cannot be listed, the worker falls back to `TIKTOK_PUBLISH_ACCOUNTS`.

| Publer name | Id | Desk | Voice |
| --- | --- | --- | --- |
| RyvalApp | `6abe9727a5ec3e563ea0b303` | `ryval` | Authority, data, coach-side product |
| Ryval Sports \|\| Recruting App | `6ad133f38b0dd8294cc724bf` | `education` | Rules, mistakes, scholarships, eligibility, outreach |
| Ryval Sports | `6ad1325434d9fdc54190acff` | `media` | College soccer context, pathways, and one real result when there is one |

Retired, and never posted to even if they reappear in Publer:

- `6abc4908fc02e0080c3174e6` (@ryvalapp2)
- `6abe96cf0211835ae4f6a762` (@ryvalapp3)

`DESK_BY_ACCOUNT` in `src/lib/recruiting-stories.ts` maps those three live ids. A TikTok that is connected but not in that map gets a desk by its position in the list: ryval, then education, then media.

One carousel never goes to more than one account. The chosen id is stored in the post notes as `tiktok_only:<publer account id>`.

The internal `account` column on the row is still the label `recruiting_truth`. That is not a TikTok. The TikTok is only `tiktok_only`.

`PUBLER_TIKTOK_NAMES` in `.env` is an old name filter and is not used. Account choice is the live Publer list minus the retired ids.

Publer’s API can list accounts. It cannot remove one (the key gets 403 on delete). Removing a TikTok is done in Publer under Social Accounts.

## Where the words come from

The model is not called on this path. While the first-week slate in `src/lib/week-one-slate.ts` still has an unused story for that account's desk, the cron uses that story next, in day order. Those 42 briefs carry their own caption, family, and objective. A story with `ready: false`, or a `reviewAfter` date that has passed, is skipped. When the slate for that desk is used up, the evergreen catalog below takes over. The generic NCAA "record is not a roster opening" news post only runs on the media desk after that desk's slate is finished.

Autopilot does not call OpenAI.

`generateEditorialPosts()` in `src/lib/generate.functions.ts` returns immediately to `autopilotStoryPost()` when there is no `promptOverride`. The Generate page is the only path that still sends a prompt to the model. That path is not what the cron uses.

The catalog is the array `RECRUITING_STORIES` in `src/lib/recruiting-stories.ts`. There are 64 stories:

| Kind | Count | What it is |
| --- | --- | --- |
| `education` | 54 | One recruiting rule, mistake, or how-to |
| `data` | 5 | A number, labeled as a number |
| `product` | 3 | What Ryval actually does |
| `brand` | 1 | One brand question |
| `news` | 1 | A written news-shaped story in the catalog |

Desk split inside the catalog: education 44, media 14, ryval 6. Education is the dominant kind. If an account’s own unused stories are gone, the picker spills into education instead of repeating that account’s last post.

A story object has:

- `id` — stable name, written onto the post as `lane:<id>`
- `kind` — `education`, `news`, `data`, `product`, or `brand`
- `desk` — which account voice it prefers
- `gender` — `men`, `women`, or `any`
- `hook` and `hookBody` — the cover
- `slides` — usually 2 to 4. The gate rejects more than 4
- `ctaHeadline` and `ctaBody` — the last slide, specific to the lesson
- `screen` — which app screenshot sits inside the phone (`/app-screens/...`)

`storyPassesGate()` rejects a story before it can be queued if:

- the hook is under 4 words or over 16
- the hook is a generic listicle (`5 recruiting tips`, `how to get recruited`, and the same family)
- the copy matches the slop list in `looksLikeSlop()` (`period`, `take control`, `link in bio`, `the reality is`, and similar)
- the CTA is empty
- an inner slide repeats the hook
- an inner slide is empty

### What is not a source

These exist in the repo and are not the autopilot path:

- School spotlights (`src/lib/school.functions.ts`, school fact packs, campus photos). The filler does not call them.
- The season-rankings carousel (`generateSeasonBoardPost`). `wantSeason` in `src/lib/autopilot-queue.ts` is `false`.
- Story ingestion / RSS (`src/lib/story-ingest.ts`). Not called by the cron.
- Player photos uploaded by users. There is no permission flow, and autopilot does not use one.

Facts that can change live in the story text. If the NCAA changes a number, the story object is what has to change. The important current ones, checked against NCAA.org:

- Opt-in Division I schools no longer share a 9.9 (men) or 14 (women) scholarship pool. The soccer roster limit is 28. A school may fund rostered players and does not have to fund all 28. A school that did not opt in cannot pass the old pool without joining the settlement.
- Division II still uses equivalencies: men’s soccer 9.0, women’s soccer 9.9. Division III cannot award athletic aid.
- Division I eligibility is no longer only “4 seasons in 5 years.” Fall 2027 enrollees use the age-based model (up to five years, not a guaranteed five seasons). The 2026–27 enrolling class gets whichever of the old or new rule helps them more. The Eligibility Center certifies the start.
- NIL is not a professional contract. A pro contract can still affect eligibility. Those slides are a map, not legal advice.
- Illustrative numbers, including the cost-comparison story, are labeled as examples. They are not sourced stats.

Class-year stories (class of 2027, 2028, 2029) were written for fall 2026. They go stale after the season.

## How one story is chosen

`autopilotStoryPost()` does this:

1. Load up to 2,000 posts from the last 60 days for this user (`hook` and `notes`, pages of 500). This is `loadTitleMemory()`. It does not filter by status, so a held `needs_edit` row still counts as “already said.”
2. Load the latest 80 posts for photos and gender.
3. Decide the photo gender with `nextPostGender()`: about 2 men’s posts, then 1 women’s post, based on the recent rows.
4. Take the desk the queue asked for (`data.desk`). If the queue did not pass one, the default is `education`.
5. Maybe build a news story (next section). If that returns nothing, call `pickRecruitingStory()`.

`pickRecruitingStory()`:

1. Drop any story id in the 12 most recent ids (`skipStoryIds` are prepended, so a story the queue just rejected is in that set).
2. Keep stories that pass the gate and match this turn’s gender. `any` can run on either turn. A `men` story only runs on a men’s turn.
3. Prefer a story that has never been used, whose hook is not a near-duplicate, and whose `desk` matches this account.
4. If that desk has nothing left, use unused education stories.
5. If nothing is unused, use a story whose hook is not a near-duplicate of the memory.
6. If the catalog is exhausted, use the least recently used story that is outside the last two weeks of hooks and ids.
7. If that is also empty, rotate to the oldest story that is outside the most recent full pass of the catalog.
8. Last resort: the single oldest story that still passes the gate.

“Near-duplicate” is `isSameCarousel()` in `src/lib/content-quality.ts`. It is true when the hooks share a Jaccard similarity of 0.72 or more, or when one hook’s subject contains the other.

Old lane titles already posted are mapped onto the new ids by `canonicalStoryId()`, so a post titled “Transfer portal minutes” still blocks `portal-is-not-a-plan`. The old 9.9 and old eligibility-clock posts are not mapped. Those facts were corrected and are allowed to run as the new stories.

The queue has a second, shorter check. After the story is written, `fillAutopilotQueue()` compares the hook only with the last 12 hooks. If it matches, it passes that story id back as `skipStoryIds` and asks again, up to 4 times. That is what stops the machine from rejecting the same oldest story forever once every catalog hook is inside the 60-day memory. The 60-day block still lives inside the picker, where another story can be chosen. The queue only blocks a repeat of the last 12.

At 6 posts a day, 64 stories do not cover 60 days. After the catalog has been used, the picker rotates. It does not stop the day, and it does not replay story 0 every hour.

Posted rows are kept on purpose. Deleting them would let those topics come back.

## College stats

Every account tries a college stats post before the slate and the catalog (`pickCollegeStatsStory()` in `src/lib/college-stats.ts`, called from `autopilotStoryPost()`). The data is Ryval's public college soccer API, not the third-party NCAA mirror. The post carries a `stat_spec:` line in `notes`, `kind:stats`, and `stats:<family>`. `scripts/render-slides.mjs` hands any post with that line to `scripts/render-stats.mjs`. `HOW-POSTS-WORK.md` has the families, the checks, and the switch (`STATS_DESKS`).

## News

News is the one live external source.

`maybeNewsStory()` runs only when the desk is `media`, and only when none of the last 8 posts have `kind:news`. It calls `fetchNcaaSeasonBoard(gender)` in `src/lib/ncaa-live.ts`.

That function reads the public NCAA stats API at `https://ncaa-api.henrygd.me`:

- team win-loss table for Division I soccer, men or women, current season
- United Soccer Coaches rankings
- goals and assists leaderboards
- the NCAA news feed

Teams with fewer than 6 games (wins + losses + ties) are dropped. The top 6 by winning percentage are kept. The first of those whose name is not already in a recent hook, and whose id `news-<sport>-<team-slug>` is unused, becomes the post.

`newsStoryFromRecord()` writes a short hook from the real record. An unbeaten team gets “still hasn’t lost.” A team with a loss gets “is 10–1–2” (the actual numbers). The slides then say a record is not a roster opening. The record is not invented, and the slides do not invent a recruiting consequence that the scoreboard does not contain.

If the fetch fails, or every top team was already used, the function returns null and the picker uses a catalog story instead.

The source line on the post is `NCAA Division I men’s soccer: <team> is <record> this season` (or women’s). The stats page the board cites is `https://www.ncaa.com/stats/soccer-men/d1` or the women’s equivalent. The feed’s `updated` field says which game day the table includes.

## How the slides are written

The story becomes columns on the `posts` row:

| Column | Contents |
| --- | --- |
| `hook` | Cover. Headline and body packed as `headline\n---\nbody` |
| `slide_2` … `slide_5` | The inner slides, in order. Unused columns stay empty |
| `slide_6` | Empty. Stories are not padded out to six slides |
| `cta` | The lesson’s own last-slide line |
| `caption` | The cover body, used as the TikTok description |
| `hashtags` | `#collegesoccer #soccerrecruiting #ryval` |
| `notes` | See the markers below |

`postProcessBrandPost()` in `src/lib/content-quality.ts` then caps the words. The story CTA is written back after that, so a generic “download Ryval” cannot replace the lesson.

| Piece | Limit |
| --- | --- |
| Cover headline | 16 words |
| Other headlines | 14 words |
| Cover body | 32 words |
| Other body | 40 words |
| CTA headline | 18 words |

`stripProductMentions()` removes the word “ryval” from body slides. The product name belongs on the last slide. Empty strings stay empty. The renderer skips them.

`openCover()` only rewrites covers that start like “N facts you still get wrong about…”. A normal hook is left alone.

## Notes on the row

Each marker is its own line. `topicFromNotes()` reads only the `lane:` line.

| Marker | Meaning |
| --- | --- |
| `lane:<story id>` | Which story. This is the memory key |
| `kind:<education\|news\|data\|product\|brand>` | Mix tracking, including the “no news in the last 8” gate |
| `desk:<ryval\|education\|media>` | Which voice the story was written for |
| `tiktok_only:<publer id>` | The one account that will receive it |
| `cta:phone` | The JPEGs have been rendered with the phone slide |
| `tiktok_fanout:<json>` | Per-account publish result after Publer answers |

`sport:` is not required on the current story path. Gender is decided at generation time and stored by which photos were used.

## Where the photos come from

Not generated. Not a player’s face from the internet at random. `pickStockPhoto()` in `src/lib/stock-photos.ts` chooses from a local allowlist.

The files are `public/stock/<unsplash id>.jpg`, indexed by `src/data/stock-catalog.json`. Unsplash tags are not trusted. The allowlist is:

- college or pro women, Jeffrey F Lin match photos, about 138, with sideline coaches and referees removed
- college men, only the four ids in `COLLEGE_MEN`
- stadiums, about 114
- fields, about 31
- balls, about 24

`NOT_SOCCER` drops frames that are not a soccer ground (an Australian-rules oval, and a city skyline that was tagged as a pitch). `COACH_FRAMES` is empty. Two Jeffrey F Lin frames that read as women stay in the women’s pool even though `COLLEGE_MEN` is checked first.

`shotKindFor()` picks the kind from the slide sentence:

- ball or cleat → ball
- stadium, crowd, or matchday → stadium
- visa, permit, scholarship, eligibility, GPA, clock, passport, I-20, or amateur → stadium, before any player word. A rule slide does not get a face
- film, tape, a position, minutes, showcase, or scout → a player of this post’s gender
- field, pitch, grass, or training → field
- anything else on a women’s turn → a woman playing
- anything else on a men’s turn → a field, unless a college-man frame is still unused on this post

The same photo is not used twice inside one post. Photos from the latest 80 posts are avoided until that pool runs out. A men’s frame, once used on the post, falls through to a field, stadium, or ball. The other gender is never used.

The last image in `bg_images` is not a stock photo. It is the CTA background from `nextCtaBackground()` in `src/lib/brand.ts` (`public/cta-bg/`). The phone screenshot is `app_screen_url` from the story (`public/app-screens/`). The mark is `public/ryval-mark.png`.

## How the JPEGs are made

At queue time the worker renders immediately, then uploads.

`runRender()` in `src/lib/autopilot-worker.ts` writes the post JSON to a temp file and runs:

`node scripts/render-slides.mjs <post.json> <out dir>`

with `cwd` set to the app directory. The server must have that script next to `dist/`. It is not inside the Vite bundle.

`scripts/render-slides.mjs` draws 1080×1350 JPEGs.

- Display face: Anton (`public/fonts/Anton-Regular.ttf`), registered as `RyvalDisplay`
- Body face: Inter (`public/fonts/Inter.ttf`), registered as `RyvalBody`
- Accent: `#7CF250` on words like NOT, NEVER, and LOST, and on numbers
- Cover headline can wrap up to 6 lines. Inner headlines use the default of 4
- A leading number is stripped only when it is a list index (`1.` or `1)`). “9 is the team pool” keeps the 9
- A cover that starts with “Men’s” or “Women’s” lifts that into a kicker so the headline can be the rest of the sentence
- The last slide is an iPhone frame (`public/app-screens/iphone-16-pro-frame.png`), the story’s screenshot inside it, and the CTA line. The phone has to stay on the canvas

Slides with text but no photo are dropped rather than failing the carousel.

The JPEGs upload to Supabase storage:

`assets / <user id> / exports / <post id> / slide-01.jpg` …

Those public URLs are saved on the row as `export_slide_urls`. The notes gain `cta:phone`.

At publish time, if `cta:phone` is already there, the cron does not render again. It sends the stored URLs.

## What gets saved

`fillAutopilotQueue()` inserts one `posts` row per slot:

- `status`: `scheduled`
- `scheduled_date`: the uneven time, ISO
- `platform`: `tiktok`
- `account`: `recruiting_truth` (internal label only)
- `tiktok_privacy_level`: `PUBLIC_TO_EVERYONE`
- `cta_type`: `download app`
- `audience` and `category`: rotated from a small fixed list so the row has a label. They do not change the story text
- `tone`: `direct`
- `bg_images`: stock URLs plus the CTA background
- `logo_url`, `app_screen_url`
- the slide columns and `notes` described above

`post_status` values used in this app: `idea`, `drafted`, `needs_edit`, `approved`, `designed`, `scheduled`, `posted`, `winner`, `reuse_later`. There is no `draft` status. Autopilot writes `scheduled` directly. `needs_edit` means “do not publish.”

The user id the cron fills is whoever has a row in `tiktok_accounts`. That table is the old direct-TikTok connection. It is how the worker finds which Supabase user owns the queue. It is not the list of TikToks that get the post.

## What happens at the scheduled time

When `scheduled_date` has passed and the hourly room is open:

1. Render, if `cta:phone` is missing.
2. `publishPhotoCarouselToAllAccounts()` sets `tiktok_publish_id` to `lock:<timestamp>` and `tiktok_status` to `PROCESSING`, but only if `tiktok_publish_id` is still null. A second cron that sees the lock throws “Already publishing” and does not clear it.
3. If the hook matches a carousel posted in the last 14 days, the lock is cleared, status becomes `needs_edit`, and the error is “Held: this carousel was already posted.”
4. The `tiktok_only` id is read. Publer is asked to schedule that one account. An immediate “publish now” call does not create a TikTok post, so the code always sends `scheduled_at` about 75 seconds ahead (`POST /posts/schedule`).
5. Photos are uploaded to Publer from the public JPEG URLs first.
6. `confirmAccountPost()` polls Publer for up to 4 minutes. It looks for that account id and the exact title in `state=published` or `state=failed`. A post that is only `scheduled` is not success. An empty `payload.failures` object means the schedule job was accepted, not that TikTok has the video yet.
7. On success: `status` becomes `posted`, `posted_at` is now, `tiktok_status` is `PUBLISH_COMPLETE`, and the lock is replaced with the Publer job id.
8. On a failure before Publer accepts the job (`not assigned`, `Connect a TikTok`, `too many posts via OpenAPI`), the lock is cleared so a later cron can retry.
9. On any other failure (timeout, “wait until your other download media from URL jobs…”), the lock stays and `tiktok_status` is `FAILED`. The row would sit invisible forever. The next fill moves any `scheduled` row whose `tiktok_publish_id` starts with `lock:` to `needs_edit`, so a dead lock cannot block the queue.

Privacy on the TikTok post is public (`PUBLIC_TO_EVERYONE`).

Publer errors that have actually stopped a send: “Publer job timed out”, “Please wait until your other download media from URL jobs…”, and “too many posts via OpenAPI”.

## Gender, and what the three accounts do not share

Men’s and women’s soccer are different. The cover says which one when the story is gendered. Photos follow that gender and never the other one.

The three accounts do not get the same story on the same pass. The picker prefers each account’s desk, then spills to education only when that desk is out of unused stories. The queue will not save a hook that matches one of the last 12 hooks, so the three accounts do not post the same line back to back.

## What you can change

| You want | Change |
| --- | --- |
| Different words | That object in `RECRUITING_STORIES` |
| A new story | Append an object with a new `id`. It has to pass `storyPassesGate()` |
| Which account a story prefers | Its `desk` |
| How long a repeat is blocked | `loadTitleMemory()` is 60 days. The queue’s extra check is the last 12 hooks. A bigger catalog is a longer gap before rotation |
| Shorter or longer headlines | The caps in `postProcessBrandPost()` |
| Rankings carousel | `wantSeason` in `src/lib/autopilot-queue.ts`. It is `false` |
| Posts per account | `POSTS_PER_ACCOUNT_PER_DAY` |
| The uneven times | `irregularDaySlots()` in `src/lib/post-times.ts` |
| More than one publish per hour | `CAROUSELS_PER_HOUR` |
| Another college men’s photo | Add the id to `COLLEGE_MEN` after looking at the frame |
| A photo that should never appear | `NOT_SOCCER` |
| Which TikToks are live | Connect or remove them in Publer. Retired ids are `RETIRED_TIKTOK_IDS` |
| Stop the machine | Settings switch “Keep autopilot on” |

After a code change, the droplet does not pick it up until `dist/` is rebuilt and `ryval-forge` is restarted. A change to `scripts/render-slides.mjs` also has to be copied to `/opt/ryval-content-forge/scripts/render-slides.mjs`, because the server runs that file from the app directory, not from the bundle.
