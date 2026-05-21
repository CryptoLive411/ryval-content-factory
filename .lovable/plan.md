# Plan

## 1. Strip the app down to just "Generate"

Remove from the sidebar + mobile menu + route tree:
- Dashboard, Library, Planner, Templates, Performance, Prompts, Assets, Settings

Keep:
- `/generate` (becomes the home route after login)
- `/login` and auth flow

Delete the unused route files so they can't be reached by URL either.

## 2. Two generation modes on the Generate page

Add a top-level **Mode** toggle:

**Mode A — Ryval brand posts** (what we have today)
- Exactly the existing flow (hooks, slides, CTA, generated backgrounds).
- Only change: generate **1 post at a time** instead of batches of 2.

**Mode B — College Recruiting posts** (new — like the Duke set you sent)
- Single input: **School + Sport** (e.g. "Duke Men's Soccer"). Optional: team color hex, mascot, conference, stadium name (auto-filled with sensible defaults from the school name if blank).
- Generates **one 5-slide post** in the exact Duke format:
  1. **Hero / "[SCHOOL]. BUILT DIFFERENT."** — campus landmark photo, school name huge, tagline
  2. **"COMPETE HERE." / [Conference] STANDARD** — team celebration photo + 3 stat chips (NCAA, conference, pro pipeline)
  3. **"ELITE ENVIRONMENT." / Every detail matters** — locker room / facilities photo + 3 sub-facility thumbnails
  4. **"MORE THAN [SPORT]."** — campus walking photo + 3 academic chips
  5. **"YOUR NEXT STEP." / DM "RECRUIT"** — Ryval app screen mock on stadium background
- All slides 1080×1350, same typographic system as the reference (huge condensed display type, blue accent rule, small uppercase eyebrow, Ryval logo top-right).
- Per-school theme color (default Duke blue `#1f3fb8`); slides pull from school name automatically.
- 1 post at a time. Each render produces a downloadable TikTok zip identical between Mac and phone.

## 3. Reliable image rendering

Two reasons images failed before: gateway hiccups and no retry. Fix:
- **Retry with backoff** on each image: up to 3 attempts (500ms / 1.5s / 3s).
- **Sequential, not parallel**, when in "1 at a time" mode — avoids rate limits.
- Show per-slide status (✓ / spinner / ✗ Retry button) so you can re-run just the failed ones without regenerating the whole post.
- If a background still fails after 3 tries, fall back to a tasteful gradient so the slide is still exportable.

## 4. OpenAI option for college imagery

College photos (campus landmarks, locker rooms, stadiums) need to look photoreal — that's where Nano Banana sometimes underperforms. Add a small **Image engine** selector on the Generate page:

- **Nano Banana** (Google, current default — fastest/cheapest)
- **Nano Banana Pro** (higher quality, slower, ~5–10× cost)
- **OpenAI GPT-Image** *(requires an OpenAI API key — I'll prompt for it when first selected)*

The college mode will default to **Nano Banana Pro** because photoreal stadium / Gothic-tower shots benefit from it; brand-post mode stays on regular Nano Banana.

## 5. Cleanup

- Update sidebar + mobile sheet to only show "Generate".
- Make `/` redirect to `/generate` when signed in.
- Remove unused DB read code from removed pages but leave the `posts` table alone (still used for save-to-library inside generate, just no library page — we can add a simple "Recent" list inline on Generate so you don't lose history).

---

## Questions before I build

1. For College mode, do you want a **dropdown of preset schools** (Duke, UNC, Stanford, etc. with logos + colors pre-loaded) or just a **free-text school name** input that auto-infers everything from the name?
2. Want me to wire up **OpenAI GPT-Image** now (you'd paste your OpenAI key), or just default to **Nano Banana Pro** for college mode and skip OpenAI for now?
