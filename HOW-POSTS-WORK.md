# How Ryval posts get made

This is the live path. A post is not written by ChatGPT at publish time. It is one recruiting idea from `src/lib/recruiting-stories.ts`, given a matching photo, scheduled onto one TikTok account, rendered into slides, and sent through Publer.

Autopilot is on. A timer on the server hits the app about every 2 minutes. Each hit does three things, in order:

1. Add up to 2 missing posts so the next 24 hours of slots stay full.
2. If nothing has published in the last hour, render the oldest due post.
3. Publish that one post to its one TikTok account.

If step 1 fails, steps 2 and 3 still run.

## College stats posts (added 2026-11-17)

RyvalApp and Ryval Sports now try a college stats post first for each of their slots. Ryval Sports || Recruting App keeps the recruiting lessons. At 2 posts per account per day, that is 4 stats posts and 2 lessons a day. `STATS_DESKS` in `src/lib/college-stats.ts` is the switch. Remove a desk there to give that account back to the stories.

The numbers come from Ryval's own public API (`https://api.ryvalsports.app/college-soccer/...`), the same data the app and the web dashboard show. Nothing is written by a model.

| Family | What it is | Source | Id (memory key) |
| --- | --- | --- | --- |
| Scores | The day's results for one division and side, biggest win on the cover, every game on scoreboards (NCAA rounds first, then conference finals). Shootouts show who advanced | NCAA.com scoreboard, bracket for shootout winners | `cs-scores-<gender>-d<n>-<date>` |
| NCAA tournament | "It starts Thursday": the field and every matchup with seeds and dates. "Sweet 16": a wall of every team still alive, then the next round | NCAA.com official bracket | `cs-ncaa-<gender>-d<n>-next-<round>`, `...-alive-<n>` |
| Leaders | Top 5 in goals, assists, points, saves or shutouts, then the leader's full line and the best true freshman | Each school's stat page | `cs-leaders-<metric>-<gender>-d<n>-<ISO week>` |
| Team stats | Best defense, best attack, goal difference, shutout rate, finishing | NCAA.com results | `cs-team-<metric>-<gender>-d<n>-<ISO week>` |
| Streaks | Longest active unbeaten run, win streak, clean-sheet streak | Schools' schedules checked against NCAA.com | `cs-streak-<board>-<gender>-d<n>-<through date>` |
| Coaches' poll | D1 top 10, with movement | United Soccer Coaches via NCAA.com | `cs-poll-<gender>-d1-<release>` |
| Top performers | Yesterday's (or the day before's) best lines, with each result and round | NCAA.com box scores | `cs-performers-<gender>-d<n>-<date>` |
| Team of the Week | Ryval's Player of the Week, then the XI on a pitch | NCAA.com box scores, Ryval's pick | `cs-totw-<gender>-d<n>-<week start>` |
| Freshmen | Top 5 true freshmen (roster says Fr.) by points | Each school's stat page | `cs-freshmen-<gender>-d<n>-<ISO week>` |

The order rotates scores, NCAA, leaders, team stats, performers, streaks, Team of the Week, leaders, poll, freshmen, team stats, NCAA. A family with nothing new (no games yesterday, no round about to start) is skipped. Divisions and stats rotate too. A board can come back the next week with new numbers, least recently used first. A name that headlined one of the last 6 posts is skipped. Men's and women's follow the same 2-to-1 rotation as the stories.

Every stats post ends on the same close: a line written for that post ("Want your name on this list? It starts with college coaches seeing you."), then GET SEEN. GET RECRUITED., one line for high school players and one for college players, the phone and laptop, a proof line (1,800+ college programs, 50,000+ players, live NCAA scores), and a full-width "Download Ryval free" button with the App Store badge. The caption closes the same way.

A board is skipped rather than posted when fewer than 90% of teams reported, the data is more than 8 days old, a top-5 line looks impossible (for example more than 13 saves a game), fewer than 5 games were played, or more than 2 players tie for first. Team of the Week only runs within 9 days of its Sunday and when 80% of the week's games have box scores. If nothing passes, or the API is down, the slot falls back to a written story.

The look: near-black, one accent per post (men `#4D8DFF`, women `#C6FF3D`), Anton for numbers and headlines, Barlow Condensed for names, JetBrains Mono for small data. The cover uses one stock photo from the existing allowlist. Data slides are drawn. There are no player photos. Team marks come from the Ryval logo registry. The last slide (above) shows the College Soccer hub on the phone (`public/app-screens/college-hub.jpg`, captured from the iOS app) and a web dashboard College Soccer page on a laptop (`public/web-screens/`).

The structured slides ride on the row as one `stat_spec:{json}` line in `notes`. `scripts/render-stats.mjs` draws them. The text columns still hold a readable copy for the Library and the duplicate checks.

Preview without touching the queue or Publer:

```bash
bun scripts/preview-college-stats.ts <outDir> [perSide] [seed] [families]
# e.g. bun scripts/preview-college-stats.ts tmp/stats 3 0 leaders,freshmen
```

Deploying this also needs `scripts/render-stats.mjs`, the five new fonts in `public/fonts/` (Barlow Condensed and JetBrains Mono), `public/app-screens/college-*.jpg` and `public/web-screens/` on the droplet, next to `scripts/render-slides.mjs`.

## The clock

| Rule | Value | Where it lives |
| --- | --- | --- |
| How often the job wakes up | about every 2 minutes | server timer `ryval-forge-cron.timer` |
| Posts created per wake-up | 2 | `src/server.ts` calls `runAutopilotFill({ maxPosts: 2 })` |
| Gap between scheduled times | uneven, about 80 to 240 minutes, never on the hour | `nextIrregularSlots()` in `src/lib/post-times.ts` |
| How far ahead the queue is filled | 24 hours | Settings `autopilot_queue_hours`, forced to at least 24 |
| Posts created per open slot | 1 | `POSTS_PER_INTERVAL` in `src/lib/autopilot-queue.ts` |
| Soonest a new slot can be | 8 minutes from now, then the next uneven time | `nextIrregularSlots()` |
| Posts actually published per hour | 1, across all 3 accounts combined | `CAROUSELS_PER_HOUR` in `src/lib/tiktok.functions.ts` |
| Posts per account per day | 2, on the Eastern calendar day | `POSTS_PER_ACCOUNT_PER_DAY` in `src/lib/tiktok-accounts.ts` |
| Accounts | Ryval Sports, Ryval Sports \|\| Recruting App, and the original RyvalApp. @ryvalapp2 and @ryvalapp3 stay off. | `listPublerTikTokAccounts` in `src/lib/publer.ts` |
| Daily total | 6 | 3 accounts × 2 |

A "day" is the Eastern calendar day, not a rolling 24 hours and not midnight UTC. It counts posts already published that day and posts scheduled later that same day. The account with the fewest of those gets the next post. One carousel never goes to more than one account. The account is stored on the post as `tiktok_only:<id>` in the notes.

Turning autopilot off is the Settings switch "Keep autopilot on". While it is on, the 2-minute job keeps filling empty slots.

## What a post is allowed to say

The publishing clock is 2 posts a day on each account, 6 total, at uneven times. What the posts say is separate from that.

Every autopilot post teaches one thing. It is not a list of loosely related tips. The cover is a specific hook. Every later slide supports that same idea. The last slide tells the player what to do with it, and names Ryval only as the tool for that action.

The model is not called. `autopilotStoryPost()` in `src/lib/generate.functions.ts` copies a story from `RECRUITING_STORIES` in `src/lib/recruiting-stories.ts`. A custom prompt on the Generate page is the only path that still asks the model.

A story has:

- `id` — stable name. A repeat of this id inside the memory window is a duplicate.
- `kind` — `education`, `news`, `data`, `product`, or `brand`
- `desk` — which account voice it belongs to
- `gender` — `men`, `women`, or `any`
- `hook` and `hookBody` — the cover
- `slides` — as many as the idea needs, usually 2 to 4. Empty later slots are not filled.
- `ctaHeadline` and `ctaBody` — the last slide
- `screen` — which app screenshot sits on the phone

`storyPassesGate()` rejects a story before it can be queued if the hook is under 4 words or over 16, if it is a generic listicle ("5 recruiting tips", "how to get recruited"), if a slide repeats the hook, or if the last slide is empty.

### The connected accounts

The next open time goes to whichever connected TikTok is furthest under 2 posts on that Eastern day. The story is then chosen for that account:

| Account | Desk | What it prefers |
| --- | --- | --- |
| RyvalApp | `ryval` | Recruiting intelligence, data, coach-side product, major context |
| Ryval Sports \|\| Recruting App | `education` | Rules, mistakes, timelines, scholarships, eligibility, outreach, roster research |
| Ryval Sports | `media` | College soccer context, pathways, transfers, programs, and one real result when there is one |

@ryvalapp2 and @ryvalapp3 are retired. RyvalApp stays on.

Education is still the dominant kind. If an account's own unused stories are gone, the picker spills into education rather than repeating that account's last post.

### Memory

Before a story is written onto slides, the generator loads titles and `lane:` ids from the previous 60 days (paged, because one query will not return 1,400 rows).

It rejects:

- the same story id
- a hook that is a near-duplicate of any title in that window (`isSameCarousel` in `src/lib/content-quality.ts`)

Old posts that used the previous topic names are mapped onto the new ids in `canonicalStoryId()`, so "Transfer portal minutes" still blocks the portal story.

There are about 64 stories. At 6 posts a day that catalog is smaller than 60 days. After every story has been used, the picker does not stop the clock and it does not replay the first story every hour. It rotates the least recently used story. A story is not eligible again while it is still inside the most recent full pass of the catalog. Adding stories to `RECRUITING_STORIES` is what lengthens the gap before a repeat.

Men's and women's posts still alternate about 2 men's then 1 women's (`nextPostGender()`). A `men` story only runs on a men's turn. A `women` story only runs on a women's turn.

Posted rows stay in the database. Deleting them would let those topics come back.

### News

Rankings carousels stay off. `wantSeason` in `src/lib/autopilot-queue.ts` is `false`.

On the media account, if none of the last 8 posts were `kind:news`, the generator may take one current NCAA Division I team from the live season board and explain that result: the record is real, and a record is not a roster opening. If the board cannot be loaded, or every top team was already used, it falls through to a story. It does not invent a consequence.

### Facts that moved in 2025–26

These are written into the stories. If the NCAA changes them again, edit the story. Do not put the old number back.

- Opt-in Division I schools no longer have the 9.9 (men) or 14 (women) scholarship cap. The soccer roster limit is 28. Schools may fund rostered players and do not have to fund all 28. Schools that did not opt in cannot pass the old pool without joining the settlement.
- Division II still uses equivalencies: men's soccer 9.0, women's soccer 9.9. Division III still cannot award athletic aid.
- Division I eligibility is no longer only "4 seasons in 5 years." Players who first enroll in fall 2027 use the age-based rule (up to five years, not a guaranteed five seasons). The 2026–27 enrolling class gets whichever rule helps them more. The Eligibility Center certifies the start.

Illustrative numbers, like the cost comparison, are labeled as examples in the story.

## How the words get onto the slides

A post is a cover, only the slides that idea needs, and a last slide with the phone. Slide size is 1080×1350. The renderer is `scripts/render-slides.mjs`. Big type is Anton. Small type is Inter. Numbers and words like NOT, NEVER, and LOST are green (`#7CF250`).

`postProcessBrandPost()` in `src/lib/content-quality.ts` caps the text. The story's own last-slide line is put back after that, so a generic "download Ryval" does not replace the lesson.

| Piece | Limit |
| --- | --- |
| Cover headline | 16 words |
| Other headlines | 14 words |
| Cover body | 32 words |
| Other body | 40 words |
| Last slide headline | 18 words |

Hashtags are `#collegesoccer #soccerrecruiting #ryval`.

To change a post, edit that object in `RECRUITING_STORIES`. To add one, append an object with a new `id`. `storyPassesGate()` has to accept it. To stop one, delete it. To turn the old rankings carousel back on, `wantSeason` is the switch, and it is `false`.

## What the photo is allowed to be

Only four kinds of picture, in `src/lib/stock-photos.ts`:

- a college or pro woman, from the Jeffrey F Lin match photos (about 138), with sideline coaches and referees removed
- a college man, and only these four frames: two Spartans shots, the Georgetown duel, and one college match save
- a soccer stadium (about 114)
- a soccer field (about 31)
- a ball (about 24)

Rec-league men, youth teams, kids, and one oval that is not a soccer ground are not in the pool. Anything that is not Jeffrey F Lin, not one of those four men's frames, and not a neutral stadium, field, or ball is dropped.

The sentence on the slide picks the kind:

- The word ball or cleat picks a ball.
- Stadium, crowd, or matchday picks a stadium.
- Visa, permit, scholarship, eligibility, GPA, clock, passport, or amateur picks a stadium. A rule slide does not get a random face.
- Film, tape, minutes, a position, or a showcase picks a player. Women's turns get the women's match photos. Men's turns get a college man if one of the four has not been used on that post yet, then a field, stadium, or ball.
- Anything else on a women's turn is a woman playing. Anything else on a men's turn is a field.

The same photo is not used twice inside one post. Recent posts are also avoided until that pool runs out.

To allow another men's photo, add its id to `COLLEGE_MEN` after you have looked at the frame and it is a college-age player. To block a bad frame, add its id to `COACH_FRAMES` or `NOT_SOCCER`.

## What happens at publish time

When the scheduled time arrives and the last hour has no published post:

1. The slides are rendered to JPEGs if they are not already rendered. The last slide is the phone mockup and the App Store line. If a slide has words but no photo, that slide is dropped rather than failing the whole post.
2. The post is locked (`tiktok_publish_id` set to `lock:...`) before Publer is called, so a second cron hit cannot send the same carousel again.
3. Publer schedules it a little over a minute ahead on the one account in `tiktok_only`. An immediate "publish now" call does not create a TikTok post, so the code always sends a `scheduled_at`.
4. The app waits up to 4 minutes for that account to show the post as published. Scheduled-but-not-yet-live does not count as success.
5. On success the status becomes `posted` and the lock is replaced with the Publer job id. On a failure before Publer accepts it, the lock is cleared. On other failures the lock stays, so a crashed job does not double-post. The next autopilot pass moves a scheduled post that is still sitting on a `lock:` id to needs review, so a timed-out send cannot block the queue forever.

Privacy is public (`PUBLIC_TO_EVERYONE`).

Posts with status `needs_edit` are not published. That is where the old SMU and rankings drafts were parked. Those unpublished drafts have been deleted. The 15 posts already on TikTok are still `posted`, which is why their topics will not be generated again.

## What you can tweak without breaking the clock

| You want | Change |
| --- | --- |
| Different words on a story | Edit that object in `RECRUITING_STORIES` in `src/lib/recruiting-stories.ts` |
| A new story | Append an object with a new `id`. It has to pass `storyPassesGate()` |
| Which account a story prefers | Its `desk`: `ryval`, `education`, or `media` |
| How long a repeat is blocked | The 60-day load in `loadTitleMemory()`, and the catalog size. A bigger catalog is a longer gap |
| Shorter or longer headlines | The caps in `postProcessBrandPost` |
| Rankings carousel again | `wantSeason` in `src/lib/autopilot-queue.ts` |
| More or fewer posts per account | `POSTS_PER_ACCOUNT_PER_DAY` |
| Where the uneven times come from | `irregularDaySlots()` in `src/lib/post-times.ts` |
| More than 1 published post per hour | `CAROUSELS_PER_HOUR` |
| Another college men's photo | `COLLEGE_MEN` in `src/lib/stock-photos.ts`, after you look at the photo |
| A photo that should never appear | `COACH_FRAMES` or `NOT_SOCCER` |
| Stop the machine | Settings switch "Keep autopilot on" |
