const SPELLED: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  thirteen: "13",
  fourteen: "14",
  fifteen: "15",
  sixteen: "16",
  seventeen: "17",
  eighteen: "18",
  nineteen: "19",
  twenty: "20",
};

/** Brand, product and generic capitalised phrases that are never claims about a person. */
const NOT_A_PERSON =
  /^(Ryval|App Store|Google Play|Division I|Division II|Division III|College Soccer|United Soccer|Soccer Coaches|Head Coach|Power Five|Big Ten|Big East|Sun Belt|Ivy League|New England|North Carolina|South Carolina|West Virginia|Notre Dame|Michigan State|Penn State|Ohio State|Wake Forest|Long Beach|Oral Roberts|Saint Louis|St Louis)$/i;

function isTitleCase(line: string) {
  const words = line.trim().split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));
  if (words.length < 2) return true;
  const capped = words.filter((w) => /^[A-Z]/.test(w)).length;
  return capped / words.length >= 0.7;
}

function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ");
}

function numberTokens(text: string) {
  const out = new Set<string>();
  for (const m of text.matchAll(/\b\d+(?:-\d+)*\b/g)) {
    out.add(m[0]);
    // A 11-0-0 record also supports saying "eleven wins" and "zero losses".
    for (const part of m[0].split("-")) out.add(part);
  }
  for (const m of text.matchAll(/\b([a-z]+)\b/g)) {
    const digit = SPELLED[m[1] ?? ""];
    if (digit) out.add(digit);
  }
  return out;
}

/**
 * Returns the claims in `copy` that the fact pack does not support. Used to drop a
 * generated carousel rather than publish a stat or a player who does not exist.
 */
export function unsupportedFacts(
  copy: string,
  source: string,
  opts: { skipNames?: boolean } = {},
): string[] {
  const src = normalise(source);
  const srcNumbers = numberTokens(src);
  const bad: string[] = [];

  for (const token of numberTokens(normalise(copy))) {
    if (srcNumbers.has(token)) continue;
    // A hyphenated record is supported when each side of it is.
    if (token.includes("-") && token.split("-").every((part) => srcNumbers.has(part))) continue;
    bad.push(token);
  }

  if (opts.skipNames) return [...new Set(bad)];

  // Headlines are title case, so every word looks like a name. Only prose can be checked.
  for (const segment of copy.split(/---|\n/)) {
    if (isTitleCase(segment)) continue;
    for (const m of segment.matchAll(/\b(?:[A-Z][a-z]{2,}(?:'s)?\s){1,3}[A-Z][a-z]{2,}(?:'s)?\b/g)) {
      const words = m[0].split(/\s+/).map((w) => w.replace(/'s$/, ""));
      // "Freshman Jack Ottley" is fine as long as one adjacent pair is a real name.
      const pairs = words.slice(0, -1).map((w, i) => `${w} ${words[i + 1]}`);
      if (pairs.some((p) => NOT_A_PERSON.test(p) || src.includes(normalise(p).trim()))) continue;
      // "Watch Ottley closely" is a real reference as long as the surname is in the pack.
      const surname = normalise(words[words.length - 1] ?? "").trim();
      if (surname && new RegExp(`\\b${surname}\\b`).test(src)) continue;
      bad.push(pairs.join(" / "));
    }
  }

  return [...new Set(bad)];
}
