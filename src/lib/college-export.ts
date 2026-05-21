// Canvas-rendered 1080x1350 college recruiting slides.
import JSZip from "jszip";
import type { CollegePost, CollegeSlide } from "./college";

const W = 1080;
const H = 1350;
const PAD = 60;

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const sR = img.width / img.height, dR = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (sR > dR) { sw = img.height * dR; sx = (img.width - sw) / 2; }
  else { sh = img.width / dR; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function setCondensed(ctx: CanvasRenderingContext2D, weight: number, size: number) {
  ctx.font = `${weight} ${size}px "Impact", "Oswald", "Bebas Neue", "Arial Narrow", system-ui, sans-serif`;
}

function setSans(ctx: CanvasRenderingContext2D, weight: number, size: number) {
  ctx.font = `${weight} ${size}px "Inter", ui-sans-serif, system-ui, sans-serif`;
}

function drawEyebrow(ctx: CanvasRenderingContext2D, text: string, accent: string) {
  ctx.fillStyle = "#ffffff";
  setSans(ctx, 700, 22);
  ctx.textBaseline = "top";
  ctx.fillText(text.toUpperCase(), PAD, PAD);
  // accent rule
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, PAD + 30, 56, 4);
}

async function drawLogo(ctx: CanvasRenderingContext2D, logoUrl: string | null) {
  if (!logoUrl) {
    ctx.fillStyle = "#ffffff";
    setSans(ctx, 900, 26);
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText("RYVAL", W - PAD, PAD);
    ctx.textAlign = "start";
    return;
  }
  const img = await loadImage(logoUrl);
  if (!img) return;
  const h = 50;
  const w = h * (img.width / img.height);
  ctx.drawImage(img, W - PAD - w, PAD, w, h);
}

// Stack a multiline title (split on \n) with optional accent word coloring.
function drawDisplayTitle(
  ctx: CanvasRenderingContext2D,
  title: string,
  accentWord: string | undefined,
  accent: string,
  startY: number,
  size: number,
) {
  const lines = title.split("\n");
  setCondensed(ctx, 900, size);
  ctx.textAlign = "start";
  ctx.textBaseline = "top";
  const lineH = Math.round(size * 0.95);
  let y = startY;
  const accUp = accentWord?.toUpperCase().replace(/\.$/, "");
  for (const raw of lines) {
    const line = raw.toUpperCase();
    const lineNoDot = line.replace(/\.$/, "");
    const isAccent = accUp && (lineNoDot === accUp);
    ctx.fillStyle = isAccent ? accent : "#ffffff";
    ctx.fillText(line, PAD, y);
    y += lineH;
  }
  return y;
}

function drawSubline(ctx: CanvasRenderingContext2D, text: string, y: number, accent: string) {
  ctx.fillStyle = "#ffffff";
  setSans(ctx, 800, 28);
  ctx.textBaseline = "top";
  // Highlight a trailing accent word if present, e.g. "BUILT DIFFERENT."
  const parts = text.split(" ");
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    const head = parts.slice(0, -1).join(" ") + " ";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(head, PAD, y);
    const headW = ctx.measureText(head).width;
    ctx.fillStyle = accent;
    ctx.fillText(last, PAD + headW, y);
  } else {
    ctx.fillText(text, PAD, y);
  }
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, y + 42, 56, 4);
}

function drawDarkGradientOverlay(ctx: CanvasRenderingContext2D) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "rgba(5,8,18,0.85)");
  g.addColorStop(0.4, "rgba(5,8,18,0.35)");
  g.addColorStop(1, "rgba(5,8,18,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function drawChipRow(ctx: CanvasRenderingContext2D, chips: { title: string; body: string }[], accent: string) {
  const top = H - 280;
  const colW = (W - PAD * 2) / chips.length;
  // separator lines between chips
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 1; i < chips.length; i++) {
    ctx.fillRect(PAD + colW * i, top + 18, 1, 200);
  }
  chips.forEach((c, i) => {
    const cx = PAD + colW * i + colW / 2;
    // title
    ctx.fillStyle = "#ffffff";
    setSans(ctx, 800, 20);
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const titleLines = wrap(ctx, c.title.toUpperCase(), colW - 24);
    let ty = top + 24;
    for (const tl of titleLines) { ctx.fillText(tl, cx, ty); ty += 24; }
    // body
    if (c.body) {
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      setSans(ctx, 400, 15);
      const lines = wrap(ctx, c.body, colW - 24);
      let by = ty + 8;
      for (const l of lines) { ctx.fillText(l, cx, by); by += 19; }
    }
  });
  ctx.textAlign = "start";
}

async function renderSlide(
  slide: CollegeSlide,
  accent: string,
  logoUrl: string | null,
  bgUrl: string | null,
  appScreenUrl: string | null,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // base fill
  ctx.fillStyle = "#05080f";
  ctx.fillRect(0, 0, W, H);

  // background image
  if (bgUrl) {
    const img = await loadImage(bgUrl);
    if (img) drawCover(ctx, img, 0, 0, W, H);
  }

  // dark gradient for legibility
  drawDarkGradientOverlay(ctx);

  // header
  drawEyebrow(ctx, slide.eyebrow, accent);
  await drawLogo(ctx, logoUrl);

  // body by kind
  if (slide.kind === "hero") {
    const titleSize = 220;
    const titleY = 360;
    const after = drawDisplayTitle(ctx, slide.title, slide.accentWord, accent, titleY, titleSize);
    if (slide.subline) drawSubline(ctx, slide.subline, after + 24, accent);
  } else if (slide.kind === "cta") {
    // Hero-style title left, app screen mock right
    const titleSize = 130;
    const titleY = 280;
    const after = drawDisplayTitle(ctx, slide.title, slide.accentWord, accent, titleY, titleSize);
    if (slide.subline) drawSubline(ctx, slide.subline, after + 24, accent);
    if (appScreenUrl) {
      const img = await loadImage(appScreenUrl);
      if (img) {
        const phoneW = 360;
        const phoneH = Math.round(phoneW * (img.height / img.width));
        const phoneX = W - PAD - phoneW;
        const phoneY = Math.round((H - phoneH) / 2);
        const rr = 32;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(phoneX + rr, phoneY);
        ctx.arcTo(phoneX + phoneW, phoneY, phoneX + phoneW, phoneY + phoneH, rr);
        ctx.arcTo(phoneX + phoneW, phoneY + phoneH, phoneX, phoneY + phoneH, rr);
        ctx.arcTo(phoneX, phoneY + phoneH, phoneX, phoneY, rr);
        ctx.arcTo(phoneX, phoneY, phoneX + phoneW, phoneY, rr);
        ctx.closePath();
        ctx.clip();
        drawCover(ctx, img, phoneX, phoneY, phoneW, phoneH);
        ctx.restore();
      }
    }
  } else {
    // compete / environment / more_than: title block + chip row at bottom
    const titleSize = slide.kind === "more_than" ? 150 : 170;
    const titleY = 200;
    const after = drawDisplayTitle(ctx, slide.title, slide.accentWord, accent, titleY, titleSize);
    if (slide.subline) drawSubline(ctx, slide.subline, after + 16, accent);
    if (slide.chips && slide.chips.length) drawChipRow(ctx, slide.chips, accent);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("encode failed"))), "image/png");
  });
}

export async function exportCollegePost(opts: {
  post: CollegePost;
  bgImages: (string | null)[];
  logoUrl: string | null;
  appScreenUrl: string | null;
  filenameBase: string;
}) {
  const { post, bgImages, logoUrl, appScreenUrl, filenameBase } = opts;
  const zip = new JSZip();
  for (let i = 0; i < post.slides.length; i++) {
    const slide = post.slides[i];
    const blob = await renderSlide(slide, post.meta.accent, logoUrl, bgImages[i] ?? null, appScreenUrl);
    zip.file(`${filenameBase}-slide-${String(i + 1).padStart(2, "0")}.png`, blob);
  }
  zip.file("caption.txt", `${post.caption}\n\n${post.hashtags}\n`);
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
