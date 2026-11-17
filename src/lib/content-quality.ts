/** Text quality + anti-duplication helpers for Ryval slideshow posts. */

const PRODUCT_RE =
  /\b(ryval|the app|our (app|platform|tool)|we built|download (the )?app|join (the )?waitlist|@ryval)\b/gi;

export function normalizeHook(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Jaccard similarity on word sets — 0..1 */
export function hookSimilarity(a: string, b: string): number {
  const wa = new Set(normalizeHook(a).split(" ").filter(Boolean));
  const wb = new Set(normalizeHook(b).split(" ").filter(Boolean));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = wa.size + wb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function isTooSimilar(candidate: string, recent: string[], threshold = 0.55): boolean {
  const n = normalizeHook(candidate);
  if (!n) return true;
  return recent.some((r) => {
    const nr = normalizeHook(r);
    if (!nr) return false;
    if (n === nr) return true;
    if (n.includes(nr) || nr.includes(n)) return true;
    return hookSimilarity(n, nr) >= threshold;
  });
}

const SUBJECT_PREFIX =
  /^(?:\d+\s+)?(?:facts|things|truths)\s+(?:you still get wrong\s+)?about\s+/;

/** Cover subject with the "7 facts about" wrapper removed, so paraphrases match. */
export function carouselSubject(text: string): string {
  const title = normalizeHook(editorialTitle(text));
  return title.replace(SUBJECT_PREFIX, "").trim();
}

/** Same carousel, including "7 facts about X" vs "5 things you still get wrong about X". */
export function isSameCarousel(candidate: string, recent: string[]): boolean {
  if (isTooSimilar(candidate, recent, 0.72)) return true;
  const subject = carouselSubject(candidate);
  if (subject.length < 8) return false;
  return recent.some((row) => {
    const other = carouselSubject(row);
    if (other.length < 8) return false;
    if (subject === other) return true;
    if (subject.includes(other) || other.includes(subject)) return true;
    return hookSimilarity(subject, other) >= 0.72;
  });
}

export function enforceMaxWords(text: string, max = 12): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= max) return words.join(" ");
  return words.slice(0, max).join(" ");
}

const SLOP_RE =
  /\b(period\.?|take control|focus on|doesn't matter if|in today's|the reality is|here's the thing|recruiting is rigged|playing great doesn't|recruiting sites promise|tailored subject lines|waitlist in bio|link in bio|they promised a pro scout|scout showed up)\b/i;

export function looksLikeSlop(text: string): boolean {
  return SLOP_RE.test(text);
}

const USEFUL_RE =
  /\d|scholarship|equivalenc|full ride|partial|walk-?on|eligibility|gpa|amateur|portal|naia|juco|njcaa|ncaa|d1|d2|d3|mls|homegrown|mls next|ecnl|usl|nwsl|academy|trial|visa|permit|gbe|nil|film|profile|roster|minutes|core|percentage|need-based|academic aid|register|writing|position|goalkeeper|center back|fullback|winger|midfielder|passport|pay-to-play|showcase|scout|discovery|tactics|1v1|chance created|work permit|super draft|next pro/i;

/** A body slide must teach a number, a rule, or a real next step — not vibe copy. */
export function isUsefulSlide(text: string): boolean {
  const t = text.split(/\n---\n/).join(" ").trim();
  if (t.split(/\s+/).filter(Boolean).length < 4) return false;
  if (looksLikeSlop(t)) return false;
  return USEFUL_RE.test(t);
}

export function editorialTitle(text: string | null | undefined): string {
  const first = (text ?? "").split(/\n---\n/)[0]?.trim() ?? "";
  return first || (text ?? "").trim();
}

const LISTICLE_COVER =
  /^(?:\d+\s+)?(?:facts|things|truths)(?:\s+you still get wrong)?\s+about\s+(.+)$/i;

/**
 * Turn a label ("6 things you still get wrong about…") into a short hook
 * plus one sentence that gives a reason to swipe.
 */
export function openCover(text: string): string {
  const ed = parseEditorial(text);
  const match = ed.headline.match(LISTICLE_COVER);
  if (!match?.[1]) return text;
  const topic = match[1].replace(/[.?!]+$/, "").trim();
  if (!topic) return text;
  const count = ed.headline.match(/^(\d+)/)?.[1];
  const lead = count ? `${count} things most people miss. Swipe.` : "Most people miss this. Swipe.";
  const first = ed.body.split(/(?<=[.!?])\s+/).find(Boolean)?.trim() ?? "";
  const extra = first && !/swipe/i.test(first) ? enforceMaxWords(first, 14) : "";
  const pretty = topic.charAt(0).toUpperCase() + topic.slice(1);
  return packEditorial(pretty, [lead, extra].filter(Boolean).join(" "), "");
}

export function splitCtaCopy(text: string): { solution: string; download: string } {
  const download = "Download Ryval";
  const stripped = (text ?? "")
    .replace(/\s*download\s+ryval\.?$/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return {
    solution:
      stripped ||
      "Ryval puts your film in front of coaches hunting your position.",
    download,
  };
}

/** Billboard split: last hard word becomes the accent kicker. */
export function splitPunchLine(text: string): { lead: string; punch: string } {
  const cleaned = text
    .replace(/\bperiod\.?$/i, "")
    .replace(/[.]+$/g, "")
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 3) return { lead: cleaned, punch: "" };
  const last = words[words.length - 1].replace(/[,:;]+$/g, "");
  if (
    !last ||
    last.length <= 2 ||
    /^(the|and|or|a|an|to|of|for|in|am|pm|a\.m\.|p\.m\.)$/i.test(last)
  ) {
    return { lead: cleaned, punch: "" };
  }
  return { lead: words.slice(0, -1).join(" "), punch: last };
}

function cleanSlideLine(text: string, max: number): string {
  return enforceMaxWords(
    stripProductMentions(text)
      .replace(/\bperiod\.?$/i, "")
      .replace(/\s+/g, " ")
      .trim(),
    max,
  );
}

export function stripProductMentions(text: string): string {
  return text.replace(PRODUCT_RE, "").replace(/\s{2,}/g, " ").trim();
}

export function slidesNearlyIdentical(a: string, b: string): boolean {
  return hookSimilarity(a, b) >= 0.75;
}

export type SlideFields = {
  hook: string;
  slide_2: string;
  slide_3: string;
  slide_4: string;
  slide_5: string;
  slide_6: string;
  cta: string;
  caption: string;
  hashtags: string;
  slide_image_prompts: string[];
};

export const EDITORIAL_SEP = "\n---\n";

export type EditorialSlide = {
  headline: string;
  body: string;
  tip: string;
};

export function packEditorial(headline: string, body = "", tip = "") {
  const h = headline.replace(/\s+/g, " ").trim();
  const b = body.replace(/\s+/g, " ").trim();
  const t = tip.replace(/\s+/g, " ").trim();
  if (!b && !t) return h;
  // A trailing separator renders as a literal "---" on the slide.
  if (!t) return [h, b].join(EDITORIAL_SEP);
  return [h, b, t].join(EDITORIAL_SEP);
}

/** Cover lines have to say which team. "Pitt soccer" is not enough. */
export function stampSportSide(text: string, side: "women" | "men") {
  const word = side === "women" ? "Women's" : "Men's";
  const parts = String(text ?? "").split(EDITORIAL_SEP);
  const headline = (parts[0] ?? "").trim();
  if (/\b(women'?s?|men'?s)\b/i.test(headline)) return text;
  parts[0] = `${word} ${headline}`.replace(/\s+/g, " ").trim();
  return parts.filter((part, i) => i === 0 || part.trim()).join(EDITORIAL_SEP);
}

/** Women's and men's are different sports. Null when the text names both or neither. */
export function sportSideOf(...parts: Array<string | null | undefined>): "women" | "men" | null {
  const text = parts.filter(Boolean).join(" ");
  const women = /\bwomen'?s\b/i.test(text);
  const men = /\bmen'?s\b/i.test(text);
  if (women && !men) return "women";
  if (men && !women) return "men";
  return null;
}

export function parseEditorial(text: string): EditorialSlide {
  const parts = (text ?? "").split(EDITORIAL_SEP);
  return {
    headline: (parts[0] ?? "").trim(),
    body: (parts[1] ?? "").trim(),
    tip: (parts[2] ?? "").trim(),
  };
}

/** Enforce writing rules on a generated post before save/preview. */
export function postProcessBrandPost(
  post: SlideFields,
  slidesPerPost: number,
): SlideFields {
  const bodyKeys = ["hook", "slide_2", "slide_3", "slide_4", "slide_5", "slide_6"] as const;
  // slidesPerPost includes CTA. Body count = slidesPerPost - 1.
  const bodyCount = Math.max(4, Math.min(6, slidesPerPost - 1));

  const texts: string[] = [];
  const prompts: string[] = [];

  for (let i = 0; i < 6; i++) {
    const key = bodyKeys[i];
    let t = (post[key] ?? "").trim();
    let p = (post.slide_image_prompts?.[i] ?? "").trim();
    if (i >= bodyCount) {
      texts.push("");
      prompts.push("");
      continue;
    }
    if (i === 0) t = openCover(t);
    const ed = parseEditorial(t);
    t = packEditorial(
      cleanSlideLine(ed.headline, i === 0 ? 16 : 14),
      enforceMaxWords(stripProductMentions(ed.body), i === 0 ? 32 : 40),
      i === 0 ? "" : enforceMaxWords(ed.tip, 28),
    );
    if (i > 0 && texts[i - 1] && slidesNearlyIdentical(parseEditorial(t).headline, parseEditorial(texts[i - 1]).headline)) {
      // Drop duplicate consecutive slide — leave empty so getSlides filters it
      t = "";
      p = "";
    }
    texts.push(t);
    prompts.push(p);
  }

  const ctaEd = parseEditorial(post.cta ?? "");
  let cta = packEditorial(
    enforceMaxWords(ctaEd.headline.replace(/waitlist|link in bio|coming soon/gi, "").trim(), 18),
    enforceMaxWords(ctaEd.body, 40),
    enforceMaxWords(ctaEd.tip, 24),
  );
  if (!parseEditorial(cta).headline || /^download ryval\.?$/i.test(parseEditorial(cta).headline)) {
    cta = packEditorial(
      "Ryval puts your film in front of coaches hunting your position.",
      "Build one profile coaches can open — film, position, and real roster needs.",
      "Download Ryval and stay visible.",
    );
  }

  return {
    hook: texts[0],
    slide_2: texts[1],
    slide_3: texts[2],
    slide_4: texts[3],
    slide_5: texts[4],
    slide_6: texts[5],
    cta,
    caption: (post.caption ?? "").trim(),
    hashtags: (post.hashtags ?? "").trim(),
    slide_image_prompts: prompts,
  };
}

/** Shared CTA chrome for preview + export. */
export function ctaLabels(ctaType?: string | null): { tag: string; btn: string } {
  const t = (ctaType ?? "").toLowerCase();
  if (t.includes("download")) return { tag: "GET THE APP", btn: "Download Ryval →" };
  if (t.includes("build profile") || t.includes("profile"))
    return { tag: "BUILD YOUR PROFILE", btn: "Start your Ryval profile →" };
  if (t.includes("coach") || t.includes("early access"))
    return { tag: "COACH EARLY ACCESS", btn: "Request coach access →" };
  if (t.includes("bio")) return { tag: "COMING SOON · WAITLIST IN BIO", btn: "Join the waitlist in bio →" };
  if (t.includes("waitlist")) return { tag: "COMING SOON · JOIN THE WAITLIST", btn: "Join the waitlist →" };
  if (t.includes("coming")) return { tag: "COMING SOON", btn: "Join the waitlist →" };
  if (t.includes("follow")) return { tag: "FOLLOW FOR MORE", btn: "@ryval.app →" };
  return { tag: "GET THE APP", btn: "Download Ryval →" };
}

/** Data-URL gradient fallback when BG generation fails (aligned by slide index). */
export function gradientFallbackDataUrl(seed = 0): string {
  const hues = [220, 230, 210, 200, 240, 250];
  const h = hues[seed % hues.length];
  // Tiny SVG → data URL (no network). Renderers accept this as image src.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0%" stop-color="hsl(${h} 70% 38%)"/>
        <stop offset="45%" stop-color="hsl(${h + 8} 55% 22%)"/>
        <stop offset="100%" stop-color="hsl(${h - 6} 40% 8%)"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#g)"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
