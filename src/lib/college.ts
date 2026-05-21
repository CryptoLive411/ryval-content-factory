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
