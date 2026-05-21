// Render TikTok carousel slides (1080x1350) directly with Canvas 2D
// from post data — no html2canvas, no DOM, no CORS issues.
import JSZip from "jszip";
import type { SlidePost } from "@/components/carousel-preview";
import { getSlides } from "@/components/carousel-preview";

const W = 1080;
const H = 1350;
const PAD = 64;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
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

function drawCoverImage(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const srcR = img.width / img.height;
  const dstR = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (srcR > dstR) {
    sw = img.height * dstR;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / dstR;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function ctaLabels(ctaType?: string | null) {
  const t = (ctaType ?? "").toLowerCase();
  if (t.includes("waitlist")) return { tag: "COMING SOON · JOIN THE WAITLIST", btn: "Join the waitlist →" };
  if (t.includes("coming"))   return { tag: "COMING SOON",                     btn: "Join the waitlist →" };
  if (t.includes("follow"))   return { tag: "FOLLOW FOR MORE",                 btn: "@ryval.app →" };
  return { tag: "COMING SOON · JOIN THE WAITLIST", btn: "Join the waitlist →" };
}

async function renderSlide(opts: {
  text: string;
  isCTA: boolean;
  index: number;
  total: number;
  bgUrl: string | null;
  appScreenUrl: string | null;
  logoUrl: string | null;
  cta: { tag: string; btn: string };
}): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Base background
  if (opts.isCTA) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#0b0f1a");
    g.addColorStop(0.55, "#11182b");
    g.addColorStop(1, "#1e3a8a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = "#0b0f1a";
    ctx.fillRect(0, 0, W, H);
    if (opts.bgUrl) {
      const img = await loadImage(opts.bgUrl);
      if (img) {
        drawCoverImage(ctx, img, 0, 0, W, H);
        // Vignette overlay for legibility
        const r = ctx.createRadialGradient(W / 2, H / 2, W * 0.15, W / 2, H / 2, W * 0.75);
        r.addColorStop(0, "rgba(5,8,18,0.35)");
        r.addColorStop(1, "rgba(5,8,18,0.92)");
        ctx.fillStyle = r;
        ctx.fillRect(0, 0, W, H);
      }
    }
  }

  // Header: logo image (or wordmark fallback) + index pill
  const logoH = 44;
  if (opts.logoUrl) {
    const logo = await loadImage(opts.logoUrl);
    if (logo) {
      const logoW = logoH * (logo.width / logo.height);
      ctx.drawImage(logo, PAD, PAD, logoW, logoH);
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 32px ui-sans-serif, system-ui, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText("RYVAL", PAD, PAD + 6);
    }
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 32px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("RYVAL", PAD, PAD + 6);
  }
  // Slide index removed per user request

  if (opts.isCTA) {
    // App screen mock area (top-center)
    const phoneW = 280;
    const phoneH = Math.round(phoneW * (19 / 9));
    const phoneX = (W - phoneW) / 2;
    const phoneY = 220;
    if (opts.appScreenUrl) {
      const img = await loadImage(opts.appScreenUrl);
      if (img) {
        // Rounded rect clip
        const rr = 28;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(phoneX + rr, phoneY);
        ctx.arcTo(phoneX + phoneW, phoneY, phoneX + phoneW, phoneY + phoneH, rr);
        ctx.arcTo(phoneX + phoneW, phoneY + phoneH, phoneX, phoneY + phoneH, rr);
        ctx.arcTo(phoneX, phoneY + phoneH, phoneX, phoneY, rr);
        ctx.arcTo(phoneX, phoneY, phoneX + phoneW, phoneY, rr);
        ctx.closePath();
        ctx.clip();
        drawCoverImage(ctx, img, phoneX, phoneY, phoneW, phoneH);
        ctx.restore();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,255,255,0.18)";
        ctx.stroke();
      }
    }

    // Headline
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "900 56px ui-sans-serif, system-ui, sans-serif";
    const headline = opts.text || "Get on the list.";
    const hLines = wrapLines(ctx, headline, W - PAD * 2);
    let ty = phoneY + phoneH + 60;
    for (const l of hLines) {
      ctx.fillText(l, W / 2, ty);
      ty += 64;
    }

    // Sub tag
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.font = "700 22px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(opts.cta.tag, W / 2, ty + 16);

    // CTA pill
    ctx.font = "800 30px ui-sans-serif, system-ui, sans-serif";
    const btnText = opts.cta.btn;
    const btnPadX = 32;
    const btnW = ctx.measureText(btnText).width + btnPadX * 2;
    const btnH = 72;
    const btnX = (W - btnW) / 2;
    const btnY = ty + 70;
    const rr = btnH / 2;
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.moveTo(btnX + rr, btnY);
    ctx.arcTo(btnX + btnW, btnY, btnX + btnW, btnY + btnH, rr);
    ctx.arcTo(btnX + btnW, btnY + btnH, btnX, btnY + btnH, rr);
    ctx.arcTo(btnX, btnY + btnH, btnX, btnY, rr);
    ctx.arcTo(btnX, btnY, btnX + btnW, btnY, rr);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0b0f1a";
    ctx.textBaseline = "middle";
    ctx.fillText(btnText, W / 2, btnY + btnH / 2 + 2);
    ctx.textAlign = "start";
    ctx.textBaseline = "top";
  } else {
    // Body slide: large centered headline
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.85)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 2;
    const maxW = W - PAD * 2;
    // Size adapts to text length
    let size = 72;
    if (opts.text.length > 90) size = 56;
    if (opts.text.length > 160) size = 46;
    ctx.font = `900 ${size}px ui-sans-serif, system-ui, sans-serif`;
    const lines = wrapLines(ctx, opts.text, maxW);
    const lineH = Math.round(size * 1.15);
    const totalH = lines.length * lineH;
    let y = (H - totalH) / 2;
    for (const l of lines) {
      ctx.fillText(l, W / 2, y);
      y += lineH;
    }
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.textAlign = "start";

    // Accent dot bottom-right
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(W - PAD, H - PAD, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), "image/png");
  });
}

export async function exportPostForTikTok(opts: {
  post: SlidePost;
  caption: string;
  hashtags: string;
  filenameBase: string;
}) {
  const { post, caption, hashtags, filenameBase } = opts;
  const slides = getSlides(post);
  if (slides.length === 0) throw new Error("No slides to export");

  const zip = new JSZip();
  const cta = ctaLabels(post.cta_type);
  const bgs = post.bg_images ?? [];

  for (let i = 0; i < slides.length; i++) {
    const s = slides[i];
    const blob = await renderSlide({
      text: s.text,
      isCTA: s.isCTA,
      index: s.index,
      total: slides.length,
      bgUrl: s.isCTA ? null : (bgs[s.index] ?? post.bg_image_url ?? null),
      appScreenUrl: post.app_screen_url ?? null,
      logoUrl: post.logo_url ?? null,
      cta,
    });
    zip.file(`${filenameBase}-slide-${String(i + 1).padStart(2, "0")}.png`, blob);
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
