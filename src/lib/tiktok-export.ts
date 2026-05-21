// Export carousel slides as TikTok-ready 1080x1350 PNGs + caption file, bundled as zip.
import html2canvas from "html2canvas-pro";
import JSZip from "jszip";

export async function exportPostForTikTok(opts: {
  container: HTMLElement;
  caption: string;
  hashtags: string;
  filenameBase: string;
}) {
  const { container, caption, hashtags, filenameBase } = opts;
  const slideEls = Array.from(container.querySelectorAll<HTMLElement>("[data-slide-index]"));
  if (slideEls.length === 0) throw new Error("No slides found to export");

  const zip = new JSZip();

  // TikTok carousel image slot: 1080 x 1350 (4:5)
  for (let i = 0; i < slideEls.length; i++) {
    const el = slideEls[i];
    const rect = el.getBoundingClientRect();
    const scale = 1080 / rect.width;
    const canvas = await html2canvas(el, {
      backgroundColor: "#0b0f1a",
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      width: rect.width,
      height: rect.height,
      windowWidth: document.documentElement.scrollWidth,
    });
    // Force exact 1080x1350 by drawing into a target canvas
    const out = document.createElement("canvas");
    out.width = 1080;
    out.height = 1350;
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#0b0f1a";
    ctx.fillRect(0, 0, 1080, 1350);
    // Cover-fit
    const srcRatio = canvas.width / canvas.height;
    const dstRatio = 1080 / 1350;
    let dw = 1080, dh = 1350, dx = 0, dy = 0;
    if (srcRatio > dstRatio) {
      dh = 1350; dw = dh * srcRatio; dx = (1080 - dw) / 2;
    } else {
      dw = 1080; dh = dw / srcRatio; dy = (1350 - dh) / 2;
    }
    ctx.drawImage(canvas, dx, dy, dw, dh);
    const blob: Blob = await new Promise((res) => out.toBlob((b) => res(b!), "image/png", 0.95));
    zip.file(`${filenameBase}-slide-${String(i + 1).padStart(2, "0")}.png`, blob);
  }

  zip.file(
    "caption.txt",
    `${caption.trim()}\n\n${hashtags.trim()}\n`,
  );

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
