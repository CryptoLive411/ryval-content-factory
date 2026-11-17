/**
 * College stats slides (posts whose notes carry a `stat_spec:` line, see src/lib/college-stats.ts).
 * Called from render-slides.mjs, which owns font registration and image loading.
 *
 * Look: near-black, white type, one accent per post (men electric blue, women volt), Anton for the
 * big numbers and headlines, Barlow Condensed for names, JetBrains Mono for small data. Thin lines,
 * a soft accent glow and film grain. No pills, no emoji, no player photos.
 */

export const W = 1080;
export const H = 1350;
const PAD = 64;
const BG = "#05070A";
const DISPLAY = "RyvalDisplay";
const BODY = "RyvalBody";
const COND = "RyvalCondX";
const COND_SEMI = "RyvalCondSemi";
const MONO = "RyvalMono";
const MONO_BOLD = "RyvalMonoBold";

const PHONE_INSET = { left: 0.065637, top: 0.033531, width: 0.870656, height: 0.932939 };

function hexToRgb(hex) {
  const h = String(hex || "#7CF250").replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function wrap(ctx, text, maxW) {
  const words = String(text || "")
    .split(/\s+/)
    .filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Largest size (down to min) at which the text fits maxW in at most maxLines. */
function fit(ctx, text, family, weight, maxW, start, min, maxLines = 1) {
  let size = start;
  for (;;) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrap(ctx, text, maxW);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if ((lines.length <= maxLines && widest <= maxW) || size <= min)
      return { size, lines: lines.slice(0, maxLines) };
    size -= 2;
  }
}

/** Letter-spaced small caps for mono labels. */
function spaced(ctx, text, x, y, spacing = 2, align = "left") {
  const chars = [...String(text)];
  const width = chars.reduce((sum, c) => sum + ctx.measureText(c).width + spacing, -spacing);
  let cx = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
  for (const c of chars) {
    ctx.fillText(c, cx, y);
    cx += ctx.measureText(c).width + spacing;
  }
  return width;
}

function drawImageCover(ctx, img, x, y, w, h, focusY = 0.5) {
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
    sy = (img.height - sh) * focusY;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

let grainTile = null;
function grain(canvasPkg) {
  if (grainTile) return grainTile;
  const size = 220;
  const c = canvasPkg.createCanvas(size, size);
  const g = c.getContext("2d");
  const data = g.createImageData(size, size);
  let seed = 7;
  for (let i = 0; i < data.data.length; i += 4) {
    seed = (seed * 16807) % 2147483647;
    const v = seed % 255;
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 16;
  }
  g.putImageData(data, 0, 0);
  grainTile = c;
  return c;
}

/** Background shared by every stats slide. With a photo it is darkened hard so type always wins. */
function paintBase(canvasPkg, ctx, accent, photo, opts = {}) {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  if (photo) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    drawImageCover(ctx, photo, 0, 0, W, H, 0.35);
    ctx.restore();
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, "rgba(5,7,10,0.78)");
    wash.addColorStop(0.3, "rgba(5,7,10,0.42)");
    wash.addColorStop(0.55, "rgba(5,7,10,0.72)");
    wash.addColorStop(1, "rgba(5,7,10,0.97)");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, W, H);
    const side = ctx.createLinearGradient(0, 0, W, 0);
    side.addColorStop(0, "rgba(5,7,10,0.55)");
    side.addColorStop(0.7, "rgba(5,7,10,0)");
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, W, H);
  } else {
    // Faint pitch geometry, cropped off the edge so it reads as texture, not a diagram.
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.045)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(W * 0.92, H * 0.5, 330, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(W * 0.92, -10);
    ctx.lineTo(W * 0.92, H + 10);
    ctx.stroke();
    ctx.restore();
  }
  const gx = opts.glowX ?? W * 0.86;
  const gy = opts.glowY ?? H * 0.1;
  const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, opts.glowR ?? 760);
  glow.addColorStop(0, rgba(accent, photo ? 0.16 : 0.2));
  glow.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.fillStyle = ctx.createPattern(grain(canvasPkg), "repeat");
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // Accent hairline down the left edge: the one constant mark of the series.
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 8, H);
}

async function header(ctx, helpers, post, accent, right) {
  const logo = await helpers.loadImg(post.logo_url || "/ryval-mark.png");
  if (logo) {
    const h = 38;
    const w = h * (logo.width / Math.max(1, logo.height));
    ctx.drawImage(logo, PAD, PAD, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.font = `400 30px ${DISPLAY}`;
    ctx.textBaseline = "middle";
    ctx.fillText("RYVAL", PAD + w + 12, PAD + h / 2 + 1);
  }
  if (right) {
    ctx.textBaseline = "middle";
    ctx.font = `700 20px ${MONO_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    spaced(ctx, right, W - PAD, PAD + 19, 2, "right");
  }
}

function footer(ctx, accent, source, last) {
  ctx.textBaseline = "alphabetic";
  if (source) {
    ctx.font = `500 19px ${MONO}`;
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    spaced(ctx, `SOURCE: ${source.toUpperCase()}`, PAD, H - PAD + 4, 1);
  }
  if (!last) {
    ctx.font = `700 22px ${MONO_BOLD}`;
    ctx.fillStyle = accent;
    spaced(ctx, "SWIPE →", W - PAD, H - PAD + 4, 2, "right");
  }
}

async function crest(ctx, helpers, url, x, y, size, align = "left") {
  if (!url) return 0;
  const img = await helpers.loadCrest(url);
  if (!img) return 0;
  const ratio = img.width / Math.max(1, img.height);
  const h = ratio > 1 ? size / ratio : size;
  const w = ratio > 1 ? size : size * ratio;
  const dx = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 14;
  ctx.drawImage(img, dx, y + (size - h) / 2, w, h);
  ctx.restore();
  return w;
}

// ---------------------------------------------------------------- slides

async function drawCover(ctx, helpers, post, spec, slide, photo) {
  const accent = spec.accent;
  paintBase(helpers.canvasPkg, ctx, accent, photo);
  await header(ctx, helpers, post, accent, "2026 SEASON");
  const maxW = W - PAD * 2;
  ctx.textBaseline = "alphabetic";

  // Bottom-up: teaser, rule, sub, name, big number, kicker.
  let y = H - PAD - 64;
  ctx.font = `500 30px ${BODY}`;
  const teaser = wrap(ctx, slide.teaser, maxW).slice(0, 2);
  y -= (teaser.length - 1) * 40;
  const teaserTop = y;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  teaser.forEach((line, i) => ctx.fillText(line, PAD, teaserTop + i * 40));
  y = teaserTop - 58;
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, y, 96, 5);
  y -= 34;

  ctx.font = `600 40px ${COND_SEMI}`;
  const sub = wrap(ctx, slide.sub, maxW).slice(0, 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  for (let i = sub.length - 1; i >= 0; i--) {
    ctx.fillText(sub[i], PAD, y);
    y -= 48;
  }
  y -= 10;

  const name = fit(ctx, slide.headline, DISPLAY, 400, maxW, 128, 72, 2);
  ctx.font = `400 ${name.size}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  for (let i = name.lines.length - 1; i >= 0; i--) {
    ctx.fillText(name.lines[i], PAD, y);
    y -= Math.round(name.size * 0.98);
  }
  y -= 18;

  // The number is the hero. Unit stacks to its right.
  const bigSize = slide.big.length >= 3 ? 330 : 400;
  ctx.font = `400 ${bigSize}px ${DISPLAY}`;
  const bigW = ctx.measureText(slide.big).width;
  const m = ctx.measureText(slide.big);
  const capH = m.actualBoundingBoxAscent || bigSize * 0.72;
  ctx.save();
  ctx.shadowColor = rgba(accent, 0.45);
  ctx.shadowBlur = 60;
  ctx.fillStyle = accent;
  ctx.fillText(slide.big, PAD - 6, y);
  ctx.restore();
  const ux = PAD + bigW + 26;
  const unitMax = W - PAD - ux;
  const unit = fit(ctx, slide.unit, COND, 800, unitMax, 96, 48, 1);
  ctx.font = `800 ${unit.size}px ${COND}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(unit.lines[0] ?? slide.unit, ux, y - capH + unit.size * 0.86);
  ctx.font = `700 24px ${MONO_BOLD}`;
  ctx.fillStyle = accent;
  spaced(ctx, slide.unitSub, ux + 2, y - capH + unit.size * 0.86 + 44, 2);
  y -= capH + 34;

  ctx.font = `700 24px ${MONO_BOLD}`;
  ctx.fillStyle = accent;
  const kicker = fit(ctx, slide.kicker, MONO_BOLD, 700, maxW - 40, 24, 17, 1);
  ctx.font = `700 ${kicker.size}px ${MONO_BOLD}`;
  spaced(ctx, slide.kicker, PAD, y, 2);

  if (slide.logo) await crest(ctx, helpers, slide.logo, W - PAD, y - 150, 120, "right");
  footer(ctx, accent, spec.source, false);
}

async function drawBoard(ctx, helpers, post, spec, slide) {
  const accent = spec.accent;
  paintBase(helpers.canvasPkg, ctx, accent, null);
  await header(ctx, helpers, post, accent, spec.side === "men" ? "MEN" : "WOMEN");
  const maxW = W - PAD * 2;
  const many = slide.rows.length > 5;
  ctx.textBaseline = "alphabetic";
  const title = fit(ctx, slide.title, DISPLAY, 400, maxW, many ? 130 : 170, 90, 1);
  ctx.font = `400 ${title.size}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  const titleY = (many ? 136 : 150) + Math.round(title.size * 0.86);
  ctx.fillText(slide.title, PAD - 4, titleY);
  const kick = fit(ctx, slide.kicker, MONO_BOLD, 700, maxW, 23, 15, 1);
  ctx.font = `700 ${kick.size}px ${MONO_BOLD}`;
  ctx.fillStyle = accent;
  spaced(ctx, slide.kicker, PAD, titleY + 48, 2);

  const top = titleY + (many ? 80 : 100);
  const rowH = Math.min(
    156,
    Math.floor((H - PAD - (slide.note ? 110 : 80) - top) / Math.max(5, slide.rows.length)),
  );
  const k = Math.max(0.55, Math.min(1, rowH / 156));
  for (let i = 0; i < slide.rows.length; i++) {
    const row = slide.rows[i];
    const ry = top + i * rowH;
    if (row.lead) {
      ctx.fillStyle = rgba(accent, 0.08);
      ctx.fillRect(PAD - 20, ry, W - PAD * 2 + 40, rowH - 6);
      ctx.fillStyle = accent;
      ctx.fillRect(PAD - 20, ry, 6, rowH - 6);
    }
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(PAD, ry + rowH - 6, maxW, 1.5);
    const mid = ry + (rowH - 6) / 2;
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(28 * k)}px ${MONO_BOLD}`;
    ctx.fillStyle = row.lead ? accent : "rgba(255,255,255,0.5)";
    ctx.fillText(row.rank, PAD + 4, mid);
    const logoX = PAD + Math.round(78 * k);
    const logoS = Math.round(68 * k);
    const drawn = await crest(ctx, helpers, row.logo, logoX, mid - logoS / 2, logoS);
    const textX = logoX + (drawn ? logoS + Math.round(24 * k) : 0);

    // Value first, so the name knows how much room it has.
    const vSize = Math.round((row.value.length > 5 ? 70 : 92) * k);
    ctx.font = `400 ${vSize}px ${DISPLAY}`;
    const valueW = ctx.measureText(row.value).width;
    ctx.fillStyle = row.lead ? accent : "#ffffff";
    ctx.textAlign = "right";
    ctx.fillText(row.value, W - PAD, mid + 4);
    if (row.unit) {
      ctx.font = `700 ${Math.round(18 * k)}px ${MONO_BOLD}`;
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText(row.unit, W - PAD - valueW - 14, mid + 22 * k);
    }
    ctx.textAlign = "left";
    const nameMax = W - PAD - valueW - 50 - textX - (row.unit ? 50 : 0);
    const nm = fit(ctx, row.name, COND, 800, nameMax, Math.round(56 * Math.max(k, 0.7)), 26, 1);
    ctx.font = `800 ${nm.size}px ${COND}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(nm.lines[0] ?? row.name, textX, mid - 18 * Math.max(k, 0.7));
    const sb = fit(
      ctx,
      row.sub.toUpperCase(),
      MONO,
      500,
      nameMax,
      Math.max(15, Math.round(21 * k)),
      13,
      1,
    );
    ctx.font = `500 ${sb.size}px ${MONO}`;
    ctx.fillStyle = "rgba(255,255,255,0.58)";
    ctx.fillText(sb.lines[0] ?? row.sub, textX, mid + 26 * k);
  }
  ctx.textBaseline = "alphabetic";
  if (slide.note) {
    ctx.font = `500 19px ${MONO}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(slide.note, PAD, top + slide.rows.length * rowH + 30);
  }
  footer(ctx, accent, spec.source, false);
}

/** One game on a photo: the score is the hero, winner first. */
async function drawScoreCover(ctx, helpers, post, spec, slide, photo) {
  const accent = spec.accent;
  paintBase(helpers.canvasPkg, ctx, accent, photo);
  await header(ctx, helpers, post, accent, "FINAL");
  const maxW = W - PAD * 2;
  ctx.textBaseline = "alphabetic";
  let y = H - PAD - 64;
  ctx.font = `500 30px ${BODY}`;
  const teaser = wrap(ctx, slide.teaser, maxW).slice(0, 2);
  y -= (teaser.length - 1) * 40;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  teaser.forEach((line, i) => ctx.fillText(line, PAD, y + i * 40));
  y -= 58;
  ctx.fillStyle = accent;
  ctx.fillRect(PAD, y, 96, 5);
  y -= 34;
  ctx.font = `600 40px ${COND_SEMI}`;
  const line = wrap(ctx, slide.line, maxW).slice(0, 2);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  for (let i = line.length - 1; i >= 0; i--) {
    ctx.fillText(line[i], PAD, y);
    y -= 48;
  }
  y -= 24;
  // Two team rows, the score right-aligned and huge.
  const rowH = 150;
  const teams = [slide.b, slide.a];
  for (const t of teams) {
    const lost = t.win === false;
    const base = y;
    const logoS = 104;
    const drawn = await crest(ctx, helpers, t.logo, PAD, base - logoS + 8, logoS);
    const tx = PAD + (drawn ? logoS + 28 : 0);
    ctx.font = `400 168px ${DISPLAY}`;
    const sw = ctx.measureText(t.score ?? "").width;
    ctx.save();
    if (!lost) {
      ctx.shadowColor = rgba(accent, 0.45);
      ctx.shadowBlur = 50;
    }
    ctx.fillStyle = lost ? "rgba(255,255,255,0.42)" : accent;
    ctx.textAlign = "right";
    ctx.fillText(t.score ?? "", W - PAD, base + 10);
    ctx.restore();
    ctx.textAlign = "left";
    const nm = fit(ctx, t.name.toUpperCase(), DISPLAY, 400, W - PAD - sw - 40 - tx, 96, 50, 1);
    ctx.font = `400 ${nm.size}px ${DISPLAY}`;
    ctx.fillStyle = lost ? "rgba(255,255,255,0.55)" : "#ffffff";
    ctx.fillText(nm.lines[0] ?? t.name, tx, base);
    if (t.seed) {
      ctx.font = `700 22px ${MONO_BOLD}`;
      ctx.fillStyle = accent;
      spaced(ctx, `NO. ${t.seed} SEED`, tx, base - nm.size - 6, 2);
    }
    y -= rowH;
  }
  y += 40;
  const kick = fit(ctx, slide.kicker, MONO_BOLD, 700, maxW, 23, 15, 1);
  ctx.font = `700 ${kick.size}px ${MONO_BOLD}`;
  ctx.fillStyle = accent;
  spaced(ctx, slide.kicker, PAD, y - 110, 2);
  footer(ctx, accent, spec.source, false);
}

/** Up to 8 games: results (winner bright, loser dim) or upcoming matchups with seeds and dates. */
async function drawScoreboard(ctx, helpers, post, spec, slide) {
  const accent = spec.accent;
  paintBase(helpers.canvasPkg, ctx, accent, null);
  await header(ctx, helpers, post, accent, spec.side === "men" ? "MEN" : "WOMEN");
  const maxW = W - PAD * 2;
  ctx.textBaseline = "alphabetic";
  const title = fit(ctx, slide.title, DISPLAY, 400, maxW, 120, 80, 1);
  ctx.font = `400 ${title.size}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  const titleY = 136 + Math.round(title.size * 0.86);
  ctx.fillText(slide.title, PAD - 4, titleY);
  const kick = fit(ctx, slide.kicker, MONO_BOLD, 700, maxW, 22, 14, 1);
  ctx.font = `700 ${kick.size}px ${MONO_BOLD}`;
  ctx.fillStyle = accent;
  spaced(ctx, slide.kicker, PAD, titleY + 44, 2);

  const games = slide.games;
  const two = games.length > 4;
  const cols = two ? 2 : 1;
  const perCol = Math.ceil(games.length / cols);
  const top = titleY + 76;
  const bottom = H - PAD - (slide.note ? 92 : 64);
  const gap = 24;
  const colW = (maxW - gap * (cols - 1)) / cols;
  const cardH = Math.min(two ? 220 : 210, Math.floor((bottom - top - (perCol - 1) * 16) / perCol));
  for (let i = 0; i < games.length; i++) {
    const g = games[i];
    const col = two ? Math.floor(i / perCol) : 0;
    const row = two ? i % perCol : i;
    const x = PAD + col * (colW + gap);
    const y = top + row * (cardH + 16);
    roundRect(ctx, x, y, colW, cardH, 14);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.09)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const tagH = g.tag ? 34 : 0;
    const lineH = (cardH - tagH - 16) / 2;
    const lines = [g.a, g.b];
    for (let j = 0; j < 2; j++) {
      const t = lines[j];
      const cy = y + 8 + lineH * j + lineH / 2;
      const lost = t.win === false;
      const logoS = Math.min(56, Math.round(lineH * 0.7));
      const drawn = await crest(ctx, helpers, t.logo, x + 18, cy - logoS / 2, logoS);
      const tx = x + 18 + (drawn ? logoS + 16 : 0);
      ctx.textBaseline = "middle";
      let right = x + colW - 20;
      if (t.score != null) {
        ctx.font = `400 ${Math.round(lineH * 0.78)}px ${DISPLAY}`;
        ctx.fillStyle = t.win ? accent : lost ? "rgba(255,255,255,0.4)" : "#ffffff";
        ctx.textAlign = "right";
        ctx.fillText(t.score, right, cy + 3);
        right -= ctx.measureText(t.score).width + 18;
        ctx.textAlign = "left";
      }
      let nx = tx;
      if (t.seed) {
        ctx.font = `700 ${Math.round(lineH * 0.3)}px ${MONO_BOLD}`;
        ctx.fillStyle = accent;
        ctx.fillText(t.seed, tx, cy + 1);
        nx += ctx.measureText(t.seed).width + 10;
      }
      const nm = fit(
        ctx,
        t.name.toUpperCase(),
        COND,
        800,
        right - nx,
        Math.round(lineH * 0.56),
        20,
        1,
      );
      ctx.font = `800 ${nm.size}px ${COND}`;
      ctx.fillStyle = lost ? "rgba(255,255,255,0.45)" : "#ffffff";
      ctx.fillText(nm.lines[0] ?? t.name, nx, cy + 1);
    }
    if (g.tag) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(x + 18, y + cardH - tagH - 4, colW - 36, 1);
      const tg = fit(ctx, g.tag, MONO_BOLD, 700, colW - 36, 17, 12, 1);
      ctx.font = `700 ${tg.size}px ${MONO_BOLD}`;
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.textBaseline = "middle";
      spaced(ctx, g.tag, x + 18, y + cardH - tagH / 2 - 2, 1);
    }
    ctx.textBaseline = "alphabetic";
  }
  if (slide.note) {
    ctx.font = `500 19px ${MONO}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(slide.note, PAD, H - PAD - 48);
  }
  footer(ctx, accent, spec.source, false);
}

/** Who is still alive: a wall of marks with names, seeds in the accent. */
async function drawLogoWall(ctx, helpers, post, spec, slide) {
  const accent = spec.accent;
  paintBase(helpers.canvasPkg, ctx, accent, null, { glowX: W * 0.5, glowY: H * 0.55, glowR: 900 });
  await header(ctx, helpers, post, accent, spec.side === "men" ? "MEN" : "WOMEN");
  const maxW = W - PAD * 2;
  ctx.textBaseline = "alphabetic";
  ctx.font = `400 220px ${DISPLAY}`;
  ctx.save();
  ctx.shadowColor = rgba(accent, 0.45);
  ctx.shadowBlur = 50;
  ctx.fillStyle = accent;
  ctx.fillText(slide.big, PAD - 6, 140 + 190);
  ctx.restore();
  const bw = ctx.measureText(slide.big).width;
  const tt = fit(ctx, slide.title, DISPLAY, 400, maxW - bw - 30, 110, 60, 1);
  ctx.font = `400 ${tt.size}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(slide.title, PAD + bw + 24, 140 + 110);
  ctx.font = `700 22px ${MONO_BOLD}`;
  ctx.fillStyle = accent;
  spaced(ctx, slide.unit, PAD + bw + 28, 140 + 162, 2);
  const kick = fit(ctx, slide.kicker, MONO_BOLD, 700, maxW, 21, 14, 1);
  ctx.font = `700 ${kick.size}px ${MONO_BOLD}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  spaced(ctx, slide.kicker, PAD, 140 + 236, 2);

  const teams = slide.teams;
  const cols = teams.length > 9 ? 4 : teams.length > 4 ? 3 : 2;
  const rows = Math.ceil(teams.length / cols);
  const top = 140 + 280;
  const bottom = H - PAD - 60;
  const cw = maxW / cols;
  const ch = (bottom - top) / rows;
  for (let i = 0; i < teams.length; i++) {
    const t = teams[i];
    const cx = PAD + (i % cols) * cw + cw / 2;
    const cy = top + Math.floor(i / cols) * ch;
    const logoS = Math.min(110, ch * 0.55, cw * 0.6);
    await crest(ctx, helpers, t.logo, cx, cy + 10, logoS, "center");
    ctx.textAlign = "center";
    const nm = fit(ctx, t.name.toUpperCase(), COND, 800, cw - 16, 30, 18, 1);
    ctx.font = `800 ${nm.size}px ${COND}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(nm.lines[0] ?? t.name, cx, cy + logoS + 46);
    if (t.seed) {
      ctx.font = `700 16px ${MONO_BOLD}`;
      ctx.fillStyle = accent;
      ctx.fillText(`NO. ${t.seed} SEED`, cx, cy + logoS + 70);
    }
    ctx.textAlign = "left";
  }
  footer(ctx, accent, spec.source, false);
}

async function drawPlayer(ctx, helpers, post, spec, slide) {
  const accent = spec.accent;
  paintBase(helpers.canvasPkg, ctx, accent, null, { glowY: H * 0.32 });
  await header(ctx, helpers, post, accent, spec.side === "men" ? "MEN" : "WOMEN");
  const maxW = W - PAD * 2;
  ctx.textBaseline = "alphabetic";

  // Ghost of the first stat behind everything.
  const ghost = String(slide.stats[0]?.value ?? "");
  ctx.save();
  ctx.font = `400 880px ${DISPLAY}`;
  ctx.fillStyle = rgba(accent, 0.07);
  ctx.textAlign = "right";
  ctx.fillText(ghost, W + 40, 980);
  ctx.restore();

  let y = 268;
  const kick = fit(ctx, slide.kicker, MONO_BOLD, 700, maxW, 24, 16, 1);
  ctx.font = `700 ${kick.size}px ${MONO_BOLD}`;
  ctx.fillStyle = accent;
  spaced(ctx, slide.kicker, PAD, y, 2);
  y += 30;

  const name = fit(ctx, slide.name, DISPLAY, 400, maxW, 168, 90, 2);
  ctx.font = `400 ${name.size}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  for (const line of name.lines) {
    y += Math.round(name.size * 0.95);
    ctx.fillText(line, PAD - 4, y);
  }
  y += 36;
  const lw = await crest(ctx, helpers, slide.logo, PAD, y, 64);
  const mx = PAD + (lw ? lw + 20 : 0);
  const meta = fit(ctx, slide.meta, COND_SEMI, 600, W - PAD - mx, 38, 26, 1);
  ctx.font = `600 ${meta.size}px ${COND_SEMI}`;
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.textBaseline = "middle";
  ctx.fillText(meta.lines[0] ?? slide.meta, mx, y + 34);
  ctx.textBaseline = "alphabetic";

  // Stat grid.
  const gy = Math.max(y + 130, 760);
  const n = slide.stats.length;
  const cw = maxW / n;
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(PAD, gy, maxW, 1.5);
  ctx.fillRect(PAD, gy + 250, maxW, 1.5);
  slide.stats.forEach((s, i) => {
    const x = PAD + i * cw;
    if (i) {
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(x, gy + 28, 1.5, 194);
    }
    const v = fit(ctx, s.value, DISPLAY, 400, cw - 36, 150, 70, 1);
    ctx.font = `400 ${v.size}px ${DISPLAY}`;
    ctx.fillStyle = i === 0 ? accent : "#ffffff";
    ctx.fillText(s.value, x + (i ? 26 : 0), gy + 172);
    ctx.font = `700 21px ${MONO_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    spaced(ctx, s.label, x + (i ? 28 : 2), gy + 216, 2);
  });
  if (slide.note) {
    ctx.font = `500 34px ${BODY}`;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillText(slide.note, PAD, gy + 320);
  }
  footer(ctx, accent, spec.source, false);
}

async function drawPotw(ctx, helpers, post, spec, slide, photo) {
  const accent = spec.accent;
  paintBase(helpers.canvasPkg, ctx, accent, photo);
  await header(ctx, helpers, post, accent, "RYVAL PICK");
  const maxW = W - PAD * 2;
  ctx.textBaseline = "alphabetic";
  let y = H - PAD - 64;
  ctx.font = `500 29px ${BODY}`;
  const teaser = wrap(ctx, slide.teaser, maxW).slice(0, 2);
  y -= (teaser.length - 1) * 40;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  teaser.forEach((line, i) => ctx.fillText(line, PAD, y + i * 40));
  y -= 70;
  ctx.font = `500 27px ${MONO}`;
  for (let i = slide.lines.length - 1; i >= 0; i--) {
    const l = fit(ctx, slide.lines[i], MONO, 500, maxW - 34, 27, 18, 1);
    ctx.font = `500 ${l.size}px ${MONO}`;
    ctx.fillStyle = accent;
    ctx.fillRect(PAD, y - 12, 18, 4);
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(l.lines[0] ?? slide.lines[i], PAD + 34, y);
    y -= 46;
  }
  y -= 12;
  const meta = fit(ctx, slide.meta, COND_SEMI, 600, maxW, 40, 26, 1);
  ctx.font = `600 ${meta.size}px ${COND_SEMI}`;
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.fillText(meta.lines[0] ?? slide.meta, PAD, y);
  y -= meta.size + 22;
  const name = fit(ctx, slide.name, DISPLAY, 400, maxW, 150, 80, 2);
  ctx.font = `400 ${name.size}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  for (let i = name.lines.length - 1; i >= 0; i--) {
    ctx.fillText(name.lines[i], PAD - 4, y);
    y -= Math.round(name.size * 0.97);
  }
  y -= 14;
  const big = fit(ctx, "PLAYER OF THE WEEK", DISPLAY, 400, maxW, 120, 70, 1);
  ctx.font = `400 ${big.size}px ${DISPLAY}`;
  ctx.save();
  ctx.shadowColor = rgba(accent, 0.45);
  ctx.shadowBlur = 50;
  ctx.fillStyle = accent;
  ctx.fillText("PLAYER OF THE WEEK", PAD - 4, y);
  ctx.restore();
  y -= big.size + 6;
  const kick = fit(ctx, slide.kicker, MONO_BOLD, 700, maxW, 22, 15, 1);
  ctx.font = `700 ${kick.size}px ${MONO_BOLD}`;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  spaced(ctx, slide.kicker, PAD, y, 2);
  if (slide.logo) await crest(ctx, helpers, slide.logo, W - PAD, PAD + 70, 120, "right");
  footer(ctx, accent, spec.source, false);
}

async function drawXi(ctx, helpers, post, spec, slide) {
  const accent = spec.accent;
  paintBase(helpers.canvasPkg, ctx, accent, null, { glowY: H * 0.55, glowX: W * 0.5, glowR: 820 });
  await header(ctx, helpers, post, accent, spec.side === "men" ? "MEN" : "WOMEN");
  const maxW = W - PAD * 2;
  ctx.textBaseline = "alphabetic";
  const title = fit(ctx, slide.title, DISPLAY, 400, maxW, 120, 80, 1);
  ctx.font = `400 ${title.size}px ${DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(slide.title, PAD - 4, 150 + title.size * 0.86);
  const ky = 150 + title.size * 0.86 + 46;
  const kick = fit(ctx, slide.kicker, MONO_BOLD, 700, maxW, 22, 15, 1);
  ctx.font = `700 ${kick.size}px ${MONO_BOLD}`;
  ctx.fillStyle = accent;
  spaced(ctx, slide.kicker, PAD, ky, 2);

  // Pitch.
  const px = PAD;
  const py = ky + 36;
  const pw = maxW;
  const ph = H - PAD - 70 - py;
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.13)";
  ctx.lineWidth = 2;
  ctx.strokeRect(px, py, pw, ph);
  ctx.beginPath();
  ctx.moveTo(px, py + ph / 2);
  ctx.lineTo(px + pw, py + ph / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px + pw / 2, py + ph / 2, 92, 0, Math.PI * 2);
  ctx.stroke();
  for (const top of [true, false]) {
    const bw = pw * 0.56;
    const bh = ph * 0.15;
    ctx.strokeRect(px + (pw - bw) / 2, top ? py : py + ph - bh, bw, bh);
    const sw = pw * 0.26;
    const sh = ph * 0.06;
    ctx.strokeRect(px + (pw - sw) / 2, top ? py : py + ph - sh, sw, sh);
  }
  ctx.restore();

  // Rows: goalkeeper at the bottom, forwards at the top.
  const layout = slide.layout;
  let k = 0;
  const rows = layout.map((count) => {
    const row = slide.picks.slice(k, k + count);
    k += count;
    return row;
  });
  const bottom = py + ph - 92;
  const topY = py + 92;
  const step = (bottom - topY) / Math.max(1, rows.length - 1);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const cy = bottom - r * step;
    const span = pw - 40;
    for (let i = 0; i < row.length; i++) {
      const p = row[i];
      const cx = px + 20 + span * ((i + 0.5) / row.length);
      const node = 54;
      const drew = await crest(ctx, helpers, p.logo, cx, cy - node - 10, node, "center");
      if (!drew) {
        ctx.beginPath();
        ctx.arc(cx, cy - node / 2 - 10, 14, 0, Math.PI * 2);
        ctx.fillStyle = p.featured ? accent : "rgba(255,255,255,0.85)";
        ctx.fill();
      }
      const nameMax = span / row.length - 12;
      const nm = fit(ctx, p.name, COND, 800, nameMax, 34, 22, 1);
      ctx.font = `800 ${nm.size}px ${COND}`;
      ctx.textAlign = "center";
      ctx.fillStyle = p.featured ? accent : "#ffffff";
      ctx.fillText(nm.lines[0] ?? p.name, cx, cy + 26);
      const tm = fit(ctx, p.team.toUpperCase(), MONO, 500, nameMax, 16, 12, 1);
      ctx.font = `500 ${tm.size}px ${MONO}`;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText(tm.lines[0] ?? p.team, cx, cy + 50);
      if (p.featured) {
        ctx.font = `700 15px ${MONO_BOLD}`;
        ctx.fillStyle = accent;
        ctx.fillText("PLAYER OF THE WEEK", cx, cy - node - 22);
      }
      ctx.textAlign = "left";
    }
  }
  footer(ctx, accent, spec.source, false);
}

function drawLaptop(ctx, screen, x, y, w) {
  const bezel = Math.round(w * 0.022);
  const sw = w - bezel * 2;
  const sh = Math.round(sw * 0.625);
  const h = sh + bezel * 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 24;
  roundRect(ctx, x, y, w, h, 20);
  ctx.fillStyle = "#0d0f12";
  ctx.fill();
  ctx.restore();
  roundRect(ctx, x, y, w, h, 20);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  roundRect(ctx, x + bezel, y + bezel, sw, sh, 6);
  ctx.clip();
  drawImageCover(ctx, screen, x + bezel, y + bezel, sw, sh, 0);
  ctx.restore();
  // Base.
  const by = y + h;
  const bw = w * 1.1;
  const bx = x - (bw - w) / 2;
  const base = ctx.createLinearGradient(0, by, 0, by + 22);
  base.addColorStop(0, "#d6d9de");
  base.addColorStop(1, "#7d8188");
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw - 18, by + 20);
  ctx.lineTo(bx + 18, by + 20);
  ctx.closePath();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.fillStyle = "#5c6067";
  ctx.fillRect(x + w / 2 - 70, by, 140, 6);
  return { h: h + 20 };
}

async function drawPhone(ctx, helpers, screen, x, y, h) {
  const frame = await helpers.loadImg("/app-screens/iphone-16-pro-frame.png");
  const w = Math.round(h * (518 / 1014));
  const sx = x + w * PHONE_INSET.left;
  const sy = y + h * PHONE_INSET.top;
  const sw = w * PHONE_INSET.width;
  const sh = h * PHONE_INSET.height;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetX = -14;
  ctx.shadowOffsetY = 20;
  roundRect(ctx, sx, sy, sw, sh, sw * 0.12);
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, sx, sy, sw, sh, sw * 0.12);
  ctx.clip();
  drawImageCover(ctx, screen, sx, sy, sw, sh, 0);
  ctx.restore();
  if (frame) ctx.drawImage(frame, x, y, w, h);
  return w;
}

async function drawCta(ctx, helpers, post, spec) {
  const accent = spec.accent;
  const cta = spec.cta;
  paintBase(helpers.canvasPkg, ctx, accent, null, { glowX: W * 0.72, glowY: H * 0.62, glowR: 900 });
  await header(ctx, helpers, post, accent, "");
  const maxW = W - PAD * 2;
  ctx.textBaseline = "alphabetic";

  // 1. The line written for this post.
  let y = 150;
  const hook = fit(ctx, cta.hook ?? "", COND, 800, maxW, 50, 34, 2);
  ctx.font = `800 ${hook.size}px ${COND}`;
  ctx.fillStyle = "#ffffff";
  for (const line of hook.lines) {
    y += Math.round(hook.size * 1.02);
    ctx.fillText(line, PAD, y);
  }
  // 2. The brand close, as big as the canvas allows.
  const l1 = fit(ctx, cta.lines[0], DISPLAY, 400, maxW, 140, 90, 1);
  const l2 = fit(ctx, cta.lines[1], DISPLAY, 400, maxW, 140, 90, 1);
  const size = Math.min(l1.size, l2.size);
  ctx.font = `400 ${size}px ${DISPLAY}`;
  y += Math.round(size * 0.98) + 10;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(cta.lines[0], PAD - 4, y);
  y += Math.round(size * 0.96);
  ctx.save();
  ctx.shadowColor = rgba(accent, 0.55);
  ctx.shadowBlur = 60;
  ctx.fillStyle = accent;
  ctx.fillText(cta.lines[1], PAD - 4, y);
  ctx.restore();
  // 3. Who it is for.
  y += 54;
  const tagW = 190;
  for (const row of cta.rows) {
    ctx.font = `700 20px ${MONO_BOLD}`;
    ctx.fillStyle = accent;
    spaced(ctx, row.tag, PAD, y, 2);
    ctx.font = `500 27px ${BODY}`;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    const lines = wrap(ctx, row.text, maxW - tagW).slice(0, 2);
    lines.forEach((line, i) => ctx.fillText(line, PAD + tagW, y + i * 34));
    y += 34 * lines.length + 16;
  }

  // 4. The download bar sits on the floor; devices fill what is left above it.
  const barH = 112;
  const barY = H - PAD - barH - 30;
  const proofY = barY - 22;
  const deviceTop = y + 4;
  const floor = proofY - 26;
  const room = floor - deviceTop;
  const laptopImg = cta.laptop ? await helpers.loadImg(cta.laptop) : null;
  const phoneImg = cta.phone ? await helpers.loadImg(cta.phone) : null;
  const phH = Math.max(260, Math.min(Math.round(room + 20), 520));
  const phW = Math.round(phH * (518 / 1014));
  if (laptopImg && room > 220) {
    const lw = Math.min(760, Math.round((room - 40) / 0.646));
    const lh = Math.round((lw - lw * 0.044) * 0.625 + lw * 0.044) + 20;
    drawLaptop(ctx, laptopImg, PAD + 10, floor - lh, lw);
  }
  if (phoneImg && room > 200)
    await drawPhone(ctx, helpers, phoneImg, W - PAD - phW + 10, floor - phH + 20, phH);

  if (cta.proof) {
    const pr = fit(ctx, cta.proof, MONO_BOLD, 700, maxW, 19, 13, 1);
    ctx.font = `700 ${pr.size}px ${MONO_BOLD}`;
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    spaced(ctx, cta.proof, W / 2, proofY, 2, "center");
  }
  // The button: accent slab, black type, App Store badge inside.
  ctx.save();
  ctx.shadowColor = rgba(accent, 0.55);
  ctx.shadowBlur = 50;
  roundRect(ctx, PAD - 8, barY, maxW + 16, barH, 22);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.restore();
  const badge = await helpers.loadImg("/badges/app-store.svg");
  let bx = PAD + 18;
  if (badge) {
    const bh = 64;
    const bw = bh * (badge.width / Math.max(1, badge.height));
    ctx.drawImage(badge, W - PAD - 18 - bw, barY + (barH - bh) / 2, bw, bh);
  }
  const btn = fit(ctx, cta.button ?? "DOWNLOAD RYVAL FREE", DISPLAY, 400, maxW - 290, 64, 40, 1);
  ctx.font = `400 ${btn.size}px ${DISPLAY}`;
  ctx.fillStyle = "#05070A";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(btn.lines[0] ?? "", bx, barY + barH / 2 + btn.size * 0.2);
  ctx.font = `700 17px ${MONO_BOLD}`;
  ctx.fillStyle = "rgba(5,7,10,0.72)";
  spaced(ctx, cta.buttonSub ?? "", bx + 2, barY + barH / 2 + btn.size * 0.2 + 30, 1);
  // The kicker under the button: the claim for college players.
  if (cta.kicker) {
    const kk = fit(ctx, cta.kicker, MONO_BOLD, 700, maxW, 18, 12, 1);
    ctx.font = `700 ${kk.size}px ${MONO_BOLD}`;
    ctx.fillStyle = accent;
    spaced(ctx, cta.kicker, W / 2, H - PAD + 6, 2, "center");
  }
}

export async function renderStatPost(helpers, post, spec) {
  const { canvasPkg } = helpers;
  const out = [];
  const photos = Array.isArray(post.bg_images) ? post.bg_images : [];
  for (let i = 0; i < spec.slides.length; i++) {
    const slide = spec.slides[i];
    const canvas = canvasPkg.createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const photoUrl = photos[i] && !String(photos[i]).startsWith("/stat-bg/") ? photos[i] : null;
    const photo =
      photoUrl && (slide.type === "cover" || slide.type === "potw" || slide.type === "score")
        ? await helpers.loadImg(photoUrl)
        : null;
    if (slide.type === "cover") await drawCover(ctx, helpers, post, spec, slide, photo);
    else if (slide.type === "board") await drawBoard(ctx, helpers, post, spec, slide);
    else if (slide.type === "player") await drawPlayer(ctx, helpers, post, spec, slide);
    else if (slide.type === "potw") await drawPotw(ctx, helpers, post, spec, slide, photo);
    else if (slide.type === "xi") await drawXi(ctx, helpers, post, spec, slide);
    else if (slide.type === "score") await drawScoreCover(ctx, helpers, post, spec, slide, photo);
    else if (slide.type === "scoreboard") await drawScoreboard(ctx, helpers, post, spec, slide);
    else if (slide.type === "logowall") await drawLogoWall(ctx, helpers, post, spec, slide);
    else continue;
    out.push(await canvas.encode("jpeg", 92));
  }
  const canvas = canvasPkg.createCanvas(W, H);
  await drawCta(canvas.getContext("2d"), helpers, post, spec);
  out.push(await canvas.encode("jpeg", 92));
  return out;
}

export function statSpecFromPost(post) {
  const line = String(post.notes ?? "").match(/^stat_spec:(.+)$/m)?.[1];
  if (!line) return null;
  try {
    const spec = JSON.parse(line);
    return spec && spec.v === 1 && Array.isArray(spec.slides) ? spec : null;
  } catch {
    return null;
  }
}
