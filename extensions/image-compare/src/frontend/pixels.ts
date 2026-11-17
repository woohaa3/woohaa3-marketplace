/** 浏览器侧的像素读写：URL → RGBA、RGBA → PNG。纯比对逻辑在 compare.ts，这里只碰 DOM。 */
import type { RgbaImage } from "./compare.js";

/** 浏览器画布的保守上限：单边 16384、总面积约 1 亿像素（再大 Safari/移动端会静默失败）。 */
export const MAX_CANVAS_EDGE = 16384;
export const MAX_CANVAS_AREA = 100_000_000;

export function fitsCanvas(width: number, height: number): boolean {
  return width <= MAX_CANVAS_EDGE && height <= MAX_CANVAS_EDGE && width * height <= MAX_CANVAS_AREA;
}

/**
 * 拉取并解码成 RGBA。关闭色彩空间转换：比对的是文件里的原始数值，
 * 不让浏览器按各图嵌入的 ICC 做不一致的转换。
 */
export async function decodeImage(url: string, signal?: AbortSignal): Promise<RgbaImage> {
  const response = await fetch(url, { credentials: "same-origin", ...(signal ? { signal } : {}) });
  if (!response.ok) throw new Error(`图片读取失败（HTTP ${response.status}）`);
  const bitmap = await createImageBitmap(await response.blob(), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none"
  });
  try {
    if (!fitsCanvas(bitmap.width, bitmap.height)) throw new Error(`图片过大（${bitmap.width}×${bitmap.height}），超出浏览器画布上限`);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("无法创建画布上下文");
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width: bitmap.width, height: bitmap.height, data };
  } finally {
    bitmap.close();
  }
}

export async function encodePng(image: RgbaImage): Promise<Blob> {
  if (!fitsCanvas(image.width, image.height)) throw new Error(`对比图过大（${image.width}×${image.height}）`);
  const canvas = new OffscreenCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建画布上下文");
  const pixels = new Uint8ClampedArray(image.data.length);
  pixels.set(image.data);
  context.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
  return canvas.convertToBlob({ type: "image/png" });
}

export type Captioned = { blob: Blob; width: number; height: number };

/** 按画布实际宽度折行：中文没有空格，逐字贪心。 */
function wrapLine(context: OffscreenCanvasRenderingContext2D, line: string, maxWidth: number): string[] {
  const out: string[] = [];
  let current = "";
  for (const ch of line) {
    if (current && context.measureText(current + ch).width > maxWidth) {
      out.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

/**
 * 把图片和说明文字合成一张 PNG：图片在上，文字在下（没有图片时只有文字卡片）。
 * 对比节点是一个图片节点，结论画在图片下面，就不需要另开文字节点。
 * 加上文字后超出画布上限时放弃文字，只保留图片（完整结论仍写在 nodeData 里）。
 */
export async function encodeWithCaption(image: RgbaImage | null, lines: readonly string[], cardWidth = 960): Promise<Captioned & { captioned: boolean }> {
  const width = image?.width ?? cardWidth;
  const fontSize = Math.max(14, Math.round(width / 64));
  const pad = Math.round(fontSize * 0.9);
  const lineHeight = Math.round(fontSize * 1.5);
  const font = `${fontSize}px "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif`;

  const probe = new OffscreenCanvas(1, 1).getContext("2d");
  if (!probe) throw new Error("无法创建画布上下文");
  probe.font = font;
  const wrapped = lines.flatMap((line) => wrapLine(probe, line, width - pad * 2));
  const captionHeight = pad * 2 + wrapped.length * lineHeight;
  const imageHeight = image?.height ?? 0;

  const withCaption = fitsCanvas(width, imageHeight + captionHeight);
  if (!withCaption && !image) throw new Error("说明文字过长");
  const height = withCaption ? imageHeight + captionHeight : imageHeight;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("无法创建画布上下文");
  if (image) {
    const pixels = new Uint8ClampedArray(image.data.length);
    pixels.set(image.data);
    context.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
  }
  if (withCaption) {
    context.fillStyle = "#f4f6f5";
    context.fillRect(0, imageHeight, width, captionHeight);
    context.fillStyle = "#1f2a27";
    context.font = font;
    context.textBaseline = "middle";
    wrapped.forEach((line, i) => context.fillText(line, pad, imageHeight + pad + i * lineHeight + lineHeight / 2));
  }
  return { blob: await canvas.convertToBlob({ type: "image/png" }), width, height, captioned: withCaption };
}
