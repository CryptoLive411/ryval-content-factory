/**
 * What Ryval actually does. Every CTA and app claim must come from here, so a
 * graphic can never promise a feature the product does not have.
 *
 * Sourced from the Ryval app itself: apps/ryval-web (landing, signup, feature
 * definitions) and apps/ryval-app-backend (opportunities, feed, reels, profile).
 */

/** The official positioning line from the Ryval landing page footer. */
export const RYVAL_TAGLINE = "Get recruited. Recruit smarter.";

export const RYVAL_ONE_LINER =
  "Ryval is a recruiting platform where college coaches post open roster spots and athletes apply directly.";

/** Capabilities that genuinely exist in the product. */
export const RYVAL_FACTS = [
  "College coaches post open roster spots from verified programs.",
  "Athletes apply to those roster spots directly, with film and documents.",
  "Athletes build one profile: position-labeled film, season stats, academics, measurables.",
  "Discover lets athletes search schools, coaches and players.",
  "A feed and reels give athletes visibility with coaches.",
  "Coaches scout athletes, shortlist them and message them in-app.",
  "Messages, profiles and film stay in sync between the app and the web dashboard.",
] as const;

/**
 * Things Ryval is NOT. These read well but describe a different product, so
 * they must never appear on a slide.
 */
export const RYVAL_NOT = [
  "a news or scores app",
  "a place to follow college soccer as a fan",
  "a highlight-watching or streaming service",
  "a ranking or poll publisher",
  "a recruiting service that contacts coaches for you",
] as const;

/** Accurate CTA pairs, keyed by what the post was about. */
export const RYVAL_CTAS = {
  roster_spots: {
    headline: "Coaches post roster spots here",
    body: "Open spots from verified college programs. Apply directly with your film.",
  },
  get_seen: {
    headline: "Get seen by college coaches",
    body: "One profile with position-labeled film and real stats, in front of coaches recruiting your level.",
  },
  apply_direct: {
    headline: "Apply to open roster spots",
    body: "No cold emails. Coaches post the spot, you apply with your film and academics.",
  },
  find_fit: {
    headline: "See where you actually fit",
    body: "Search programs by level, see their open roster spots, and message coaches from one profile.",
  },
  build_profile: {
    headline: "Build your free Ryval profile",
    body: "Position-labeled film, season stats and academics in one link coaches can open.",
  },
} as const;

export type RyvalCtaKey = keyof typeof RYVAL_CTAS;

/** Claims about the app that a generated slide is not allowed to make. */
const FORBIDDEN_CLAIMS: Array<[RegExp, string]> = [
  [/\bfollow (college soccer|the season|your team|games?)\b/i, "Ryval is not a fan-follow app"],
  [/\b(watch|stream) (highlights|games?|matches|film)\b/i, "Ryval does not stream games"],
  [/\b(live )?(scores?|scoreboard|box scores?)\b/i, "Ryval does not publish scores"],
  [/\bnews (app|feed|alerts?)\b/i, "Ryval is not a news app"],
  [/\bwe (contact|email|message) coaches for you\b/i, "athletes contact coaches themselves"],
  [/\bguarantee[sd]?\b.*\b(scholarship|offer|roster spot)\b/i, "Ryval guarantees no outcome"],
];

/** Flags app claims the product cannot back, so they never reach a graphic. */
export function inaccurateAppClaims(copy: string): string[] {
  const text = String(copy ?? "");
  const found: string[] = [];
  for (const [re, why] of FORBIDDEN_CLAIMS) {
    if (re.test(text)) found.push(why);
  }
  return [...new Set(found)];
}
