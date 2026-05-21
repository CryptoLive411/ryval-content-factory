// Shared constants & labels for the Ryval content factory.
export const CATEGORIES = [
  { value: "harsh_truths", label: "Harsh Recruiting Truths" },
  { value: "highlight_tips", label: "Highlight Tape Tips" },
  { value: "coach_pov", label: "Coach POV" },
  { value: "parent_education", label: "Parent Education" },
  { value: "international_pathway", label: "International Pathway" },
  { value: "soft_pitch", label: "Ryval Soft Pitch" },
  { value: "launch_countdown", label: "Launch Countdown" },
  { value: "product_feature", label: "Product Feature" },
  { value: "educational", label: "Educational" },
  { value: "pain_point", label: "Pain Point" },
] as const;

export const PLATFORMS = [
  { value: "tiktok", label: "TikTok" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "linkedin", label: "LinkedIn" },
] as const;

export const ACCOUNTS = [
  { value: "ryval_main", label: "Ryval Main" },
  { value: "recruiting_truth", label: "Recruiting Truth" },
  { value: "global_pathway", label: "Global Soccer Pathway" },
  { value: "founder", label: "Founder" },
] as const;

export const AUDIENCES = [
  { value: "players", label: "Players" },
  { value: "parents", label: "Parents" },
  { value: "coaches", label: "Coaches" },
  { value: "academies", label: "Academies" },
  { value: "international", label: "International Players" },
] as const;

export const TONES = ["direct", "intense", "premium", "educational", "founder-led", "emotional"] as const;

export const STATUSES = [
  { value: "idea", label: "Idea" },
  { value: "drafted", label: "Drafted" },
  { value: "needs_edit", label: "Needs Edit" },
  { value: "approved", label: "Approved" },
  { value: "designed", label: "Designed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "posted", label: "Posted" },
  { value: "winner", label: "Winner" },
  { value: "reuse_later", label: "Reuse Later" },
] as const;

export const CTA_TYPES = [
  "join waitlist",
  "download app",
  "build profile",
  "coach early access",
  "follow for recruiting tips",
] as const;

export const POSTING_WINDOWS = ["09:00", "12:30", "15:30", "18:30", "20:30", "22:00"];

export const ASSET_TAGS = [
  "logo","ryval logo","main page","quick scout","ryval discovery",
  "player profile","player feed","player messages","player opportunities","player reels",
  "coach profile","coach feed","coach dashboard","roster needs","applicant screen",
  "cta","waitlist","app store","launch","dark mode","light mode","founder","background",
];


export const TEMPLATE_PRESETS = [
  { id: "dark_premium", name: "Dark Premium", bg: "linear-gradient(135deg,#0b0f1a,#11182b)", accent: "#3b82f6", text: "#ffffff" },
  { id: "clean_white", name: "Clean White", bg: "#ffffff", accent: "#0b0f1a", text: "#0b0f1a" },
  { id: "soccer_field", name: "Soccer Field", bg: "linear-gradient(180deg,#0a3d1c,#0e5a2a)", accent: "#ffffff", text: "#ffffff" },
  { id: "bold_black", name: "Bold Black", bg: "#000000", accent: "#3b82f6", text: "#ffffff" },
  { id: "ryval_blue", name: "Ryval Blue Accent", bg: "linear-gradient(135deg,#0b0f1a,#1e3a8a)", accent: "#60a5fa", text: "#ffffff" },
  { id: "founder", name: "Founder Insight", bg: "linear-gradient(180deg,#111,#222)", accent: "#facc15", text: "#ffffff" },
];

export const DEFAULT_PROMPT = `Create faceless slideshow carousel posts for Ryval, a soccer recruiting app helping athletes get discovered and helping college coaches find players faster.

Each post should have short, powerful slide text, max 12 words per slide. Tone should be direct, helpful, premium, slightly intense, and not cheesy.

Do NOT:
- Promise scholarships
- Say every player will get recruited
- Sound scammy
- Use fake coach quotes
- Use cheesy motivational language
- Make Ryval sound bigger than it is yet
- Use NCAA or school logos unless approved

DO:
- Make the content useful first, then softly point to Ryval
- Sound direct, human, confident, useful, slightly intense, premium, modern
- Keep slide copy tight and punchy`;

export type CategoryValue = (typeof CATEGORIES)[number]["value"];
export type PlatformValue = (typeof PLATFORMS)[number]["value"];
export type AccountValue = (typeof ACCOUNTS)[number]["value"];
export type AudienceValue = (typeof AUDIENCES)[number]["value"];
export type StatusValue = (typeof STATUSES)[number]["value"];

export const statusColor = (s: string) => {
  switch (s) {
    case "winner": return "bg-success/20 text-success border-success/30";
    case "approved":
    case "designed": return "bg-success/15 text-success border-success/20";
    case "scheduled": return "bg-primary/15 text-primary border-primary/30";
    case "posted": return "bg-muted text-muted-foreground border-border";
    case "needs_edit": return "bg-warning/15 text-warning border-warning/30";
    case "drafted": return "bg-accent text-accent-foreground border-border";
    case "reuse_later": return "bg-primary/10 text-primary border-primary/20";
    default: return "bg-muted/40 text-muted-foreground border-border";
  }
};
