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

export function buildCollegePost(input: CollegeInput): CollegePost {
  const k = keyOf(input.school);
  const preset = SCHOOL_PRESETS[k] ?? {};
  const meta: Required<CollegeInput> = {
    school: input.school.trim(),
    sport: input.sport.trim(),
    nickname: (input.nickname || preset.nickname || input.school).toUpperCase(),
    conference: input.conference || preset.conference || "Conference",
    accent: input.accent || preset.accent || "#1f3fb8",
  };
  const sportLower = meta.sport.toLowerCase();
  const sportShort = meta.sport.replace(/men's |women's /i, "").trim();
  const eyebrow = `${meta.school.toUpperCase()} ${meta.sport.toUpperCase()}`;

  const landmark = preset.landmark ?? `iconic ${meta.school} campus landmark building at dusk with dramatic warm sunset sky`;
  const stadium = preset.stadium ?? `${meta.school} ${sportShort} stadium`;

  const slides: CollegeSlide[] = [
    {
      kind: "hero",
      eyebrow,
      title: `${meta.nickname}.`,
      subline: "BUILT DIFFERENT.",
      accentWord: "DIFFERENT",
      imagePrompt: `Cinematic photograph of ${landmark}. Wide vertical composition, deep blue evening sky with warm orange light spilling from windows, lampposts glowing, empty foreground walkway. Magazine quality, ultra sharp, premium college admissions brochure aesthetic. NO text, NO logos.`,
    },
    {
      kind: "compete",
      eyebrow,
      title: "COMPETE\nHERE.",
      subline: `${meta.conference.toUpperCase()} STANDARD.`,
      chips: [
        { title: "NCAA POWERHOUSE", body: "Consistent national tournament contender." },
        { title: `${meta.conference.toUpperCase()} COMPETITION`, body: "Competing in one of the toughest conferences." },
        { title: "PRO PIPELINE", body: "Developing players for the next level." },
      ],
      imagePrompt: `Cinematic action photograph of a college ${sportLower} team celebrating a goal at night under stadium floodlights. Players in dark navy and blue striped kits roaring with raw emotion, packed student section blurred in background, sweat and intensity, dramatic rim lighting, deep shadows. Photoreal, ultra sharp, sports photography style. NO text, NO logos, NO school crests, NO recognizable identifiable faces — heads angled or partially shadowed.`,
    },
    {
      kind: "environment",
      eyebrow,
      title: "ELITE\nENVIRONMENT.",
      subline: "EVERY DETAIL MATTERS.",
      chips: [
        { title: "STRENGTH & CONDITIONING", body: "" },
        { title: "INDOOR TRAINING",         body: "" },
        { title: "RECOVERY CENTER",         body: "" },
      ],
      imagePrompt: `Cinematic interior photograph of an elite college ${sportLower} locker room. Curved layout, dark wood lockers with backlit blue LED accents, leather couches in foreground, trophy case glowing, jerseys hanging in a row, polished floor reflecting moody blue light. Premium professional sports facility, architectural photography, dark navy palette with electric blue glow. NO text, NO logos.`,
    },
    {
      kind: "more_than",
      eyebrow,
      title: `MORE\nTHAN\n${sportShort.toUpperCase()}.`,
      subline: "ELITE ACADEMICS. GLOBAL NETWORK.",
      chips: [
        { title: "TOP-TIER ACADEMICS", body: "Consistently ranked among the world's best universities." },
        { title: "GLOBAL NETWORK",     body: "A powerhouse alumni network that opens doors worldwide." },
        { title: "LEADERS FOR LIFE",   body: "Developing character, impact, and purpose beyond the field." },
      ],
      imagePrompt: `Cinematic photograph of college students with backpacks walking on a sunlit path toward a gothic university tower. Warm golden hour light filtering through trees, lush green lawns, traditional stone architecture. Shot from behind so faces are not visible. Premium university admissions brochure aesthetic. NO text, NO logos, NO recognizable faces.`,
    },
    {
      kind: "cta",
      eyebrow: "RYVAL",
      title: "YOUR\nNEXT STEP.",
      accentWord: "NEXT STEP.",
      subline: 'DM "RECRUIT"',
      imagePrompt: `Cinematic photograph of an empty ${stadium} at night, stadium floodlights casting bright pools of light onto the field, deep blue sky, empty bleachers softly visible. Atmospheric, dramatic, magazine quality. NO text, NO logos, NO recognizable signage.`,
    },
  ];

  const caption = `${meta.school} ${meta.sport} — built different.\nDM "RECRUIT" to get on the radar.`;
  const tag = meta.school.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const sportTag = sportShort.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const hashtags = `#${tag} #${tag}${sportTag} #college${sportTag} #${sportTag}recruiting #d1${sportTag} #collegerecruiting #ryval`;

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

