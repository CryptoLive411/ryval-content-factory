import { RYVAL_CTAS } from "@/lib/ryval-product";
import type { StoryFormat } from "@/lib/story-ingest";

export type SlideRole = {
  key: "hook" | "slide_2" | "slide_3" | "slide_4" | "slide_5" | "slide_6";
  brief: string;
};

export type Template = {
  id: string;
  label: string;
  /** Which app screen the final CTA slide should show, matched to the topic. */
  appScreen: string;
  ctaHeadline: string;
  ctaBody: string;
  /** News graphics carry a source and date line; education posts do not need one. */
  showSourceLine: boolean;
  roles: SlideRole[];
};

const WHAT_IT_MEANS: SlideRole = {
  key: "slide_5",
  brief: "WHAT THIS MEANS FOR RECRUITS: the practical takeaway for a player reading this.",
};

export const TEMPLATES: Record<StoryFormat, Template> = {
  news_slide: {
    id: "news_headline",
    label: "News headline",
    appScreen: "/app-screens/feed.jpg",
    ctaHeadline: RYVAL_CTAS.roster_spots.headline,
    ctaBody: RYVAL_CTAS.roster_spots.body,
    showSourceLine: true,
    roles: [
      { key: "hook", brief: "COVER: 4 to 6 plain words that make someone swipe. The detail goes in the body." },
      { key: "slide_2", brief: "The facts: who, what, and the number that matters." },
      { key: "slide_3", brief: "Why players and coaches should care." },
    ],
  },
  carousel: {
    id: "breaking_update",
    label: "Breaking update",
    appScreen: "/app-screens/opportunities.jpg",
    ctaHeadline: RYVAL_CTAS.apply_direct.headline,
    ctaBody: RYVAL_CTAS.apply_direct.body,
    showSourceLine: true,
    roles: [
      { key: "hook", brief: "COVER: 4 to 6 plain words. A reason to swipe, with the update in the body." },
      { key: "slide_2", brief: "What changed, with the real detail from the story." },
      { key: "slide_3", brief: "Who it affects most." },
      { key: "slide_4", brief: "The part most people will miss." },
      WHAT_IT_MEANS,
    ],
  },
  player_spotlight: {
    id: "player_spotlight",
    label: "Player spotlight",
    appScreen: "/app-screens/profile.jpg",
    ctaHeadline: RYVAL_CTAS.build_profile.headline,
    ctaBody: RYVAL_CTAS.build_profile.body,
    showSourceLine: true,
    roles: [
      { key: "hook", brief: "COVER: the player plus the one number, in 4 to 6 plain words, so someone swipes." },
      { key: "slide_2", brief: "Who they are: school, and class year or position if the story states it." },
      { key: "slide_3", brief: "The production: their real stat line from the story." },
      { key: "slide_4", brief: "Why coaches value this kind of player." },
      WHAT_IT_MEANS,
    ],
  },
  program_spotlight: {
    id: "program_spotlight",
    label: "Program spotlight",
    appScreen: "/app-screens/university.jpg",
    ctaHeadline: RYVAL_CTAS.find_fit.headline,
    ctaBody: RYVAL_CTAS.find_fit.body,
    showSourceLine: true,
    roles: [
      { key: "hook", brief: "COVER: the program in 4 to 6 plain words. Put the record in the body." },
      { key: "slide_2", brief: "The season so far, using the real record or ranking." },
      { key: "slide_3", brief: "Who is making it work, only if the story names them." },
      { key: "slide_4", brief: "The recruiting angle: what kind of player fits here." },
      WHAT_IT_MEANS,
    ],
  },
  stats_post: {
    id: "ranking_list",
    label: "Ranking / stat breakdown",
    appScreen: "/app-screens/discover.jpg",
    ctaHeadline: RYVAL_CTAS.find_fit.headline,
    ctaBody: RYVAL_CTAS.find_fit.body,
    showSourceLine: true,
    roles: [
      { key: "hook", brief: "COVER: 4 to 6 plain words on the top name or number, written so someone swipes." },
      { key: "slide_2", brief: "The first standout, with their real number." },
      { key: "slide_3", brief: "The second standout, with their real number." },
      { key: "slide_4", brief: "The movement worth noticing in these numbers." },
      WHAT_IT_MEANS,
    ],
  },
  rules_update: {
    id: "rules_update",
    label: "NCAA rules update",
    appScreen: "/app-screens/university.jpg",
    ctaHeadline: RYVAL_CTAS.get_seen.headline,
    ctaBody: RYVAL_CTAS.get_seen.body,
    showSourceLine: true,
    roles: [
      { key: "hook", brief: "COVER: the rule in 4 to 6 plain words. The detail goes in the body." },
      { key: "slide_2", brief: "What the rule actually says, no jargon." },
      { key: "slide_3", brief: "Who it affects and from when." },
      { key: "slide_4", brief: "The mistake players will make because of it." },
      WHAT_IT_MEANS,
    ],
  },
  recruiting_tip: {
    id: "recruiting_education",
    label: "Recruiting education",
    appScreen: "/app-screens/quick-scout.jpg",
    ctaHeadline: RYVAL_CTAS.get_seen.headline,
    ctaBody: RYVAL_CTAS.get_seen.body,
    showSourceLine: false,
    roles: [
      { key: "hook", brief: "COVER: the mistake in 4 to 6 plain words, blunt enough to make someone swipe." },
      { key: "slide_2", brief: "The first thing coaches actually check." },
      { key: "slide_3", brief: "The second thing, and why players get it wrong." },
      { key: "slide_4", brief: "The fix, specific enough to do this week." },
      WHAT_IT_MEANS,
    ],
  },
};

export function templateFor(format: StoryFormat): Template {
  return TEMPLATES[format] ?? TEMPLATES.news_slide;
}
