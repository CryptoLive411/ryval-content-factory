import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
} from "mediabunny";

const W = 1080;
const H = 1920;
const FPS = 30;
const SEC_PER_SLIDE = 3;

/** Turn composed slide JPEGs into a 9:16 H.264 MP4 TikTok can pull. */
export async function encodeSlidesToMp4(slideBlobs: Blob[]): Promise<Blob> {
  if (!slideBlobs.length) throw new Error("No slides to encode.");
  if (typeof VideoEncoder === "undefined") {
    throw new Error("This browser cannot encode video. Open Content Forge in Chrome or Safari 17+.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not create video canvas.");

  const target = new BufferTarget();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const source = new CanvasSource(canvas, {
    codec: "avc",
    quality: QUALITY_HIGH,
    keyFrameInterval: SEC_PER_SLIDE,
  });
  output.addVideoTrack(source, { frameRate: FPS });
  await output.start();

  const framesPerSlide = Math.round(FPS * SEC_PER_SLIDE);
  for (let s = 0; s < slideBlobs.length; s++) {
    const bitmap = await createImageBitmap(slideBlobs[s]);
    for (let i = 0; i < framesPerSlide; i++) {
      const t = i / Math.max(1, framesPerSlide - 1);
      const scale = 1 + t * 0.045;
      ctx.fillStyle = "#05080f";
      ctx.fillRect(0, 0, W, H);
      const dw = W * scale;
      const dh = H * scale;
      ctx.drawImage(bitmap, (W - dw) / 2, (H - dh) / 2, dw, dh);
      await source.add(s * SEC_PER_SLIDE + i / FPS, 1 / FPS);
    }
    bitmap.close();
  }

  source.close();
  await output.finalize();
  if (!target.buffer) throw new Error("Video encode produced an empty file.");
  return new Blob([target.buffer], { type: "video/mp4" });
}

export function isMp4Url(url: string) {
  return /\.mp4(\?|#|$)/i.test(url);
}
