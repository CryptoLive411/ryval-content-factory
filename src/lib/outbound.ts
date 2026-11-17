export type FanoutLine = { name: string; status: string; error?: string };

export function fanoutLines(notes: string | null | undefined): FanoutLine[] {
  const match = notes?.match(/^tiktok_fanout:(.+)$/m);
  if (!match?.[1]) return [];
  try {
    const parsed = JSON.parse(match[1]) as Record<
      string,
      { name?: string; status?: string; error?: string }
    >;
    return Object.values(parsed).map((entry) => ({
      name: entry.name || "TikTok",
      status: entry.status || "queued",
      error: entry.error,
    }));
  } catch {
    return [];
  }
}

export function outboundWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Which content lane produced this carousel, for the queue view. */
export function laneLabel(notes: string | null | undefined) {
  if (!notes) return "Recruiting facts";
  if (notes.includes("lane:school-spotlight")) return "School spotlight";
  if (notes.includes("lane:season-board")) return "Current season";
  if (notes.includes("lane:")) return "Facts list";
  return "Recruiting facts";
}

/** The "through games …" stamp NCAA.com gave us when this post was written. */
export function factsThroughFromNotes(notes: string | null | undefined) {
  const raw = notes?.match(/^updated:(.+)$/m)?.[1]?.trim();
  if (!raw) return null;
  return raw.replace(/^.*?Through games\s*/i, "").trim() || raw;
}

export function schoolNameFromNotes(notes: string | null | undefined) {
  const id = notes?.match(/^school:(.+)$/m)?.[1]?.trim();
  if (!id) return null;
  return id
    .split("-")
    .map((part) => (part ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(" ");
}
