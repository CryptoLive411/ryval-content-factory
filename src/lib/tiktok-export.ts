// Compose 1080×1350 (4:5) JPEGs — Ryval editorial carousel frame.
import JSZip from "jszip";
import type { SlidePost } from "@/components/carousel-preview";
import { getSlides } from "@/components/carousel-preview";
import {
  APP_STORE_BADGE_SRC,
  DEFAULT_APP_SCREENS,
  IPHONE_FRAME_SRC,
  IPHONE_SCREEN_INSET_NUM,
  resolveAppScreen,
  resolveCtaBackground,
  RYVAL_MARK_SRC,
  screenSalt,
} from "@/lib/brand";
import { gradientFallbackDataUrl, parseEditorial } from "@/lib/content-quality";
import { extractStockPhotoId, unsplashPhotoUrl } from "@/lib/stock-photos";
import { proxiedSchoolLogo } from "@/lib/school-logo";
import {
  EDITORIAL_ACCENT,
  EDITORIAL_BG,
  EDITORIAL_FOOTER,
  EDITORIAL_H,
  EDITORIAL_TAG_LEFT,
  EDITORIAL_TAG_RIGHT,
  EDITORIAL_W,
  splitBodyGrafs,
  splitHeadlineTone,
  stripLeadingNumber,
} from "@/lib/editorial";

const W = EDITORIAL_W;
const H = EDITORIAL_H;

function resolveAssetUrl(src: string) {
  const stockId = extractStockPhotoId(src);
  if (stockId) {
    if (typeof window === "undefined") return `/stock/${stockId}.jpg`;
    return new URL(`/stock/${stockId}.jpg`, window.location.origin).toString();
  }
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  if (typeof window === "undefined") return src;
  return new URL(src, window.location.origin).toString();
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  const primary = resolveAssetUrl(src);
  const stockId = extractStockPhotoId(src);
  const fallback = stockId ? unsplashPhotoUrl(stockId) : null;
  const urls = fallback && fallback !== primary ? [primary, fallback] : [primary];

  const load = (url: string, cors: boolean) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      const sameOrigin =
        url.startsWith("data:") ||
        (typeof window !== "undefined" && url.startsWith(window.location.origin));
      if (cors && !sameOrigin) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });

  return (async () => {
    for (const url of urls) {
      const withCors = await load(url, true);
      if (withCors) return withCors;
      const plain = await load(url, false);
      if (plain) return plain;
    }
    return null;
  })();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const srcR = img.width / img.height;
  const dstR = w / h;
  let sx = 0,
    sy = 0,
    sw = img.width,
    sh = img.height;
  if (srcR > dstR) {
    sw = img.height * dstR;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dstR;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

export async function renderPostSlideUrls(post: SlidePost, _scope?: ParentNode | null): Promise<string[]> {
  const blobs = await renderPostSlideBlobs(post);
  return blobs.map((b) => URL.createObjectURL(b));
}

export async function renderPostSlideBlobs(post: SlidePost, _scope?: ParentNode | null): Promise<Blob[]> {
  const slides = getSlides(post);
  const bgs = post.bg_images ?? [];
  const series = parseEditorial(post.hook ?? "").headline;
  const blobs: Blob[] = [];
  for (const s of slides) {
    const last = s.displayIdx === slides.length - 1;
    const blob = await renderSlide({
      text: s.text,
      isCover: s.isCover,
      isLast: last,
      reasonNumber: s.reasonNumber,
      series,
      bgUrl: last
        ? (bgs[s.index] ||
          post.cta_bg_url ||
          resolveCtaBackground(screenSalt(post.app_screen_url)))
        : (bgs[s.index] ?? gradientFallbackDataUrl(s.index)),
      appScreenUrl: last ? resolveAppScreen(post.app_screen_url) : null,
      logoUrl: post.logo_url || RYVAL_MARK_SRC,
      schoolLogoUrl: post.school_logo_url ?? null,
    });
    blobs.push(blob);
  }
  return blobs;
}

function fillWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
) {
  const lines = wrapLines(ctx, text, maxW);
  for (const l of lines) {
    ctx.fillText(l, x, y);
    y += lineH;
  }
  return y;
}

async function renderSlide(opts: {
  text: string;
  isCover: boolean;
  isLast: boolean;
  reasonNumber: number;
  series: string;
  bgUrl: string | null;
  appScreenUrl: string | null;
  logoUrl: string | null;
  schoolLogoUrl?: string | null;
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = EDITORIAL_BG;
  ctx.fillRect(0, 0, W, H);

  const photoW = Math.round(W * 0.46);
  const photoX = W - photoW;
  if (opts.bgUrl) {
    const img = await loadImage(opts.bgUrl);
    if (img) {
      drawCoverImage(ctx, img, photoX, 0, photoW, H);
      ctx.fillStyle = opts.appScreenUrl ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.15)";
      ctx.fillRect(photoX, 0, photoW, H);
    }
  }
  if (opts.appScreenUrl) {
    const phoneH = 860;
    const phoneW = Math.round(phoneH * (518 / 1014));
    const phoneX = photoX + Math.round((photoW - phoneW) / 2);
    const phoneY = Math.round((H - phoneH) / 2) + 10;
    const screenUrl = opts.appScreenUrl || DEFAULT_APP_SCREENS[0];
    const screenImg = await loadImage(screenUrl);
    const frameImg = await loadImage(IPHONE_FRAME_SRC);
    if (screenImg) {
      const sx = phoneX + phoneW * IPHONE_SCREEN_INSET_NUM.left;
      const sy = phoneY + phoneH * IPHONE_SCREEN_INSET_NUM.top;
      const sw = phoneW * IPHONE_SCREEN_INSET_NUM.width;
      const sh = phoneH * IPHONE_SCREEN_INSET_NUM.height;
      ctx.save();
      const rr = sw * 0.12;
      ctx.beginPath();
      ctx.moveTo(sx + rr, sy);
      ctx.arcTo(sx + sw, sy, sx + sw, sy + sh, rr);
      ctx.arcTo(sx + sw, sy + sh, sx, sy + sh, rr);
      ctx.arcTo(sx, sy + sh, sx, sy, rr);
      ctx.arcTo(sx, sy, sx + sw, sy, rr);
      ctx.closePath();
      ctx.clip();
      drawCoverImage(ctx, screenImg, sx, sy, sw, sh);
      ctx.restore();
    }
    if (frameImg) {
      ctx.drawImage(frameImg, phoneX, phoneY, phoneW, phoneH);
    }
  }
  const fade = ctx.createLinearGradient(photoX, 0, photoX + 120, 0);
  fade.addColorStop(0, EDITORIAL_BG);
  fade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(photoX, 0, 120, H);

  const logo = await loadImage(opts.logoUrl || RYVAL_MARK_SRC);
  if (logo) {
    const logoH = 44;
    const logoW = logoH * (logo.width / Math.max(1, logo.height));
    ctx.drawImage(logo, 48, 44, logoW, logoH);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 28px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText("RYVAL", 48 + logoW + 16, 66);
    const wordW = ctx.measureText("RYVAL").width;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(48 + logoW + 16 + wordW + 16, 48, 1, 36);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "600 11px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "top";
    let ty = 48;
    for (const line of EDITORIAL_TAG_LEFT) {
      ctx.fillText(line, 48 + logoW + 16 + wordW + 32, ty);
      ty += 14;
    }
  }

  ctx.textAlign = "right";
  const schoolSrc = proxiedSchoolLogo(opts.schoolLogoUrl);
  if (schoolSrc) {
    const crest = await loadImage(schoolSrc);
    if (crest && crest.width > 0 && crest.height > 0) {
      const crestH = 72;
      const crestW = Math.min(110, crestH * (crest.width / Math.max(1, crest.height)));
      ctx.drawImage(crest, W - 48 - crestW, 36, crestW, crestH);
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "600 11px Inter, ui-sans-serif, system-ui, sans-serif";
      ctx.textBaseline = "top";
      let ry = 48;
      for (const line of EDITORIAL_TAG_RIGHT) {
        ctx.fillText(line, W - 48, ry);
        ry += 14;
      }
    }
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = "600 11px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "top";
    let ry = 48;
    for (const line of EDITORIAL_TAG_RIGHT) {
      ctx.fillText(line, W - 48, ry);
      ry += 14;
    }
  }
  ctx.textAlign = "left";

  const copyX = 48;
  const copyW = 520;
  let y = 130;
  const ed = parseEditorial(opts.text);

  if (!opts.isCover && opts.series) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "600 13px Inter, ui-sans-serif, system-ui, sans-serif";
    y = fillWrapped(ctx, opts.series.toUpperCase(), copyX, y, copyW, 18) + 18;
  }

  if (opts.isCover) {
    const { n, rest } = stripLeadingNumber(ed.headline || opts.text);
    const { lead, punch } = splitHeadlineTone(rest || ed.headline);
    ctx.font = "900 72px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "top";
    const head = `${n ? `${n} ` : ""}${lead}`.toUpperCase();
    ctx.fillStyle = n ? EDITORIAL_ACCENT : "#ffffff";
    const headLines = wrapLines(ctx, head, copyW);
    // Paint first token blue when it is the number
    for (let i = 0; i < headLines.length; i++) {
      const line = headLines[i];
      if (i === 0 && n) {
        ctx.fillStyle = EDITORIAL_ACCENT;
        const nw = ctx.measureText(`${n} `).width;
        ctx.fillText(n, copyX, y);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(line.slice(String(n).length).trimStart(), copyX + nw, y);
      } else {
        ctx.fillStyle = "#ffffff";
        ctx.fillText(line, copyX, y);
      }
      y += 68;
    }
    if (punch) {
      ctx.fillStyle = EDITORIAL_ACCENT;
      y = fillWrapped(ctx, punch.toUpperCase(), copyX, y, copyW, 68);
    }
    if (ed.body) {
      y += 24;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "600 20px Inter, ui-sans-serif, system-ui, sans-serif";
      y = fillWrapped(ctx, ed.body.toUpperCase(), copyX, y, copyW, 28);
    }
  } else {
    const stripped = stripLeadingNumber(ed.headline || opts.text).rest || ed.headline;
    const { lead, punch } = splitHeadlineTone(stripped);
    ctx.fillStyle = EDITORIAL_ACCENT;
    ctx.font = "900 110px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(String(opts.reasonNumber), copyX, y);
    const numW = ctx.measureText(String(opts.reasonNumber)).width;
    ctx.font = "900 44px Inter, ui-sans-serif, system-ui, sans-serif";
    let hy = y + 10;
    ctx.fillStyle = "#ffffff";
    hy = fillWrapped(ctx, lead.toUpperCase(), copyX + numW + 16, hy, copyW - numW - 16, 48);
    if (punch) {
      ctx.fillStyle = EDITORIAL_ACCENT;
      hy = fillWrapped(ctx, punch.toUpperCase(), copyX + numW + 16, hy, copyW - numW - 16, 48);
    }
    y = Math.max(y + 130, hy + 20);
    const [g1, g2] = splitBodyGrafs(ed.body);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.font = "500 22px Inter, ui-sans-serif, system-ui, sans-serif";
    if (g1) y = fillWrapped(ctx, g1, copyX, y, copyW, 30) + 16;
    if (g2) y = fillWrapped(ctx, g2, copyX, y, copyW, 30);
    if (ed.tip) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "800 13px Inter, ui-sans-serif, system-ui, sans-serif";
      ctx.fillText("TIP:", copyX + 40, H - 210);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.font = "500 20px Inter, ui-sans-serif, system-ui, sans-serif";
      fillWrapped(ctx, ed.tip, copyX + 40, H - 186, copyW - 40, 26);
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "800 15px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.textBaseline = "bottom";
  let fy = H - 48;
  for (let i = EDITORIAL_FOOTER.length - 1; i >= 0; i--) {
    ctx.fillText(EDITORIAL_FOOTER[i], 48, fy);
    fy -= 20;
  }

  if (!opts.isLast) {
    ctx.textAlign = "right";
    ctx.font = "700 16px Inter, ui-sans-serif, system-ui, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillText("SWIPE →", W - 48, H - 48);
    ctx.textAlign = "left";
  }

  if (opts.isLast) {
    const badge = await loadImage(APP_STORE_BADGE_SRC);
    if (badge) {
      const badgeH = 48;
      const badgeW = badgeH * (badge.width / Math.max(1, badge.height));
      ctx.drawImage(badge, W - 48 - badgeW, H - 56, badgeW, badgeH);
    }
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

export async function exportPostForTikTok(opts: {
  post: SlidePost;
  caption: string;
  hashtags: string;
  filenameBase: string;
}) {
  const { post, caption, hashtags, filenameBase } = opts;
  const blobs = await renderPostSlideBlobs(post);
  if (blobs.length === 0) throw new Error("No slides to export");

  const zip = new JSZip();
  for (let i = 0; i < blobs.length; i++) {
    zip.file(`${filenameBase}-slide-${String(i + 1).padStart(2, "0")}.jpg`, blobs[i]);
  }
  zip.file("caption.txt", `${caption.trim()}\n\n${hashtags.trim()}\n`);

  const out = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}-tiktok.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function uploadExportSlides(opts: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { storage: { from: (b: string) => any } };
  userId: string;
  postId: string;
  blobs: Blob[];
}): Promise<string[]> {
  const { supabase, userId, postId, blobs } = opts;
  const urls: string[] = [];
  for (let i = 0; i < blobs.length; i++) {
    const path = `${userId}/exports/${postId}/slide-${String(i + 1).padStart(2, "0")}.jpg`;
    const { error } = await supabase.storage.from("assets").upload(path, blobs[i], {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (error) throw new Error(`Export upload failed: ${error.message}`);
    const { data } = supabase.storage.from("assets").getPublicUrl(path);
    urls.push(`${data.publicUrl}?v=${Date.now()}`);
  }
  return urls;
}
