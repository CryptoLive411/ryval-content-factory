import catalog from "@/data/schools.json";
import { isAllowedSchoolLogoHost } from "@/lib/school-logo";

export type SchoolAssociation = "NCAA" | "NAIA" | "NJCAA";

export type School = {
  id: string;
  name: string;
  shortName: string;
  nickname: string;
  association: SchoolAssociation;
  division: string;
  conference: string;
  city: string;
  state: string;
  logoUrl: string;
  athleticsUrl: string;
  website: string;
  mascot?: string;
  sat25?: number;
  sat75?: number;
  gpa?: number;
  admitRate?: number;
  enroll?: number;
};

const SCHOOLS = catalog as School[];
const BY_ID = new Map(SCHOOLS.map((s) => [s.id, s]));
const CATALOG_LOGOS = new Set(SCHOOLS.map((s) => s.logoUrl).filter(Boolean));

const FEATURED_IDS = [
  "stanford",
  "north-carolina",
  "indiana",
  "virginia",
  "ucla",
  "duke",
  "georgetown",
  "clemson",
  "notre-dame",
  "washington",
  "pittsburgh",
  "akron",
  "saint-louis",
  "florida-st",
  "maryland",
  "penn-st",
  "kentucky",
  "wake-forest",
  "west-virginia",
  "south-carolina",
] as const;

function skipWord(word: string) {
  return /^(of|the|and|at)$/i.test(word);
}

function initials(name: string) {
  return name
    .replace(/[,'().]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !skipWord(w))
    .map((w) => w[0]!)
    .join("")
    .toLowerCase();
}

function haystack(school: School) {
  return `${school.name} ${school.shortName} ${school.nickname} ${school.mascot ?? ""} ${school.city} ${school.state} ${school.id}`.toLowerCase();
}

export function getSchool(id: string): School | undefined {
  return BY_ID.get(id);
}

export function allSchools(): School[] {
  return SCHOOLS;
}

export function featuredSchools(limit = 12): School[] {
  const hits = FEATURED_IDS.map((id) => BY_ID.get(id)).filter((s): s is School => Boolean(s));
  return hits.slice(0, limit);
}

export function searchSchools(query: string, limit = 12): School[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return featuredSchools(limit);
  const tokens = q.split(/\s+/).filter(Boolean);
  const slug = q.replace(/\s+/g, "-");
  const scored: Array<{ school: School; score: number }> = [];
  for (const school of SCHOOLS) {
    const hay = haystack(school);
    const init = initials(school.name);
    const shortInit = initials(school.shortName);
    if (!tokens.every((t) => hay.includes(t) || init === t || shortInit === t || school.id.includes(t))) {
      continue;
    }
    let score = 0;
    if (school.name.toLowerCase().startsWith(q)) score += 10;
    if (school.shortName.toLowerCase().startsWith(q)) score += 8;
    if (school.id === slug || school.id.startsWith(slug)) score += 7;
    if (init === q || shortInit === q) score += 9;
    if (school.nickname.toLowerCase().startsWith(q)) score += 4;
    if (school.association === "NCAA") score += 1;
    if (school.division.includes("I") && !school.division.includes("II") && !school.division.includes("III")) {
      score += 1;
    }
    scored.push({ school, score });
  }
  scored.sort((a, b) => b.score - a.score || a.school.name.localeCompare(b.school.name));
  return scored.slice(0, limit).map((s) => s.school);
}

export function schoolCount() {
  return SCHOOLS.length;
}

export function schoolLabel(school: Pick<School, "association" | "division" | "city" | "state">) {
  const div = school.division ? ` ${school.division.replace("Division ", "D")}` : "";
  const loc = [school.city, school.state].filter(Boolean).join(", ");
  return `${school.association}${div}${loc ? ` · ${loc}` : ""}`;
}

export function isAllowedSchoolLogoUrl(raw: string) {
  if (CATALOG_LOGOS.has(raw)) {
    try {
      return new URL(raw).protocol === "https:";
    } catch {
      return false;
    }
  }
  return isAllowedSchoolLogoHost(raw);
}

export function schoolNotes(school: School, sport?: "men" | "women") {
  return `lane:school-spotlight\nschool:${school.id}${sport ? `\nsport:${sport}` : ""}\nlogo:${school.logoUrl}`;
}

export function isSchoolSpotlightNotes(notes: string | null | undefined) {
  return Boolean(notes && /lane:school-spotlight/.test(notes));
}

export function pickAutopilotSchool(excludeIds: string[], salt = 0): School | undefined {
  const excluded = new Set(excludeIds.filter(Boolean));
  const featured = FEATURED_IDS.map((id) => BY_ID.get(id)).filter(
    (s): s is School => Boolean(s) && !excluded.has(s.id),
  );
  const ncaa = SCHOOLS.filter(
    (s) =>
      s.association === "NCAA" &&
      s.logoUrl &&
      !excluded.has(s.id) &&
      !FEATURED_IDS.includes(s.id as (typeof FEATURED_IDS)[number]),
  );
  const other = SCHOOLS.filter((s) => s.association !== "NCAA" && s.logoUrl && !excluded.has(s.id));
  const bucket = Math.abs(salt) % 10;
  const pool =
    bucket < 7 ? (featured.length ? featured : ncaa) : bucket < 9 ? ncaa : other.length ? other : ncaa;
  const list = pool.length ? pool : SCHOOLS.filter((s) => s.logoUrl && !excluded.has(s.id));
  if (!list.length) return featured[0] ?? SCHOOLS.find((s) => s.logoUrl);
  return list[Math.abs(salt * 13 + 7) % list.length];
}
