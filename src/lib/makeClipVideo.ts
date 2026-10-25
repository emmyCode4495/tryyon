/**
 * Build a short silent video from a still image (canvas + MediaRecorder).
 * Used as Decart batch input (person) or as a local shareable clip fallback.
 */

export type ClipProgress = (ratio: number) => void;

export async function imageUrlToVideoBlob(
  imageUrl: string,
  options?: {
    durationSec?: number;
    width?: number;
    height?: number;
    fps?: number;
    /** Subtle zoom for a more “alive” share clip */
    kenBurns?: boolean;
  }
): Promise<Blob> {
  const durationSec = options?.durationSec ?? 5;
  const fps = options?.fps ?? 24;
  const kenBurns = options?.kenBurns ?? true;

  const img = await loadImage(imageUrl);
  const width = options?.width ?? Math.min(720, img.naturalWidth || 720);
  const height =
    options?.height ??
    Math.round(width * ((img.naturalHeight || 960) / (img.naturalWidth || 720)));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const stream = canvas.captureStream(fps);
  const mime =
    MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
        ? "video/webm;codecs=vp8"
        : "video/webm";

  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 2_500_000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime }));
    recorder.onerror = () => reject(new Error("Recording failed"));
  });

  recorder.start(100);

  const totalFrames = durationSec * fps;
  const frameMs = 1000 / fps;
  let frame = 0;

  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = frame / Math.max(1, totalFrames - 1);
      ctx.fillStyle = "#0b0e2b";
      ctx.fillRect(0, 0, width, height);

      if (kenBurns) {
        const scale = 1 + t * 0.08;
        const sw = width * scale;
        const sh = height * scale;
        const sx = (width - sw) / 2;
        const sy = (height - sh) / 2 - t * height * 0.02;
        ctx.drawImage(img, sx, sy, sw, sh);
      } else {
        drawCover(ctx, img, width, height);
      }

      frame += 1;
      if (frame >= totalFrames) {
        resolve();
        return;
      }
      window.setTimeout(tick, frameMs);
    };
    tick();
  });

  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  return done;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number
) {
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let dw = w;
  let dh = h;
  let dx = 0;
  let dy = 0;
  if (ir > cr) {
    dw = h * ir;
    dx = (w - dw) / 2;
  } else {
    dh = w / ir;
    dy = (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for clip"));
    img.src = src;
  });
}
