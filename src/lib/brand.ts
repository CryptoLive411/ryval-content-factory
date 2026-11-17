import { nextUnused } from "@/lib/rotation";

/** Official Ryval R mark — transparent PNG in /public. */
export const RYVAL_MARK_SRC = "/ryval-mark.png";

/** Real iPhone 16 Pro chassis. Screen hole is transparent for compositing. */
export const IPHONE_FRAME_SRC = "/app-screens/iphone-16-pro-frame.png";

/** Screen hole as % of the cropped frame PNG (518×1014). */
export const IPHONE_SCREEN_INSET = {
  left: "6.5637%",
  top: "3.3531%",
  width: "87.0656%",
  height: "93.2939%",
} as const;

export const IPHONE_SCREEN_INSET_NUM = {
  left: 0.065637,
  top: 0.033531,
  width: 0.870656,
  height: 0.932939,
} as const;

/** Real Ryval iPhone screenshots, shown inside the device frame. */
export const DEFAULT_APP_SCREENS = [
  "/app-screens/discover.jpg",
  "/app-screens/profile.jpg",
  "/app-screens/opportunities.jpg",
  "/app-screens/quick-scout.jpg",
  "/app-screens/feed.jpg",
  "/app-screens/university.jpg",
  "/app-screens/applicants.jpg",
  "/app-screens/roster-need.jpg",
  "/app-screens/reel.jpg",
  "/app-screens/need-uab-striker.png",
  "/app-screens/need-liberty-am.png",
  "/app-screens/need-dayton-cm.png",
  "/app-screens/need-assumption-cam.png",
  "/app-screens/need-longwood-gk.png",
  "/app-screens/need-evangel-gk.png",
  "/app-screens/need-lynn-cm.png",
  "/app-screens/roster-assumption.png",
  "/app-screens/opportunities-live.png",
  "/app-screens/feed-live.jpg",
  "/app-screens/discover-live.jpg",
] as const;

export function nextAppScreen(recentNewestFirst: Array<string | null | undefined>) {
  return nextUnused(DEFAULT_APP_SCREENS, recentNewestFirst);
}

export function resolveAppScreen(url?: string | null, salt = 0) {
  const fallback = DEFAULT_APP_SCREENS[Math.abs(salt) % DEFAULT_APP_SCREENS.length];
  if (!url || url.endsWith(".svg")) return fallback;
  return url;
}

/** Official Apple “Download on the App Store” badge (US-UK artwork). */
export const APP_STORE_BADGE_SRC = "/badges/app-store.svg";

/** Night stadium / match energy behind the iPhone CTA. */
export const DEFAULT_CTA_BACKGROUNDS = [
  "/cta-bg/energy.png",
  "/cta-bg/stadium-crowd.jpg",
  "/cta-bg/stadium-pitch.jpg",
  "/cta-bg/match.jpg",
  "/cta-bg/kick.jpg",
  "/cta-bg/stadium-night.jpg",
] as const;

export function resolveCtaBackground(salt = 0) {
  return DEFAULT_CTA_BACKGROUNDS[Math.abs(salt) % DEFAULT_CTA_BACKGROUNDS.length];
}

export function nextCtaBackground(recentNewestFirst: Array<string | null | undefined>) {
  return nextUnused(DEFAULT_CTA_BACKGROUNDS, recentNewestFirst);
}

export function screenSalt(url?: string | null) {
  const resolved = resolveAppScreen(url);
  const i = (DEFAULT_APP_SCREENS as readonly string[]).indexOf(resolved);
  return i >= 0 ? i : 0;
}
