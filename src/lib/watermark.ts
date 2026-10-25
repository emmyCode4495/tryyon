/**
 * Bake a durable "engraved" watermark into an image.
 * The watermark is drawn into the pixel data (not a CSS overlay), so
 * downloads and screenshots include it and simple crop/clone tools
 * cannot cleanly remove the repeated diagonal pattern.
 */

const WATERMARK_TEXT = "tryyON";
const SUB_TEXT = "FREE · tryyon.app";

export async function applyFreeWatermark(imageUrl: string): Promise<string> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");
  if (!ctx) return imageUrl;

  // Base image
  ctx.drawImage(img, 0, 0, w, h);

  // Slight darken so light watermarks stay readable on bright photos
  ctx.fillStyle = "rgba(0,0,0,0.04)";
  ctx.fillRect(0, 0, w, h);

  const minSide = Math.min(w, h);
  const fontSize = Math.max(14, Math.round(minSide * 0.045));
  const stepX = fontSize * 6.5;
  const stepY = fontSize * 4.2;

  ctx.save();
  // Diagonal lattice covering the whole frame
  ctx.translate(w / 2, h / 2);
  ctx.rotate((-28 * Math.PI) / 180);
  ctx.translate(-w / 2, -h / 2);

  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw twice with different blend modes so the mark survives soft-clone / content-aware fill
  for (let pass = 0; pass < 2; pass++) {
    ctx.globalCompositeOperation = pass === 0 ? "multiply" : "soft-light";
    ctx.fillStyle = pass === 0 ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.28)";

    // Extend beyond bounds so rotation still covers corners
    for (let y = -h; y < h * 2; y += stepY) {
      const offset = (Math.floor(y / stepY) % 2) * (stepX / 2);
      for (let x = -w; x < w * 2; x += stepX) {
        ctx.fillText(WATERMARK_TEXT, x + offset, y);
      }
    }
  }
  ctx.restore();

  // Center seal — larger, harder to crop out without losing the subject
  const sealSize = Math.max(18, Math.round(minSide * 0.07));
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.font = `700 ${sealSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillText(WATERMARK_TEXT, w / 2, h / 2 - sealSize * 0.15);
  ctx.font = `500 ${Math.round(sealSize * 0.38)}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "rgba(0,0,0,0.32)";
  ctx.fillText(SUB_TEXT, w / 2, h / 2 + sealSize * 0.55);
  ctx.restore();

  // Soft white highlight pass on the seal for dark backgrounds
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.font = `700 ${sealSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText(WATERMARK_TEXT, w / 2, h / 2 - sealSize * 0.15);
  ctx.restore();

  // Bottom-right badge (always visible when viewing the full image)
  const badgePad = Math.round(minSide * 0.03);
  const badgeH = Math.round(minSide * 0.055);
  const badgeW = Math.round(badgeH * 4.2);
  const bx = w - badgeW - badgePad;
  const by = h - badgeH - badgePad;

  ctx.save();
  ctx.fillStyle = "rgba(11, 14, 43, 0.72)";
  roundRect(ctx, bx, by, badgeW, badgeH, badgeH / 2);
  ctx.fill();
  ctx.font = `600 ${Math.round(badgeH * 0.42)}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("tryyON free", bx + badgeW / 2, by + badgeH / 2);
  ctx.restore();

  // Export as JPEG so the watermark is in the compressed bitstream
  return canvas.toDataURL("image/jpeg", 0.92);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for watermark"));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
