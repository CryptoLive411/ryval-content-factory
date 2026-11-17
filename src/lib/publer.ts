/** Publer API — TikTok photo carousels without our unaudited developer app. */

import { RETIRED_TIKTOK_IDS } from "@/lib/tiktok-accounts";

const PUBLER = "https://app.publer.com/api/v1";

function cleanEnv(raw: string | undefined) {
  if (typeof raw !== "string") return "";
  return raw.trim().replace(/^['"]|['"]$/g, "");
}

export type PublerAccount = {
  id: string;
  name: string;
  provider: string;
  picture?: string | null;
  type?: string;
  status?: string;
  locked?: boolean;
};

export function isPublerConfigured() {
  return Boolean(cleanEnv(process.env.PUBLER_API_KEY));
}

function publerKey() {
  const key = cleanEnv(process.env.PUBLER_API_KEY);
  if (!key) {
    throw new Error(
      "Publer is not configured. Add PUBLER_API_KEY (Business plan → Settings → API Keys).",
    );
  }
  return key;
}

async function publerFetch(path: string, init: RequestInit & { workspaceId?: string } = {}) {
  const workspaceId =
    init.workspaceId ||
    cleanEnv(process.env.PUBLER_WORKSPACE_ID) ||
    (await resolveWorkspaceId());
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer-API ${publerKey()}`);
  headers.set("Publer-Workspace-Id", workspaceId);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("User-Agent")) headers.set("User-Agent", "Mozilla/5.0 RyvalContentForge/1.0");
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const { workspaceId: _w, ...rest } = init;
  const res = await fetch(`${PUBLER}${path}`, { ...rest, headers });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const errors = json.errors;
    const msg = Array.isArray(errors)
      ? errors.map(String).join(" · ")
      : typeof json.message === "string"
        ? json.message
        : text.slice(0, 280) || `Publer ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

let workspaceCache: string | null = null;

async function resolveWorkspaceId() {
  if (workspaceCache) return workspaceCache;
  const pinned = cleanEnv(process.env.PUBLER_WORKSPACE_ID);
  if (pinned) {
    workspaceCache = pinned;
    return pinned;
  }
  const res = await fetch(`${PUBLER}/workspaces`, {
    headers: { Authorization: `Bearer-API ${publerKey()}`, Accept: "application/json" },
  });
  const json = (await res.json()) as unknown;
  const list = Array.isArray(json)
    ? json
    : Array.isArray((json as { workspaces?: unknown[] }).workspaces)
      ? (json as { workspaces: unknown[] }).workspaces
      : [];
  const first = list[0] as { id?: string } | undefined;
  if (!first?.id) throw new Error("No Publer workspace on this API key.");
  workspaceCache = first.id;
  return first.id;
}

export async function listPublerAccounts(): Promise<PublerAccount[]> {
  const json = await publerFetch("/accounts");
  const rows = Array.isArray(json)
    ? json
    : Array.isArray(json.accounts)
      ? (json.accounts as unknown[])
      : [];
  return rows
    .map((raw) => {
      const row = raw as PublerAccount;
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        provider: String(row.provider ?? ""),
        picture: row.picture ?? null,
        type: row.type,
        status: row.status,
        locked: Boolean(row.locked),
      };
    })
    .filter((row) => row.id);
}

export async function listPublerTikTokAccounts() {
  const tiktoks = (await listPublerAccounts()).filter((row) => row.provider === "tiktok" && !row.locked);
  if (!tiktoks.length) {
    throw new Error("Connect a TikTok account in Publer. The content factory posts only to TikToks connected there.");
  }
  const active = tiktoks.filter((row) => !RETIRED_TIKTOK_IDS.has(row.id));
  if (!active.length) {
    throw new Error("The only TikToks in Publer are the old accounts. Connect the new ones in Social Accounts.");
  }
  return active;
}

type JobStatus = {
  status: string;
  payload?: Record<string, unknown>;
  plan?: Record<string, unknown>;
  data?: Record<string, unknown>;
};

async function pollJob(jobId: string, timeoutMs = 90_000): Promise<JobStatus> {
  const started = Date.now();
  let last: JobStatus = { status: "working" };
  while (Date.now() - started < timeoutMs) {
    const json = await publerFetch(`/job_status/${jobId}`);
    const nested = (json.data as JobStatus | undefined) ?? json;
    last = {
      status: String(nested.status ?? json.status ?? "working"),
      payload: (nested.payload as Record<string, unknown> | undefined) ?? (json.payload as Record<string, unknown> | undefined),
      plan: nested.plan as Record<string, unknown> | undefined,
      data: json,
    };
    const s = last.status.toLowerCase();
    if (s === "complete" || s === "completed" || s === "failed") return last;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Publer job timed out");
}

/** A schedule job can finish before TikTok accepts or rejects the carousel. */
async function confirmAccountPost(accountId: string, title: string, timeoutMs: number) {
  const started = Date.now();
  const want = title.trim().toLowerCase();
  while (Date.now() - started < timeoutMs) {
    for (const state of ["published", "failed"] as const) {
      const json = await publerFetch(`/posts?state=${state}`);
      const rows = Array.isArray(json.posts) ? (json.posts as Array<Record<string, unknown>>) : [];
      const hit = rows.find(
        (row) =>
          String(row.account_id ?? "") === accountId &&
          String(row.title ?? "").trim().toLowerCase() === want,
      );
      if (!hit) continue;
      if (state === "failed") {
        const details = hit.details as { error?: string } | undefined;
        throw new Error(String(hit.error || details?.error || "TikTok rejected the post"));
      }
      return { id: String(hit.id ?? ""), link: String(hit.post_link ?? "") };
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("TikTok did not confirm the post. It was not marked as posted.");
}

function collectMediaItems(node: unknown, depth = 0): Array<{ id: string; path?: string }> {
  if (depth > 8 || node == null) return [];
  if (Array.isArray(node)) return node.flatMap((item) => collectMediaItems(item, depth + 1));
  if (typeof node !== "object") return [];
  const row = node as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  const path = typeof row.path === "string" ? row.path : undefined;
  const type = typeof row.type === "string" ? row.type : "";
  const looksMedia =
    id &&
    (path ||
      type === "photo" ||
      type === "image" ||
      type === "video" ||
      typeof row.thumbnail === "string");
  const kids = Object.entries(row)
    .filter(([key]) => key !== "plan")
    .flatMap(([, value]) => collectMediaItems(value, depth + 1));
  return looksMedia ? [{ id, path }, ...kids] : kids;
}

async function uploadPhotosFromUrls(urls: string[]) {
  const json = await publerFetch("/media/from-url", {
    method: "POST",
    body: JSON.stringify({
      type: "bulk",
      in_library: false,
      media: urls.map((url, i) => ({
        url,
        name: `ryval-slide-${String(i + 1).padStart(2, "0")}.jpg`,
      })),
    }),
  });
  const jobId = String(json.job_id ?? "");
  if (!jobId) {
    const direct = collectMediaItems(json);
    if (direct.length) return direct;
    throw new Error("Publer media upload did not return a job id");
  }
  const job = await pollJob(jobId);
  if (job.status.toLowerCase() === "failed") {
    throw new Error("Publer could not import the slide images");
  }
  const items = collectMediaItems(job.payload ?? job.data ?? job);
  const unique = new Map<string, { id: string; path?: string }>();
  for (const item of items) {
    if (!unique.has(item.id)) unique.set(item.id, item);
  }
  const ordered = [...unique.values()];
  if (ordered.length < urls.length) {
    return urls.map((path, i) => ({ id: ordered[i]?.id || `slide-${i + 1}`, path }));
  }
  return ordered.slice(0, urls.length);
}

function tiktokNetwork(opts: {
  title: string;
  text: string;
  media: Array<{ id: string; path?: string }>;
  privacy: string;
}) {
  return {
    type: "photo",
    title: opts.title.slice(0, 90),
    text: opts.text.slice(0, 2200),
    media: opts.media.map((item, i) => ({
      id: item.id,
      path: item.path,
      caption: i === 0 ? opts.title.slice(0, 90) : undefined,
    })),
    details: {
      privacy: opts.privacy,
      auto_add_music: true,
      comment: true,
      promotional: false,
      paid: false,
      reminder: false,
    },
  };
}

export async function publishTikTokCarouselViaPubler(opts: {
  photoUrls: string[];
  title: string;
  description: string;
  privacy?: string;
  scheduledAt?: string | null;
  accountIds?: string[];
}) {
  const listed = await listPublerTikTokAccounts();
  const accounts = opts.accountIds?.length
    ? listed.filter((account) => opts.accountIds?.includes(account.id))
    : listed;
  if (!accounts.length) {
    throw new Error("Connect a TikTok account in Publer (Social Accounts) first.");
  }
  const media = await uploadPhotosFromUrls(opts.photoUrls.slice(0, 35));
  const privacy = opts.privacy || "PUBLIC_TO_EVERYONE";
  const results: { accountId: string; name: string; ok: boolean; jobId?: string; error?: string }[] =
    [];

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i]!;
    const when = opts.scheduledAt
      ? new Date(new Date(opts.scheduledAt).getTime() + i * 90_000).toISOString()
      : new Date(Date.now() + (75 + i * 90) * 1000).toISOString();
    const body = {
      bulk: {
        state: "scheduled",
        posts: [
          {
            networks: {
              tiktok: tiktokNetwork({
                title: opts.title,
                text: opts.description,
                media,
                privacy,
              }),
            },
            accounts: [{ id: account.id, scheduled_at: when }],
          },
        ],
      },
    };
    try {
      // Immediate /publish completes without creating a TikTok post. A near-term schedule does.
      const json = await publerFetch("/posts/schedule", { method: "POST", body: JSON.stringify(body) });
      const jobId = String(json.job_id ?? "");
      if (jobId) {
        const job = await pollJob(jobId, 60_000);
        const failures = job.payload?.failures;
        const failList = Array.isArray(failures)
          ? failures
          : failures && typeof failures === "object"
            ? Object.values(failures as Record<string, unknown>)
            : [];
        if (job.status.toLowerCase() === "failed" || failList.length) {
          const msg =
            failList
              .map((row) => (row as { message?: string }).message)
              .filter(Boolean)
              .join(" · ") || "Publer publish failed";
          results.push({ accountId: account.id, name: account.name, ok: false, jobId, error: msg });
          if (/too many posts via OpenAPI/i.test(msg)) break;
          continue;
        }
      }
      const confirmed = await confirmAccountPost(account.id, opts.title, 4 * 60_000);
      results.push({
        accountId: account.id,
        name: account.name,
        ok: true,
        jobId: jobId || confirmed.id,
      });
    } catch (e) {
      const error = e instanceof Error ? e.message : "failed";
      results.push({
        accountId: account.id,
        name: account.name,
        ok: false,
        error,
      });
      if (/too many posts via OpenAPI/i.test(error)) break;
    }
  }

  const anyOk = results.some((r) => r.ok);
  if (!anyOk) throw new Error(results[0]?.error || "Publer publish failed");
  return {
    publishId: results.find((r) => r.ok)?.jobId || "publer",
    results,
  };
}

export async function publerStatus() {
  if (!isPublerConfigured()) {
    return { configured: false, accounts: [] as PublerAccount[] };
  }
  try {
    const accounts = await listPublerTikTokAccounts();
    return { configured: true, accounts };
  } catch (e) {
    return {
      configured: true,
      accounts: [] as PublerAccount[],
      error: e instanceof Error ? e.message : "Could not list Publer accounts",
    };
  }
}
