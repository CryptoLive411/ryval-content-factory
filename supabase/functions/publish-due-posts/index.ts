// Publishing runs on the forge server through Publer.
// This function used the unaudited TikTok Content Posting API and rejected
// public posts. It stays deployed so an old 10-minute schedule cannot fall
// through to that API.

function authorized(req: Request, secret: string) {
  if (!secret) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const headerSecret = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const querySecret = new URL(req.url).searchParams.get("secret") ?? "";
  return headerSecret === secret || cronHeader === secret || querySecret === secret;
}

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET") ?? "";
  if (!authorized(req, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({ processed: 0, published: 0, skipped: "moved to forge" });
});
