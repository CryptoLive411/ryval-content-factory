const LOGO_HOSTS = new Set([
  "www.ncaa.com",
  "ncaa.com",
  "a.espncdn.com",
  "thumb.wikimedia.org",
  "upload.wikimedia.org",
  "commons.wikimedia.org",
  "maps.wikimedia.org",
  "logo.clearbit.com",
  "njcaamemberdirectory.prestosports.com",
  "ryval-assets.s3.ap-southeast-2.amazonaws.com",
]);

export function isAllowedSchoolLogoHost(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    return LOGO_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/** Same-origin proxy so NCAA SVGs can paint onto TikTok export canvases. */
export function proxiedSchoolLogo(url: string | null | undefined) {
  if (!url) return null;
  if (url.startsWith("/")) return url;
  if (!url.startsWith("https://")) return null;
  return `/api/school-logo?u=${encodeURIComponent(url)}`;
}

export function schoolLogoFromNotes(notes: string | null | undefined) {
  const match = notes?.match(/^logo:(.+)$/m);
  return match?.[1]?.trim() || null;
}

export function schoolIdFromNotes(notes: string | null | undefined) {
  const match = notes?.match(/^school:(.+)$/m);
  return match?.[1]?.trim() || null;
}
