import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { pathToFileURL } from "node:url";

const root = resolve(process.cwd());
const envFile = join(root, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

const clientDir = join(root, "dist/client");
const publicDir = join(root, "public");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

const TYPES = {
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function safeFile(dir, urlPath) {
  const decoded = decodeURIComponent((urlPath.split("?")[0] || "/").replace(/\\/g, "/"));
  const rel = decoded.replace(/^\/+/, "");
  if (!rel || rel.includes("\0")) return null;
  const full = normalize(join(dir, rel));
  if (!full.startsWith(dir)) return null;
  if (!existsSync(full)) return null;
  const st = statSync(full);
  if (!st.isFile()) return null;
  return full;
}

function sendFile(res, file) {
  res.statusCode = 200;
  res.setHeader("content-type", TYPES[extname(file).toLowerCase()] || "application/octet-stream");
  res.setHeader("cache-control", extname(file) === ".html" ? "no-cache" : "public, max-age=31536000, immutable");
  createReadStream(file).pipe(res);
}

function toRequest(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const hostHeader = req.headers.host || `${host}:${port}`;
  const url = `${proto}://${hostHeader}${req.url || "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  const method = req.method || "GET";
  const hasBody = method !== "GET" && method !== "HEAD";
  return new Request(url, {
    method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
}

async function sendResponse(res, response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "transfer-encoding") return;
    res.setHeader(key, value);
  });
  if (!response.body) {
    res.end();
    return;
  }
  Readable.fromWeb(response.body).pipe(res);
}

const mod = await import(pathToFileURL(join(root, "dist/server/server.js")).href);
const app = mod.default;

const server = createServer(async (req, res) => {
  try {
    const urlPath = req.url || "/";
    const staticFile = safeFile(clientDir, urlPath) || safeFile(publicDir, urlPath);
    if (staticFile && (req.method === "GET" || req.method === "HEAD")) {
      sendFile(res, staticFile);
      return;
    }
    const response = await app.fetch(toRequest(req), process.env, {});
    await sendResponse(res, response);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  }
});

server.listen(port, host, () => {
  console.log(`Ryval Content Forge listening on http://${host}:${port}`);
});
