#!/usr/bin/env node
/**
 * Node slide renderer for 24/7 autopilot (no browser canvas).
 * Usage: node scripts/render-slides.mjs <post.json> <outdir>
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { renderStatPost, statSpecFromPost } from "./render-stats.mjs";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1080;
const H = 1350;
const ACCENT = "#7CF250";
const BG = "#000000";
const PAD = 64;
const DISPLAY_FONT = "RyvalDisplay";
const BODY_FONT = "RyvalBody";

/** Shrink the headline until it fits the box instead of overflowing the slide. */
function fitDisplay(ctx, text, maxW, maxH, startSize, minSize, maxLines = 4) {
  let size = startSize;
  for (;;) {
    ctx.font = `400 ${size}px ${DISPLAY_FONT}`;
    const lines = wrapLines(ctx, text, maxW);
    if ((lines.length * size * 1.02 <= maxH && lines.length <= maxLines) || size <= minSize) {
      return { lines, size };
    }
    size -= 3;
  }
}

function wrapAt(ctx, text, maxW, font) {
  ctx.font = font;
  return wrapLines(ctx, text, maxW);
}

function brandFromPost(post) {
  const notes = String(post.notes ?? "");
  const pick = (key) => notes.match(new RegExp(`^${key}:(.+)$`, "m"))?.[1]?.trim() || "";
  return {
    primary: post.brand_primary_color || pick("brand_primary") || "",
    secondary: post.brand_secondary_color || pick("brand_secondary") || "",
    logo: post.brand_logo_url || pick("brand_logo") || "",
    program: post.brand_program || pick("brand_program") || "",
    showLogos: !/^show_logos:false$/m.test(notes),
  };
}

function isHex(value) {
  return /^#[0-9a-f]{6}$/i.test(value ?? "");
}

function isReadableAccent(hex) {
  if (!isHex(hex)) return false;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  // Against a dark wash, very dark program colours disappear.
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 70;
}

/** Numbers, records and the last two words carry the green accent, like the reference posts. */
function accentWord(word) {
  return (
    /\d/.test(word) ||
    /^(NOW|FREE|TODAY|WHY|HOW|NOT|NEVER|MOST|BEST|REAL|LOST|UNBEATEN|WRONG|HASN'T|HASNT)$/.test(word)
  );
}

function drawAccented(ctx, line, x, y, size, accent = ACCENT) {
  ctx.font = `400 ${size}px ${DISPLAY_FONT}`;
  const space = ctx.measureText(" ").width;
  let cx = x;
  for (const word of line.split(" ")) {
    ctx.fillStyle = accentWord(word) ? accent : "#ffffff";
    ctx.fillText(word, cx, y);
    cx += ctx.measureText(word).width + space;
  }
}

/** Graphics need one idea, not a paragraph. */
function firstSentences(body, count) {
  const parts = String(body ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  return parts.slice(0, count).join(" ");
}

function parseEditorial(text) {
  const parts = String(text ?? "").split("\n---\n");
  // Strip stray separators so no slide ever prints a literal "---".
  const clean = (s) => String(s ?? "").replace(/^[-\s]*|[-\s]*$/g, "").trim();
  return { headline: clean(parts[0]), body: clean(parts[1]), tip: clean(parts[2]) };
}

function stripLeadingNumber(text) {
  const m = text.trim().match(/^(\d{1,2})\s*[.)]\s+(.*)$/s);
  if (m) return { n: m[1], rest: m[2] };
  return { n: null, rest: text.trim() };
}

/** Pull "Men's"/"Women's" up as a small kicker so the hook itself stays short. */
function coverCopy(headline, body) {
  let hook = String(headline || "").replace(/\s+/g, " ").trim();
  let kicker = "";
  const side = hook.match(/^(women's|men's)\b\s*/i);
  if (side) {
    kicker = `${side[1].toUpperCase()} SOCCER`;
    hook = hook.slice(side[0].length).trim();
  }
  const list = hook.match(/^(?:\d+\s+)?(?:facts|things|truths)(?:\s+you still get wrong)?\s+about\s+(.+)$/i);
  let tease = String(body || "").replace(/\s+/g, " ").trim();
  if (list?.[1]) {
    const count = hook.match(/^(\d+)/)?.[1];
    hook = list[1].replace(/[.?!]+$/, "").trim();
    const lead = count ? `${count} things most people miss.` : "Most people miss this.";
    tease = tease ? `${lead} ${tease}` : `${lead} Swipe.`;
  }
  if (hook) hook = hook.charAt(0).toUpperCase() + hook.slice(1);
  return { kicker, hook, tease };
}

function splitHeadlineTone(text) {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= 2) return { lead: text.trim(), punch: "" };
  const splitAt = Math.max(2, Math.ceil(words.length * 0.55));
  return { lead: words.slice(0, splitAt).join(" "), punch: words.slice(splitAt).join(" ") };
}

function splitBodyGrafs(body) {
  const t = body.trim();
  const nl = t.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (nl.length >= 2) return [nl[0], nl.slice(1).join(" ")];
  const parts = t.split(/(?<=\.)\s+/);
  if (parts.length >= 2) return [parts[0], parts.slice(1).join(" ")];
  return [t, ""];
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function fillWrapped(ctx, text, x, y, maxW, lineH) {
  for (const l of wrapLines(ctx, text, maxW)) {
    ctx.fillText(l, x, y);
    y += lineH;
  }
  return y;
}

function localPath(src) {
  if (!src) return null;
  const path = src.startsWith("http")
    ? (() => {
        try {
          return new URL(src).pathname;
        } catch {
          return src;
        }
      })()
    : src.split("?")[0];
  const rel = path.replace(/^\/+/, "");
  const candidates = [join(root, "public", rel), join(root, "dist/client", rel), join(root, rel)];
  return candidates.find((p) => existsSync(p)) ?? null;
}

async function fetchImage(canvasPkg, url) {
  const headers = {
    Accept: "image/svg+xml,image/png,image/webp,image/jpeg,image/*,*/*;q=0.8",
    "User-Agent": "RyvalContentFactory/1.0 (https://ryvalcontent.space)",
  };
  if (url.includes("ncaa.com")) headers.Referer = "https://www.ncaa.com/";
  const res = await fetch(url, { headers, redirect: "follow" });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const img = await canvasPkg.loadImage(buf);
  return img?.width ? img : null;
}

async function loadImg(canvasPkg, src) {
  if (!src) return null;
  const file = localPath(src);
  if (file) {
    try {
      const img = await canvasPkg.loadImage(file);
      if (img?.width) return img;
    } catch {
      /* try remote */
    }
  }
  const urls = [];
  if (src.startsWith("http")) urls.push(src);
  else if (src.startsWith("/")) {
    urls.push(`http://127.0.0.1:3000${src}`);
    try {
      const inner = new URL(src, "http://127.0.0.1:3000").searchParams.get("u");
      if (inner?.startsWith("http")) urls.push(inner);
    } catch {
      /* ignore */
    }
  }
  for (const url of urls) {
    try {
      const img = await fetchImage(canvasPkg, url);
      if (img) return img;
    } catch {
      /* next candidate */
    }
  }
  return null;
}

function isSchoolPost(post) {
  return /lane:school-spotlight/.test(String(post.notes ?? ""));
}

function isGenericCampus(url) {
  if (!url) return true;
  const u = String(url).toLowerCase();
  return u.includes("/stock/") || u.includes("/cta-bg/") || u.includes("images.unsplash.com");
}

const PHONE_INSET = { left: 0.065637, top: 0.033531, width: 0.870656, height: 0.932939 };

async function loadSlidePhoto(canvasPkg, post, preferred, last) {
  if (preferred) {
    const img = await loadImg(canvasPkg, preferred);
    if (img) return img;
  }
  if (last) return loadImg(canvasPkg, "/cta-bg/stadium-night.jpg");
  return null;
}

function schoolLogoFromPost(post) {
  if (post.school_logo_url) return String(post.school_logo_url);
  const match = String(post.notes ?? "").match(/^logo:(.+)$/m);
  return match?.[1]?.trim() || null;
}

async function loadSchoolCrest(canvasPkg, url) {
  if (!url) return null;
  const candidates = [];
  // NCAA serves each mark twice: bgl for light backgrounds, bgd for dark ones.
  // Our slides are dark, so the bgd variant reads without a plate behind it.
  if (url.includes("/logos/schools/bgl/")) {
    const dark = url.replace("/logos/schools/bgl/", "/logos/schools/bgd/");
    candidates.push(`http://127.0.0.1:3000/api/school-logo?u=${encodeURIComponent(dark)}`);
    candidates.push(dark);
  }
  if (url.startsWith("https://")) {
    candidates.push(`http://127.0.0.1:3000/api/school-logo?u=${encodeURIComponent(url)}`);
    candidates.push(url);
  } else if (url.startsWith("/")) {
    candidates.push(`http://127.0.0.1:3000${url}`);
    const file = localPath(url);
    if (file) candidates.push(file);
  } else {
    candidates.push(url);
  }
  for (const src of candidates) {
    const img = await loadImg(canvasPkg, src);
    if (img && img.width > 0 && img.height > 0) return img;
  }
  return null;
}

function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height;
  const cr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > cr) {
    sw = img.height * cr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / cr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function getSlides(post) {
  const raw = [post.hook, post.slide_2, post.slide_3, post.slide_4, post.slide_5, post.slide_6, post.cta];
  const slides = [];
  for (let i = 0; i < raw.length; i++) {
    const text = raw[i] ?? "";
    const ed = parseEditorial(text);
    if (i !== 6 && !ed.headline && !String(text).trim()) continue;
    slides.push({ text, index: i, isCTA: i === 6, isCover: slides.length === 0 && i !== 6 });
  }
  let reason = 0;
  return slides.map((s, displayIdx) => {
    const isCover = !s.isCTA && displayIdx === 0;
    if (!isCover) reason += 1;
    return { ...s, displayIdx, isCover, reasonNumber: isCover ? 0 : reason };
  });
}

async function renderOne(canvasPkg, post, slide, series) {
  const { createCanvas } = canvasPkg;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const bgs = post.bg_images ?? [];
  const last = slide.isCTA;
  const bgUrl = last ? bgs[slide.index] || post.cta_bg_url : bgs[slide.index];
  const img = await loadSlidePhoto(canvasPkg, post, bgUrl, last);
  if (!img && !last) throw new Error("Slide is missing a photo");
  if (img) drawCover(ctx, img, 0, 0, W, H);

  // Readability wash: light on top, heavy under the copy.
  const wash = ctx.createLinearGradient(0, 0, 0, H);
  wash.addColorStop(0, "rgba(0,0,0,0.62)");
  wash.addColorStop(0.32, "rgba(0,0,0,0.28)");
  wash.addColorStop(0.62, "rgba(0,0,0,0.62)");
  wash.addColorStop(1, "rgba(0,0,0,0.94)");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, W, H);

  const brand = brandFromPost(post);
  const accent = isReadableAccent(brand.primary) ? brand.primary : ACCENT;
  await drawWatermark(canvasPkg, ctx, post);

  const crestUrl = brand.showLogos ? brand.logo || schoolLogoFromPost(post) : null;
  const crest = await loadSchoolCrest(canvasPkg, crestUrl);
  if (crest && !last) {
    const crestH = 76;
    const crestW = Math.min(120, crestH * (crest.width / Math.max(1, crest.height)));
    const cx = W - PAD - crestW;
    // No plate: the mark sits straight on the photo, lifted by a soft shadow.
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 2;
    ctx.drawImage(crest, cx, PAD + 2, crestW, crestH);
    ctx.restore();
    if (isReadableAccent(brand.primary)) {
      ctx.fillStyle = brand.primary;
      ctx.fillRect(cx, PAD + crestH + 12, crestW, 6);
    }
  }

  if (last) {
    await drawCtaSlide(canvasPkg, ctx, post, slide);
    return canvas.encode("jpeg", 92);
  }

  const ed = parseEditorial(slide.text);
  const maxW = W - PAD * 2;
  // Leave room under the copy when a credibility line is drawn.
  const reserve = sourceLineFromPost(post) ? 122 : 74;

  if (slide.isCover) {
    const { kicker, hook, tease } = coverCopy(ed.headline || slide.text, ed.body);
    const { lines, size } = fitDisplay(ctx, (hook || ed.headline).toUpperCase(), maxW, 420, 96, 52, 6);
    const lineH = Math.round(size * 1.02);
    const teaseLines = tease ? wrapAt(ctx, tease, maxW, `600 32px ${BODY_FONT}`).slice(0, 3) : [];
    const kickerH = kicker ? 40 : 0;
    const teaseH = teaseLines.length ? teaseLines.length * 42 + 28 : 0;
    let y = H - PAD - reserve - teaseH - lines.length * lineH - kickerH;
    ctx.textBaseline = "top";
    if (kicker) {
      ctx.font = `700 22px ${BODY_FONT}`;
      ctx.fillStyle = accent;
      ctx.fillText(kicker, PAD, y);
      y += kickerH;
    }
    for (const line of lines) {
      drawAccented(ctx, line, PAD, y, size, accent);
      y += lineH;
    }
    if (teaseLines.length) {
      y += 16;
      ctx.beginPath();
      ctx.moveTo(PAD, y);
      ctx.lineTo(PAD + 120, y);
      ctx.lineWidth = 4;
      ctx.strokeStyle = accent;
      ctx.stroke();
      y += 18;
      ctx.font = `600 32px ${BODY_FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      for (const line of teaseLines) {
        ctx.fillText(line, PAD, y);
        y += 42;
      }
    }
  } else {
    const stripped = stripLeadingNumber(ed.headline || slide.text).rest || ed.headline;
    const { lines, size } = fitDisplay(ctx, stripped.toUpperCase(), maxW, 200, 78, 56);
    const lineH = Math.round(size * 1.04);
    const body = firstSentences(ed.body, 2);
    const bodyLines = body ? wrapAt(ctx, body, maxW, `500 30px ${BODY_FONT}`) : [];
    const blockH = 96 + lines.length * lineH + (bodyLines.length ? 22 + bodyLines.length * 40 : 0);
    let y = H - PAD - reserve - blockH;

    ctx.textBaseline = "top";
    ctx.font = `400 84px ${DISPLAY_FONT}`;
    ctx.fillStyle = accent;
    ctx.fillText(String(slide.reasonNumber), PAD, y);
    y += 96;

    for (const line of lines) {
      drawAccented(ctx, line, PAD, y, size, accent);
      y += lineH;
    }
    if (bodyLines.length) {
      y += 22;
      ctx.font = `500 30px ${BODY_FONT}`;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (const line of bodyLines) {
        ctx.fillText(line, PAD, y);
        y += 40;
      }
    }
  }

  drawSourceLine(ctx, sourceLineFromPost(post));
  drawFooter(ctx, slide, false);
  return canvas.encode("jpeg", 92);
}

/** Ryval mark plus wordmark, top left, small enough to stay out of the way. */
async function drawWatermark(canvasPkg, ctx, post) {
  const logo = await loadImg(canvasPkg, post.logo_url || "/ryval-mark.png");
  if (!logo) return;
  const logoH = 40;
  const logoW = logoH * (logo.width / Math.max(1, logo.height));
  ctx.globalAlpha = 0.95;
  ctx.drawImage(logo, PAD, PAD, logoW, logoH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 30px ${DISPLAY_FONT}`;
  ctx.textBaseline = "middle";
  ctx.fillText("RYVAL", PAD + logoW + 14, PAD + logoH / 2 + 1);
}

function sourceLineFromPost(post) {
  return String(post.notes ?? "").match(/^source_line:(.+)$/m)?.[1]?.trim() || "";
}

/** Credibility line on news graphics: who reported it and when. */
function drawSourceLine(ctx, text) {
  if (!text) return;
  ctx.textBaseline = "bottom";
  ctx.font = `700 19px ${BODY_FONT}`;
  const label = `SOURCE: ${text.toUpperCase()}`;
  const w = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(PAD - 12, H - PAD - 84, w + 24, 34);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(PAD - 12, H - PAD - 84, 4, 34);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(label, PAD, H - PAD - 58);
}

function drawFooter(ctx, slide, last) {
  ctx.textBaseline = "bottom";
  if (!last) {
    ctx.textAlign = "right";
    ctx.font = `700 22px ${BODY_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    ctx.fillText("SWIPE \u2192", W - PAD, H - PAD);
    ctx.textAlign = "left";
  }
}

/** Last slide: the phone is the hero, copy stacks beside it. */
async function drawCtaSlide(canvasPkg, ctx, post, slide) {
  const ed = parseEditorial(slide.text);
  // Keep the whole handset on canvas: nothing bleeds past the right edge.
  const phoneH = 960;
  const phoneW = Math.round(phoneH * (518 / 1014));
  const phoneX = W - phoneW - 28;
  const phoneY = Math.round((H - phoneH) / 2);

  const screenUrl =
    post.app_screen_url || (isSchoolPost(post) ? "/app-screens/university.jpg" : "/app-screens/discover.jpg");
  const screenImg = await loadImg(canvasPkg, screenUrl);
  const frameImg = await loadImg(canvasPkg, "/app-screens/iphone-16-pro-frame.png");
  if (!screenImg || !frameImg) throw new Error("CTA phone mockup failed to load");

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetX = -18;
  const sx = phoneX + phoneW * PHONE_INSET.left;
  const sy = phoneY + phoneH * PHONE_INSET.top;
  const sw = phoneW * PHONE_INSET.width;
  const sh = phoneH * PHONE_INSET.height;
  const rr = sw * 0.12;
  ctx.beginPath();
  ctx.moveTo(sx + rr, sy);
  ctx.arcTo(sx + sw, sy, sx + sw, sy + sh, rr);
  ctx.arcTo(sx + sw, sy + sh, sx, sy + sh, rr);
  ctx.arcTo(sx, sy + sh, sx, sy, rr);
  ctx.arcTo(sx, sy, sx + sw, sy, rr);
  ctx.closePath();
  ctx.clip();
  drawCover(ctx, screenImg, sx, sy, sw, sh);
  ctx.restore();
  ctx.drawImage(frameImg, phoneX, phoneY, phoneW, phoneH);

  const copyW = phoneX - PAD - 40;
  const { lines, size } = fitDisplay(ctx, (ed.headline || "GET SEEN BY COLLEGE COACHES").toUpperCase(), copyW, 340, 80, 52);
  const lineH = Math.round(size * 1.02);
  const bodyLines = ed.body ? wrapAt(ctx, ed.body, copyW, `500 26px ${BODY_FONT}`) : [];
  let y = Math.round((H - (lines.length * lineH + (bodyLines.length ? 24 + bodyLines.length * 34 : 0))) / 2) - 40;

  ctx.textBaseline = "top";
  for (const line of lines) {
    drawAccented(ctx, line, PAD, y, size);
    y += lineH;
  }
  if (bodyLines.length) {
    y += 24;
    ctx.font = `500 26px ${BODY_FONT}`;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    for (const line of bodyLines) {
      ctx.fillText(line, PAD, y);
      y += 34;
    }
  }

  const badge = await loadImg(canvasPkg, "/badges/app-store.svg");
  if (badge) {
    const badgeH = 58;
    const badgeW = badgeH * (badge.width / Math.max(1, badge.height));
    ctx.drawImage(badge, PAD, H - PAD - badgeH, badgeW, badgeH);
  } else {
    ctx.font = `700 24px ${BODY_FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "bottom";
    ctx.fillText("Download on the App Store", PAD, H - PAD);
  }
}

async function main() {
  const postPath = process.argv[2];
  const outDir = process.argv[3];
  if (!postPath || !outDir) {
    console.error("Usage: node scripts/render-slides.mjs <post.json> <outdir>");
    process.exit(1);
  }
  let canvasPkg;
  try {
    canvasPkg = require("@napi-rs/canvas");
  } catch (e) {
    console.error("Install @napi-rs/canvas on the host: npm install @napi-rs/canvas");
    throw e;
  }
  const fontDirs = [join(root, "public/fonts"), join(root, "dist/client/fonts")];
  const register = (file, family) => {
    for (const dir of fontDirs) {
      const path = join(dir, file);
      if (!existsSync(path)) continue;
      try {
        canvasPkg.GlobalFonts.registerFromPath(path, family);
        return true;
      } catch {
        /* try the next copy */
      }
    }
    return false;
  };
  const haveDisplay = register("Anton-Regular.ttf", DISPLAY_FONT);
  const haveBody = register("Inter.ttf", BODY_FONT);
  if (!haveDisplay || !haveBody) {
    // Fall back to whatever the host ships so a missing font never blanks the text.
    for (const f of [
      "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
      "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]) {
      if (!existsSync(f)) continue;
      if (!haveDisplay) canvasPkg.GlobalFonts.registerFromPath(f, DISPLAY_FONT);
      if (!haveBody) canvasPkg.GlobalFonts.registerFromPath(f, BODY_FONT);
      break;
    }
  }
  // College stats faces. A missing file falls back to the display/body face so text never blanks.
  for (const [file, family, fallback] of [
    ["BarlowCondensed-ExtraBold.ttf", "RyvalCondX", "Anton-Regular.ttf"],
    ["BarlowCondensed-SemiBold.ttf", "RyvalCondSemi", "Inter.ttf"],
    ["JetBrainsMono-Medium.ttf", "RyvalMono", "Inter.ttf"],
    ["JetBrainsMono-Bold.ttf", "RyvalMonoBold", "Inter.ttf"],
  ]) {
    if (!register(file, family)) register(fallback, family);
  }
  const post = JSON.parse(readFileSync(postPath, "utf8"));
  mkdirSync(outDir, { recursive: true });
  const statSpec = statSpecFromPost(post);
  if (statSpec) {
    const jpegs = await renderStatPost(
      {
        canvasPkg,
        loadImg: (src) => loadImg(canvasPkg, src),
        loadCrest: (url) => loadSchoolCrest(canvasPkg, url),
      },
      post,
      statSpec,
    );
    jpegs.forEach((jpeg, i) => writeFileSync(join(outDir, `slide-${String(i + 1).padStart(2, "0")}.jpg`), jpeg));
    console.log(JSON.stringify({ slides: jpegs.length, outDir, stats: true }));
    return;
  }
  const slides = getSlides(post);
  const series = parseEditorial(post.hook ?? "").headline;
  for (let i = 0; i < slides.length; i++) {
    const jpeg = await renderOne(canvasPkg, post, slides[i], series);
    const dest = join(outDir, `slide-${String(i + 1).padStart(2, "0")}.jpg`);
    writeFileSync(dest, jpeg);
  }
  console.log(JSON.stringify({ slides: slides.length, outDir }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
