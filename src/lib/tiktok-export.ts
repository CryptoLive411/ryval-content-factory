// Export carousel slides as TikTok-ready 1080x1350 PNGs + caption file, bundled as zip.
import html2canvas from "html2canvas-pro";
import JSZip from "jszip";

// Fetch a remote image and return a data: URL. Avoids html2canvas CORS/taint issues.
async function toDataUrl(src: string): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, { mode: "cors", cache: "force-cache" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function inlineImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute("src") ?? "";
      if (!src || src.startsWith("data:")) return;
      const data = await toDataUrl(src);
      if (data) {
        img.removeAttribute("crossorigin");
        img.src = data;
        if (!img.complete) {
          await new Promise<void>((r) => {
            img.onload = () => r();
            img.onerror = () => r();
          });
        }
      }
    }),
  );
}

export async function exportPostForTikTok(opts: {
  container: HTMLElement;
  caption: string;
  hashtags: string;
  filenameBase: string;
}) {
  const { container, caption, hashtags, filenameBase } = opts;
  const slideEls = Array.from(container.querySelectorAll<HTMLElement>("[data-slide-index]"));
  if (slideEls.length === 0) throw new Error("No slides found to export");

  // Pre-inline every <img> in the carousel so html2canvas never hits CORS.
  await inlineImages(container);

  const zip = new JSZip();

  for (let i = 0; i < slideEls.length; i++) {
    const el = slideEls[i];
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      throw new Error("Slide preview is not visible — scroll it into view and retry");
    }
    // Render at high resolution then down/up-fit to 1080x1350.
    const scale = Math.max(1, 1080 / rect.width);
    const canvas = await html2canvas(el, {
      backgroundColor: "#0b0f1a",
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
    });

    const out = document.createElement("canvas");
    out.width = 1080;
    out.height = 1350;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#0b0f1a";
    ctx.fillRect(0, 0, 1080, 1350);
    const srcRatio = canvas.width / canvas.height;
    const dstRatio = 1080 / 1350;
    let dw = 1080, dh = 1350, dx = 0, dy = 0;
    if (srcRatio > dstRatio) {
      dh = 1350; dw = dh * srcRatio; dx = (1080 - dw) / 2;
    } else {
      dw = 1080; dh = dw / srcRatio; dy = (1350 - dh) / 2;
    }
    ctx.drawImage(canvas, dx, dy, dw, dh);

    const blob: Blob | null = await new Promise((res) => out.toBlob((b) => res(b), "image/png"));
    if (!blob) throw new Error("Failed to encode slide image");
    zip.file(`${filenameBase}-slide-${String(i + 1).padStart(2, "0")}.png`, blob);
  }

  zip.file("caption.txt", `${caption.trim()}\n\n${hashtags.trim()}\n`);

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameBase}-tiktok.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
