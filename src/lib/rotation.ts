/** Walk newest → oldest and pick the next unused item. Recycle only after the whole pool is used. */
export function nextUnused<T extends string>(
  pool: readonly T[],
  recentNewestFirst: Array<string | null | undefined>,
): T {
  if (!pool.length) throw new Error("nextUnused: empty pool");
  const poolSet = new Set(pool);
  const used: T[] = [];
  for (const raw of recentNewestFirst) {
    if (!raw || !poolSet.has(raw as T)) continue;
    const item = raw as T;
    if (used.includes(item)) break;
    used.push(item);
    if (used.length >= pool.length) break;
  }
  const pick = pool.find((p) => !used.includes(p));
  if (pick) return pick;
  const last = used[0];
  return pool.find((p) => p !== last) ?? pool[0];
}

/**
 * Exclude every recently used item (do not stop at a repeat).
 * Recycle only after the whole pool is used. Never pick `hardExclude`.
 */
export function nextUnusedAll<T extends string>(
  pool: readonly T[],
  used: Iterable<string | null | undefined>,
  hardExclude: Iterable<string | null | undefined> = [],
): T {
  if (!pool.length) throw new Error("nextUnusedAll: empty pool");
  const poolSet = new Set(pool);
  const usedList = [...used];
  const usedSet = new Set(
    usedList.filter((id): id is T => typeof id === "string" && poolSet.has(id as T)),
  );
  const hard = new Set(
    [...hardExclude].filter((id): id is string => typeof id === "string" && id.length > 0),
  );
  const fresh = pool.find((p) => !usedSet.has(p) && !hard.has(p));
  if (fresh) return fresh;
  const last = usedList.find(
    (id): id is T => typeof id === "string" && poolSet.has(id as T) && !hard.has(id),
  );
  return pool.find((p) => !hard.has(p) && p !== last) ?? pool.find((p) => !hard.has(p)) ?? pool[0];
}

/** 2 men : 1 woman. Never two women in a row. */
export function nextPostGender(
  recentNewestFirst: Array<"men" | "women" | "neutral" | null | undefined>,
): "men" | "women" {
  const known = recentNewestFirst.filter((g): g is "men" | "women" => g === "men" || g === "women");
  if (known[0] === "women") return "men";
  if (known[0] === "men" && known[1] === "men") return "women";
  return "men";
}
