import { POSTS_PER_ACCOUNT_PER_DAY, TIKTOK_PUBLISH_ACCOUNTS } from "@/lib/tiktok-accounts";

/** Six posts a day across the three accounts, spread unevenly so the clock is not hourly. */
export const POSTS_PER_DAY_TOTAL = POSTS_PER_ACCOUNT_PER_DAY * TIKTOK_PUBLISH_ACCOUNTS.length;

const MIN_GAP_MIN = 80;
const MAX_GAP_MIN = 240;
const MINUTES = [4, 7, 11, 14, 18, 22, 26, 29, 33, 36, 41, 44, 48, 52, 57];

function mix(n: number) {
  let x = Math.imul(n | 0, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

function humanMinute(salt: number) {
  return MINUTES[mix(salt) % MINUTES.length] ?? 22;
}

/** Calendar day in Eastern time. "4 posts a day" follows this, not a rolling 24 hours. */
export function etDayKey(ms: number) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
}

/**
 * One day's posts. Gaps vary between about 80 and 150 minutes.
 * The minute is never :00, so a slot does not land on the top of the hour.
 */
export function irregularDaySlots(dayStartMs: number, count = POSTS_PER_DAY_TOTAL): number[] {
  const gaps = Array.from({ length: Math.max(0, count - 1) }, () => MIN_GAP_MIN);
  let remaining = 22 * 60 - gaps.length * MIN_GAP_MIN;
  let guard = 0;
  const daySalt = Math.floor(dayStartMs / 60_000);
  while (remaining > 0 && guard < 800) {
    guard += 1;
    const idx = mix(daySalt + guard * 13) % gaps.length;
    const room = MAX_GAP_MIN - gaps[idx];
    if (room <= 0) continue;
    const add = Math.min(room, 6 + (mix(daySalt + guard * 97) % 18), remaining);
    gaps[idx] += add;
    remaining -= add;
  }

  const out: number[] = [];
  let cursor = dayStartMs + humanMinute(daySalt) * 60_000;
  const push = (ms: number, salt: number) => {
    const prev = out[out.length - 1];
    let next = ms;
    if (prev != null && next - prev < 75 * 60_000) next = prev + 75 * 60_000;
    const d = new Date(next);
    d.setUTCSeconds(0, 0);
    d.setUTCMinutes(humanMinute(salt));
    next = d.getTime();
    if (prev != null && next - prev < 75 * 60_000) next = prev + (80 + (mix(salt) % 40)) * 60_000;
    if (next >= dayStartMs + 24 * 3600_000) return false;
    out.push(next);
    return true;
  };

  if (!push(cursor, daySalt)) return out;
  for (let i = 0; i < gaps.length; i++) {
    cursor = out[out.length - 1] + gaps[i] * 60_000;
    if (!push(cursor, daySalt + (i + 1) * 17)) break;
  }
  return out;
}

export function nextIrregularSlots(opts: {
  existingMs: number[];
  queueHours: number;
  now?: number;
  postsPerDay?: number;
}): Date[] {
  const now = opts.now ?? Date.now();
  const notBefore = now + 8 * 60_000;
  const horizon = now + opts.queueHours * 3600_000;
  const day = 24 * 3600_000;
  const start = Math.floor(notBefore / day) * day - day;
  const planned: number[] = [];
  const count = opts.postsPerDay ?? POSTS_PER_DAY_TOTAL;
  for (let d = start; d <= horizon + day; d += day) planned.push(...irregularDaySlots(d, count));
  const near = (ms: number) => opts.existingMs.some((t) => Math.abs(t - ms) < 40 * 60_000);
  return planned
    .filter((ms) => ms >= notBefore && ms <= horizon && !near(ms))
    .map((ms) => new Date(ms));
}
