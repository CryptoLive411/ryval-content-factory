/** Brand carousel frame — matches the Ryval 4:5 editorial posts. */
export const EDITORIAL_W = 1080;
export const EDITORIAL_H = 1350;
export const EDITORIAL_ACCENT = "#1E8CFF";
export const EDITORIAL_BG = "#000000";
export const EDITORIAL_FOOTER = [
  "BETTER PROFILES.",
  "REAL COACHES.",
  "GLOBAL OPPORTUNITIES.",
] as const;
export const EDITORIAL_TAG_LEFT = [
  "ATHLETES",
  "OPPORTUNITIES",
  "WITHOUT LIMITS",
] as const;
export const EDITORIAL_TAG_RIGHT = [
  "THE",
  "RECRUITING",
  "MARKET",
] as const;

export function splitHeadlineTone(text: string): { lead: string; punch: string } {
  const cleaned = text.replace(/\s+/g, " ").trim();
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length <= 2) return { lead: cleaned, punch: "" };
  const splitAt = Math.max(2, Math.ceil(words.length * 0.55));
  return {
    lead: words.slice(0, splitAt).join(" "),
    punch: words.slice(splitAt).join(" "),
  };
}

export function stripLeadingNumber(text: string): { n: string | null; rest: string } {
  const m = text.trim().match(/^(\d{1,2})\s*[.)]?\s+(.*)$/s);
  if (m) return { n: m[1], rest: m[2] };
  return { n: null, rest: text.trim() };
}

export function splitBodyGrafs(body: string): [string, string] {
  const t = body.trim();
  if (!t) return ["", ""];
  const parts = t.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length < 2) return [t, ""];
  const mid = Math.ceil(parts.length / 2);
  return [parts.slice(0, mid).join(" "), parts.slice(mid).join(" ")];
}

export function editorialImagePrompt(who: string, scene: string) {
  return `${who} on a soccer pitch (grass or turf, jersey, cleats, ball or goal in frame). ${scene}. Dark 4:5 (1080x1350) editorial soccer photograph. Subject on the RIGHT half. Left half empty/dark for type. No gym, yoga, studio portrait, fashion, or non-soccer sport. No text, logos, crests, or watermarks.`;
}
