import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { isAllowedSchoolLogoUrl } from "./lib/schools";
import { unsplashPhotoUrl } from "./lib/stock-photos";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

/** Cron entrypoint: POST /api/cron/publish-due with Authorization: Bearer $CRON_SECRET */
async function handleCronPublishDue(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/cron/publish-due") return null;
  if (request.method !== "POST" && request.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const headerSecret = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const querySecret = url.searchParams.get("secret") ?? "";
  const secret = headerSecret || querySecret;
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let queued = 0;
    try {
      const { runAutopilotFill } = await import("./lib/autopilot-worker");
      const fill = await runAutopilotFill({ maxPosts: 2 });
      queued = fill.created;
    } catch (e) {
      console.error("autopilot fill failed", e);
    }
    const { hourlyPublishRoom, runPublishDuePosts } = await import("./lib/tiktok.functions");
    const room = await hourlyPublishRoom();
    if (!room.open) return Response.json({ processed: 0, published: 0, queued, skipped: room.reason });
    const { renderNextDueCarousel } = await import("./lib/autopilot-worker");
    const ready = await renderNextDueCarousel();
    if (!ready) return Response.json({ processed: 0, published: 0, queued, skipped: "nothing renderable" });
    const result = await runPublishDuePosts({ secret, limit: 1 });
    return Response.json({ ...result, queued });
  } catch (e) {
    console.error("cron publish-due failed", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "cron failed" },
      { status: 500 },
    );
  }
}

function bytesResponse(
  bytes: Uint8Array,
  mime: string,
  method: string,
  cacheControl: string,
) {
  return new Response(method === "HEAD" ? null : (bytes as unknown as BodyInit), {
    headers: {
      "content-type": mime,
      "cache-control": cacheControl,
      "access-control-allow-origin": "*",
    },
  });
}

const stockCache = new Map<string, { bytes: Uint8Array; mime: string }>();
const logoCache = new Map<string, { bytes: Uint8Array; mime: string }>();

function cleanNcaaSvg(svg: string) {
  return svg
    .replace(
      /<(path|polyline|polygon|rect|circle)\b[^>]*fill="#(?:FFF(?:FFF(?:FE|FF)?)?|ffffff|fffffe|fefefe|fffefe|fff|White|white)"[^>]*\/>/gi,
      (tag) => {
        const large =
          tag.length > 180 ||
          /\bd="[^"]{120,}/.test(tag) ||
          /\bpoints="[^"]{80,}/.test(tag) ||
          /\b(width|height)="(?:1[5-9]\d|200)/.test(tag);
        return large ? "" : tag;
      },
    )
    .replace(/<rect\b[^>]*(?:width|height)\s*=\s*"(?:1[5-9]\d|200)[^"]*"[^>]*\/>/gi, "");
}

async function handleSchoolLogo(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname !== "/api/school-logo") return null;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, HEAD, OPTIONS",
      },
    });
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }
  const raw = url.searchParams.get("u") ?? "";
  if (!isAllowedSchoolLogoUrl(raw)) {
    return new Response("Logo not allowed", { status: 400 });
  }
  const cached = logoCache.get(raw);
  if (cached) {
    return bytesResponse(cached.bytes, cached.mime, request.method, "public, max-age=86400");
  }
  try {
    const upstream = await fetch(raw, {
      headers: {
        Accept: "image/svg+xml,image/png,image/webp,image/jpeg,image/*,*/*;q=0.8",
        "User-Agent": "RyvalContentFactory/1.0 (https://ryvalcontent.space)",
        ...(raw.includes("ncaa.com") ? { Referer: "https://www.ncaa.com/" } : {}),
        ...(raw.includes("wikimedia") ? { "Accept-Language": "en" } : {}),
      },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    let mime = upstream.headers.get("content-type") || "";
    if (!upstream.ok) {
      return new Response("Logo unavailable", { status: 502 });
    }
    const buf = new Uint8Array(await upstream.arrayBuffer());
    if (buf.byteLength > 900_000) {
      return new Response("Logo too large", { status: 413 });
    }
    const looksSvg =
      mime.includes("svg") ||
      raw.toLowerCase().endsWith(".svg") ||
      new TextDecoder().decode(buf.slice(0, 200)).includes("<svg");
    let bytes = buf;
    if (looksSvg) {
      mime = "image/svg+xml; charset=utf-8";
      bytes = new TextEncoder().encode(cleanNcaaSvg(new TextDecoder().decode(buf)));
    } else if (!mime.startsWith("image/")) {
      mime = raw.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    }
    if (logoCache.size > 80) {
      const first = logoCache.keys().next().value;
      if (first) logoCache.delete(first);
    }
    logoCache.set(raw, { bytes, mime });
    return bytesResponse(bytes, mime, request.method, "public, max-age=86400");
  } catch (error) {
    console.error("school logo proxy failed", error);
    return new Response("Logo unavailable", { status: 502 });
  }
}

async function handleStockPhoto(request: Request): Promise<Response | null> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/stock\/(\d{10,}-[a-z0-9]+)$/i);
  if (!match) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405 });
  }
  const id = match[1];
  const cached = stockCache.get(id);
  if (cached) {
    return bytesResponse(
      cached.bytes,
      cached.mime,
      request.method,
      "public, max-age=31536000, immutable",
    );
  }
  try {
    const upstream = await fetch(unsplashPhotoUrl(id), {
      headers: { Accept: "image/*", "User-Agent": "RyvalContentFactory/1.0" },
    });
    const mime = upstream.headers.get("content-type") || "image/jpeg";
    if (!upstream.ok || !mime.startsWith("image/")) {
      return new Response("Stock photo unavailable", { status: 502 });
    }
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (stockCache.size > 80) {
      const first = stockCache.keys().next().value;
      if (first) stockCache.delete(first);
    }
    stockCache.set(id, { bytes, mime });
    return bytesResponse(bytes, mime, request.method, "public, max-age=31536000, immutable");
  } catch (error) {
    console.error("stock photo proxy failed", error);
    return new Response("Stock photo unavailable", { status: 502 });
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const stock = await handleStockPhoto(request);
      if (stock) return stock;

      const logo = await handleSchoolLogo(request);
      if (logo) return logo;

      const cron = await handleCronPublishDue(request);
      if (cron) return cron;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },

  // Cloudflare Cron Triggers (wrangler.jsonc) — same publish worker
  async scheduled(_event: unknown, _env: unknown, _ctx: unknown) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.error("CRON_SECRET missing — skipping scheduled publish");
      return;
    }
    try {
      try {
        const { runAutopilotFill } = await import("./lib/autopilot-worker");
        await runAutopilotFill({ maxPosts: 2 });
      } catch (e) {
        console.error("autopilot fill failed", e);
      }
      const { hourlyPublishRoom, runPublishDuePosts } = await import("./lib/tiktok.functions");
      const room = await hourlyPublishRoom();
      if (room.open) {
        const { renderNextDueCarousel } = await import("./lib/autopilot-worker");
        await renderNextDueCarousel();
        const result = await runPublishDuePosts({ secret, limit: 1 });
        console.log("scheduled publish-due", JSON.stringify({ ...result, skipped: room.reason }));
      } else {
        console.log("scheduled publish-due", JSON.stringify({ processed: 0, skipped: room.reason }));
      }
    } catch (e) {
      console.error("scheduled publish-due failed", e);
    }
  },
};
