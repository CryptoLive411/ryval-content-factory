// College recruiting post template + per-school presets.

export type CollegeInput = {
  school: string;        // e.g. "Duke"
  sport: string;         // e.g. "Men's Soccer"
  nickname?: string;     // Display name for hero slide. Defaults to school upper.
  conference?: string;   // e.g. "ACC"
  accent?: string;       // hex color
};

export type CollegeSlideKind = "hero" | "compete" | "environment" | "more_than" | "cta";

export type CollegeSlide = {
  kind: CollegeSlideKind;
  eyebrow: string;       // e.g. "DUKE MEN'S SOCCER"
  title: string;         // big display headline
  accentWord?: string;   // optional word in accent color (e.g. "DIFFERENT")
  subline?: string;      // smaller all-caps sub
  chips?: { title: string; body: string }[];
  imagePrompt: string;   // background prompt
};

export type CollegePost = {
  meta: Required<CollegeInput>;
  slides: CollegeSlide[];
  caption: string;
  hashtags: string;
};

// Light school preset map — extend as needed. Falls back to defaults.
const SCHOOL_PRESETS: Record<string, Partial<CollegeInput> & { landmark?: string; stadium?: string }> = {
  duke:        { nickname: "DUKE",      conference: "ACC",     accent: "#1f3fb8", landmark: "Duke Chapel gothic tower at dusk with warm sunset sky", stadium: "Koskinen Stadium" },
  unc:         { nickname: "CAROLINA",  conference: "ACC",     accent: "#4B9CD3", landmark: "UNC Old Well in Chapel Hill at golden hour" },
  stanford:    { nickname: "STANFORD",  conference: "ACC",     accent: "#8C1515", landmark: "Stanford Hoover Tower and Memorial Church at sunset" },
  ucla:        { nickname: "UCLA",      conference: "Big Ten", accent: "#2774AE", landmark: "Royce Hall arches at UCLA, golden hour" },
  indiana:     { nickname: "INDIANA",   conference: "Big Ten", accent: "#990000", landmark: "Sample Gates at Indiana University at dusk" },
  virginia:    { nickname: "VIRGINIA",  conference: "ACC",     accent: "#232D4B", landmark: "UVA Rotunda and Lawn at sunset" },
  wakeforest:  { nickname: "WAKE",      conference: "ACC",     accent: "#9E7E38", landmark: "Wait Chapel at Wake Forest, twilight" },
  notredame:   { nickname: "NOTRE DAME",conference: "ACC",     accent: "#0C2340", landmark: "Notre Dame Golden Dome at sunset" },
  georgetown:  { nickname: "GEORGETOWN",conference: "Big East",accent: "#041E42", landmark: "Healy Hall at Georgetown at dusk" },
  maryland:    { nickname: "MARYLAND",  conference: "Big Ten", accent: "#E03A3E", landmark: "McKeldin Mall at University of Maryland at sunset" },
};

function keyOf(school: string) {
  return school.toLowerCase().replace(/\s+/g, "").replace(/[^a-z]/g, "");
}

export type CollegeCopy = {
  nickname?: string;
  conference?: string;
  accent_hex?: string;
  hero_tagline?: string;        // e.g. "BUILT DIFFERENT."
  hero_accent_word?: string;    // e.g. "DIFFERENT."
  compete_subline?: string;
  compete_chips?: { title: string; body: string }[];
  environment_chips?: { title: string; body: string }[];
  more_than_chips?: { title: string; body: string }[];
  cta_subline?: string;
  caption?: string;
  hashtags?: string;
  hero_scene?: string;
  compete_scene?: string;
  environment_scene?: string;
  more_than_scene?: string;
  cta_scene?: string;
};

export function buildCollegePost(input: CollegeInput, copy: CollegeCopy = {}): CollegePost {
  const k = keyOf(input.school);
  const preset = SCHOOL_PRESETS[k] ?? {};
  const meta: Required<CollegeInput> = {
    school: input.school.trim(),
    sport: input.sport.trim(),
    nickname: (input.nickname || copy.nickname || preset.nickname || input.school).toUpperCase(),
    conference: input.conference || copy.conference || preset.conference || "Conference",
    accent: input.accent || copy.accent_hex || preset.accent || "#1f3fb8",
  };
  const sportLower = meta.sport.toLowerCase();
  const sportShort = meta.sport.replace(/men's |women's /i, "").trim();
  const eyebrow = `${meta.school.toUpperCase()} ${meta.sport.toUpperCase()}`;

  const landmark = preset.landmark ?? `the iconic ${meta.school} campus landmark`;
  const stadium = preset.stadium ?? `${meta.school} ${sportShort} stadium`;

  const heroTagline = (copy.hero_tagline || "BUILT DIFFERENT.").toUpperCase();
  const heroAccent = (copy.hero_accent_word || heroTagline.split(" ").pop() || "DIFFERENT.").toUpperCase();

  const competeChips = copy.compete_chips?.length === 3 ? copy.compete_chips : [
    { title: "NCAA POWERHOUSE", body: "Consistent national tournament contender." },
    { title: `${meta.conference.toUpperCase()} COMPETITION`, body: "Competing in one of the toughest conferences." },
    { title: "PRO PIPELINE", body: "Developing players for the next level." },
  ];
  const envChips = copy.environment_chips?.length === 3 ? copy.environment_chips : [
    { title: "STRENGTH & CONDITIONING", body: "" },
    { title: "INDOOR TRAINING",         body: "" },
    { title: "RECOVERY CENTER",         body: "" },
  ];
  const moreChips = copy.more_than_chips?.length === 3 ? copy.more_than_chips : [
    { title: "TOP-TIER ACADEMICS", body: "Consistently ranked among the world's best universities." },
    { title: "GLOBAL NETWORK",     body: "A powerhouse alumni network that opens doors worldwide." },
    { title: "LEADERS FOR LIFE",   body: "Developing character, impact, and purpose beyond the field." },
  ];

  const heroScene = copy.hero_scene
    ?? `Cinematic photograph of ${landmark} at dusk with deep blue evening sky, warm window glow, lampposts glowing, empty walkway. Clearly recognizable as ${meta.school}.`;
  const competeScene = copy.compete_scene
    ?? `Cinematic action photograph of a ${meta.school} ${sportLower} team competing at night under stadium floodlights. Players wearing ${meta.school}'s real primary colors, intense rim lighting, packed student section blurred behind. No readable logos, no recognizable faces.`;
  const envScene = copy.environment_scene
    ?? `Cinematic interior photograph of the ${meta.school} ${sportLower} locker room / training facility — premium architectural photography, school colors visible on walls and lockers.`;
  const moreScene = copy.more_than_scene
    ?? `Cinematic photograph of students with backpacks walking on a sunlit path on the ${meta.school} campus, shot from behind so no faces are visible. Iconic campus architecture in frame.`;
  const ctaScene = copy.cta_scene
    ?? `Cinematic photograph of empty ${stadium} at night, stadium floodlights casting bright pools of light onto the field, deep blue sky.`;

  const noText = " NO text, NO logos, NO school crests, NO trademarks, NO NCAA marks, NO readable signage.";

  const slides: CollegeSlide[] = [
    {
      kind: "hero",
      eyebrow,
      title: `${meta.nickname}.`,
      subline: heroTagline,
      accentWord: heroAccent,
      imagePrompt: `${heroScene} Wide vertical 4:5 composition, magazine quality, ultra sharp, premium college admissions brochure aesthetic.${noText}`,
    },
    {
      kind: "compete",
      eyebrow,
      title: "COMPETE\nHERE.",
      subline: copy.compete_subline || `${meta.conference.toUpperCase()} STANDARD.`,
      chips: competeChips,
      imagePrompt: `${competeScene} Photoreal, ultra sharp, sports photography style, dramatic lighting, deep shadows.${noText}`,
    },
    {
      kind: "environment",
      eyebrow,
      title: "ELITE\nENVIRONMENT.",
      subline: "EVERY DETAIL MATTERS.",
      chips: envChips,
      imagePrompt: `${envScene} Premium professional sports facility, architectural photography, moody lighting.${noText}`,
    },
    {
      kind: "more_than",
      eyebrow,
      title: `MORE\nTHAN\n${sportShort.toUpperCase()}.`,
      subline: "ELITE ACADEMICS. GLOBAL NETWORK.",
      chips: moreChips,
      imagePrompt: `${moreScene} Warm golden hour light, premium university admissions aesthetic.${noText}`,
    },
    {
      kind: "cta",
      eyebrow: "RYVAL",
      title: "YOUR\nNEXT STEP.",
      accentWord: "NEXT STEP.",
      subline: copy.cta_subline || 'DM "RECRUIT"',
      imagePrompt: `${ctaScene} Atmospheric, dramatic, magazine quality.${noText}`,
    },
  ];

  const caption = copy.caption
    || `${meta.school} ${meta.sport} — built different.\nDM "RECRUIT" to get on the radar.`;
  const tag = meta.school.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const sportTag = sportShort.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const hashtags = copy.hashtags
    || `#${tag} #${tag}${sportTag} #college${sportTag} #${sportTag}recruiting #d1${sportTag} #collegerecruiting #ryval`;

  return { meta, slides, caption, hashtags };
}

// ============== Composed slide prompt for OpenAI gpt-image-1 ==============
// Produces a single rich prompt describing the ENTIRE slide (text, stats,
// chips, emojis baked into the image). Use when generating with OpenAI so the
// rendered PNG is the final slide — no overlay needed.
export function buildComposedPrompt(slide: CollegeSlide, meta: Required<CollegeInput>): string {
  const accent = meta.accent;
  const eyebrow = slide.eyebrow.toUpperCase();
  const common = `Vertical 4:5 social post (1080x1350). Premium college athletics recruiting graphic. Background: dark navy / charcoal cinematic photograph with deep dramatic moody lighting and a single electric accent color exactly ${accent}. Strong magazine-quality typography baked into the image. Top-left small bold uppercase eyebrow text "${eyebrow}" with a short ${accent} underline bar. Top-right small bold white "RYVAL" wordmark. Clean grid layout, plenty of negative space, premium editorial sports graphic — Nike / Adidas / Bleacher Report tier. All text must be perfectly legible, real letters (not gibberish), white with the key accent word in ${accent}.`;

  if (slide.kind === "hero") {
    return `${common}
Background image: ${slide.imagePrompt}
Composition: HUGE condensed bold uppercase display headline "${meta.nickname}." filling most of the slide, with sub-headline below that reads "BUILT DIFFERENT." where the word "DIFFERENT." is in ${accent}. Add a small ${accent} bar under the sub-headline. No other text.`;
  }

  if (slide.kind === "compete") {
    return `${common}
Background image: dramatic action photo of a college ${meta.sport.toLowerCase()} team celebrating at night under floodlights, intense, no readable logos, no recognizable faces.
Composition: Large condensed uppercase headline "COMPETE HERE." (the word "HERE." in ${accent}). Sub-line "${meta.conference.toUpperCase()} STANDARD." Then a horizontal row of 3 stat cards at the bottom, each with a small ${accent} emoji icon at the top:
  1. 🏆  "NCAA POWERHOUSE" — "Consistent national tournament contender"
  2. ⚡  "${meta.conference.toUpperCase()} COMPETITION" — "One of the toughest conferences in the country"
  3. 🚀  "PRO PIPELINE" — "Developing players for the next level"
Card titles bold uppercase white, body text small white 70% opacity. Thin vertical ${accent} dividers between cards.`;
  }

  if (slide.kind === "environment") {
    return `${common}
Background image: cinematic interior photograph of an elite college locker room — dark wood lockers with backlit blue LED accents, polished floor.
Composition: Large condensed uppercase headline "ELITE ENVIRONMENT." (the word "ENVIRONMENT." in ${accent}). Sub-line "EVERY DETAIL MATTERS." Then a horizontal row of 3 facility cards at the bottom with emoji icons in ${accent}:
  1. 💪  "STRENGTH & CONDITIONING"
  2. 🏟️  "INDOOR TRAINING"
  3. 🧊  "RECOVERY CENTER"
Bold uppercase white labels under each emoji. Thin ${accent} dividers between cards.`;
  }

  if (slide.kind === "more_than") {
    const sportShort = meta.sport.replace(/men's |women's /i, "").trim().toUpperCase();
    return `${common}
Background image: warm golden-hour photo of students with backpacks walking on a sunlit path toward a gothic university tower, shot from behind, no faces visible.
Composition: Large condensed uppercase headline stacked on 3 lines "MORE / THAN / ${sportShort}." with "${sportShort}." in ${accent}. Sub-line "ELITE ACADEMICS. GLOBAL NETWORK." Then a horizontal row of 3 cards at the bottom with emoji icons in ${accent}:
  1. 🎓  "TOP-TIER ACADEMICS" — "Ranked among the world's best universities"
  2. 🌍  "GLOBAL NETWORK" — "A powerhouse alumni network worldwide"
  3. 🧠  "LEADERS FOR LIFE" — "Character, impact, and purpose beyond the field"
Card titles bold uppercase white, body text small white 70% opacity. Thin vertical ${accent} dividers between cards.`;
  }

  // CTA
  return `${common}
Background image: cinematic photograph of an empty college ${meta.sport.toLowerCase()} stadium at night under floodlights, deep blue sky, empty bleachers softly visible.
Composition: Split layout. LEFT 55% of slide: large condensed uppercase headline stacked "YOUR / NEXT STEP." where "NEXT STEP." is in ${accent}. Below it, sub-line in white: 'DM "RECRUIT" TO GET ON THE RADAR.' with a small ${accent} bar underneath. RIGHT 45% of slide: a clean realistic vertical smartphone mockup (iPhone-style, rounded corners, subtle bezel) showing a sports recruiting app interface on the screen — dark UI, player profile card with stats, ${accent} accents. Phone properly centered in the right half with comfortable margin from edges. Do NOT crop the phone. Do NOT overlap the phone with the headline text.`;
}

